# Fabric Release Readiness v1

Use este checklist antes de publicar uma versao alpha, beta ou stable do Fabric.

## Gates por canal

### npm

- [ ] `npm ci`
- [ ] `npm run type-check`
- [ ] `npm run test:vitest`
- [ ] `npm run test:node`
- [ ] `npm run build`
- [ ] `npm pack --dry-run --ignore-scripts`
- [ ] Instalar `@auvexis/fabric@alpha` em pasta limpa
- [ ] Abrir `http://localhost:23800`
- [ ] Criar perfil
- [ ] Reiniciar e validar persistencia do perfil
- [ ] Abrir `/home` e `/workflows` sem erro de CORS
- [ ] Publicar workflow com formulario

### Docker

- [ ] `docker compose -f docker-compose.prod.yml config`
- [ ] `docker compose -f docker-compose.prod.yml pull`
- [ ] `docker compose -f docker-compose.prod.yml up`
- [ ] Abrir `http://localhost:23800`
- [ ] Criar ou selecionar perfil
- [ ] Abrir `/home` e `/workflows` sem erro de CORS
- [ ] Validar que API e client nao precisam estar expostos diretamente
- [ ] Parar o compose ao final

### Desktop

- [ ] `npm run type-check --workspace apps/desktop`
- [ ] `npm run build --workspace apps/desktop`
- [ ] `npm run test --workspace @fabric/desktop`
- [ ] `npm run dev:desktop`
- [ ] `npm run dist:win --workspace @fabric/desktop` em Windows
- [ ] `npm run dist:mac --workspace @fabric/desktop` em macOS
- [ ] `npm run dist:linux --workspace @fabric/desktop` em Linux
- [ ] Conferir assets esperados: `.exe`, `.dmg`, `.AppImage` e `.deb`
- [ ] Splash inicial aparece com marca do Fabric
- [ ] Janela principal abre somente apos API e gateway estarem prontos
- [ ] Criar perfil
- [ ] Reiniciar e validar persistencia do perfil
- [ ] Abrir `/home` e `/workflows` sem erro de Network inicial
- [ ] Links externos abrem fora do Electron
- [ ] Tray respeita fechar/minimizar conforme configuracao
- [ ] Notificacoes nativas aparecem somente quando Fabric nao esta focado
- [ ] Restart automatico funciona apos alterar Public URL
- [ ] Update check abre a release do GitHub
- [ ] Download page informa que builds alpha desktop nao sao assinados

## Gate Public URL

- [ ] Rodar gateway em `23800`
- [ ] Expor `23800` via ngrok ou dominio publico
- [ ] Configurar Public URL no Fabric
- [ ] Reiniciar quando solicitado
- [ ] Abrir frontend pela URL publica
- [ ] Abrir formulario publicado em outro dispositivo
- [ ] Enviar formulario publicado
- [ ] Confirmar execucao no Fabric
- [ ] Confirmar ausencia de erro de CORS

## Gate de canal

- [ ] `alpha`: pode ter features incompletas, mas nao pode quebrar instalacao, startup, perfil, gateway, public URL ou workflow publicado.
- [ ] `beta`: deve ter UX de erro clara, installer desktop utilizavel, tray definido, update check funcional e checklist alpha sem falhas.
- [ ] `stable`: deve ter assinatura de binarios, updater seguro, installer polido, docs finais e validacao em maquina limpa.

## Evidencia

- [ ] Salvar log npm em `logs/release-<version>-npm.log`
- [ ] Salvar log Docker em `logs/release-<version>-docker.log`
- [ ] Salvar log Desktop em `logs/release-<version>-desktop.log`
- [ ] Registrar resultado no `feats-map/release-<version>-*.md`
