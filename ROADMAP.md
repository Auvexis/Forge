# Roadmap

1. Criar `@sailor/sdk` minimo com tipos, contratos e validacao de manifest.

2. Criar sailor CLI (`npx sailor`) com:
   - `sailor create plugin`
   - `sailor build`
   - `sailor release`

3. Criar plugin canario para validar fluxo externo completo.
   - 1: PostgreSQL plugin.
   - 2: Supabase plugin.

4. Adicionar suporte a varios perfis, cada um com configuracao, workflows e plugins instalados.

5. Adicionar painel global para ver automacoes rodando em tempo real em qualquer parte do sistema.

6. Expandir catalogo de plugins:
   - Discord
   - Slack
   - GitHub
   - Notion
   - Trello
   - Jira
   - Google Calendar
   - OpenRouter
   - OpenAI
   - Adicionar mais funcionalidades e metodos no Plugin Google Sheets.

9. Plugins Plus:
   - Playwright
   - Waha

11. Start Guide por feature:
   Criar um componente simples de guia inicial por ferramenta, sem traduzir a UI inteira. Cada feature passa uma lista de steps com preview e textos por idioma.

   ```ts
   type StartGuideLang = "en" | "pt" | "es";

   interface StartGuideStepText {
     title: string;
     description: string;
     prevBtn?: string;
     nextBtn?: string;
     doneBtn?: string;
   }

   interface StartGuideStep {
     id: string;
     preview?: {
       type: "image" | "gif" | "video";
       src: string;
       alt?: string;
     };
     lang: Record<StartGuideLang, StartGuideStepText>;
   }
   ```

   Uso esperado:

   ```vue
   <StartGuide
     feature-id="plugin-creator"
     :steps="pluginCreatorGuide"
     default-lang="en"
   />
   ```

12. Agent Tools foundation:
   - Chat Trigger.
   - AI Agent / Model / Memory / Tool nodes.
   - Plugin method tool adapter.
   - Persistent short-term and long-term memory.
   - Tool approvals and execution trace.
