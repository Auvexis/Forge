export type OllamaConfig = {
  host: string;
  model: string;
  options: {
    temperature: number;
    num_ctx: 4096;
    [key: string]: unknown;
  };
};
