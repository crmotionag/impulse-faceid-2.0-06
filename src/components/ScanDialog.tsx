import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useShenai, type ScanResults } from "@/lib/shenai";
import { ResultsView } from "./ResultsView";
import { EmailGate } from "./EmailGate";

interface ScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CANVAS_ID = "shenai-canvas";

const STAGE_LABELS: Record<string, string> = {
  idle: "Preparando câmera",
  "loading-sdk": "Carregando engine",
  initializing: "Inicializando câmera",
  ready: "Pronto para iniciar",
  scanning: "Scan em andamento",
  finished: "Resultado",
  error: "Erro",
};

// Ring stroke geometry — circle r=290 within a 600x600 viewBox.
const RING_R = 290;
const RING_CIRC = 2 * Math.PI * RING_R; // ≈ 1822.12

/**
 * ScanDialog — A2 Clean Premium fullscreen layout.
 *
 * 🚨 LOGIC CONTRACT — DO NOT BREAK:
 *  - Imports & uses useShenai(CANVAS_ID) exactly as before.
 *  - <canvas id="shenai-canvas"> always exists in the DOM while open and
 *    status !== 'finished'. It lives directly inside .video-stage with no
 *    transform/filter/opacity wrapper. SDK calls sdk.attachToCanvas('#shenai-canvas').
 *  - start()/stop() lifecycle preserved (auto-start on open, stop on close).
 *  - When status === 'finished' && results, render <EmailGate> first then
 *    <ResultsView> after unlock — fluxo preservado.
 *
 * Visual layout copiado das linhas 1111-1160 e CSS 569-813 de
 * src/design-reference/A2-clean-premium.html.
 */
