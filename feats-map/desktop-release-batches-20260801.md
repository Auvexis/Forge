- [x] Batch 1 - Release readiness checklist v1
- [x] Definir checklist final para npm
- [x] Definir checklist final para Docker
- [x] Definir checklist final para Desktop
- [x] Definir gate de release alpha beta stable

- [x] Batch 2 - Desktop branding foundation
- [x] Definir icone do Fabric Desktop
- [x] Aplicar icone na janela e build desktop
- [x] Revisar branding base do desktop

- [ ] Batch 3 - Loading and startup polish
- [ ] Melhorar tela de loading inicial
- [ ] Garantir splash consistente com a marca
- [ ] Ajustar transicao entre splash e app
- [ ] Revisar startup frio API gateway client

- [ ] Batch 4 - Desktop restart flow
- [ ] Mapear fluxo atual de restart
- [ ] Implementar restart automatico ao confirmar
- [ ] Garantir restart seguro dos processos internos
- [ ] Validar restart apos mudar public URL

- [ ] Batch 5 - Native notifications
- [ ] Mapear eventos de notificacao do Fabric
- [ ] Implementar notificacao nativa no desktop
- [ ] Disparar so quando o app nao estiver focado
- [ ] Adicionar preferencia para habilitar desabilitar

- [ ] Batch 6 - System settings foundation
- [ ] Criar aba System Updates em AppGlobalSettings
- [ ] Adicionar toggles de comportamento do OS
- [ ] Adicionar estado inicial e persistencia
- [ ] Validar UX da aba desktop

- [ ] Batch 7 - Tray and window behavior
- [ ] Implementar system tray
- [ ] Adicionar abrir fechar minimizar para tray
- [ ] Adicionar opcao abrir com o OS
- [ ] Validar comportamento ao fechar janela

- [ ] Batch 8 - Desktop update service
- [ ] Definir estrategia de canal safe alpha beta stable
- [ ] Buscar release elegivel no GitHub
- [ ] Comparar versao instalada com release remota
- [ ] Expor servico de update para o frontend

- [ ] Batch 9 - Desktop update UI
- [ ] Criar dialog base de atualizacao
- [ ] Mostrar versao titulo e changelog
- [ ] Adicionar checagem manual por update
- [ ] Adicionar auto check ao abrir o Fabric

- [ ] Batch 10 - Auto update behavior
- [ ] Adicionar preferencia buscar updates automaticamente
- [ ] Adicionar preferencia atualizar automaticamente
- [ ] Implementar fluxo baixar instalar reiniciar
- [ ] Validar comportamento por canal

- [ ] Batch 11 - Installer polish
- [ ] Definir experiencia de instalacao desktop
- [ ] Revisar nome icones atalhos e metadata
- [ ] Ajustar acabamento do instalador
- [ ] Validar instalacao em maquina limpa

- [ ] Batch 12 - Code signing
- [ ] Definir estrategia de assinatura por plataforma
- [ ] Configurar secrets e pipeline de assinatura
- [ ] Assinar binarios desktop
- [ ] Validar reputacao e warnings do sistema

- [ ] Batch 13 - Final release validation
- [ ] Rodar checklist final npm Docker Desktop
- [ ] Validar public URL e formularios publicados
- [ ] Validar notificacoes tray restart update
- [ ] Preparar release candidate
