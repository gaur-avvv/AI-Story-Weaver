import type { Settings } from '../types';

export interface ProviderOptimization {
  textModel: string;
  imageProvider: Settings['imageProvider'];
  imageModel: string;
  audioProvider: Settings['audioProvider'];
  audioModel: string;
  voice: string;
  providerDisplayName: string;
  description: string;
}

export const PROVIDER_OPTIMAL_DEFAULTS: Record<string, ProviderOptimization> = {
  gemini: {
    textModel: 'gemini-2.5-flash',
    imageProvider: 'gemini',
    imageModel: 'gemini-2.5-flash-image',
    audioProvider: 'gemini',
    audioModel: 'gemini-2.5-flash-preview-tts',
    voice: 'Kore',
    providerDisplayName: 'Google AI Studio (Gemini)',
    description: 'Default Recommended: Ultra-fast 2.5 Flash reasoning, high-sharpness 8K Gemini scene illustrations & natural voice TTS',
  },
  puter: {
    textModel: 'openai/gpt-5.4-nano',
    imageProvider: 'puter',
    imageModel: 'nanobanana-2-lite',
    audioProvider: 'pollinations',
    audioModel: 'openai-audio',
    voice: 'alloy',
    providerDisplayName: 'Puter AI (100% Free)',
    description: 'Zero API keys required. Free GPT-5.4 Nano, Nano Banana 2 Lite & OpenAI Audio',
  },
  pollinations: {
    textModel: 'openai',
    imageProvider: 'pollinations',
    imageModel: 'nanobanana-2-lite',
    audioProvider: 'pollinations',
    audioModel: 'openai-audio',
    voice: 'alloy',
    providerDisplayName: 'Pollinations.ai (100% Free)',
    description: 'Fast, unlimited free tier with Nano Banana & OpenAI Audio TTS',
  },
  openai: {
    textModel: 'gpt-4o-mini',
    imageProvider: 'openai',
    imageModel: 'dall-e-3',
    audioProvider: 'openai',
    audioModel: 'tts-1',
    voice: 'fable',
    providerDisplayName: 'OpenAI',
    description: 'GPT-4o Mini, DALL-E 3 creative images & expressive OpenAI TTS',
  },
  groq: {
    textModel: 'llama-3.3-70b-versatile',
    imageProvider: 'pollinations',
    imageModel: 'nanobanana-2-lite',
    audioProvider: 'pollinations',
    audioModel: 'openai-audio',
    voice: 'alloy',
    providerDisplayName: 'Groq Cloud',
    description: 'Ultra high-speed Llama 3.3 70B inference with free Nano Banana 2 imagery',
  },
  cerebras: {
    textModel: 'llama-3.3-70b',
    imageProvider: 'pollinations',
    imageModel: 'nanobanana-2-lite',
    audioProvider: 'pollinations',
    audioModel: 'openai-audio',
    voice: 'alloy',
    providerDisplayName: 'Cerebras',
    description: '1,800 tokens/sec Llama 3.3 70B with free multi-modal media generation',
  },
  mistral: {
    textModel: 'mistral-large-latest',
    imageProvider: 'pollinations',
    imageModel: 'nanobanana-2-lite',
    audioProvider: 'pollinations',
    audioModel: 'openai-audio',
    voice: 'alloy',
    providerDisplayName: 'Mistral AI',
    description: 'Mistral Large 3 creative storytelling with free fast Nano Banana visuals',
  },
  cohere: {
    textModel: 'command-r-plus-08-2024',
    imageProvider: 'pollinations',
    imageModel: 'nanobanana-2-lite',
    audioProvider: 'pollinations',
    audioModel: 'openai-audio',
    voice: 'alloy',
    providerDisplayName: 'Cohere',
    description: 'Command R+ rich narratives paired with free media generation',
  },
  nvidia: {
    textModel: 'meta/llama-3.3-70b-instruct',
    imageProvider: 'pollinations',
    imageModel: 'nanobanana-2-lite',
    audioProvider: 'pollinations',
    audioModel: 'openai-audio',
    voice: 'alloy',
    providerDisplayName: 'NVIDIA NIM',
    description: 'High-throughput Llama 3.3 70B Instruct with free media generation',
  },
  openrouter: {
    textModel: 'deepseek/deepseek-r1:free',
    imageProvider: 'pollinations',
    imageModel: 'nanobanana-2-lite',
    audioProvider: 'pollinations',
    audioModel: 'openai-audio',
    voice: 'alloy',
    providerDisplayName: 'OpenRouter',
    description: 'DeepSeek R1 Free Tier with free high-resolution story illustrations',
  },
  zai: {
    textModel: 'glm-4-flash',
    imageProvider: 'zai',
    imageModel: 'cogview-3-flash',
    audioProvider: 'pollinations',
    audioModel: 'openai-audio',
    voice: 'alloy',
    providerDisplayName: 'Z.AI (Zhipu)',
    description: 'GLM-4 Flash intelligence and CogView-3-Flash image synthesis',
  },
  siliconflow: {
    textModel: 'deepseek-ai/DeepSeek-V3',
    imageProvider: 'siliconflow',
    imageModel: 'black-forest-labs/FLUX.1-schnell',
    audioProvider: 'pollinations',
    audioModel: 'openai-audio',
    voice: 'alloy',
    providerDisplayName: 'SiliconFlow',
    description: 'DeepSeek V3 narration paired with Flux.1 Schnell fast image generation',
  },
  huggingface: {
    textModel: 'meta-llama/Llama-3.3-70B-Instruct',
    imageProvider: 'huggingface',
    imageModel: 'black-forest-labs/FLUX.1-schnell',
    audioProvider: 'pollinations',
    audioModel: 'openai-audio',
    voice: 'alloy',
    providerDisplayName: 'Hugging Face',
    description: 'Llama 3.3 70B Serverless Inference with Flux.1 Schnell images',
  },
  cloudflare: {
    textModel: '@cf/meta/llama-3.3-70b-instruct',
    imageProvider: 'pollinations',
    imageModel: 'nanobanana-2-lite',
    audioProvider: 'pollinations',
    audioModel: 'openai-audio',
    voice: 'alloy',
    providerDisplayName: 'Cloudflare Workers AI',
    description: 'Cloudflare edge Llama 3.3 with instant free media generation',
  },
  inception: {
    textModel: 'mercury-2',
    imageProvider: 'pollinations',
    imageModel: 'nanobanana-2-lite',
    audioProvider: 'pollinations',
    audioModel: 'openai-audio',
    voice: 'alloy',
    providerDisplayName: 'Inception AI',
    description: 'Mercury 2 fast reasoning with instant free media generation',
  },
  requesty: {
    textModel: 'meta-llama/llama-3.3-70b',
    imageProvider: 'pollinations',
    imageModel: 'nanobanana-2-lite',
    audioProvider: 'pollinations',
    audioModel: 'openai-audio',
    voice: 'alloy',
    providerDisplayName: 'Requesty AI',
    description: 'Llama 3.3 70B router with instant free Nano Banana 2 media generation',
  },
  others: {
    textModel: 'deepseek-ai/DeepSeek-V3',
    imageProvider: 'pollinations',
    imageModel: 'nanobanana-2-lite',
    audioProvider: 'pollinations',
    audioModel: 'openai-audio',
    voice: 'alloy',
    providerDisplayName: 'Custom / OpenAI Compatible',
    description: 'Universal OpenAI endpoint with high-speed media generation',
  },
};

/**
 * Automatically calculates and synchronizes optimal text, image, and audio models for a given provider.
 */
export function getOptimalSettingsForProvider(
  provider: string,
  existingSettings: Settings
): Partial<Settings> {
  const opt = PROVIDER_OPTIMAL_DEFAULTS[provider] || PROVIDER_OPTIMAL_DEFAULTS.gemini;

  return {
    textProvider: provider as any,
    textModel: opt.textModel,
    imageProvider: opt.imageProvider,
    imageModel: opt.imageModel,
    audioProvider: opt.audioProvider,
    audioModel: opt.audioModel,
    voice: opt.voice,
  };
}
