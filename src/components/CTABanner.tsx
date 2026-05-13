interface CTABannerProps {
  onStart: () => void;
}

/**
 * CTABanner — A2 Clean Premium.
 * Markup copiado das linhas 1066-1073 de src/design-reference/A2-clean-premium.html.
 */
export const CTABanner = ({ onStart }: CTABannerProps) => {
  return (
    <section className="cta-final" id="cta-final">
      <h2>
        Sua saúde em <span className="hl">60 segundos.</span>
        <br />
        <span className="it">De graça. Agora.</span>
      </h2>
      <p>
        Sem cadastro. Sem instalar nada. Nenhum vídeo sai do seu dispositivo
        enquanto você faz o scan.
      </p>
      <button className="cta-breathing" onClick={onStart} type="button">
        Fazer meu scan em 60s
        <span className="icon">
          <svg
            width="16"
            height="16"
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
    </section>
  );
};
