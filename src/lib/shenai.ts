import { useEffect, useRef, useState } from "react";
import CreateShenaiSDK, {
  type ShenaiSDK,
  type MeasurementResults,
  type HealthRisks,
  InitializationResult,
  MeasurementState,
  OperatingMode,
  PrecisionMode,
  MeasurementPreset,
  CameraMode,
  OnboardingMode,
} from "shenai-sdk";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shen.AI Web SDK integration.
 *
 * - SDK is bundled locally from `vendor/shenai-sdk` (v3.0.9).
 * - The wasm binary is served from `/shenai/shenai_sdk.wasm` (public/).
 * - API key is fetched from the `get-shenai-key` edge function (secret SHENAI_API_KEY).
 */

let cachedApiKey: string | null = null;
const SDK_LOAD_TIMEOUT_MS = 15000;
const SDK_INIT_TIMEOUT_MS = 15000;

function isEmbeddedContext() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function hasRequiredBrowserApis() {
  if (typeof window === "undefined") return false;
  if (typeof SharedArrayBuffer === "undefined") return false;
  if (typeof OffscreenCanvas === "undefined") return false;

  try {
    return !!new OffscreenCanvas(1, 1).getContext("webgl2");
  } catch {
    return false;
  }
}

function getRuntimeCompatibilityError() {
  if (typeof window === "undefined") return null;

  if (window.crossOriginIsolated) {
    return hasRequiredBrowserApis()
      ? null
      : "Este navegador não suporta os recursos necessários para rodar o scan por câmera.";
  }

  if (isEmbeddedContext()) {
    return "O scan por câmera não roda dentro do preview embutido do editor. Abra o app em uma nova aba para usar o FaceScan.";
  }

  if (!window.isSecureContext) {
    return "O scan precisa de uma conexão segura para acessar a câmera. Abra o app em https e tente novamente.";
  }

  if ("serviceWorker" in navigator && !navigator.serviceWorker.controller) {
    return "O motor do scan ainda está sendo preparado no navegador. Recarregue a página uma vez e tente novamente.";
  }

  return "O navegador não ativou o modo seguro necessário para o scan. Recarregue a página e tente novamente.";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timeoutId);
        reject(err);
      });
  });
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

