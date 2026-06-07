# Sailor SDK Plugin Categories Array Plan - 2026-06-07

## Objetivo

Trocar o contrato de plugin de `metadata.category: string` para `metadata.categories: SailorPluginCategory[]`.

O SDK deve aceitar apenas `categories`. Depois de publicar a nova versao do `@auvexis/sailor-sdk`, o Sailor deve instalar essa versao e migrar todos os plugins padrao, backend e frontend para o novo contrato.

## Contexto lido

- SDK fora do repo Sailor: `C:\Workspace\Projects\sailor-sdk`.
- SDK atual: `@auvexis/sailor-sdk@1.3.0`.
- SDK atual tem:
  - `src/plugin-categories.ts` com categorias antigas: `AI`, `Communication`, `Database`, `Development`, `Google`, `Productivity`, `Utilities`, `Other`.
  - `src/types.ts` com `PluginMetadata.category: PluginCategory`.
  - `src/manifest-schema.ts` exigindo `metadata.category`.
  - `test/sdk.test.ts` cobrindo `category`.
- Sailor atual usa `@auvexis/sailor-sdk: ^1.3.0` em `server/package.json`.
- Frontend ainda espelha tipos localmente em `client-vue/src/core/types/plugin.types.ts`.
- Consumos importantes no Sailor:
  - `client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue`
  - `client-vue/src/features/universe/utils/pluginUniverseMapper.ts`
  - `server/src/core/modules/command-palette/providers/plugins.commands.ts`
- Plugins padrao com `metadata.category` em `server/src/plugins/sailor/**/manifest.json`.
- Template externo com `category` em `server/src/plugins/_template/manifest.json`.

## Categorias finais

```ts
export const SAILOR_PLUGIN_CATEGORIES = [
  'AI',
  'Core',
  'Flow',
  'Data transformation',
  'Apps',
  'Files',
  'Developer',
] as const

export type SailorPluginCategory = typeof SAILOR_PLUGIN_CATEGORIES[number]
```

Alias possivel para compatibilidade de nome interno:

```ts
export const PLUGIN_CATEGORIES = SAILOR_PLUGIN_CATEGORIES
export type PluginCategory = SailorPluginCategory
```

Mas o campo do manifest deve ser apenas:

```ts
metadata: {
  categories: SailorPluginCategory[]
}
```

## Decisao de compatibilidade

Nao aceitar `category` no novo SDK.

Motivo:
- evita estado meio migrado;
- deixa plugins novos corretos por contrato;
- obriga Sailor e plugins padrao a ficarem alinhados;
- simplifica o novo Node Picker.

Risco:
- plugins externos antigos quebram validacao ao atualizar SDK.

Mitigacao:
- mensagem de erro clara no validador/testes;
- README/changelog com migration guide:
  - antes: `"category": "Utilities"`
  - depois: `"categories": ["Core"]`

## Mapeamento inicial dos plugins padrao

| Plugin | Categoria atual | Nova categories |
| --- | --- | --- |
| openai | AI | `["AI"]` |
| openrouter | AI | `["AI"]` |
| ollama | AI | `["AI"]` |
| wait | Utilities | `["Flow", "Core"]` |
| date-time | Utilities | `["Core", "Data transformation"]` |
| crypto | Utilities | `["Core", "Data transformation"]` |
| compare-datasets | Utilities | `["Data transformation"]` |
| file | Utilities | `["Files", "Core"]` |
| google-drive | Google | `["Apps", "Files"]` |
| google-sheets | Google | `["Apps", "Data transformation"]` |
| google-calendar | Google | `["Apps"]` |
| google-youtube | Google | `["Apps"]` |
| google-gmail | Communication | `["Apps"]` |
| slack | Communication | `["Apps"]` |
| discord | Communication | `["Apps"]` |
| telegram | Communication | `["Apps"]` |
| github | Development | `["Apps", "Developer"]` |
| postgresql | Database | `["Developer", "Data transformation"]` |
| supabase | Database | `["Developer", "Apps", "Data transformation"]` |
| notion | Productivity | `["Apps", "Files"]` |
| jira | Productivity | `["Apps", "Developer"]` |
| trello | Productivity | `["Apps"]` |
| _template | Productivity | `["Apps"]` |

