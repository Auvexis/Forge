- [x] Identificar mismatch de versao interna nas imagens alpha.6
- [x] Corrigir prepare-release para atualizar workspaces, lockfile e APP_VERSION
- [x] Preparar 0.1.0-alpha.7
- [x] Validar CI local
- [x] Commitar e pushar
- [x] Criar tag release
- [x] Auditar falha do CI na tag
- [ ] Corrigir instabilidade detectada e publicar uma nova alpha
- [ ] Validar npm e Docker

Nota: a tag `v0.1.0-alpha.7` foi criada, mas o CI da tag falhou antes dos jobs de publish por uma instabilidade no ordenamento de sessoes do Agent Chat quando `updatedAt` empatava entre chats. A correcao segue em uma nova versao alpha para evitar reescrever tag remota.
