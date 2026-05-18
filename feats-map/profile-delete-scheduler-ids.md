# Profile delete scheduler and ids

## Objetivo

Ao deletar perfil com workflow publicado, nenhum cron antigo pode continuar tentando rodar com `profileId` removido. Perfis novos devem receber id opaco, nao derivado do nome exibido.

## Tasks

- [x] Reproduzir com teste de scheduler removendo jobs por perfil.
- [x] Reproduzir com teste de rota `DELETE /profiles/:profileId` notificando scheduler.
- [x] Gerar ids hex32 para perfis criados sem id explicito.
- [x] Manter ids explicitos aceitos para compatibilidade/testes.
- [x] Rodar backend typecheck.
- [x] Rodar testes focados.
- [x] Rodar suite backend completa.

## Verificacao

- `node --loader ts-node/esm --test src/core/modules/scheduler/scheduler.test.ts src/core/profiles/profile-store.test.ts src/core/routes/profiles-delete-scheduler.test.ts src/core/routes/profiles.routes.test.ts`
- `npx tsc --noEmit --pretty false`
- `node --loader ts-node/esm --test "src/**/*.test.ts"` com 248 pass, 1 skip.
