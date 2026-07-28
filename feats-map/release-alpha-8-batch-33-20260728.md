- [x] Preparar 0.1.0-alpha.8
- [x] Validar CI local
- [x] Commitar e pushar
- [x] Aguardar CI do dev
- [x] Criar tag release
- [x] Aguardar CI da tag e publish
- [x] Validar npm e Docker
- [x] Registrar smoke manual npm + ngrok

Nota: esta versao substitui a tentativa `0.1.0-alpha.7`, cuja tag foi criada mas nao publicou por falha de CI antes dos jobs de release.
Validacao local: `npm run ci` passou em type-check, Vitest, testes Node e build. O build do client manteve apenas warnings conhecidos de chunk/import dinamico.
CI remoto: `dev` passou no run `30403914307`; a tag `v0.1.0-alpha.8` passou e publicou no run `30404273046`.
Validacao pos-publicacao: npm `@auvexis/fabric@alpha` aponta para `0.1.0-alpha.8`; GHCR publicou `fabric-api`, `fabric-client` e `fabric-gateway` em `0.1.0-alpha.8`; compose de producao respondeu `/home` com HTTP 200 e foi derrubado ao final.
Smoke manual: pacote npm instalado fora do repo funcionou; Public URL via ngrok na porta do gateway funcionou com workflow form dev e publicado.
