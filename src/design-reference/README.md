# Design Reference — A2 Clean Premium (Impulso+ FaceScan)

Esta pasta contém os arquivos de **referência visual** para o redesign da landing
do FaceScan. Eles **NÃO** são importados pelo bundle da aplicação — servem apenas
como fonte da verdade para CSS, marcação HTML e lógica de animação que devem ser
copiadas (literalmente, sem reinterpretação) para os componentes React.

## Arquivos

- `A2-clean-premium.html` — protótipo completo (HTML + CSS + JS) do design A2.
  Contém os tokens em `:root`, classes utilitárias (`.ambient`, `.gridlines`,
  `.grain`), estilos do hero, do scan fullscreen, do EmailGate e do
  ResultsView.
- `A2-scan.js` — lógica de countdown, readouts animados e estados do scan
  fullscreen. Serve apenas de inspiração — no projeto real, o estado vem do
  hook `useShenai` em `src/lib/shenai.ts`.
- `tokens.css` — versão isolada dos tokens da marca Impulso+ (paleta cyan,
  fontes Instrument Serif / Inter / JetBrains Mono).

## Regra de ouro

> **NÃO REESCREVER. COPIAR.**
> Quando um prompt mandar copiar de "linhas X-Y de A2-clean-premium.html",
> abra o arquivo, copie literalmente esse trecho e cole no destino indicado.

## O que NÃO mexer

- `src/lib/shenai.ts` — integração Shen.AI SDK
- `public/coi-serviceworker.js` — COOP/COEP service worker
- `public/shenai/` — assets WASM do SDK
- `supabase/` — edge functions e migrations
- `src/integrations/supabase/client.ts` — cliente Supabase auto-gerado
