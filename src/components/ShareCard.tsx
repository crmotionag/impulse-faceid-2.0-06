import { useEffect, useMemo, useRef, useState } from "react";
import { toBlob } from "html-to-image";

export interface BeltInfo {
  name: string;
  color: string;
  ringStroke: string;
  goldBorder?: boolean;
}

interface ShareCardProps {
  open: boolean;
  onClose: () => void;
  score: number;
  belt: BeltInfo;
  fullName: string;
}

const BELT_THRESHOLDS: Array<{ min: number; name: string }> = [
  { min: 0, name: "Faixa Branca" },
  { min: 30, name: "Faixa Azul" },
  { min: 50, name: "Faixa Roxa" },
  { min: 70, name: "Faixa Marrom" },
  { min: 85, name: "Faixa Preta" },
];

const QUOTES: Record<string, string> = {
  "Faixa Branca": "Toda jornada começa com um primeiro passo.",
  "Faixa Azul": "Consistência constrói campeões.",
  "Faixa Roxa": "Disciplina é liberdade.",
  "Faixa Marrom": "Excelência é um hábito, não um ato.",
  "Faixa Preta": "O corpo obedece quem persiste.",
};

const truncate = (s: string, n = 24) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

const formatDate = (d: Date) => {
  const months = [
    "janeiro","fevereiro","março","abril","maio","junho",
    "julho","agosto","setembro","outubro","novembro","dezembro",
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} de ${month} · ${hh}h${mm}`;
};

const beltProgress = (score: number) => {
  const idx = [...BELT_THRESHOLDS].reverse().findIndex((b) => score >= b.min);
  const currentIdx = BELT_THRESHOLDS.length - 1 - idx;
  const current = BELT_THRESHOLDS[currentIdx];
  const next = BELT_THRESHOLDS[currentIdx + 1];
  if (!next) return { progress: 1, nextLabel: null as string | null, missing: 0 };
  const span = next.min - current.min;
  const into = score - current.min;
  return {
    progress: Math.max(0, Math.min(1, into / span)),
    nextLabel: next.name,
    missing: Math.max(0, next.min - score),
  };
};

/**
 * The card layout uses CSS variable `--u` as a unit. A "designed" card is
 * built on a 360-unit-wide canvas (mobile-first). Preview sets --u so the
 * card fills the viewport. Export sets --u so the card renders at 1080px wide.
 * Same layout, two sizes — no transform: scale needed.
 */
const Card = ({
  innerRef,
  unit,
  score,
  belt,
  displayName,
  date,
  glowColor,
  beltBarColor,
  progress,
  nextLabel,
  missing,
  quote,
}: {
  innerRef?: React.Ref<HTMLDivElement>;
  unit: number; // px per "u"
  score: number;
  belt: BeltInfo;
  displayName: string;
  date: string;
  glowColor: string;
  beltBarColor: string;
  progress: number;
  nextLabel: string | null;
  missing: number;
  quote: string;
}) => {
  // base 360u wide, 640u tall (9:16). All sizes below in "u".
  const W = 360;
  const H = 640;

  // ring geometry (in u)
  const ringSize = 200;
  const stroke = 7;
  const r = (ringSize - stroke) / 2;
  const cx = ringSize / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);

  const u = (n: number) => `${n * unit}px`;

  return (
    <div
      ref={innerRef}
      style={{
        width: u(W),
        height: u(H),
        position: "relative",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#fff",
        background: "linear-gradient(180deg, #0a0e1a 0%, #0d1220 100%)",
        overflow: "hidden",
        padding: `${u(28)} ${u(26)}`,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* noise overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          pointerEvents: "none",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* Logo */}
      <div
        style={{
          alignSelf: "flex-start",
          fontSize: u(13),
          fontWeight: 700,
          letterSpacing: "0.02em",
          lineHeight: 1,
        }}
      >
        Impulso<span style={{ color: belt.ringStroke }}>+</span>
      </div>

      {/* Name + date */}
      <div style={{ marginTop: u(22), textAlign: "center", width: "100%" }}>
        <div
          style={{
            fontSize: u(24),
            fontWeight: 700,
            lineHeight: 1.15,
            wordBreak: "break-word",
          }}
        >
          {displayName}
        </div>
        <div
          style={{
            marginTop: u(6),
            fontSize: u(11),
            color: "#64748b",
            fontWeight: 400,
            lineHeight: 1.2,
          }}
        >
          {date}
        </div>
      </div>

      {/* Score ring */}
      <div
        style={{
          marginTop: u(28),
          position: "relative",
          width: u(ringSize),
          height: u(ringSize),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: u(14),
            borderRadius: "50%",
            boxShadow: `0 0 ${u(22)} ${glowColor}33`,
            pointerEvents: "none",
          }}
        />
        <svg
          width={u(ringSize)}
          height={u(ringSize)}
          viewBox={`0 0 ${ringSize} ${ringSize}`}
          style={{ position: "absolute", inset: 0 }}
        >
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={belt.ringStroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cx})`}
            style={
              belt.goldBorder
                ? { filter: "drop-shadow(0 0 6px rgba(212,175,55,0.6))" }
                : undefined
            }
          />
        </svg>
        <div style={{ textAlign: "center", position: "relative", lineHeight: 1 }}>
          <div
            style={{
              fontSize: u(64),
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {Math.round(score)}
          </div>
          <div
            style={{
              marginTop: u(6),
              fontSize: u(9),
              color: "#64748b",
              fontWeight: 400,
              letterSpacing: "0.2em",
              lineHeight: 1.2,
            }}
          >
            IMPULSO+ SCORE
          </div>
        </div>
      </div>

      {/* Belt section */}
      <div style={{ marginTop: u(26), width: "60%", textAlign: "center" }}>
        <div
          style={{
            height: u(4),
            background: "#1e293b",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: "100%",
              background: beltBarColor,
              boxShadow: belt.goldBorder ? `0 0 ${u(8)} rgba(212,175,55,0.5)` : undefined,
            }}
          />
        </div>
        <div
          style={{
            marginTop: u(14),
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: u(22),
            lineHeight: 1.1,
            color: belt.color === "#F4F1EA" ? "#F4F1EA" : belt.color,
            textShadow: belt.goldBorder ? `0 0 ${u(10)} rgba(212,175,55,0.5)` : undefined,
          }}
        >
          {belt.name}
        </div>
        {nextLabel && (
          <div
            style={{
              marginTop: u(6),
              fontSize: u(11),
              color: "#94a3b8",
              fontWeight: 400,
              lineHeight: 1.3,
            }}
          >
            Próxima: {nextLabel} · Faltam {missing} ponto{missing === 1 ? "" : "s"}
          </div>
        )}
      </div>

      {/* Quote */}
      <div
        style={{
          marginTop: u(28),
          fontSize: u(14),
          fontStyle: "italic",
          fontWeight: 300,
          color: "#cbd5e1",
          textAlign: "center",
          maxWidth: u(280),
          lineHeight: 1.4,
        }}
      >
        "{quote}"
      </div>

      {/* Bottom */}
      <div style={{ marginTop: "auto", width: "100%", textAlign: "center" }}>
        <div
          style={{
            height: 1,
            width: "100%",
            background: belt.ringStroke,
            opacity: 0.4,
            marginBottom: u(14),
          }}
        />
        <div style={{ fontSize: u(10), color: "#64748b", fontWeight: 400, lineHeight: 1.2 }}>
          Faça o seu scan:
        </div>
        <div
          style={{
            marginTop: u(4),
            fontSize: u(12),
            fontWeight: 600,
            color: "#fff",
            lineHeight: 1.2,
          }}
        >
          face-scan.impulsomais.app
        </div>
      </div>
    </div>
  );
};

