import type { StartGuideDefinition } from './startGuide.types'

export const startGuideRegistry = {
  'plugin-external-installer': {
    featureId: 'plugin-external-installer',
    version: 1,
    category: 'plugins',
    categoryLabel: 'Plugins',
    defaultLang: 'en',
    autoOpen: true,
    steps: [
      {
        id: 'source',
        lang: {
          en: {
            title: 'Choose a plugin source',
            description: 'Paste a repository URL or drop an extracted plugin folder to preview it before installing.',
          },
          pt: {
            title: 'Escolha a origem do plugin',
            description: 'Cole uma URL de repositorio ou solte uma pasta extraida para revisar antes de instalar.',
          },
          es: {
            title: 'Elige el origen del plugin',
            description: 'Pega una URL de repositorio o suelta una carpeta extraida para revisar antes de instalar.',
          },
        },
      },
      {
        id: 'target',
        lang: {
          en: {
            title: 'Pick where it installs',
            description: 'Install for the current profile, a selected profile, or all profiles depending on your workflow.',
          },
          pt: {
            title: 'Escolha onde instalar',
            description: 'Instale no profile atual, em um profile especifico ou em todos os profiles.',
          },
          es: {
            title: 'Elige donde instalar',
            description: 'Instala en el perfil actual, en un perfil especifico o en todos los perfiles.',
          },
        },
      },
      {
        id: 'install',
        lang: {
          en: {
            title: 'Review and install',
            description: 'Check manifest metadata, methods, triggers, warnings, and errors before installing.',
          },
          pt: {
            title: 'Revise e instale',
            description: 'Confira metadados, metodos, triggers, avisos e erros antes de instalar.',
          },
          es: {
            title: 'Revisa e instala',
            description: 'Revisa metadatos, metodos, triggers, avisos y errores antes de instalar.',
          },
        },
      },
    ],
  },
  'workflow-editor-starter': {
    featureId: 'workflow-editor-starter',
    version: 1,
    category: 'workflow-editor',
    categoryLabel: 'Workflow Editor',
    defaultLang: 'en',
    autoOpen: false,
    steps: [
      {
        id: 'workflow-editor-starter',
        lang: {
          en: {
            title: 'Welcome to the Workflow Editor',
            description: 'Use the workflow editor to create and edit workflows.',
          },
          pt: {
            title: 'Bem-vindo ao Editor de Workflows',
            description: 'Use o editor de workflows para criar e editar workflows.',
          },
          es: {
            title: 'Bienvenido al Editor de Workflows',
            description: 'Usa el editor de workflows para crear y editar workflows.',
          },
        },
      },
    ],
  },
  'workflow-utility-nodes': {
    featureId: 'workflow-utility-nodes',
    version: 1,
    category: 'workflow-editor',
    categoryLabel: 'Workflow Editor',
    defaultLang: 'en',
    autoOpen: false,
    steps: [
      {
        id: 'utility-nodes',
        preview: {
          type: 'component',
          component: 'utility-nodes',
        },
        lang: {
          en: {
            title: 'Core utility nodes',
            description: 'Explore the first-party nodes available for logic, routing, APIs, forms, and AI workflows.',
          },
          pt: {
            title: 'Nodes utilitarios do core',
            description: 'Explore os nodes nativos para logica, rotas, APIs, formularios e workflows com IA.',
          },
          es: {
            title: 'Nodos utilitarios del core',
            description: 'Explora los nodos nativos para logica, rutas, APIs, formularios y workflows con IA.',
          },
        },
      },
    ],
  },
} satisfies Record<string, StartGuideDefinition>

export type StartGuideId = keyof typeof startGuideRegistry

export function getStartGuideDefinition(featureId: string): StartGuideDefinition | null {
  return startGuideRegistry[featureId as StartGuideId] ?? null
}
