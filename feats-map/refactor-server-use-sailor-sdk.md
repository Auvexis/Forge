# Refactor - Server usa @auvexis/sailor-sdk

Goal: trocar contratos duplicados do `server` pelo SDK publicado `@auvexis/sailor-sdk`.

## Tasks

- [ ] Mapear imports atuais de tipos, manifest e validator.
- [ ] Criar teste RED mostrando validacao do SDK no loader/preview.
- [ ] Instalar `@auvexis/sailor-sdk` no `server`.
- [ ] Migrar imports do `server` para o SDK.
- [ ] Trocar validacao estrutural local por `validateManifest` do SDK.
- [ ] Remover arquivos locais que ficarem sem uso.
- [ ] Rodar testes/build do server.
- [ ] Fazer commits por etapa sem incluir mudancas soltas do usuario.

## Boundaries

- Plugins continuam sem importar core/engine.
- Core pode usar o SDK como contrato publico compartilhado.
- Client Vue fica fora deste refactor.
