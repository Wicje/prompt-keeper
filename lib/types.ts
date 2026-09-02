export type AiSource = "chatgpt" | "gemini" | "grok" | "other";

export interface Prompt {
  id: string;
  user_id: string;
  prompt_text: string;
  notes: string | null;
  ai_source: AiSource | string | null;
  source_url: string | null;
  created_at: string;
}

export interface GeneratedImage {
  id: string;
  user_id: string;
  prompt_id: string | null;
  storage_path: string;
  public_url: string;
  caption: string | null;
  created_at: string;
}

export interface PromptWithImages extends Prompt {
  generated_images: GeneratedImage[];
}