## Tasks

### Batch 1 - SDK contract

- [x] Task 1: Atualizar testes do `sailor-sdk` primeiro.
  - `test/sdk.test.ts` deve exigir `metadata.categories`.
  - Deve rejeitar `metadata.category`.
  - Deve rejeitar categoria fora da lista.
  - Deve rejeitar array vazio.

- [x] Task 2: Atualizar tipos e schema do `sailor-sdk`.
  - `src/plugin-categories.ts` com as 7 categorias finais.
  - `src/types.ts` com `PluginMetadata.categories: SailorPluginCategory[]`.
  - `src/manifest-schema.ts` exigindo `categories`.
  - `category` deve virar propriedade invalida.

- [x] Task 3: Atualizar README/versionamento do SDK.
  - Documentar breaking change.
  - Adicionar migration guide curto.
  - Bump de versao recomendado: `2.0.0`.
  - Rodar `npm test`, `npm run typecheck`, `npm run build`.
  - Commit no repo `sailor-sdk`.

### Batch 2 - Publish e instalacao no Sailor

- [x] Task 4: Publicar nova versao do SDK.
  - Confirmar login/registry.
  - Rodar `npm publish --access public`.
  - Confirmar pacote publicado.

- [x] Task 5: Atualizar `server/` para nova versao.
  - Instalar `@auvexis/sailor-sdk@2.0.0`.
  - Atualizar `server/package.json` e `server/package-lock.json`.
  - Rodar build/typecheck do server.

- [x] Task 6: Atualizar contratos backend que leem categoria.
  - Command palette: keywords e description devem usar `metadata.categories`.
  - Testes do command palette.
  - Testes de loader/agent-runtime com manifests fake.
  - Commit no repo Sailor.

### Batch 3 - Migrar plugins padrao

- [x] Task 7: Migrar `server/src/plugins/sailor/**/manifest.json`.
  - Remover `category`.
  - Adicionar `categories`.
  - Usar o mapeamento inicial acima.

- [x] Task 8: Migrar template de plugin.
  - `server/src/plugins/_template/manifest.json`.
  - Qualquer doc/template que mostre `category`.

- [x] Task 9: Validar plugins internos.
  - Rodar testes de loader.
  - Rodar testes de plugin installer/preview.
  - Rodar build do server.
  - Commit no repo Sailor.

### Batch 4 - Frontend

- [x] Task 10: Atualizar tipos locais do frontend.
  - `client-vue/src/core/types/plugin.types.ts`.
  - Trocar `category` por `categories`.
  - Atualizar `PLUGIN_CATEGORIES` para as 7 categorias finais.

- [x] Task 11: Atualizar telas que usam categoria.
  - `AddNodePanel.vue`: plugin aparece em todas as categorias onde pertence.
  - `pluginUniverseMapper.ts`: universo deve lidar com multiplas categorias.
  - Qualquer filtro/search deve procurar em `categories`.

- [x] Task 12: Atualizar testes frontend.
  - Contratos do AddNodePanel.
  - Contratos do Universe se existirem.
  - Rodar `npm run type-check` e teste alvo.
  - Commit no repo Sailor.

## Regras de implementacao

- Nao criar branch nova. Usar branch atual/dev.
- TDD nas tasks de contrato.
- 3 tasks por vez.
- Commits pequenos ao concluir cada batch/task relevante.
- Nao mexer em mudancas sujas nao relacionadas no Sailor.
- Plugins continuam genericos. Manifest dirige UI. Plugin nao conhece core.

## Criterios de aceite

- SDK novo nao aceita `metadata.category`.
- SDK novo aceita apenas `metadata.categories` com pelo menos uma categoria valida.
- Sailor instala a nova versao publicada.
- Todos os plugins padrao usam `categories`.
- Frontend agrupa/filtra plugins por multiplas categorias.
- Server command palette e Universe nao quebram.
- Testes e builds principais passam.
