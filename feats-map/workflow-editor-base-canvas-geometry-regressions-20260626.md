# Workflow Base Canvas Geometry Regressions

## Motivo

Corrigir desalinhamento, flick e sobreposicao de edges apos a migracao do Workflow Editor para o BaseCanvas proprio.

## Regras

- Nao modificar `BaseCanvas.vue`.
- Manter compatibilidade com Sailor Pages.
- Usar TDD nas correcoes geometricas.

## Tasks

- [x] Reproduzir alinhamento e atualizacao dos edges em testes.
- [x] Posicionar Quick Add pelos handles com maior distancia horizontal.
- [x] Atualizar edges imediatamente quando handles mudarem.
- [x] Preservar geometria valida durante paineis e menus.
- [x] Colocar edges abaixo dos nodes.
- [ ] Validar testes, tipos e fluxo renderizado.
