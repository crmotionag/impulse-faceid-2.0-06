import type { CSSProperties } from "react";

/**
 * Metrics — A2 Clean Premium.
 * Markup copiado das linhas 990-1063 de src/design-reference/A2-clean-premium.html.
 */
export const Metrics = () => {
  return (
    <section className="block" id="metricas">
      <div className="sec-head">
        <span className="sec-tag">O que medimos</span>
        <h2 className="sec-h2">
          Seis sinais. <span className="it">De grau</span>{" "}
          <span className="hl">clínico.</span>
        </h2>
        <p className="sec-sub">
          Todos extraídos simultaneamente a partir de micro-variações na sua
          pele — os mesmos sinais que um hospital mede, sem encostar em você.
        </p>
      </div>
      <div className="metrics-grid">
        <div className="metric-tile" style={{ "--fw": "72%" } as CSSProperties}>
          <div className="hd">
            <div className="ico">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <span className="label">bpm</span>
          </div>
          <h4>Frequência cardíaca</h4>
          <p>Seu batimento em tempo real, sem tocar em nada.</p>
          <div className="val">
            <span className="num">72</span>
            <span className="u">bpm</span>
          </div>
          <div className="bar-wrap">
            <div className="f" />
          </div>
        </div>

        <div className="metric-tile" style={{ "--fw": "60%" } as CSSProperties}>
          <div className="hd">
            <div className="ico">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className="label">ms · rmssd</span>
          </div>
          <h4>HRV</h4>
          <p>
            A variabilidade entre batimentos — o indicador mais honesto de
            recuperação.
          </p>
          <div className="val">
            <span className="num">48</span>
            <span className="u">ms</span>
          </div>
          <div className="bar-wrap">
            <div className="f" />
          </div>
        </div>

        <div className="metric-tile" style={{ "--fw": "34%" } as CSSProperties}>
          <div className="hd">
            <div className="ico">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2 L4 14 L12 14 L10 22 L20 10 L12 10 Z" />
              </svg>
            </div>
            <span className="label">%</span>
          </div>
          <h4>Nível de estresse</h4>
          <p>
            Derivado do HRV e da frequência respiratória. Objetivo, não
            perguntado.
          </p>
          <div className="val">
            <span className="num">34</span>
            <span className="u">%</span>
          </div>
          <div className="bar-wrap">
            <div className="f" />
          </div>
        </div>



        <div className="metric-tile" style={{ "--fw": "65%" } as CSSProperties}>
          <div className="hd">
            <div className="ico">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6 L12 12 L16 14" />
              </svg>
            </div>
            <span className="label">mmHg</span>
          </div>
          <h4>Pressão arterial</h4>
          <p>
            Estimativa não-invasiva a partir do padrão de pulsação facial.
          </p>
          <div className="val">
            <span className="num">118/76</span>
          </div>
          <div className="bar-wrap">
            <div className="f" />
          </div>
        </div>

      </div>
    </section>
  );
};
