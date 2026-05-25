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

7. Criar utility nodes adicionais:
   - Image Editor Utility Node: crop, resize, rotate e aspect ratio.
  
8. Plugin Creator:
   Criar uma funcionalidade onde a pessoa pode criar o propio plugin dela no frontend com facilidade, sem precisar escrever muito codigo. A ideia é criar criador de plugin onde a pessoa pode conectar o sistema externo dela e criar um plugin, escolher handle, nome, icone(icon, iconDark, iconLight). Depois ela poderia criar cada metodo de forma intuitiva com seus parametros, colocaria a URL da API dela, testaria manualmente para ver o que retornava, depois ela mapeava o resultado do body, assim iria montando o manifest.json e methods.ts automaticamente, ela pegaria os possiveis erros e adicionaria uma exception para capturar aquele error. No fim, ela poderia salvar/descartar o plugin para ja começar a usar, se ela salvasse, iria salvar na pasta de plugins globais. Teria como salvar localmente no pc dela tambem ou criar um repositorio no github para salvar esse plugin, assim teria como ela mandar ou o arquivo ou o repositorio para outra pessoa testar o plugin que ela criou.

9. Plugins Plus:
   - Playwright
   - Waha

10. Start Guide por feature:
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
     :version="1"
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
