# PluginAuth variable resolution

## Problema

Credenciais de plugins aceitam variaveis inseridas pelo `BaseVariableInput` como `{{ variables.TELEGRAM_BOT }}`.
O Vault resolvia apenas `{{ env.KEY }}`, entao qualquer PluginAuth recebia o valor literal.
No Telegram isso chegava como token literal e a API retornava 404.

## Tasks

- [x] Criar teste cobrindo resolucao de `{{ variables.KEY }}` no profile ativo.
- [x] Manter compatibilidade com `{{ env.KEY }}`.
- [x] Implementar resolucao no Vault.
- [x] Rodar teste focado.
- [x] Commitar a correcao.
