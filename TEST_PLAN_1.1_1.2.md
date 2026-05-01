# Plano de Testes de Aceitação - Marcos 1.1 e 1.2

Este documento detalha o passo a passo para validar todas as features e melhorias arquiteturais implementadas nos Marcos 1.1 e 1.2 do Nod8.

## 🎯 1. Testes de Interface Dinâmica (Frontend x Plugins)
Abra a tela de edição de um Workflow, crie um Nó de Plugin e faça os seguintes testes de comportamento de UI:

### Google Gmail
- [ ] Selecione o método **"Get Message"**.
- [ ] Verifique se o campo "Format" aparece como um **Dropdown (Select)** com as opções ("full", "metadata", "minimal", "raw") ao invés de um campo de texto livre.
- [ ] Verifique se os campos de `to`, `from` e `subject` estão com rótulos amigáveis (`x-label`) ao invés do nome bruto da propriedade.

### Google Drive
- [ ] Selecione o método **"List Files"**.
- [ ] Verifique se existe um dropdown "Sort By" (orderBy) funcionando.
- [ ] Ligue e desligue o toggle **"Filter by File Type"**. O campo de texto para digitar o MIME Type deve aparecer e sumir dinamicamente (`x-visible-if`).

### Google Sheets
- [ ] Selecione o método **"Read Rows"**.
- [ ] O campo "Spreadsheet" deve ser um Dropdown e mostrar a mensagem *"Loading options..."* rapidamente. 
- [ ] Como não há credenciais ativas, ele deve parar de carregar e ficar vazio (ou mostrar que não tem opções), **sem quebrar a tela de erro vermelho**. Isso valida a rota genérica de `dynamic-options` lidando graciosamente com o estado de não-autorizado.

### Telegram
- [ ] Selecione **"Send Photo"**. Ligue e desligue o toggle "Use URL". O input abaixo dele deve alternar entre pedir um Link de URL ou pedir o Upload de um Arquivo (usando Pipeline Buffer).
- [ ] Selecione **"Send Poll"**. Ligue o toggle "Quiz Mode". Deve aparecer o campo "Correct Option (0-based index)".

---

## 🔐 2. Testes de Conexão e Credenciais (Settings > Plugins)
Abra o menu global de Configurações e vá até a aba de Integrações/Plugins:

### Google Sheets
- [ ] Você deve ver o formulário de conexão pedindo `Client ID` e `Client Secret`. 
- [ ] O botão para conectar usará o padrão `OAuth2` e levará à tela de consentimento do Google (que agora exige os escopos de edição em Planilhas e leitura no Drive).

### Telegram
- [ ] Você deve ver o formulário pedindo apenas um **Bot Token** padrão (`ApiKeyProvider`).
- [ ] **Teste prático:** Vá ao `@BotFather` no Telegram, crie um bot rápido e cole o token. Clique em conectar. O Nod8 fará o teste de conexão silencioso no endpoint `/getMe` e a luz da integração deve ficar **verde (Connected)** instantaneamente.

---

## 🌐 3. Testes do Core Node: HTTP
No Editor de Workflows, adicione um nó nativo de **HTTP Request**:

### Métodos e Body
- [ ] Mude o método para `GET`. O Request Body deve **sumir**.
- [ ] Mude para `POST`, `PUT` ou `PATCH`. O Request Body deve aparecer usando a fonte de código (monoespaçada).
- [ ] Mude para `DELETE`. O Request Body deve **continuar visível**, permitindo que você envie um payload (comum em APIs modernas).

### Headers & Advanced
- [ ] Abra a seção "Headers & Advanced".
- [ ] Verifique se as opções de "Body Content Type" possuem a opção **Raw** (para não forçar a adição de Content-Type).
- [ ] Verifique se o "Response Type" possui a opção **Binary File (Buffer)** (para permitir pipelines de arquivos baixados).

---

## 🪝 4. Testes de Webhooks (Backend / Rest Client)
Para garantir que o endpoint genérico e agnóstico está funcionando perfeitamente:

### Teste Simples (JSON)
- [ ] Faça um `POST` via Postman/curl para `http://localhost:23801/webhooks/meu_teste_webhook` com body `{"hello": "world"}`.
- [ ] O console do servidor deve exibir: `[NOD8 | WEBHOOKS]: Webhook received — identifier: 'meu_teste_webhook', content-type: application/json`.

### Teste Multipart / Form-Data
- [ ] Envie a mesma requisição mudando o formato para `x-www-form-urlencoded` com body `foo=bar`.
- [ ] O console do servidor deve logar sucesso com `content-type: application/x-www-form-urlencoded` provando que o parser do `@fastify/formbody` está ativo e funcionando.
