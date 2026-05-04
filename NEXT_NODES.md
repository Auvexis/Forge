1. ✏️ Set (Edit Fields) Por que adicionar: Atualmente, se o usuário quiser renomear uma chave de um JSON ou adicionar um dado fixo, ele é obrigado a usar um CodeNode e escrever JavaScript. O Set permite "mapear" e criar variáveis de forma 100% visual, sendo um dos nós mais usados no dia a dia.

2. 🔲 Switch Por que adicionar: Se o usuário receber um "Status" que pode ser Aprovado, Pendente, Cancelado ou Em Análise, hoje ele teria que aninhar vários IfNodes (o famoso IF do IF do IF). O Switch limpa o fluxo criando de 2 a N saídas visuais no mesmo Node com base nos valores.

3. 🔌 Merge Por que adicionar: Quando o fluxo se divide (por exemplo, após um IF em que o caminho True vai pra um lugar e o False vai pra outro), às vezes precisamos que os dois caminhos voltem a se encontrar lá na frente para finalizar o workflow. Sem um Merge, os dados ficam rodando em paralelo para sempre.

4. 🔀 Split In Batches / Item Lists Por que adicionar: Nós já temos o LoopNode, mas um nó dedicado de manipulação de itens (como pegar um array com 100 usuários e dividir em lotes de 10) é fantástico para evitar sobrecarga em APIs externas (Rate Limits).
