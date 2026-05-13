import { useEffect, useMemo, useRef, useState } from "react";
import type { ScanResults } from "@/lib/shenai";
import { ShareCard } from "./ShareCard";

interface ResultsViewProps {
  results: ScanResults;
  onRetry: () => void;
}

/* ────────── Helpers ────────── */

const isPresent = (v: unknown): boolean =>
  v !== null && v !== undefined && !(typeof v === "number" && (Number.isNaN(v) || v === 0));

const fmt = (v: number | null | undefined, digits = 0): string => {
  if (v == null || !Number.isFinite(v)) return "—";
  return digits === 0 ? String(Math.round(v)) : v.toFixed(digits).replace(".", ",");
};

const fmtPct = (v: number | null | undefined): string => {
  if (v == null || !Number.isFinite(v)) return "—";
  const n = v <= 1.001 ? v * 100 : v;
  return `${Math.round(n)}%`;
};

// Sistema de faixas (estilo BJJ) baseado no Impulso+ Score
type Belt = {
  name: string;
  color: string;       // cor do nome + arco
  textOn: string;      // cor do texto sobre a faixa, quando aplicável
  ringStroke: string;  // cor do gradiente/arco
  goldBorder?: boolean;
};

const beltFromScore = (s: number): Belt => {
  if (s >= 85) return { name: "Faixa Preta", color: "#111827", textOn: "#F4F1EA", ringStroke: "#D4AF37", goldBorder: true };
  if (s >= 70) return { name: "Faixa Marrom", color: "#92400E", textOn: "#F4F1EA", ringStroke: "#92400E" };
  if (s >= 50) return { name: "Faixa Roxa", color: "#7C3AED", textOn: "#F4F1EA", ringStroke: "#7C3AED" };
  if (s >= 30) return { name: "Faixa Azul", color: "#2563EB", textOn: "#F4F1EA", ringStroke: "#2563EB" };
  return { name: "Faixa Branca", color: "#F4F1EA", textOn: "#111827", ringStroke: "#F4F1EA" };
};

const proxyScore = (r: ScanResults): number => {
  const parts: Array<{ w: number; v: number }> = [];
  if (isPresent(r.heartRate)) {
    const hr = Number(r.heartRate);
    const v = hr >= 60 && hr <= 80 ? 100 : hr < 60 ? 60 : Math.max(0, 100 - (hr - 80) * 2);
    parts.push({ w: 1, v });
  }
  if (isPresent(r.hrvSdnn)) {
    parts.push({ w: 1.2, v: Math.max(0, Math.min(100, Number(r.hrvSdnn) * 1.4)) });
  }
  if (isPresent(r.stressIndex)) {
    const s = Number(r.stressIndex);
    const n = s <= 1 ? s * 100 : s;
    parts.push({ w: 1.2, v: Math.max(0, 100 - n) });
  }
  if (isPresent(r.systolic) && isPresent(r.diastolic)) {
    const sys = Number(r.systolic);
    parts.push({ w: 1, v: sys < 120 ? 100 : sys < 130 ? 85 : sys < 140 ? 65 : 40 });
  }
  if (parts.length === 0) return 60;
  const total = parts.reduce((a, p) => a + p.w * p.v, 0);
  const wsum = parts.reduce((a, p) => a + p.w, 0);
  return Math.round(total / wsum);
};

/* ────────── Score count-up ────────── */

const useCountUp = (target: number, duration = 1800) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
};

/* ────────── Detail row ────────── */

interface GroupField {
  key: string;
  label: string;
  unit?: string;
  format?: "int" | "dec1" | "pct" | "string";
}

