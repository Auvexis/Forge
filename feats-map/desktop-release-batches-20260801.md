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

- [x] Batch 4 - Desktop restart flow
- [x] Mapear fluxo atual de restart
- [x] Implementar restart automatico ao confirmar
- [x] Garantir restart seguro dos processos internos
- [x] Validar restart apos mudar public URL

- [x] Batch 5 - Native notifications
- [x] Mapear eventos de notificacao do Fabric
- [x] Implementar notificacao nativa no desktop
- [x] Disparar so quando o app nao estiver focado
- [x] Adicionar preferencia para habilitar desabilitar

- [x] Batch 6 - System settings foundation
- [x] Criar aba System Updates em AppGlobalSettings
- [x] Adicionar toggles de comportamento do OS
- [x] Adicionar estado inicial e persistencia
- [x] Validar UX da aba desktop

- [x] Batch 7 - Tray and window behavior
- [x] Implementar system tray
- [x] Adicionar abrir fechar minimizar para tray
- [x] Adicionar opcao abrir com o OS
- [x] Validar comportamento ao fechar janela

- [x] Batch 8 - Desktop update service
- [x] Definir estrategia de canal safe alpha beta stable
- [x] Buscar release elegivel no GitHub
- [x] Comparar versao instalada com release remota
- [x] Expor servico de update para o frontend

- [x] Batch 9 - Desktop update UI
- [x] Criar dialog base de atualizacao
- [x] Mostrar versao titulo e changelog
- [x] Adicionar checagem manual por update
- [x] Adicionar auto check ao abrir o Fabric

- [x] Batch 10 - Auto update behavior
- [x] Adicionar preferencia buscar updates automaticamente
- [x] Adicionar preferencia atualizar automaticamente
- [x] Implementar fluxo seguro de download manual
- [x] Validar comportamento por canal safe

- [x] Batch 11 - Installer polish
- [x] Definir experiencia de instalacao desktop
- [x] Revisar nome icones atalhos e metadata
- [x] Ajustar acabamento inicial do instalador
- [x] Validar build desktop local

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
