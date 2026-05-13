import { useEffect, useRef, type MutableRefObject } from "react";

interface Heartbeat {
  /** segundos relativos ao início do scan */
  t: number;
  /** duração do batimento em ms */
  durationMs: number;
}

interface PpgWaveformProps {
  /** Buffer PPG bruto (preferencial). Atualizado em ~30Hz pelo SDK. */
  bufferRef: MutableRefObject<number[]>;
  /** Heartbeats reais detectados — usado como fallback se buffer estiver vazio. */
  heartbeatsRef?: MutableRefObject<Heartbeat[]>;
  /** Status do scan — para resetar t0 quando inicia. */
  active?: boolean;
  width?: number;
  height?: number;
  color?: string;
  /** Quantas amostras visíveis na janela (controla "velocidade" do scroll). */
  windowSize?: number;
}

/**
 * Pulso PQRST sintético — função analítica que imita um batimento de ECG
 * (P bump, complexo QRS afiado, T bump). `phase` vai de 0 a 1 (0 = início
 * do batimento, 1 = fim).
 */
function ecgPulse(phase: number): number {
  if (phase < 0 || phase > 1) return 0;
  const p = Math.exp(-Math.pow((phase - 0.18) / 0.04, 2)) * 0.18; // P
  const q = -Math.exp(-Math.pow((phase - 0.32) / 0.012, 2)) * 0.25; // Q
  const r = Math.exp(-Math.pow((phase - 0.36) / 0.012, 2)) * 1.0; // R (spike)
  const s = -Math.exp(-Math.pow((phase - 0.40) / 0.014, 2)) * 0.35; // S
  const t = Math.exp(-Math.pow((phase - 0.62) / 0.06, 2)) * 0.28; // T
  return p + q + r + s + t;
}

/**
 * PpgWaveform — renderiza o sinal cardíaco real durante o scan.
 *
 * Estratégia híbrida:
 * 1) Se houver buffer PPG real (getFullPpgSignal), renderiza ele direto.
 * 2) Senão, usa os heartbeats reais detectados pelo SDK
 *    (getRealtimeHeartbeats) e sintetiza um traçado ECG cujos picos R caem
 *    exatamente nos timestamps dos batimentos detectados pela câmera.
 *
 * Em ambos os casos o ritmo é o ritmo REAL do usuário — só muda se mostramos
 * a forma de onda PPG bruta ou um ECG estilizado disparado pelos batimentos.
 */
export const PpgWaveform = ({
  bufferRef,
  heartbeatsRef,
  active = true,
  width = 300,
  height = 52,
  color = "#38BDF8",
  windowSize = 240,
}: PpgWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<number>(performance.now());

  // Reset start time quando ativa
  useEffect(() => {
    if (active) startTimeRef.current = performance.now();
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    let raf = 0;
    let lastDraw = 0;
    const FPS = 30;
    const frameInterval = 1000 / FPS;

    // Window in seconds for the ECG-synthetic mode (rolls right→left)
    const VIEW_SECONDS = 5;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - lastDraw < frameInterval) return;
      lastDraw = now;

      ctx.clearRect(0, 0, width, height);

      // Linha base sutil
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      const padY = height * 0.15;
      const usableH = height - padY * 2;

      // Pontos a desenhar — array de {x, y}
      const pts: Array<[number, number]> = [];

      const buf = bufferRef.current;
      const beats = heartbeatsRef?.current ?? [];
      const havePpg = buf && buf.length >= 8;

      if (havePpg) {
        // ── MODO PPG REAL ──
        const visible = buf.slice(-windowSize);
        let min = Infinity, max = -Infinity;
        for (const v of visible) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
        const range = max - min || 1;
        for (let i = 0; i < visible.length; i++) {
          const x = (i / (visible.length - 1)) * width;
          const norm = (visible[i] - min) / range;
          const y = padY + (1 - norm) * usableH;
          pts.push([x, y]);
        }
      } else if (beats.length > 0) {
        // ── MODO ECG SINTÉTICO disparado por heartbeats reais ──
        // Tempo "agora" relativo ao início do scan, em segundos
        const elapsedSec = (now - startTimeRef.current) / 1000;
        // Janela: [elapsedSec - VIEW_SECONDS, elapsedSec]
        const t0 = elapsedSec - VIEW_SECONDS;

        // Filtra batimentos visíveis na janela (com margem pra renderizar a cauda)
        const visibleBeats = beats.filter(
          (b) => b.t >= t0 - 1 && b.t <= elapsedSec + 0.5,
        );

        // Densidade: 2 amostras por px
        const samples = width * 2;
        for (let i = 0; i < samples; i++) {
          const x = (i / (samples - 1)) * width;
          const tSec = t0 + (x / width) * VIEW_SECONDS;
          // Soma contribuição de cada batimento próximo
          let v = 0;
          for (const b of visibleBeats) {
            const dt = tSec - b.t; // segundos desde o início do batimento
            const dur = Math.max(0.4, b.durationMs / 1000);
            const phase = dt / dur;
            if (phase >= 0 && phase <= 1) {
              v += ecgPulse(phase);
            }
          }
          // Pequena oscilação base para parecer "vivo" mesmo entre picos
          v += Math.sin(tSec * 1.1) * 0.015;
          // Mapeia v (~ -0.4..1) para y
          const norm = Math.max(-0.4, Math.min(1.1, v));
          const y = padY + ((1.1 - norm) / 1.5) * usableH;
          pts.push([x, y]);
        }
      } else {
        // ── MODO IDLE ── animação suave de "procurando sinal"
        const elapsedSec = (now - startTimeRef.current) / 1000;
        const samples = width;
        for (let i = 0; i < samples; i++) {
          const x = (i / (samples - 1)) * width;
          const v = Math.sin((x / width) * Math.PI * 4 - elapsedSec * 2) * 0.06;
          const y = height / 2 + v * usableH;
          pts.push([x, y]);
        }
      }

      if (pts.length < 2) return;

      // Glow + linha nítida (efeito phosphor de osciloscópio)
      const drawTrace = (lineWidth: number, alpha: number, blur: number) => {
        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const [x, y] = pts[i];
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      };

      drawTrace(3, 0.32, 8);
      drawTrace(1.4, 1, 0);

      // Cabeça pulsante na ponta direita
      const [lx, ly] = pts[pts.length - 1];
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(lx - 1, ly, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [bufferRef, heartbeatsRef, width, height, color, windowSize]);

  return <canvas ref={canvasRef} className="ppg-waveform-canvas" aria-hidden />;
};
