import type { AgentIntentDecision } from "./agent-intent-gateway.ts";

export interface SmallModelIntentFixture {
  id: string;
  language: "pt-BR" | "en" | "es";
  category: "chat" | "action" | "clarify" | "control" | "prepare";
  userMessage: string;
  expected: AgentIntentDecision;
}

export const SMALL_MODEL_INTENT_FIXTURES: SmallModelIntentFixture[] = [
  {
    id: "pt-chat",
    language: "pt-BR",
    category: "chat",
    userMessage: "Oi, como você está?",
    expected: { mode: "chat", response: "Estou bem. Como posso ajudar?" },
  },
  {
    id: "en-chat",
    language: "en",
    category: "chat",
    userMessage: "Explain what the connected Drive tool can do.",
    expected: { mode: "chat", response: "It can retrieve files from Drive." },
  },
  {
    id: "es-clarify",
    language: "es",
    category: "clarify",
    userMessage: "Envía el archivo.",
    expected: { mode: "clarify", question: "¿Qué archivo y a qué destinatario?" },
  },
  {
    id: "pt-prepare-without-side-effect",
    language: "pt-BR",
    category: "prepare",
    userMessage: "Escreva um rascunho do email, mas não envie.",
    expected: { mode: "chat", response: "Claro. Qual deve ser o conteúdo do rascunho?" },
  },
  {
    id: "en-hypothetical-without-side-effect",
    language: "en",
    category: "prepare",
    userMessage: "How would you upload this video? Do not actually upload it.",
    expected: { mode: "chat", response: "I can explain the upload steps without executing them." },
  },
  {
    id: "pt-multi-action",
    language: "pt-BR",
    category: "action",
    userMessage: "Baixe X.mp4 do Drive, envie para Y e depois publique no YouTube.",
    expected: {
      mode: "action",
      actions: [
        { id: "download", toolName: "drive_download", objective: "Baixar X.mp4", dependsOn: [] },
        { id: "email", toolName: "email_send", objective: "Enviar X.mp4 para Y", dependsOn: ["download"] },
        { id: "publish", toolName: "youtube_upload", objective: "Publicar X.mp4", dependsOn: ["download"] },
      ],
    },
  },
  {
    id: "en-repeated-tool",
    language: "en",
    category: "action",
    userMessage: "Email the report to Ana and then email the same report to Bruno.",
    expected: {
      mode: "action",
      actions: [
        { id: "email_ana", toolName: "email_send", objective: "Email report to Ana", dependsOn: [] },
        { id: "email_bruno", toolName: "email_send", objective: "Email report to Bruno", dependsOn: ["email_ana"] },
      ],
    },
  },
  {
    id: "pt-control",
    language: "pt-BR",
    category: "control",
    userMessage: "Cancele essa operação.",
    expected: { mode: "chat", response: "Não há uma operação pendente para cancelar." },
  },
];