const renderRows = (results: ScanResults, fields: GroupField[]) => {
  const rows = fields
    .map((f) => {
      const raw = (results as unknown as Record<string, unknown>)[f.key];
      if (!isPresent(raw) && typeof raw !== "string") return null;
      let value: string;
      if (f.format === "string" || typeof raw === "string") value = String(raw);
      else if (f.format === "pct") value = fmtPct(Number(raw));
      else if (f.format === "dec1") value = fmt(Number(raw), 1);
      else value = fmt(Number(raw), 0);
      return { key: f.key, label: f.label, value, unit: f.unit };
    })
    .filter(Boolean) as { key: string; label: string; value: string; unit?: string }[];

  if (rows.length === 0) return null;
  return (
    <div>
      {rows.map((r) => (
        <div key={r.key} className="result-row">
          <span className="l">{r.label}</span>
          <span className="v">
            {r.value}
            {r.unit && <span className="u">{r.unit}</span>}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ────────── Main ────────── */

export const ResultsView = ({ results, onRetry }: ResultsViewProps) => {
  const score = useMemo(() => {
    const real = Number(results.wellnessScore);
    if (Number.isFinite(real) && real > 0) return Math.round(real);
    return proxyScore(results);
  }, [results]);

  const belt = useMemo(() => beltFromScore(score), [score]);
  const animatedScore = useCountUp(score);
  const RING_CIRC = 722; // matches reference dasharray
  const ringOffset = RING_CIRC * (1 - animatedScore / 100);

  const [shareOpen, setShareOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  useEffect(() => {
    try {
      setFullName(sessionStorage.getItem("impulso:fullName") ?? "");
    } catch {
      /* ignore */
    }
  }, []);

  // Dispara webhook do Make UMA ÚNICA VEZ ao montar — adicional ao
  // fluxo existente (send-lead → Supabase + Notion + Apollo).
  const webhookFiredRef = useRef(false);
  useEffect(() => {
    if (webhookFiredRef.current) return;
    webhookFiredRef.current = true;

    let email = "";
    let full_name = "";
    let phone = "";
    let company = "";
    try {
      email = sessionStorage.getItem("impulso:email") ?? "";
      full_name = sessionStorage.getItem("impulso:fullName") ?? "";
      phone = sessionStorage.getItem("impulso:phone") ?? "";
      company = sessionStorage.getItem("impulso:company") ?? "";
    } catch {
      /* ignore */
    }

    // Normaliza stressIndex (pode vir 0–1 ou 0–100) e calcula faixa
    const rawStress = results.stressIndex;
    let stress_band: "baixo" | "moderado" | "alto" | "indisponível" = "indisponível";
    if (rawStress != null && Number.isFinite(Number(rawStress))) {
      const s = Number(rawStress);
      const n = s <= 1 ? s * 100 : s;
      stress_band = n < 33 ? "baixo" : n < 66 ? "moderado" : "alto";
    }

    // Normaliza telefone para E.164 BR (+55…); null se inválido (<10 dígitos)
    let phoneE164: string | null = null;
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 10) {
      phoneE164 = digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
    }

    const payload = {
      email,
      full_name,
      phone: phoneE164,
      company,
      wellness_score: isPresent(results.wellnessScore) ? Math.round(Number(results.wellnessScore)) : null,
      heart_rate: isPresent(results.heartRate) ? Math.round(Number(results.heartRate)) : null,
      hrv_sdnn: isPresent(results.hrvSdnn) ? Math.round(Number(results.hrvSdnn)) : null,
      stress_band,
      origem: "facescan",
      viewed_at: new Date().toISOString(),
    };

    fetch("https://hook.us2.make.com/2ygf7o73l2gyf3otaf9jfqlc9rja8it5", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error("[results-view] make webhook failed:", err);
    });
  }, [results]);

  const groups: Array<{ id: string; title: string; fields: GroupField[] }> = [
    {
      id: "cardio",
      title: "Cardiovascular",
      fields: [
        { key: "hrvLnRmssd", label: "Variabilidade Cardíaca", unit: "ms", format: "dec1" },
        { key: "parasympatheticActivity", label: "Recuperação do Sistema Nervoso", unit: "%", format: "pct" },
        { key: "cvOverallRisk", label: "Risco CV global", unit: "%", format: "pct" },
        { key: "coronaryHeartDiseaseRisk", label: "Risco coronariano", unit: "%", format: "pct" },
        { key: "strokeRisk", label: "Risco de AVC", unit: "%", format: "pct" },
        { key: "heartFailureRisk", label: "Insuficiência cardíaca", unit: "%", format: "pct" },
        { key: "peripheralVascularDiseaseRisk", label: "Doença vascular periférica", unit: "%", format: "pct" },
      ],
    },
    {
      id: "age",
      title: "Idade biológica",
      fields: [
        { key: "ageYears", label: "Idade estimada", unit: "anos", format: "int" },
        { key: "vascularAge", label: "Idade vascular", unit: "anos", format: "int" },
      ],
    },
    {
      id: "metabolic",
      title: "Riscos metabólicos",
      fields: [
        { key: "hypertensionRisk", label: "Hipertensão", unit: "%", format: "pct" },
        { key: "diabetesRisk", label: "Diabetes", unit: "%", format: "pct" },
        { key: "nafldRisk", label: "Esteatose hepática (NAFLD)", format: "string" },
      ],
    },
    {
      id: "events",
      title: "Eventos cardiovasculares",
      fields: [
        { key: "coronaryDeathEventRisk", label: "Morte coronariana", unit: "%", format: "pct" },
        { key: "fatalStrokeEventRisk", label: "AVC fatal", unit: "%", format: "pct" },
        { key: "totalCVMortalityRisk", label: "Mortalidade CV total", unit: "%", format: "pct" },
        { key: "hardCVEventRisk", label: "Evento CV grave", unit: "%", format: "pct" },
      ],
    },
    {
      id: "scores",
      title: "Scores de risco (SCORE2 / Framingham)",
      fields: [
        { key: "ageScore", label: "Score idade", format: "int" },
        { key: "sbpScore", label: "Score pressão sistólica", format: "int" },
        { key: "smokingScore", label: "Score tabagismo", format: "int" },
        { key: "diabetesScore", label: "Score diabetes", format: "int" },
        { key: "bmiScore", label: "Score IMC", format: "int" },
        { key: "cholesterolScore", label: "Score colesterol total", format: "int" },
        { key: "cholesterolHdlScore", label: "Score HDL", format: "int" },
        { key: "totalScore", label: "Score total", format: "int" },
      ],
    },
    {
      id: "signal",
      title: "Sinal",
      fields: [{ key: "signalQuality", label: "Qualidade do sinal", unit: "%", format: "pct" }],
    },
  ];

  return (
    <div className="px-5 py-12 lg:px-10 lg:py-16">
      <div className="result-inner">
        {/* ── 1. HERO ── */}
        <span className="tag">Seu score de saúde · agora</span>
        <h1>
          Você está na<span className="it">…</span>{" "}
          <span
            className="hl"
            style={{
              color: belt.color,
              ...(belt.goldBorder
                ? {
                    WebkitTextStroke: "0.5px #D4AF37",
                    textShadow: "0 0 18px rgba(212,175,55,0.35)",
                  }
                : {}),
            }}
          >
            {belt.name}.
          </span>
        </h1>

        <div className="score-showcase">
          <div
            className="score-ring-big"
            style={belt.goldBorder ? { filter: "drop-shadow(0 0 24px rgba(212,175,55,0.35))" } : undefined}
          >
            <svg viewBox="0 0 260 260">
              <circle className="t" cx="130" cy="130" r="115" />
              <circle
                className="f"
                cx="130"
                cy="130"
                r="115"
                style={{ strokeDashoffset: ringOffset, stroke: belt.ringStroke }}
              />
            </svg>
            <div className="center">
              <span className="n">{Math.round(animatedScore)}</span>
              <span className="lbl">Impulso+ Score</span>
            </div>
          </div>
        </div>

        {/* ── 2. METRIC GRID (.rm cards) ── */}
        <div className="result-grid">
          {isPresent(results.heartRate) && (
            <div className="rm">
              <div className="rm-head">
                <span className="l">Batimento</span>
              </div>
              <div className="v">
                {fmt(results.heartRate)}
                <span className="u">bpm</span>
              </div>
            </div>
          )}
          {isPresent(results.hrvSdnn) && (
            <div className="rm">
              <div className="rm-head">
                <span className="l">HRV (SDNN)</span>
              </div>
              <div className="v">
                {fmt(results.hrvSdnn)}
                <span className="u">ms</span>
              </div>
            </div>
          )}
          {isPresent(results.stressIndex) && (
            <div className="rm">
              <div className="rm-head">
                <span className="l">Estresse</span>
              </div>
              <div className="v">{fmtPct(results.stressIndex)}</div>
            </div>
          )}
          {isPresent(results.breathingRate) && (
            <div className="rm">
              <div className="rm-head">
                <span className="l">Respiração</span>
              </div>
              <div className="v">
                {fmt(results.breathingRate)}
                <span className="u">rpm</span>
              </div>
            </div>
          )}
          {isPresent(results.systolic) && isPresent(results.diastolic) && (
            <div className="rm">
              <div className="rm-head">
                <span className="l">Pressão arterial</span>
              </div>
              <div className="v">
                {fmt(results.systolic)}/{fmt(results.diastolic)}
                <span className="u">mmHg</span>
              </div>
            </div>
          )}
        </div>

        {/* ── 2.5 SCORE COMPLETO · COMPLEMENTARES ── */}
        <section
          aria-label="Composição do Score de Saúde Metabólica"
          style={{ maxWidth: 880, margin: "8px auto 40px", padding: "0 4px" }}
        >
          {/* Barra de progresso */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 10,
                borderRadius: 999,
                background: "transparent",
                border: "1px dashed rgba(255,255,255,0.14)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "13%",
                  height: "100%",
                  background: "var(--cyan)",
                  borderRadius: 999,
                  boxShadow: "0 0 12px rgba(2,148,232,0.5)",
                }}
              />
            </div>
            <p
              style={{
                marginTop: 12,
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--muted)",
                textAlign: "center",
              }}
            >
              Este scan representa{" "}
              <span style={{ color: "var(--cyan)", fontWeight: 600 }}>13%</span>{" "}
              do seu Score de Saúde Metabólica
            </p>
            <p
              style={{
                marginTop: 6,
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--muted)",
                textAlign: "center",
                opacity: 0.75,
              }}
            >
              Score proprietário · desenvolvido em parceria com especialistas médicos
            </p>
          </div>

          {/* Título */}
          <h3
            style={{
              fontFamily: "var(--serif)",
              fontWeight: 400,
              fontSize: "clamp(28px, 4vw, 40px)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              textAlign: "center",
              color: "var(--ink)",
              margin: "0 0 24px",
            }}
          >
            E os outros{" "}
            <span style={{ color: "var(--cyan)", fontStyle: "italic" }}>87%</span>?
          </h3>

          {/* Grid 2 colunas com complementares */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 18,
              marginBottom: 28,
            }}
          >
            <div className="rm">
              <div className="rm-head">
                <span className="l">🔬 Exame de Sangue</span>
              </div>
              <div className="v" style={{ fontSize: 18 }}>
                Biomarcadores
                <span className="u">completos</span>
              </div>
            </div>
            <div className="rm">
              <div className="rm-head">
                <span className="l">⌚ Impulso Band 24/7</span>
              </div>
              <div className="v" style={{ fontSize: 18 }}>
                Monitoramento
                <span className="u">contínuo</span>
              </div>
            </div>
          </div>

          {/* Frase de destaque */}
          <div
            style={{
              border: "1px solid var(--cyan-border)",
              background: "var(--cyan-soft)",
              borderRadius: 14,
              padding: "20px 24px",
              textAlign: "center",
              fontFamily: "var(--serif)",
              fontSize: "clamp(16px, 2.2vw, 20px)",
              lineHeight: 1.5,
              color: "var(--ink)",
              fontStyle: "italic",
              boxShadow: "0 0 24px rgba(2,148,232,0.08) inset",
            }}
          >
            Se em 30 segundos com a câmera do seu celular chegamos até aqui,
            imagine o que podemos fazer com os{" "}
            <span style={{ color: "var(--cyan)", fontStyle: "normal", fontWeight: 500 }}>
              87% restantes
            </span>
            .
          </div>
        </section>

        {/* ── 2.6 INDIVIDUAL → CORPORATIVO ── */}
        <section
          aria-label="Score individual versus equipe"
          style={{ maxWidth: 880, margin: "8px auto 40px", padding: "0 4px" }}
        >
          <h3
            style={{
              fontFamily: "var(--serif)",
              fontWeight: 400,
              fontSize: "clamp(28px, 4vw, 40px)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              textAlign: "center",
              color: "var(--ink)",
              margin: "0 0 10px",
            }}
          >
            Seu score é{" "}
            <span style={{ color: "var(--cyan)", fontWeight: 500 }}>{score}</span>.{" "}
            <span style={{ color: "var(--cyan)", fontStyle: "italic" }}>
              E o da sua equipe?
            </span>
          </h3>

          <p
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--muted)",
              textAlign: "center",
              margin: "0 0 22px",
            }}
          >
            Score individual · 1 pessoa · 30 segundos
          </p>

          <p
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(15px, 1.8vw, 17px)",
              lineHeight: 1.6,
              color: "var(--muted)",
              textAlign: "center",
              maxWidth: 680,
              margin: "0 auto 28px",
            }}
          >
            Empresas perdem em média{" "}
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>38% da folha</span>{" "}
            com produtividade invisível — colaboradores presentes, mas operando muito
            abaixo do potencial. O Impulso+ transforma esse custo oculto em performance
            mensurável.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <div className="rm">
              <div className="rm-head">
                <span className="l">Folha perdida</span>
              </div>
              <div className="v">
                38<span className="u">%</span>
              </div>
            </div>
            <div className="rm">
              <div className="rm-head">
                <span className="l">Capacidade real</span>
              </div>
              <div className="v">
                62<span className="u">%</span>
              </div>
            </div>
            <div className="rm">
              <div className="rm-head">
                <span className="l">Monitoramento</span>
              </div>
              <div className="v">
                24/7<span className="u">equipe</span>
              </div>
            </div>
          </div>

          <div
            style={{
              border: "1px solid var(--cyan-border)",
              background: "var(--cyan-soft)",
              borderRadius: 14,
              padding: "24px 24px 26px",
              textAlign: "center",
              boxShadow: "0 0 24px rgba(2,148,232,0.08) inset",
            }}
          >
            <p
              style={{
                fontFamily: "var(--serif)",
                fontSize: "clamp(16px, 2.2vw, 20px)",
                lineHeight: 1.5,
                color: "var(--ink)",
                fontStyle: "italic",
                margin: "0 0 18px",
              }}
            >
              Descubra o{" "}
              <span style={{ color: "var(--cyan)", fontStyle: "normal", fontWeight: 500 }}>
                Score de Saúde Metabólica
              </span>{" "}
              da sua empresa inteira.
            </p>
            <a
              href="https://impulsomais.net"
              target="_blank"
              rel="noopener noreferrer"
              className="primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
              }}
            >
              Calcular impacto na minha empresa →
            </a>
          </div>
        </section>

        {/* ── 3. AÇÕES ── */}
        <div className="result-actions">
          <button
            type="button"
            className="primary"
            onClick={() => {
              const el = document.getElementById("result-details");
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Ver análise completa
          </button>
          <button type="button" className="ghost" onClick={onRetry}>
            Fazer novo scan
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => setShareOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <span aria-hidden>↑</span> Compartilhar resultado
          </button>
        </div>

        <p
          className="mt-6 text-center"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--muted-2, var(--muted))",
          }}
        >
          Dados processados localmente · nenhum vídeo foi armazenado
        </p>

        {/* ── 4. ANÁLISE COMPLETA ── */}
        <section id="result-details" className="result-details">
          <h2>
            Análise <span className="hl">completa.</span>
          </h2>
          {groups.map((g) => {
            const block = renderRows(results, g.fields);
            if (!block) return null;
            return (
              <div key={g.id} style={{ marginBottom: 36 }}>
                <h3
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--cyan)",
                    margin: "0 0 12px",
                  }}
                >
                  {g.title}
                </h3>
                {block}
              </div>
            );
          })}
        </section>
      </div>

      <ShareCard
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        score={score}
        belt={belt}
        fullName={fullName}
      />
    </div>
  );
};
