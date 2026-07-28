- [x] Preparar 0.1.0-alpha.8
- [x] Validar CI local
- [ ] Commitar e pushar
- [ ] Aguardar CI do dev
- [ ] Criar tag release
- [ ] Aguardar CI da tag e publish
- [ ] Validar npm e Docker

Nota: esta versao substitui a tentativa `0.1.0-alpha.7`, cuja tag foi criada mas nao publicou por falha de CI antes dos jobs de release.
Validacao local: `npm run ci` passou em type-check, Vitest, testes Node e build. O build do client manteve apenas warnings conhecidos de chunk/import dinamico.