export const ShareCard = ({ open, onClose, score, belt, fullName }: ShareCardProps) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const now = useMemo(() => new Date(), [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const displayName = truncate(fullName?.trim() || "Atleta");
  const { progress, nextLabel, missing } = beltProgress(score);
  const quote = QUOTES[belt.name] ?? "";
  const date = formatDate(now);
  const glowColor = belt.goldBorder ? "#D4AF37" : belt.ringStroke;
  const beltBarColor = belt.color === "#F4F1EA" ? "#F4F1EA" : belt.color;

  // Preview unit: fit card to viewport. Card design width = 360u.
  // Use min(viewport width minus padding, viewport height * 9/16) / 360.
  const [previewUnit, setPreviewUnit] = useState(1);
  useEffect(() => {
    if (!open) return;
    const compute = () => {
      const vw = Math.min(window.innerWidth, 480) - 32; // page padding
      const vh = window.innerHeight - 200; // leave room for buttons
      const byW = vw / 360;
      const byH = vh / 640;
      setPreviewUnit(Math.max(0.5, Math.min(byW, byH)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [open]);

  // Export unit: 1080 / 360 = 3 px per u.
  const EXPORT_UNIT = 3;

  useEffect(() => {
    if (!open) setStatus(null);
  }, [open]);

  const handleShare = async () => {
    if (!exportRef.current || busy) return;
    setBusy(true);
    setStatus("Gerando seu card...");
    try {
      await new Promise((r) => setTimeout(r, 1500));
      const blob = await toBlob(exportRef.current, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: "#0a0e1a",
        // Skip pulling external stylesheets — we only use inline styles
        skipFonts: false,
        filter: (node) => {
          // ignore <style> tags from the page that may contain unsupported CSS
          if (node instanceof HTMLStyleElement) return false;
          if (node instanceof HTMLLinkElement && node.rel === "stylesheet") return false;
          return true;
        },
      });
      if (!blob) throw new Error("blob failed");
      const safeName = displayName.replace(/\s+/g, "-").toLowerCase();
      const fileName = `impulso-score-${safeName}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Meu Impulso+ Score" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
      setStatus(null);
    } catch (e) {
      console.error("[share-card] failed", e);
      setStatus("Falha ao gerar card. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "16px 16px 24px",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
      onClick={onClose}
    >
      {/* Preview — mobile-first, fits viewport */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          marginTop: 8,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          flexShrink: 0,
        }}
      >
        <Card
          unit={previewUnit}
          score={score}
          belt={belt}
          displayName={displayName}
          date={date}
          glowColor={glowColor}
          beltBarColor={beltBarColor}
          progress={progress}
          nextLabel={nextLabel}
          missing={missing}
          quote={quote}
        />
      </div>

      {/* Controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          marginTop: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          paddingBottom: 12,
        }}
      >
        {status && (
          <div
            style={{
              color: "#cbd5e1",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {busy && (
              <span
                style={{
                  width: 12,
                  height: 12,
                  border: "2px solid #cbd5e1",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            )}
            {status}
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={handleShare}
            disabled={busy}
            style={{
              background: "#fff",
              color: "#0a0e1a",
              border: "none",
              padding: "12px 20px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 600,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            Baixar / Compartilhar
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              padding: "12px 20px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Off-screen export card at 1080×1920 */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: 1080,
          height: 1920,
          opacity: 0,
          visibility: "hidden",
          pointerEvents: "none",
          zIndex: -1,
          overflow: "hidden",
        }}
      >
        <Card
          innerRef={exportRef}
          unit={EXPORT_UNIT}
          score={score}
          belt={belt}
          displayName={displayName}
          date={date}
          glowColor={glowColor}
          beltBarColor={beltBarColor}
          progress={progress}
          nextLabel={nextLabel}
          missing={missing}
          quote={quote}
        />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
