# Profile-scoped triggers

## Objetivo

Trigger publicado pertence ao perfil dono. Trocar perfil ou logout nao pode parar nem redirecionar execucao publicada.

## Decisao

Usar URLs explicitas por perfil:

- `/p/:profileId/webhook/:webhookPath`
- `/p/:profileId/forms/:formId`
- `/p/:profileId/forms-api/:formId`

Sem gambiarra: core resolve perfil antes; plugins continuam genericos.

## Tasks

- [x] Criar helper core para executar callback dentro do contexto de um `profileId` existente.
- [x] Criar testes para webhook scoped: mesmo slug em dois perfis resolve pelo `profileId` da URL.
- [x] Ajustar rotas `/p/:profileId/webhook/:webhookPath` e manter rota antiga como compat.
- [x] Ajustar builder de URL de lifecycle para plugin trigger usar `/p/:profileId/webhook/:path`.
- [x] Criar testes para plugin lifecycle garantindo URL scoped e credenciais do perfil dono.
- [x] Criar testes para forms scoped: API e submit com `/p/:profileId/forms-api/:formId`.
- [x] Ajustar form routes/service para resolver dentro do contexto do perfil explicito.
- [x] Ajustar tipos compartilhados/frontend para expor URLs scoped sem quebrar drafts/test.
- [ ] Rodar `npx tsc --noEmit --pretty false`.
- [ ] Rodar testes backend focados.
- [ ] Rodar suite backend completa.
- [ ] Marcar tasks concluidas e commitar cada bloco seguro.

## Regras de arquitetura

- Plugin nao acessa profile/core/database.
- Resolver de perfil fica no core.
- Resolver de trigger nao abre banco, so recebe workflows.
- Route layer resolve URL e chama services.
- Lifecycle monta URL, mas nao executa regra de negocio de plugin fora do SDK.
- Slug pode repetir entre perfis; nao pode repetir dentro do mesmo perfil.
