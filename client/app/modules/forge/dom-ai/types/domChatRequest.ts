export type ChatBotMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  date: Date;
};

export interface DomChatRequest {
  previousMessages?: ChatBotMessage[];
  newMessage: ChatBotMessage;
}
