# 🚀 Próximas Atualizações: Engine & Novos Nós

## 📌 1. Suporte a Múltiplos Triggers (Prioridade Máxima)
**Por que adicionar:** Permitir múltiplos Triggers (ex: iniciar o mesmo workflow por *Webhook* **OU** por um *Form Trigger* **OU** um agendamento *Cron*) traz extrema flexibilidade. Como conversamos, isso deve ser a prioridade #1 pois exige mudanças arquiteturais na Engine do Nod8 (preparar o gerenciador de execuções para aceitar dados de entrada de diferentes portas iniciais sem conflitos).

---

## 🛠️ Nós Estruturais Essenciais

**✏️ Set (Edit Fields)**
**Por que adicionar:** Permite renomear chaves JSON ou adicionar dados fixos visualmente, sem a necessidade de um CodeNode com Javascript.

**🔲 Switch**
**Por que adicionar:** Substitui múltiplos IfNodes aninhados (IF dentro do IF). Direciona o fluxo para caminhos diferentes com base em múltiplos valores definidos (Aprovado, Pendente, Cancelado).

**🔌 Merge**
**Por que adicionar:** Junta fluxos paralelos (ex: após se separarem em um IF) de volta para uma linha única. Impede que os fluxos sigam eternamente separados quando precisam voltar ao mesmo curso.

**🔀 Split In Batches / Item Lists**
**Por que adicionar:** Nó dedicado à manipulação pesada de listas (arrays). Divide grandes quantidades de itens em lotes menores para contornar bloqueios (Rate Limits) em APIs de terceiros.

---

## 🧰 Nós Utilitários (Utility Nodes)

**📝 Form (Form Trigger)**
**Por que adicionar:** O Nod8 cria e hospeda uma página web simples contendo um formulário. Quando submetido, dispara o workflow. Excelente para criar automações "Human in the Loop" (aprovações, ouvidoria, pesquisas) sem depender do Typeform/Google Forms.

**⏳ Wait / Sleep**
**Por que adicionar:** Pausa a execução do fluxo por um período (ex: aguardar 10 min) ou até uma data/hora específica. Fundamental para réguas de relacionamento (ex: e-mails de follow-up).

**📅 Date & Time**
**Por que adicionar:** Evita uso de Javascript para manipulação de data/hora. Converte formatos, altera fusos horários (Timezones) e faz cálculos simples matemáticos com datas.

**🔐 Crypto / Hash**
**Por que adicionar:** Gera senhas e criptografia, assinaturas SHA-256/HMAC e codifica em Base64. Essencial ao se comunicar com APIs bancárias ou ferramentas legadas que exigem headers criptografados.

**⚖️ Compare Datasets**
**Por que adicionar:** Cruza dados da Lista A e Lista B. Retorna o que é comum nas duas ou exclusivo em cada uma. Ótimo para integrações de sincronismo (Sincronizar CRM com plataforma de E-mail, achando apenas os contatos novos).

**📩 Respond to Webhook**
**Por que adicionar:** Ao invés do Nod8 retornar automaticamente um status "HTTP 200 OK" ao receber um gatilho de Webhook, este nó permite que o próprio fluxo decida o Status Code e o corpo JSON que deve ser retornado a quem fez o disparo HTTP.

**💾 Read / Write File**
**Por que adicionar:** Interação direta com o sistema de arquivos onde o Nod8 está hospedado. Permite ler, gravar ou apagar arquivos físicos (TXT, CSV, etc) processados no fluxo.
