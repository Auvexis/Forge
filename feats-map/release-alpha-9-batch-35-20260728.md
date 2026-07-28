- [x] Preparar 0.1.0-alpha.9
- [x] Validar CI local
- [x] Commitar e pushar
- [x] Aguardar CI do dev
- [x] Criar tag release
- [x] Aguardar CI da tag e publish
- [x] Validar npm e Docker

Nota: alpha.9 publica a correcao do client Docker para usar a origem do gateway em producao.
CI remoto: `dev` passou no run `30407991440`; a tag `v0.1.0-alpha.9` passou e publicou no run `30408300778`.
Validacao pos-publicacao: npm `@auvexis/fabric@alpha` aponta para `0.1.0-alpha.9`; GHCR publicou `fabric-api`, `fabric-client` e `fabric-gateway` em `0.1.0-alpha.9`; compose de producao respondeu `/profiles` e `/profiles/current` com HTTP 200 pelo gateway e foi derrubado ao final.