async function fetchApiKeyDirect(): Promise<string | null> {
  // Fallback: chama a edge function via fetch direto. O `supabase.functions.invoke`
  // às vezes engole o corpo da resposta no Safari iOS quando o preflight CORS
  // demora, devolvendo apenas "non-2xx status code" mesmo quando o servidor
  // respondeu 200. Esse fallback bypassa essa camada.
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-shenai-key`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return json?.apiKey ?? null;
  } catch {
    return null;
  }
}

async function fetchApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  let lastError: unknown = null;
  // Tenta o invoke padrão; se falhar, faz fallback para fetch direto.
  try {
    const { data, error } = await supabase.functions.invoke("get-shenai-key");
    if (!error && data?.apiKey) {
      cachedApiKey = data.apiKey as string;
      return cachedApiKey;
    }
    lastError = error;
  } catch (err) {
    lastError = err;
  }
  const direct = await fetchApiKeyDirect();
  if (direct) {
    cachedApiKey = direct;
    return cachedApiKey;
  }
  const msg =
    lastError instanceof Error ? lastError.message : "servidor indisponível";
  throw new Error(`Falha ao obter API key: ${msg}`);
}

export type ScanStatus =
  | "idle"
  | "loading-sdk"
  | "initializing"
  | "ready"
  | "scanning"
  | "finished"
  | "error";

export interface ScanResults {
  // Cardiovascular
  heartRate?: number | null;
  hrvSdnn?: number | null;
  hrvLnRmssd?: number | null;
  stressIndex?: number | null;
  parasympatheticActivity?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  cardiacWorkload?: number | null;
  // Respiratório
  breathingRate?: number | null;
  // Antropometria
  ageYears?: number | null;
  bmi?: number | null;
  bmiCategory?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  // Sinal
  signalQuality?: number | null;
  // Health risks
  wellnessScore?: number | null;
  vascularAge?: number | null;
  waistToHeightRatio?: number | null;
  bodyFatPercentage?: number | null;
  basalMetabolicRate?: number | null;
  bodyRoundnessIndex?: number | null;
  conicityIndex?: number | null;
  aBodyShapeIndex?: number | null;
  totalDailyEnergyExpenditure?: number | null;
  hypertensionRisk?: number | null;
  diabetesRisk?: number | null;
  nafldRisk?: string | number | null;
  // CV diseases
  cvOverallRisk?: number | null;
  coronaryHeartDiseaseRisk?: number | null;
  strokeRisk?: number | null;
  heartFailureRisk?: number | null;
  peripheralVascularDiseaseRisk?: number | null;
  // Hard & fatal events
  coronaryDeathEventRisk?: number | null;
  fatalStrokeEventRisk?: number | null;
  totalCVMortalityRisk?: number | null;
  hardCVEventRisk?: number | null;
  // Scores
  ageScore?: number | null;
  sbpScore?: number | null;
  smokingScore?: number | null;
  diabetesScore?: number | null;
  bmiScore?: number | null;
  cholesterolScore?: number | null;
  cholesterolHdlScore?: number | null;
  totalScore?: number | null;
  // Meta
  capturedAt?: number;
}

// Some SDK fields come back as enum objects like { value: N } — convert them
// to a primitive (number or string) so React can render them safely.
function toPrimitive(v: unknown): string | number | null {
  if (v == null) return null;
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if ("value" in obj) {
      const inner = obj.value;
      if (typeof inner === "number" || typeof inner === "string") return inner;
    }
    if ("name" in obj && typeof obj.name === "string") return obj.name;
    try {
      return String(v);
    } catch {
      return null;
    }
  }
  return null;
}

function toNumber(v: unknown): number | null {
  const p = toPrimitive(v);
  if (p == null) return null;
  const n = typeof p === "number" ? p : Number(p);
  return Number.isFinite(n) ? n : null;
}

function toStringSafe(v: unknown): string | null {
  const p = toPrimitive(v);
  return p == null ? null : String(p);
}

function mapResults(
  r: MeasurementResults | null,
  risks: HealthRisks | null,
): ScanResults | null {
  if (!r) return null;
  return {
    heartRate: toNumber(r.heart_rate_bpm),
    hrvSdnn: toNumber(r.hrv_sdnn_ms),
    hrvLnRmssd: toNumber(r.hrv_lnrmssd_ms),
    stressIndex: toNumber(r.stress_index),
    parasympatheticActivity: toNumber(r.parasympathetic_activity),
    systolic: toNumber(r.systolic_blood_pressure_mmhg),
    diastolic: toNumber(r.diastolic_blood_pressure_mmhg),
    cardiacWorkload: toNumber(r.cardiac_workload_mmhg_per_sec),
    breathingRate: toNumber(r.breathing_rate_bpm),
    ageYears: toNumber(r.age_years),
    bmi: toNumber(r.bmi_kg_per_m2),
    bmiCategory: toStringSafe(r.bmi_category),
    weightKg: toNumber(r.weight_kg),
    heightCm: toNumber(r.height_cm),
    signalQuality: toNumber(r.average_signal_quality),
    // Health risks
    wellnessScore: toNumber(risks?.wellnessScore),
    vascularAge: toNumber(risks?.vascularAge),
    waistToHeightRatio: toNumber(risks?.waistToHeightRatio),
    bodyFatPercentage: toNumber(risks?.bodyFatPercentage),
    basalMetabolicRate: toNumber(risks?.basalMetabolicRate),
    bodyRoundnessIndex: toNumber(risks?.bodyRoundnessIndex),
    conicityIndex: toNumber(risks?.conicityIndex),
    aBodyShapeIndex: toNumber(risks?.aBodyShapeIndex),
    totalDailyEnergyExpenditure: toNumber(risks?.totalDailyEnergyExpenditure),
    hypertensionRisk: toNumber(risks?.hypertensionRisk),
    diabetesRisk: toNumber(risks?.diabetesRisk),
    nafldRisk: toPrimitive(risks?.nonAlcoholicFattyLiverDiseaseRisk),
    cvOverallRisk: toNumber(risks?.cvDiseases?.overallRisk),
    coronaryHeartDiseaseRisk: toNumber(risks?.cvDiseases?.coronaryHeartDiseaseRisk),
    strokeRisk: toNumber(risks?.cvDiseases?.strokeRisk),
    heartFailureRisk: toNumber(risks?.cvDiseases?.heartFailureRisk),
    peripheralVascularDiseaseRisk: toNumber(risks?.cvDiseases?.peripheralVascularDiseaseRisk),
    coronaryDeathEventRisk: toNumber(risks?.hardAndFatalEvents?.coronaryDeathEventRisk),
    fatalStrokeEventRisk: toNumber(risks?.hardAndFatalEvents?.fatalStrokeEventRisk),
    totalCVMortalityRisk: toNumber(risks?.hardAndFatalEvents?.totalCVMortalityRisk),
    hardCVEventRisk: toNumber(risks?.hardAndFatalEvents?.hardCVEventRisk),
    ageScore: toNumber(risks?.scores?.ageScore),
    sbpScore: toNumber(risks?.scores?.sbpScore),
    smokingScore: toNumber(risks?.scores?.smokingScore),
    diabetesScore: toNumber(risks?.scores?.diabetesScore),
    bmiScore: toNumber(risks?.scores?.bmiScore),
    cholesterolScore: toNumber(risks?.scores?.cholesterolScore),
    cholesterolHdlScore: toNumber(risks?.scores?.cholesterolHdlScore),
    totalScore: toNumber(risks?.scores?.totalScore),
    capturedAt: Date.now(),
  };
}

let cachedSdk: ShenaiSDK | null = null;

async function loadSdk(canvasId: string, onProgress: (p: number) => void) {
  if (cachedSdk) return cachedSdk;
  cachedSdk = await CreateShenaiSDK({
    locateFile: (file: string) => `/shenai/${file}`,
    onWasmLoadingProgress: onProgress,
    // ⚠️ Desabilitamos o preload display nativo do SDK porque ele renderiza
    // continuamente no MESMO canvas usado pelo scan, causando flicker no
    // Progress Ring e consumo elevado de memória (a página chega a recarregar
    // por excesso de uso). Nossa UI A2 já mostra o progresso via `wasmProgress`.
    enablePreloadDisplay: false,
  } as any);
  return cachedSdk;
}

export const SCAN_RESULTS_STORAGE_KEY = "impulso:lastScanResults";

export function useShenai(canvasId: string) {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [wasmProgress, setWasmProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScanResults | null>(null);
  const [realtimeHeartRate, setRealtimeHeartRate] = useState<number | null>(null);
  const [realtimeBloodPressure, setRealtimeBloodPressure] = useState<{
    systolic: number;
    diastolic: number;
  } | null>(null);
  // Estado do posicionamento facial — usado para liberar o botão "Iniciar"
  // somente quando o rosto está dentro do molde (FaceState.OK).
  // Valores possíveis: "OK" | "TOO_FAR" | "TOO_CLOSE" | "NOT_CENTERED"
  // | "NOT_VISIBLE" | "TURNED_AWAY" | "UNKNOWN".
  const [faceState, setFaceState] = useState<string>("UNKNOWN");
  const faceStatePollRef = useRef<number | null>(null);
  // Buffer compartilhado do sinal PPG para o waveform — usamos ref + tick
  // para evitar re-render do React a cada amostra (60Hz).
  const ppgBufferRef = useRef<number[]>([]);
  // Heartbeats (eventos) detectados pelo SDK em tempo real, com timestamp
  // em segundos relativos ao início do scan. Usados pelo waveform como
  // fallback caso getFullPpgSignal() esteja vazio durante a captura.
  const heartbeatsRef = useRef<Array<{ t: number; durationMs: number }>>([]);
  const sdkRef = useRef<ShenaiSDK | null>(null);
  const pollRef = useRef<number | null>(null);
  const ppgPollRef = useRef<number | null>(null);
  const fullProgressSinceRef = useRef<number | null>(null);
  const finishEventSinceRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const cleanup = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (ppgPollRef.current) {
      window.clearInterval(ppgPollRef.current);
      ppgPollRef.current = null;
    }
    if (faceStatePollRef.current) {
      window.clearInterval(faceStatePollRef.current);
      faceStatePollRef.current = null;
    }
    ppgBufferRef.current = [];
    heartbeatsRef.current = [];
    fullProgressSinceRef.current = null;
    finishEventSinceRef.current = null;
    try {
      sdkRef.current?.deinitialize?.();
    } catch {
      /* noop */
    }
    try {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    } catch {
      /* noop */
    }
    mediaStreamRef.current = null;
    sdkRef.current = null;
    cachedSdk = null;
  };

  useEffect(() => () => cleanup(), []);

  const getLatestMeasurementResults = (inst: ShenaiSDK) => {
    const directResults = inst.getMeasurementResults();
    if (directResults) {
      console.log("[shenai] finalize direct results:", directResults);
      return directResults;
    }

    try {
      const history = inst.getMeasurementResultsHistory()?.history ?? [];
      const latestHistoryEntry = history[history.length - 1]?.measurement_results ?? null;
      console.log("[shenai] finalize history results:", latestHistoryEntry);
      return latestHistoryEntry;
    } catch (err) {
      console.warn("[shenai] getMeasurementResultsHistory failed", err);
      return null;
    }
  };

  const releaseCameraResources = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (ppgPollRef.current) {
      window.clearInterval(ppgPollRef.current);
      ppgPollRef.current = null;
    }
    if (faceStatePollRef.current) {
      window.clearInterval(faceStatePollRef.current);
      faceStatePollRef.current = null;
    }
    fullProgressSinceRef.current = null;
    finishEventSinceRef.current = null;
    // Desliga o SDK (libera workers/wasm) e para todas as tracks da câmera.
    // Sem isso, mesmo após o "finished" o MediaStream continua ativo e o
    // indicador de câmera do navegador segue aceso.
    try {
      sdkRef.current?.deinitialize?.();
    } catch {
      /* noop */
    }
    try {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    } catch {
      /* noop */
    }
    mediaStreamRef.current = null;
    sdkRef.current = null;
    cachedSdk = null;
  };

  const finalizeWithResults = (inst: ShenaiSDK) => {
    const raw = getLatestMeasurementResults(inst);
    console.log("[shenai] finalize raw results:", raw);
    if (!raw) return false;
    let risks: HealthRisks | null = null;
    try {
      risks = inst.getHealthRisks?.() ?? null;
      console.log("[shenai] health risks:", risks);
    } catch (err) {
      console.warn("[shenai] getHealthRisks failed", err);
      risks = null;
    }
    const mapped = mapResults(raw, risks);
    console.log("[shenai] mapped results:", mapped);
    if (!mapped) return false;
    setResults(mapped);
    setStatus("finished");
    try {
      const payload = JSON.stringify(mapped);
      sessionStorage.setItem(SCAN_RESULTS_STORAGE_KEY, payload);
      localStorage.setItem(SCAN_RESULTS_STORAGE_KEY, payload);
      console.log("[shenai] saved to storage");
    } catch (err) {
      console.warn("[shenai] storage save failed", err);
    }
    // Câmera desligada IMEDIATAMENTE após capturar os resultados.
    releaseCameraResources();
    return true;
  };

  const start = async (providedStream?: MediaStream | null) => {
    setError(null);
    setResults(null);
    setProgress(0);
    setWasmProgress(0);
    fullProgressSinceRef.current = null;
    finishEventSinceRef.current = null;

    const compatibilityError = getRuntimeCompatibilityError();
    if (compatibilityError) {
      setStatus("error");
      setError(compatibilityError);
      return;
    }

    let apiKey: string;
    try {
      apiKey = await fetchApiKey();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Falha ao obter API key.");
      return;
    }

    try {
      setStatus("loading-sdk");
      let lastReportedProgress = -1;
      const sdk = await withTimeout(loadSdk(canvasId, (p) => {
        const normalized = p > 1 ? p : p * 100;
        const next = Math.max(0, Math.min(100, Math.round(normalized)));
        // Só atualiza state se o valor monotonicamente avançou — evita
        // o efeito "ringing" onde o ring vai e volta várias vezes em ms.
        if (next <= lastReportedProgress) return;
        lastReportedProgress = next;
        setWasmProgress(next);
      }), SDK_LOAD_TIMEOUT_MS, "O motor do scan demorou demais para carregar neste navegador.");
      sdkRef.current = sdk;

      setStatus("initializing");

      const mobileDevice = isMobileDevice();

      const initResult = await withTimeout(
        new Promise<InitializationResult>((resolve) => {
          sdk.initialize(
            apiKey,
            "",
            {
              // ⚠️ STRICT em ambos (desktop e mobile). Doc oficial da Shen.AI:
              // "in STRICT precision mode, blood pressure is shown whenever a
              // measurement completes." Em RELAXED, BP frequentemente vem null.
              // O custo é só um pouquinho mais de exigência de qualidade do
              // sinal, mas com 30s e iluminação OK costuma passar tranquilo.
              precisionMode: PrecisionMode.STRICT,
              // Não aplicamos quality gate adicional só para BP — queremos
              // mostrar o que o SDK conseguir estimar, mesmo se a confiança
              // não for perfeita. Sem este flag (ou com false), o BP sai junto
              // com o resto dos resultados.
              applyPrecisionModeToBloodPressure: false,
              // Start directly in MEASURE so the scan kicks off as soon as the
              // face is detected — sem precisar do botão INICIAR nativo do SDK.
              operatingMode: OperatingMode.MEASURE,
              cameraMode: providedStream ? CameraMode.MEDIA_STREAM : CameraMode.FACING_USER,
              // Padronizado em 30s para desktop e mobile — o user pediu
              // contagem de 30s no desktop também (antes era 60s).
              measurementPreset: MeasurementPreset.THIRTY_SECONDS_ALL_METRICS,
              onboardingMode: OnboardingMode.HIDDEN,
              // ✅ UI nativa do SDK habilitada (igual à demo oficial ShenAI):
              // ring de progresso, countdown, instruções de face, tiles de
              // BPM/PA/qualidade — tudo renderizado pelo próprio SDK no canvas.
              // Nosso overlay custom (.scan-vitals, .ring-progress, countdown)
              // foi removido do ScanDialog para esta tela.
              showUserInterface: true,
              hideShenaiLogo: true,
              showFacePositioningOverlay: true,
              showVisualWarnings: true,
              enableCameraSwap: false,
              showFaceMask: false,
              showBloodFlow: false,
              enableStartAfterSuccess: false,
              enableSummaryScreen: false,
              showResultsFinishButton: false,
              showSignalTile: true,
              showSignalQualityIndicator: true,
              enableHealthRisks: true,
              enableFullFrameProcessing: !mobileDevice,
              language: "pt",
              eventCallback: (event) => {
                // Não logar todos os eventos: o SDK dispara dezenas/segundo
                // (frames de ROI, qualidade do sinal) e isso satura o console
                // do Safari iOS, contribuindo para travadas no main thread.
                if (event === "MEASUREMENT_FINISHED" || event === "USER_FLOW_FINISHED") {
                  finishEventSinceRef.current = Date.now();
                  window.setTimeout(() => {
                    const currentSdk = sdkRef.current;
                    if (currentSdk) {
                      finalizeWithResults(currentSdk);
                    }
                  }, 250);
                }
              },
              customColorTheme: {
                themeColor: "#1E9BF0",
                textColor: "#F8FAFC",
                backgroundColor: "#0B0E14",
                tileColor: "#141925",
                buttonMainColor: "#1E9BF0",
                buttonSecondaryColor: "#1F2937",
              },
            },
            (r) => resolve(r),
          );
        }),
        SDK_INIT_TIMEOUT_MS,
        "O motor do scan não conseguiu inicializar a câmera neste navegador.",
      );

      const initValue =
        typeof initResult === "object" && initResult !== null && "value" in (initResult as any)
          ? (initResult as any).value
          : initResult;
      const okValue =
        typeof InitializationResult.OK === "object" &&
        InitializationResult.OK !== null &&
        "value" in (InitializationResult.OK as any)
          ? (InitializationResult.OK as any).value
          : InitializationResult.OK;
      if (initValue !== okValue) {
        const reason =
          initValue === 1
            ? "API key inválida"
            : initValue === 2
              ? "Erro de conexão"
              : initValue === 3
                ? "Erro interno do SDK"
                : `código ${initValue}`;
        throw new Error(`Shen.AI init falhou: ${reason}`);
      }

      if (providedStream) {
        mediaStreamRef.current = providedStream;
        try {
          sdk.setMediaStream(providedStream, true);
        } catch (streamError) {
          console.warn("[shenai] setMediaStream failed", streamError);
        }
      }

      // 🔋 Limita o backing-store do canvas ANTES de attachToCanvas para evitar
      // OOM no Safari iOS. Sem isso, em telas com DPR=3 o canvas vira um
      // framebuffer de 1500x1500 (≈9MB só na cor) e o WebGL/WASM extrapola
      // memória, causando reload da página no meio do scan.
      try {
        const canvasEl = document.getElementById(canvasId) as HTMLCanvasElement | null;
        if (canvasEl) {
          const cap = mobileDevice ? 640 : 960;
          const rect = canvasEl.getBoundingClientRect();
          const target = Math.min(cap, Math.round(Math.max(rect.width, rect.height)));
          canvasEl.width = target;
          canvasEl.height = target;
        }
      } catch (err) {
        console.warn("[shenai] canvas resize failed", err);
      }

      sdk.attachToCanvas(`#${canvasId}`, true);
      // Reforça a supressão da UI nativa: em alguns fluxos o setMediaStream /
      // attachToCanvas reativa overlays como o botão INICIAR, tiles de pulso /
      // pressão e "condições de medição", que ficam por cima do nosso UI A2.
      try {
        sdk.setShowUserInterface?.(true);
        sdk.setShowFacePositioningOverlay?.(true);
        sdk.setShowVisualWarnings?.(true);
        sdk.setShowSignalTile?.(true);
        sdk.setShowSignalQualityIndicator?.(true);
        sdk.setEnableSummaryScreen?.(false);
        sdk.setShowResultsFinishButton?.(false);
        // Reforça via setter: não aplicar precision-mode ao BP (mostra BP
        // mesmo se a confiança não for "clínica"). Algumas builds só pegam
        // este flag via setter, não via initialize() options.
        sdk.setApplyPrecisionModeToBloodPressure?.(false);
      } catch {
        /* noop */
      }
      // Câmera ligada e SDK pronto — aguarda o usuário clicar em INICIAR
      // (botão renderizado pelo ScanDialog sobre o círculo do vídeo). Sem
      // esse gate, o scan começava automaticamente assim que o rosto era
      // detectado, o que não permitia o usuário se preparar.
      setStatus("ready");

      // Polling do estado facial — alimenta o gate do botão "Iniciar".
      // Roda a 4Hz (250ms) — suficiente pra UX responsiva sem custo.
      if (faceStatePollRef.current) {
        window.clearInterval(faceStatePollRef.current);
      }
      faceStatePollRef.current = window.setInterval(() => {
        const inst = sdkRef.current;
        if (!inst) return;
        try {
          const fs = inst.getFaceState?.();
          const fsAny = fs as any;
          const sdkName =
            fsAny && typeof fsAny === "object" && "value" in fsAny
              ? (Object.keys((sdk as any).FaceState ?? {}).find(
                  (k) => (sdk as any).FaceState[k]?.value === fsAny.value,
                ) ?? "UNKNOWN")
              : typeof fs === "string"
                ? fs
                : "UNKNOWN";

          // 🔒 Gate geométrico ADICIONAL — o SDK costuma reportar OK assim que
          // o rosto está "no centro", mas com uma tolerância larga demais. Nós
          // exigimos que a bbox normalizada do rosto:
          //  - esteja contida num retângulo central apertado (32%-68% H, 22%-78% V),
          //    deixando margem confortável para o oval do molde nativo;
          //  - tenha um tamanho mínimo (rosto não pode estar muito pequeno) e
          //    máximo (não pode estar muito perto/cortado).
          let geomName = sdkName;
          try {
            const bbox = inst.getNormalizedFaceBbox?.();
            if (bbox && Number.isFinite(bbox.x) && Number.isFinite(bbox.y)) {
              const cx = bbox.x + bbox.width / 2;
              const cy = bbox.y + bbox.height / 2;
              const sizeOk =
                bbox.width >= 0.28 && bbox.width <= 0.6 &&
                bbox.height >= 0.32 && bbox.height <= 0.7;
              const centerOk = cx >= 0.4 && cx <= 0.6 && cy >= 0.42 && cy <= 0.62;
              const insideOk =
                bbox.x >= 0.18 && bbox.x + bbox.width <= 0.82 &&
                bbox.y >= 0.12 && bbox.y + bbox.height <= 0.88;

              if (!sizeOk) {
                geomName = bbox.width < 0.28 ? "TOO_FAR" : "TOO_CLOSE";
              } else if (!centerOk || !insideOk) {
                geomName = "NOT_CENTERED";
              } else if (sdkName === "OK") {
                geomName = "OK";
              }
            } else if (sdkName === "OK") {
              // SDK diz OK mas não temos bbox — mantém o veredicto do SDK.
              geomName = "OK";
            }
          } catch {
            /* noop — usa apenas o estado do SDK */
          }

          setFaceState(geomName);
        } catch {
          /* noop */
        }
      }, 250);

    } catch (e) {
      console.error("[shenai]", e);
      setStatus("error");
      setError(e instanceof Error ? e.message : "Erro desconhecido ao iniciar o scan.");
      cleanup();
    }
  };

  const beginMeasurement = () => {
    const inst = sdkRef.current;
    if (!inst) return;
    try {
      inst.setOperatingMode(OperatingMode.MEASURE);
      inst.startMeasurement?.();
    } catch (err) {
      console.warn("[shenai] startMeasurement failed", err);
    }
    setStatus("scanning");
    setProgress(0);
    setRealtimeHeartRate(null);
    setRealtimeBloodPressure(null);
    ppgBufferRef.current = [];
    heartbeatsRef.current = [];
    fullProgressSinceRef.current = null;
    finishEventSinceRef.current = null;

    if (pollRef.current) {
      window.clearInterval(pollRef.current);
    }
    if (ppgPollRef.current) {
      window.clearInterval(ppgPollRef.current);
    }

    // Polling rápido (~100ms) para alimentar o waveform com dados reais.
    // Tenta 1) sinal PPG bruto e 2) eventos de batimento (fallback).
    const PPG_MAX_SAMPLES = 600;
    let lastPpgLen = 0;
    let diagLogged = 0;
    ppgPollRef.current = window.setInterval(() => {
      const inst = sdkRef.current;
      if (!inst) return;
      try {
        const sig = inst.getFullPpgSignal?.();
        if (Array.isArray(sig) && sig.length > lastPpgLen) {
          const fresh = sig.slice(lastPpgLen);
          lastPpgLen = sig.length;
          const buf = ppgBufferRef.current;
          for (const s of fresh) {
            if (typeof s === "number" && Number.isFinite(s)) buf.push(s);
          }
          if (buf.length > PPG_MAX_SAMPLES) {
            ppgBufferRef.current = buf.slice(buf.length - PPG_MAX_SAMPLES);
          }
        }

        try {
          const beats = inst.getRealtimeHeartbeats?.(12);
          if (Array.isArray(beats) && beats.length > 0) {
            heartbeatsRef.current = beats.map((b) => ({
              t: Number(b.start_location_sec) || 0,
              durationMs: Number(b.duration_ms) || 800,
            }));
          }
        } catch { /* noop */ }

        // Diagnostic — log a cada ~3s
        const now = Date.now();
        if (now - diagLogged > 3000) {
          diagLogged = now;
          try {
            const sigLen = Array.isArray(sig) ? sig.length : -1;
            const beatsArr = inst.getRealtimeHeartbeats?.(10);
            const beatsCount = Array.isArray(beatsArr) ? beatsArr.length : -1;
            const rt10 = inst.getRealtimeMetrics?.(10);
            const rt30 = inst.getRealtimeMetrics?.(30);
            console.log("[shenai/diag] ppgLen=", sigLen,
              "buf=", ppgBufferRef.current.length,
              "beats=", beatsCount,
              "rt10.sys=", rt10?.systolic_blood_pressure_mmhg,
              "rt10.dia=", rt10?.diastolic_blood_pressure_mmhg,
              "rt30.sys=", rt30?.systolic_blood_pressure_mmhg,
              "rt30.dia=", rt30?.diastolic_blood_pressure_mmhg);
          } catch (err) {
            console.warn("[shenai/diag] failed", err);
          }
        }
      } catch { /* noop */ }
    }, 100);


    pollRef.current = window.setInterval(() => {
      const inst = sdkRef.current;
      if (!inst) return;
      try {
        const rawProgress = inst.getMeasurementProgressPercentage() ?? 0;
        const normalizedProgress = Math.max(0, Math.min(100, rawProgress));
        setProgress(normalizedProgress);

        // BPM em tempo real — tenta a janela de 10s primeiro (mais estável),
        // depois cai para 4s e por fim para o realtime puro.
        try {
          const hr =
            inst.getHeartRate10s?.() ??
            inst.getHeartRate4s?.() ??
            inst.getRealtimeHeartRate?.() ??
            null;
          if (typeof hr === "number" && Number.isFinite(hr) && hr > 0) {
            setRealtimeHeartRate(Math.round(hr));
          }
        } catch {
          /* noop */
        }

        // Pressão arterial em tempo real — tenta múltiplas janelas (a janela
        // mais larga estabiliza primeiro). Em último caso, lê do snapshot
        // parcial dos resultados acumulados.
        try {
          const candidates: Array<MeasurementResults | null | undefined> = [
            inst.getRealtimeMetrics?.(30),
            inst.getRealtimeMetrics?.(20),
            inst.getRealtimeMetrics?.(10),
            inst.getMeasurementResults?.(),
          ];
          for (const rt of candidates) {
            const sys = toNumber(rt?.systolic_blood_pressure_mmhg);
            const dia = toNumber(rt?.diastolic_blood_pressure_mmhg);
            if (sys != null && dia != null && sys > 60 && dia > 30 && sys > dia) {
              setRealtimeBloodPressure({
                systolic: Math.round(sys),
                diastolic: Math.round(dia),
              });
              break;
            }
          }
        } catch {
          /* noop */
        }

        const state = inst.getMeasurementState();
        const stateValue =
          typeof state === "object" && state !== null && "value" in (state as any)
            ? (state as any).value
            : state;
        // Poll log removido: rodar a cada 1s satura o console do Safari iOS.

        if (normalizedProgress >= 100 && fullProgressSinceRef.current == null) {
          fullProgressSinceRef.current = Date.now();
        }

        if (state === MeasurementState.FAILED || stateValue === 7) {
          console.warn("[shenai] measurement FAILED");
          setStatus("error");
          setError("A medição falhou. Verifique a iluminação e tente novamente.");
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
          return;
        }

        if (state === MeasurementState.FINISHED || stateValue === 6) {
          finalizeWithResults(inst);
          return;
        }

        if (
          fullProgressSinceRef.current != null &&
          (finishEventSinceRef.current != null || stateValue === 0 || stateValue === 1)
        ) {
          const ok = finalizeWithResults(inst);
          if (ok) return;
        }

        if (
          fullProgressSinceRef.current != null &&
          Date.now() - fullProgressSinceRef.current > 5000
        ) {
          const ok = finalizeWithResults(inst);
          if (!ok && Date.now() - fullProgressSinceRef.current > 12000) {
            console.warn("[shenai] stuck at 100% without results");
            setStatus("error");
            setError(
              "A medição travou em 100%. Tente refazer mantendo o rosto bem iluminado e estável.",
            );
            if (pollRef.current) {
              window.clearInterval(pollRef.current);
              pollRef.current = null;
            }
          }
        }
      } catch (err) {
        console.warn("[shenai] poll error", err);
      }
    }, 1000);
  };

  const stop = () => {
    cleanup();
    setStatus("idle");
    setProgress(0);
    setWasmProgress(0);
    setRealtimeHeartRate(null);
    setRealtimeBloodPressure(null);
    setFaceState("UNKNOWN");
  };

  return {
    status,
    progress,
    wasmProgress,
    error,
    results,
    realtimeHeartRate,
    realtimeBloodPressure,
    faceState,
    ppgBufferRef,
    heartbeatsRef,
    start,
    beginMeasurement,
    stop,
    environmentBlocked: isEmbeddedContext(),
    runtimeCompatibilityError: getRuntimeCompatibilityError(),
  };
}
