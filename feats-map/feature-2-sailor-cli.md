# Feature 2 - Sailor CLI

Goal: criar CLI JavaScript publish-ready para `npx sailor`, com `sailor create`, `sailor build` e `sailor release`.

## Arquitetura

`src/index.js` deve ser somente bootstrap.

Camadas:

- `src/cli/`: parse de argumentos, roteamento de comandos e lifecycle visual.
- `src/commands/`: casos de uso `create`, `build`, `release`.
- `src/prompts/`: perguntas com `@clack/prompts`.
- `src/project/`: criacao de arquivos, templates e validacao de paths.
- `src/package-manager/`: instalar deps com npm de forma isolada.
- `src/release/`: empacotar plugin para distribuicao.
- `src/ui/`: mensagens, cores e erros com `picocolors`.
- `src/shared/`: helpers pequenos e puros.
- `test/`: testes node:test para unidades e fluxos sem prompt real.

## Regras

- [x] CLI em JavaScript ESM.
- [x] Usar `@clack/prompts` para `intro`, `outro`, `select`, `text`, `confirm`, `cancel`, `isCancel`.
- [x] Usar `picocolors` para mensagens.
- [x] Nunca criar arquivos fora do diretório onde o usuario rodou a CLI.
- [x] Validar nome do plugin em kebab-case.
- [x] Não sobrescrever pasta existente sem confirmacao clara.
- [x] Plugin gerado deve usar `@auvexis/sailor-sdk@latest`.
- [x] Final do `create` deve mostrar docs: `https://sailor.auvexis.com/api/docs`.

## Tasks

- [x] Task 1: configurar package CLI publish-ready.
  - `name`: decidir antes de publicar; alvo do roadmap e `npx sailor` é pacote `sailor`.
  - `bin`: apontar comando `sailor` para `src/index.js`.
  - scripts: `test`, `build`, `start`.

- [x] Task 2: criar bootstrap e router.
  - `src/index.js`
  - `src/cli/run.js`
  - `src/cli/parse-args.js`
  - Suportar: `sailor create`, `sailor create plugin`, `sailor build`, `sailor release`, `--help`, `--version`.

- [x] Task 3: criar UI shell.
  - `src/ui/messages.js`
  - `src/ui/errors.js`
  - `intro` no inicio e `outro` no fim.
  - Erro tratado sem stack trace feio para usuario.

- [x] Task 4: criar prompts do `create`.
  - `src/prompts/create-plugin.prompt.js`
  - Campos: nome, descricao, logo opcional, repository opcional, com exemplo ou vazio.
  - Cancelamento deve parar com mensagem limpa.

- [x] Task 5: criar dominio do plugin scaffold.
  - `src/project/plugin-project.js`
  - `src/project/validate-plugin-input.js`
  - `src/project/safe-path.js`
  - Testar kebab-case, path traversal e pasta existente.

- [x] Task 6: criar templates.
  - `src/templates/plugin/base/*`
  - `src/templates/plugin/example/*`
  - Arquivos gerados: `package.json`, `src/index.js`, `src/methods.js`, `manifest.json`, `README.md`, `.gitignore`.
  - `manifest.json` deve seguir `@auvexis/sailor-sdk`.

- [x] Task 7: implementar `sailor create`.
  - Criar pasta no cwd.
  - Escrever arquivos.
  - Rodar `npm install`.
  - Mostrar proximos passos.

- [x] Task 8: implementar `sailor build`.
  - Validar projeto atual.
  - Rodar build definido no plugin.
  - Validar `manifest.json` com `@auvexis/sailor-sdk`.

- [x] Task 9: implementar `sailor release`.
  - Rodar build.
  - Validar release.
  - Gerar pacote distributavel em `dist/release`.
  - Incluir `package.json`, `package-lock.json`, `manifest.json`, entrypoint e build output.

- [x] Task 10: testes TDD.
  - Testar parser.
  - Testar validação de input.
  - Testar scaffold em tmpdir.
  - Testar que não sobrescreve pasta existente.
  - Testar build/release com processo fake.

- [x] Task 11: documentação.
  - Atualizar `README.md` do `sailor-cli`.
  - Documentar comandos e fluxo `sailor create`.

- [x] Task 12: verificação final.
  - `npm test`
  - `npm run build`
  - `node src/index.js --help`
  - `node src/index.js create --help`
  - dry run de scaffold em tmpdir.