export const ScanDialog = ({ open, onOpenChange }: ScanDialogProps) => {
  const {
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
    environmentBlocked,
    runtimeCompatibilityError,
  } = useShenai(CANVAS_ID);
  const [unlocked, setUnlocked] = useState(false);
  const scanStartRef = useRef<number | null>(null);
  // Tick puramente local que avança o countdown linearmente em wall-clock,
  // independente do polling do SDK. Antes o countdown era derivado do
  // `progress` que vem do SDK e podia "pular" 2-4s quando o main thread
  // travava com GC ou frames pesados.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (status !== "scanning") return;
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [status]);
  useEffect(() => {
    if (status === "scanning" && scanStartRef.current == null) {
      scanStartRef.current = Date.now();
    }
    if (status !== "scanning" && status !== "finished") {
      scanStartRef.current = null;
    }
  }, [status]);

  const [localError, setLocalError] = useState<string | null>(null);

  const handleStart = async () => {
    if (environmentBlocked) {
      openStandalone();
      return;
    }

    if (runtimeCompatibilityError) {
      setLocalError(runtimeCompatibilityError);
      return;
    }

    setLocalError(null);
    try {
      // 🔋 Resolução reduzida (640x480) é suficiente para rPPG e economiza
      // ~60% da memória de vídeo em comparação com HD/Full HD. No iPhone,
      // pedir o stream nativo (1280x720+) é o que mais aproxima a aba do
      // limite de RAM do Safari, causando reload no meio do scan.
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(
        navigator.userAgent,
      );
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: isMobile ? 480 : 640 },
          height: { ideal: isMobile ? 360 : 480 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });
      await start(stream);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      const message =
        name === "NotAllowedError" || name === "SecurityError"
          ? "Você precisa autorizar o acesso à câmera nas configurações do navegador e tentar novamente."
          : name === "NotFoundError"
            ? "Nenhuma câmera foi encontrada neste dispositivo."
            : err instanceof Error
              ? err.message
              : "Não foi possível acessar a câmera.";
      setLocalError(message);
    }
  };

  useEffect(() => {
    if (!open) {
      setUnlocked(false);
      setLocalError(null);
      stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const openStandalone = () =>
    window.open(window.location.href, "_blank", "noopener,noreferrer");

  const stageLabel = STAGE_LABELS[status] ?? "Scan";

  const isFinished = status === "finished" && !!results;
  const showEmailGate = isFinished && !unlocked;
  const showResults = isFinished && unlocked;
  const showPrestart = !isFinished && status === "idle" && !localError;

  // Duração total do scan — alinhado ao preset usado em shenai.ts
  // (THIRTY_SECONDS_ALL_METRICS para desktop e mobile).
  const totalDurationSec = 30;

  // Tempo decorrido em wall-clock — fonte da verdade para o countdown.
  const elapsedSec =
    status === "scanning" && scanStartRef.current != null
      ? Math.min(totalDurationSec, (Date.now() - scanStartRef.current) / 1000)
      : 0;

  // Ring: durante o scan, usa o tempo decorrido (linear) em vez do progress
  // do SDK que pode dar saltos. Durante o load do WASM, segue o wasmProgress.
  const ringPct =
    status === "loading-sdk"
      ? wasmProgress
      : status === "scanning"
        ? Math.max(progress, (elapsedSec / totalDurationSec) * 100)
        : status === "finished"
          ? 100
          : 0;
  const ringDashOffset = RING_CIRC * (1 - Math.max(0, Math.min(100, ringPct)) / 100);

  const countdown =
    status === "scanning"
      ? Math.max(0, Math.ceil(totalDurationSec - elapsedSec))
      : null;

  // Hint específico do estado facial — mostrado em "ready" pra orientar
  // o usuário a se posicionar dentro do molde antes de poder clicar "Iniciar".
  const faceReady = faceState === "OK";
  const faceHint = (() => {
    switch (faceState) {
      case "OK":
        return "Rosto posicionado — toque em iniciar";
      case "TOO_FAR":
        return "Aproxime-se um pouco da câmera";
      case "TOO_CLOSE":
        return "Afaste-se um pouco da câmera";
      case "NOT_CENTERED":
        return "Centralize o rosto no molde";
      case "TURNED_AWAY":
        return "Olhe diretamente para a câmera";
      case "NOT_VISIBLE":
      case "UNKNOWN":
      default:
        return "Posicione seu rosto dentro do molde";
    }
  })();

  // Status line — string mostrada abaixo do ring.
  const statusLine = (() => {
    if (status === "loading-sdk")
      return `Carregando engine neural · ${wasmProgress}%`;
    if (status === "initializing") return "Permita o acesso à câmera";
    if (status === "scanning")
      return "Capturando sinal rPPG — respire normalmente";
    if (status === "idle") return "Preparando";
    if (status === "ready") return faceHint;
    return "";
  })();

  // Show fallback overlay (inside .video-stage) only while canvas is empty.
  const showVideoFallback =
    status === "loading-sdk" || status === "initializing";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scan-dialog-content" aria-describedby={undefined}>
        <div className={`scan-full ${open ? "open" : ""}`}>
          {/* Close */}
          <button
            type="button"
            className="scan-close"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar scan"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>

          {/* Header */}
          <div className="scan-header">
            <span className="logo">
              <img src="/shared/logo-impulso.png" alt="impulso+" />
            </span>
            <DialogTitle asChild>
              <span>{stageLabel}</span>
            </DialogTitle>
          </div>

          {/*
            ÁREA DO SCAN — o canvas do ShenAI (id="shenai-canvas") vive aqui.
            Mantido SEMPRE no DOM enquanto não estiver em finished, sem
            wrappers que apliquem transform / opacity / overflow:hidden.
          */}
          {!isFinished && (
            <>
              <div className="scan-center">
                <div className="scan-stage-wrap scan-stage-wrap--native">
                  <div className="video-stage" id="videoStage">
                    <canvas id={CANVAS_ID} />
                    {showVideoFallback && (
                      <div className="video-fallback">
                        <svg
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="6" width="18" height="12" rx="2" />
                          <path d="M8 6 L9 4 L15 4 L16 6" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <div>
                          <b>
                            {status === "loading-sdk"
                              ? "Carregando engine"
                              : "Permissão necessária"}
                          </b>
                          {status === "loading-sdk"
                            ? "Preparando o motor do scan no seu navegador."
                            : "Autorize o acesso à câmera pra começar o scan. Nenhum vídeo sai do seu dispositivo."}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {showPrestart && (
                <div className="scan-prestart" role="dialog" aria-label="Iniciar scan">
                  <h2>
                    Pronto? <span className="it">Vamos</span>{" "}
                    <span className="hl">escanear você.</span>
                  </h2>
                  <p>
                    Você vai ficar parado por 60 segundos, olhando pra câmera.
                    Em seguida você vê o que ela leu.
                  </p>
                  <div className="tips">
                    <span>
                      <span className="ico">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="4" />
                          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                        </svg>
                      </span>
                      Luz ambiente boa
                    </span>
                    <span>
                      <span className="ico">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="9" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </span>
                      Olhe para a câmera
                    </span>
                    <span>
                      <span className="ico">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="4" y="8" width="16" height="12" rx="2" />
                          <path d="M8 8 V6 a4 4 0 0 1 8 0 V8" />
                        </svg>
                      </span>
                      Nenhum dado sai daqui
                    </span>
                  </div>
                  <button
                    type="button"
                    className="scan-start-btn"
                    onClick={() => void handleStart()}
                  >
                    {environmentBlocked ? "Abrir em nova aba" : "Começar"}
                    <span className="ico">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    </span>
                  </button>
                </div>
              )}

              {(status === "error" || localError) && (
                <div className="scan-prestart" role="alert">
                  <h2>
                    Não foi possível <span className="hl">iniciar.</span>
                  </h2>
                  <p>{localError ?? error}</p>
                  <button
                    type="button"
                    className="scan-start-btn"
                    onClick={() => void handleStart()}
                  >
                    {environmentBlocked ? "Abrir em nova aba" : "Tentar de novo"}
                    <span className="ico">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    </span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* RESULTADO — fluxo sagrado: EmailGate → ResultsView. */}
          {showEmailGate && (
            <div className="scan-contact show">
              <EmailGate
                results={results as ScanResults}
                onUnlock={() => setUnlocked(true)}
              />
            </div>
          )}

          {showResults && (
            <div className="scan-result show">
              <ResultsView
                results={results as ScanResults}
                onRetry={() => {
                  stop();
                  setUnlocked(false);
                  // Re-pede a câmera dentro do gesto do usuário (clique no botão).
                  // Sem isso, o navegador bloqueia o getUserMedia silenciosamente
                  // e o scan trava em "initializing" sem nunca abrir a câmera.
                  void handleStart();
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
