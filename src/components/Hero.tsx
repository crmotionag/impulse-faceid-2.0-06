import { useEffect, useRef, useState } from "react";

interface HeroProps {
  onStart: () => void;
}

/**
 * Hero — A2 Clean Premium.
 * Markup copiado LITERALMENTE das linhas 837-944 de
 * src/design-reference/A2-clean-premium.html (HTML → JSX).
 * Loops animados copiados das linhas 31-61 de src/design-reference/A2-scan.js.
 */
export const Hero = ({ onStart }: HeroProps) => {
  const [bpm, setBpm] = useState(72);
  const [stress, setStress] = useState(34);
  const [score, setScore] = useState(84);
  const [tc, setTc] = useState("00:00:12.480 · ROI 92%");
  const tRef = useRef(0);
  const msRef = useRef(12480);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // Hero readouts loop
    const a = window.setInterval(() => {
      tRef.current += 1;
      const t = tRef.current;
      setBpm(70 + Math.round(Math.sin(t / 5) * 3 + Math.random() * 2));
      setStress(30 + Math.round(Math.sin(t / 7) * 4 + Math.random() * 2));
      setScore(82 + Math.round(Math.sin(t / 9) * 3));
    }, 1200);

    // Timecode loop
    const b = window.setInterval(() => {
      msRef.current += 90;
      const total = msRef.current;
      const m = String(Math.floor(total / 60000)).padStart(2, "0");
      const s = String(Math.floor((total % 60000) / 1000)).padStart(2, "0");
      const mss = String(total % 1000).padStart(3, "0");
      const roi = 88 + Math.round(Math.sin(total / 800) * 5 + Math.random() * 2);
      setTc(`00:${m}:${s}.${mss} · ROI ${roi}%`);
    }, 90);

    return () => {
      window.clearInterval(a);
      window.clearInterval(b);
    };
  }, []);

  return (
    <section className="hero">
      <div className="hero-left">
        
        <h1 className="hero-h1">
          Seus sinais vitais.
          <span className="br">
            <span className="it">Sem tocar em</span> <span className="hl">você.</span>
          </span>
        </h1>
        <p className="hero-sub">
          FaceScan mede <b>frequência cardíaca, HRV, estresse e mais</b> direto
          da câmera do seu celular. Sem relógio. Sem sensor. Sem logística. Em
          sessenta segundos.
        </p>
        <div className="hero-cta-wrap">
          <button className="cta-big" onClick={onStart} type="button">
            Fazer Scan agora
            <span className="icon">
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
          <div className="cta-meta">
            <b>60s</b> <span className="dot" /> no navegador <span className="dot" /> sem cadastro
          </div>
        </div>
      </div>

      {/* Foto + overlay assimétrico */}
      <div className="hero-right">
        <div className="photo-stage">
          <img
            src="/shared/facescan-heatmap.png"
            alt="FaceScan em andamento — mapa térmico facial"
            loading="eager"
          />

          {/* Status + timecode */}
          <div className="status-chip">
            <span className="dot" />
            Detectando · Rosto
          </div>
          <div className="timecode" id="timecode">
            {tc}
          </div>

          {/* Corner brackets */}
          <div className="bracket b1" />
          <div className="bracket b2" />
          <div className="bracket b3" />
          <div className="bracket b4" />
          <div className="bracket b5" />

          {/* Crosshair */}
          <div className="crosshair" />

          {/* Keypoints */}
          <div className="keypoint kp1" />
          <div className="keypoint kp2" />
          <div className="keypoint kp3" />
          <div className="keypoint kp4" />
          <div className="keypoint kp5" />
          <div className="keypoint kp6" />

          {/* Scan sweep */}
          <div className="scan-sweep" />

          {/* Data stream */}
          <div className="data-stream">
            0x7A · rPPG 52ms · G-CHAN · ROI STABLE · HR±0.8bpm
          </div>
        </div>

        {/* Readouts assimétricos */}
        <div className="readout r1">
          <div className="ring">
            <svg viewBox="0 0 30 30">
              <circle className="t" cx="15" cy="15" r="13" />
              <circle className="f" cx="15" cy="15" r="13" />
            </svg>
          </div>
          <div>
            <span className="l">Freq. Cardíaca</span>
            <span className="v" id="h-bpm">
              {bpm}
              <span className="u">bpm</span>
            </span>
          </div>
        </div>

        <div className="readout r2">
          <div>
            <span className="l">Estresse</span>
            <span className="v">
              <span id="h-stress">{stress}</span>
              <span className="u">%</span>
            </span>
          </div>
        </div>

        <div className="readout r3">
          <div>
            <span className="l">Score</span>
            <span className="v" id="h-score">
              {score}
            </span>
          </div>
        </div>

        {/* ECG */}
        <div className="ecg-float">
          <svg viewBox="0 0 800 64" preserveAspectRatio="none">
            <path d="M0 32 L60 32 L68 32 L72 14 L76 50 L80 6 L84 58 L88 32 L120 32 L160 32 L168 32 L172 18 L176 46 L180 10 L184 54 L188 32 L200 32 L240 32 L248 32 L252 14 L256 50 L260 8 L264 56 L268 32 L280 32 L320 32 L400 32 L460 32 L468 32 L472 14 L476 50 L480 6 L484 58 L488 32 L520 32 L560 32 L568 32 L572 18 L576 46 L580 10 L584 54 L588 32 L600 32 L640 32 L648 32 L652 14 L656 50 L660 8 L664 56 L668 32 L680 32 L800 32" />
          </svg>
        </div>
      </div>

      {/* Stats */}
      <div className="hero-stats">
        <div className="hstat">
          <div className="v">
            60<span className="it">s</span>
          </div>
          <div className="l">Duração do scan</div>
        </div>
        <div className="hstat">
          <div className="v">6</div>
          <div className="l">Sinais vitais captados</div>
        </div>
        <div className="hstat">
          <div className="v">0</div>
          <div className="l">Hardware por pessoa</div>
        </div>
        <div className="hstat">
          <div className="v">
            <span className="it">&gt;</span>
            <span className="hl">95%</span>
          </div>
          <div className="l">Precisão clínica (rPPG)</div>
        </div>
      </div>
    </section>
  );
};
