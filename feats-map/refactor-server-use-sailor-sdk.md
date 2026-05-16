# Refactor - Server usa @auvexis/sailor-sdk

Goal: trocar contratos duplicados do `server` pelo SDK publicado `@auvexis/sailor-sdk`.

## Tasks

- [x] Mapear imports atuais de tipos, manifest e validator.
- [x] Criar teste RED mostrando validacao do SDK no loader/preview.
- [x] Instalar `@auvexis/sailor-sdk` no `server`.
- [x] Migrar imports do `server` para o SDK.
- [x] Trocar validacao estrutural local por `validateManifest` do SDK.
- [x] Remover arquivos locais que ficarem sem uso.
- [x] Rodar testes/build do server.
- [x] Fazer commits por etapa sem incluir mudancas soltas do usuario.

## Boundaries

- Plugins continuam sem importar core/engine.
- Core pode usar o SDK como contrato publico compartilhado.
- Client Vue fica fora deste refactor.
