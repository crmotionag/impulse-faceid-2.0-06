/**
 * HowItWorks — A2 Clean Premium.
 * Markup copiado das linhas 947-987 de src/design-reference/A2-clean-premium.html.
 */
export const HowItWorks = () => {
  return (
    <section className="block" id="como-funciona">
      <div className="sec-head">
        <span className="sec-tag">Como funciona</span>
        <h2 className="sec-h2">
          Três passos. <span className="it">Sessenta</span>{" "}
          <span className="hl">segundos.</span>
        </h2>
        <p className="sec-sub">
          Tudo acontece no navegador do seu dispositivo. Nenhum vídeo sai do seu
          celular — só os sinais processados.
        </p>
      </div>
      <div className="steps">
        <div className="step">
          <span className="n">01</span>
          <div className="anim-slot anim-1">
            <div className="face-brackets" />
            <div className="face-dot" />
            <div className="face-dot d2" />
            <div className="face-dot d3" />
          </div>
          <h3>Aponte a câmera.</h3>
          <p>
            O FaceScan detecta seu rosto em segundos e trava o foco. Basta ficar
            parado, olhando pra tela.
          </p>
        </div>
        <div className="step">
          <span className="n">02</span>
          <div className="anim-slot anim-2">
            <svg viewBox="0 0 200 60" preserveAspectRatio="none">
              <path d="M0 30 L40 30 L48 30 L52 10 L56 50 L60 4 L64 56 L68 30 L100 30 L140 30 L148 30 L152 12 L156 48 L160 8 L164 52 L168 30 L200 30" />
            </svg>
          </div>
          <h3>O algoritmo escuta.</h3>
          <p>
            A fotopletismografia remota (rPPG) detecta variações
            sub-perceptíveis de cor da pele — o batimento do seu coração fica
            visível.
          </p>
        </div>
        <div className="step">
          <span className="n">03</span>
          <div className="anim-slot anim-3">
            <div className="ring-s">
              <svg viewBox="0 0 90 90">
                <circle className="t" cx="45" cy="45" r="40" />
                <circle className="f" cx="45" cy="45" r="40" />
              </svg>
              <div className="ring-num">84</div>
            </div>
          </div>
          <h3>Sua leitura, pronta.</h3>
          <p>
            Em 60 segundos a câmera lê seus sinais e te mostra o resultado. O
            resto — o que cabe no P&amp;L do seu time — a gente te conta por
            email.
          </p>
        </div>
      </div>
    </section>
  );
};
