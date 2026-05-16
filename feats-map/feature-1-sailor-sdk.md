# Feature 1 - @sailor/sdk

Goal: preparar o pacote npm `@sailor/sdk` em `C:\Workspace\Projects\sailor-sdk`, sem publicar.

## Tasks

- [ ] Mapear contratos atuais de plugin, manifest e loader no `server/`.
- [ ] Criar base npm publish-ready do SDK.
- [ ] Escrever testes RED para contratos, helper de plugin e validacao de manifest.
- [ ] Implementar tipos publicos e helpers minimos.
- [ ] Implementar validacao de manifest com erros legiveis.
- [ ] Configurar build TypeScript, exports, files e pacote.
- [ ] Rodar testes, build e package dry-run.
- [ ] Documentar uso minimo no README.

## Boundaries

- SDK nao importa `server/`, `core/engines` ou plugins internos.
- SDK expõe contratos genericos para plugins externos.
- Publicacao no npm fica para depois, feita pelo usuario.
