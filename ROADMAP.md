Futuras Features:

1. Melhorar/Testar todas as features do Sailor Pages, verificar se está ativando Workflow Corretamente.

4. Arrumar UI da Sidebar e outras partes do Sistema. (MANUAL)

<!-- IMPORTANTE -->
5. ADICIONAR NOVOS NODES (Dataset, Embeddings, Vector Stores, Retriever)
<!-- IMPORTANTE -->

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