## Objetivo

Adicionar, na página de resultados do Face Scan (`src/components/ResultsView.tsx`), uma nova seção de transição **individual → corporativo**, ancorada no posicionamento B2B do Impulso+ (plataforma corporativa de saúde + produtividade que combina wearables, IA e gamificação).

A seção aparece logo após o bloco "E os outros 87%?" e antes do bloco de ações (Ver análise completa / Novo scan / Compartilhar).

## Conteúdo da nova seção

**Headline (serif, grande):**
> Seu score é **{score}**. *E o da sua equipe?*

(o número do score puxa dinamicamente da variável `score` já calculada no componente; o "E o da sua equipe?" em itálico azul `var(--cyan)`)

**Subtítulo (mono, uppercase, muted):**
> Score individual · 1 pessoa · 30 segundos

**Bloco de contexto B2B** (parágrafo curto em serif, baseado nos dados do Notion / Economizômetro):
> Empresas perdem em média **38% da folha** com produtividade invisível — colaboradores presentes, mas operando muito abaixo do potencial. O Impulso+ transforma esse custo oculto em performance mensurável.

**Mini-grid de 3 stats corporativos** (mesmo estilo `.rm` dos cards existentes), cada um com número grande + label uppercase:

| Stat | Label |
|---|---|
| **38%** | Folha perdida em produtividade |
| **62%** | Capacidade produtiva real hoje |
| **24/7** | Monitoramento contínuo da equipe |

**CTA final** (caixa com borda cyan sutil, mesmo estilo da frase de destaque já existente):
> Descubra o **Score de Saúde Metabólica** da sua empresa inteira.
> 
> [ Botão primário: **Falar com o time Impulso+** ]

O botão abre `mailto:contato@impulsomais.app` (ou link do Economizômetro se preferir — confirmar abaixo).

## Implementação técnica

Arquivo: `src/components/ResultsView.tsx`

- Inserir nova `<section>` após a section "Composição do Score de Saúde Metabólica" (linha ~395, antes do `result-actions`).
- Reutilizar tokens já existentes: `var(--cyan)`, `var(--cyan-border)`, `var(--cyan-soft)`, `var(--ink)`, `var(--muted)`, `var(--mono)`, `var(--serif)`.
- Reutilizar a classe `.rm` para os 3 cards de stats (mantém consistência visual com cards de Batimento/HRV/etc).
- Layout: `max-width: 880px`, grid de 3 colunas em desktop, 1 coluna em mobile (`@media (max-width: 640px)` via inline style fallback ou via `result-grid` existente).
- Sem novas dependências, sem mudanças de CSS global.

## Layout (ASCII)

```text
─────────────────────────────────────────
  Seu score é 72. E o da sua equipe?
  SCORE INDIVIDUAL · 1 PESSOA · 30S

  Empresas perdem em média 38% da folha
  com produtividade invisível...

  ┌──────┐ ┌──────┐ ┌──────┐
  │ 38%  │ │ 62%  │ │ 24/7 │
  │folha │ │cap.  │ │monit.│
  └──────┘ └──────┘ └──────┘

  ╔═════════════════════════════════╗
  ║ Descubra o Score da sua empresa ║
  ║   [ Falar com time Impulso+ ]   ║
  ╚═════════════════════════════════╝
─────────────────────────────────────────
```

## Pergunta de confirmação

O CTA final deve apontar para qual destino?

1. `mailto:contato@impulsomais.app` (simples, sem dependência externa)
2. Link para o **Economizômetro** (`https://economizometro-impulso.lovable.app`) — calculadora B2B já mencionada no Notion
3. Ambos: botão primário Economizômetro + secundário "Falar com time"

Posso assumir **opção 2 (Economizômetro)** como default por ser o funil B2B natural já existente, salvo se você indicar outro.
