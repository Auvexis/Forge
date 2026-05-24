# Sailor Pages Canvas Fidelity DnD Font Family

## Contexto

O canvas do editor aplica estilos próprios em `.web-page-block`, enquanto preview/publicado renderizam o HTML final sem esses defaults. Isso faz texto, padding, border, background e tamanho divergirem.

O drag/drop recalcula intenção a cada `dragover` e pode alternar rapidamente entre cima, dentro e baixo perto das bordas.

O Inspector ainda não expõe `fontFamily`, e o renderer publicado também não permite essa propriedade.

## Plano

- [x] Testes essenciais
  - [x] Contrato do canvas não pode aplicar background/padding/border default no bloco renderizado.
  - [x] Contrato client/server permite `fontFamily`.
  - [x] Helper de drag intent tem zonas determinísticas.
- [x] Canvas fiel ao preview
  - [x] Remover visual default de `.web-page-block`.
  - [x] Manter seleção/drop como outline/overlay sem alterar layout base.
- [x] Drag/drop estável
  - [x] Calcular intent uma vez por evento.
  - [x] Não emitir intent repetida igual.
- [x] Inspector font family
  - [x] Adicionar campo `Font Family`.
  - [x] Permitir `fontFamily` no allowlist do client.
  - [x] Permitir `fontFamily` no renderer do backend.
- [x] Verificação
  - [x] Rodar testes focados do client.
  - [x] Rodar testes focados do backend.
  - [x] Rodar builds necessários.
