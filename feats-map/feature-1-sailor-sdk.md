# Feature 1 - @sailor/sdk

Goal: preparar o pacote npm `@sailor/sdk` em `C:\Workspace\Projects\sailor-sdk`, sem publicar.

## Tasks

- [x] Mapear contratos atuais de plugin, manifest e loader no `server/`.
- [x] Criar base npm publish-ready do SDK.
- [x] Escrever testes RED para contratos, helper de plugin e validacao de manifest.
- [x] Implementar tipos publicos e helpers minimos.
- [x] Implementar validacao de manifest com erros legiveis.
- [x] Configurar build TypeScript, exports, files e pacote.
- [x] Rodar testes, build e package dry-run.
- [x] Documentar uso minimo no README.

## Boundaries

- SDK nao importa `server/`, `core/engines` ou plugins internos.
- SDK expõe contratos genericos para plugins externos.
- Publicacao no npm fica para depois, feita pelo usuario.
