/**
 * Chrome flutuante A2 — copiado de src/design-reference/A2-clean-premium.html.
 * SiteHeader: linhas 832-833. SiteFooter: linhas 1077-1106.
 * Não há navbar tradicional: apenas logo top-left e meta "Live · rPPG" top-right.
 */
export const SiteHeader = () => (
  <>
    <div className="chrome-logo">
      <img src="/shared/logo-impulso.png" alt="impulso+" />
      <span className="sub">FaceScan</span>
    </div>
    <div className="chrome-meta">
      <span className="dot" />
      <span>Live · rPPG</span>
    </div>
  </>
);

export const SiteFooter = () => (
  <footer>
    <div className="footer-inner">
      <div>
        <a href="#" className="logo">
          <img src="/shared/logo-impulso.png" alt="impulso+" />
        </a>
        <div className="foot-social" aria-label="Redes sociais">
          <a
            href="https://www.instagram.com/impulsomais.app"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="foot-social-btn"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/company/impulsomais"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="foot-social-btn"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v14H.22V8zm7.4 0h4.37v1.92h.06c.61-1.15 2.1-2.36 4.32-2.36 4.62 0 5.47 3.04 5.47 7v7.44h-4.56v-6.6c0-1.57-.03-3.6-2.2-3.6-2.2 0-2.54 1.72-2.54 3.49V22H7.62V8z" />
            </svg>
          </a>
        </div>
      </div>
      <div className="foot-right">
        <div className="foot-col">
          <h5>Sobre nós</h5>
          <a href="https://impulsomais.app" target="_blank" rel="noopener noreferrer">
            impulsomais.app
          </a>
        </div>
      </div>
    </div>
    <div className="foot-bottom">
      <div>© {new Date().getFullYear()} Impulso+. Saúde que gera resultado.</div>
      <div>ISO 27001 · ISO 9001 · LGPD</div>
    </div>
  </footer>
);

export const WhatsAppFab = () => (
  <a
    href="https://wa.me/5511936228717?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20o%20Impulso%2B"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Falar no WhatsApp"
    className="wa-fab"
  >
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.554-5.338 11.89-11.893 11.89a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
    </svg>
  </a>
);
