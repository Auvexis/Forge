# Roadmap

1. Criar `@sailor/sdk` minimo com tipos, contratos e validacao de manifest.

2. Criar sailor CLI (`npx sailor`) com:
   - `sailor create plugin`
   - `sailor build`
   - `sailor release`

3. Criar um plugin canario para validar o fluxo externo completo.
   - Prioridade: OpenAI plugin.
   - Alternativa forte: PostgreSQL plugin.

4. Adicionar painel global para ver automacoes rodando em tempo real em qualquer parte do sistema.

5. Adicionar suporte a varios perfis, cada um com configuracao, workflows e plugins instalados.

6. Expandir catalogo de plugins:
   - Discord
   - Slack
   - GitHub
   - Notion
   - Trello
   - Google Calendar
   - OpenRouter
   - PostgreSQL

7. Criar utility nodes adicionais:
   - Image Editor Utility Node: crop, resize, rotate e aspect ratio.
