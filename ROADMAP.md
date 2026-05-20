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

7. Plugins Mestre:
   - Playwright
   - Waha

8. Criar utility nodes adicionais:
   - Image Editor Utility Node: crop, resize, rotate e aspect ratio.