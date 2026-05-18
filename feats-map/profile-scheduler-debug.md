# Debug: scheduler com multiplos perfis

- [x] Revisar commits recentes da feature de perfis.
- [x] Mapear fluxo backend de perfil ativo, banco por perfil, workflows publicados e scheduler.
- [x] Reproduzir ou criar teste que prove que trocar perfil nao deve parar cron publicado em outro perfil.
- [x] Corrigir raiz do bug sem quebrar isolamento dos perfis/plugins.
- [x] Rodar testes focados e registrar resultado.

Resultado:
- Root cause: Scheduler era global ao perfil ativo. Ao trocar perfil, `stopAll()` removia jobs anteriores e `resync()` recriava apenas jobs do banco ativo.
- Fix: Scheduler agora registra jobs com `profileId` e executa listagem/cron dentro do contexto de banco do perfil dono.
- Verificacao: `npx tsc --noEmit --pretty false`; `node --loader ts-node/esm --test src/core/profiles/active-profile-service.test.ts src/core/routes/profile-switch-integration.test.ts src/core/modules/workflows/repository.test.ts src/core/modules/scheduler/scheduler.test.ts`; `node --loader ts-node/esm --test "src/**/*.test.ts"` (239 pass, 1 skip).
