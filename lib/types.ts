export type AiSource = "chatgpt" | "gemini" | "grok" | "other";

export interface Prompt {
  id: string;
  user_id: string;
  prompt_text: string;
  title: string | null;
  notes: string | null;
  ai_source: AiSource | string | null;
  source_url: string | null;
  reference_storage_path: string | null;
  reference_public_url: string | null;
  tags: string[];
  favorite: boolean;
  share_token: string | null;
  shared_at: string | null;
  created_at: string;
  updated_at: string;
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