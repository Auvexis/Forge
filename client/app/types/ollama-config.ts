export interface OllamaOptions {
  temperature?: number;
  num_ctx?: number;

  [key: string]: unknown;
}

export interface OllamaConfigModel {
  host: string;
  model: string;
  options: OllamaOptions | null;
}
