Futuras Features:

1. Melhorar/Testar todas as features do Sailor Pages, verificar se está ativando Workflow Corretamente.

2. Global Agent Chat

3. Adicionar um sistema de git para os workflows

4. Arrumar UI da Sidebar e outras partes do Sistema.

5. Install Plugin no Comand Palette abrir o Plugin Instaler.

6. Atualizar categorias pre-definidas no Schema JSON de Plugins e Depois separar cada Plugin/Utility Plugin em categorias do Add Node Panel no Frontend, Adicionar botão de filtra categoria do lado do input Search, Adicionar botão de colapsar/expandir categoria.

7. Atualizar o Sailor SDK/Sailor CLI para o Schema JSON de Manifest Atual do backend do Sailor.

99. Start Guide por feature:
   Criar um componente simples de guia inicial por ferramenta, sem traduzir a UI inteira. Cada feature passa uma lista de steps com preview e textos por idioma.

   ```ts
   type StartGuideLang = "en" | "pt" | "es";

   interface StartGuideStepText {
     title: string;
     description: string;
     prevBtn?: string;
     nextBtn?: string;
     doneBtn?: string;
   }

   interface StartGuideStep {
     id: string;
     preview?: {
       type: "image" | "gif" | "video";
       src: string;
       alt?: string;
     };
     lang: Record<StartGuideLang, StartGuideStepText>;
   }
   ```

   Uso esperado:

   ```vue
   <StartGuide
     feature-id="plugin-creator"
     :steps="pluginCreatorGuide"
     default-lang="en"
   />
   ```