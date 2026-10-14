export type CapabilityType = 'text' | 'image' | 'audio';
export type ProviderType = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'openai_compatible';

export interface CustomModelEndpoint {
  id: string;
  name: string;
  provider: ProviderType;
  baseUrl: string;
  modelId: string;
  apiKey: string;
  capabilities: CapabilityType[];
  createdAt: number;
}

export interface RegisteredModel {
  id: string;
  name: string;
  provider: string;
  providerKey: string;
  modelId: string;
  capabilities: CapabilityType[];
  isCustom?: boolean;
  endpointId?: string;
  badge?: string;
  description?: string;
  baseUrl?: string;
  apiKey?: string;
}

const STORAGE_KEY_CUSTOM_MODELS = 'novella_custom_models';
const STORAGE_KEY_ACTIVE_TEXT = 'novella_active_text_engine';
const STORAGE_KEY_ACTIVE_VISION = 'novella_active_vision_engine';
const STORAGE_KEY_ACTIVE_AUDIO = 'novella_active_audio_engine';

export const PROVIDER_DEFAULT_BASE_URLS: Record<ProviderType, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  google: 'https://generativelanguage.googleapis.com',
  deepseek: 'https://api.deepseek.com/v1',
  openai_compatible: 'https://api.groq.com/openai/v1',
};

export const PROVIDER_LABELS: Record<ProviderType, string> = {
  google: 'Google (Gemini)',
  openai: 'OpenAI (GPT & DALL-E)',
  anthropic: 'Anthropic (Claude)',
  deepseek: 'DeepSeek',
  openai_compatible: 'Generic OpenAI-Compatible (Groq, Together, Ollama, etc.)',
};

// Built-in curated models across capabilities
export const BUILTIN_MODELS: RegisteredModel[] = [
  // --- TEXT ENGINES ---
  {
    id: 'gemini:gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google Gemini',
    providerKey: 'gemini',
    modelId: 'gemini-2.5-flash',
    capabilities: ['text'],
    badge: 'Recommended',
    description: 'Fast, high-quality multimodal storytelling with instant responses',
  },
  {
    id: 'gemini:gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google Gemini',
    providerKey: 'gemini',
    modelId: 'gemini-2.5-pro',
    capabilities: ['text'],
    badge: 'Pro Reasoning',
    description: 'Deep narrative depth, complex character arcs, and rich worldbuilding',
  },
  {
    id: 'gemini:gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'Google Gemini',
    providerKey: 'gemini',
    modelId: 'gemini-2.0-flash',
    capabilities: ['text'],
    badge: 'Ultra Fast',
    description: 'Ultra-low latency narrative drafting',
  },
  {
    id: 'openai:gpt-4o',
    name: 'GPT-4o Flagship',
    provider: 'OpenAI',
    providerKey: 'openai',
    modelId: 'gpt-4o',
    capabilities: ['text'],
    badge: 'Flagship',
    description: 'Flagship omni-intelligence for structured and dramatic storytelling',
  },
  {
    id: 'openai:gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    providerKey: 'openai',
    modelId: 'gpt-4o-mini',
    capabilities: ['text'],
    badge: 'Fast',
    description: 'Efficient, high-speed narrative generation with great value',
  },
  {
    id: 'anthropic:claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    providerKey: 'anthropic',
    modelId: 'claude-3-7-sonnet',
    capabilities: ['text'],
    badge: 'Hybrid Reasoning',
    description: 'Nuanced literary prose with adaptive reasoning depth',
  },
  {
    id: 'anthropic:claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    providerKey: 'anthropic',
    modelId: 'claude-3-5-sonnet',
    capabilities: ['text'],
    badge: 'Literary Prose',
    description: 'Exquisite literary vocabulary, pacing, and dialogue flow',
  },
  {
    id: 'deepseek:deepseek-chat',
    name: 'DeepSeek-V3',
    provider: 'DeepSeek',
    providerKey: 'deepseek',
    modelId: 'deepseek-chat',
    capabilities: ['text'],
    badge: 'High Value',
    description: 'Exceptional open-weight creative prose with high throughput',
  },
  {
    id: 'deepseek:deepseek-reasoner',
    name: 'DeepSeek-R1',
    provider: 'DeepSeek',
    providerKey: 'deepseek',
    modelId: 'deepseek-reasoner',
    capabilities: ['text'],
    badge: 'Deep Thinking',
    description: 'Chain-of-thought narrative reasoning for intricate plot puzzles',
  },
  {
    id: 'pollinations:pollinations-free',
    name: 'Pollinations AI (Free)',
    provider: 'Pollinations',
    providerKey: 'pollinations',
    modelId: 'pollinations-free',
    capabilities: ['text'],
    badge: '100% Free',
    description: 'No key required, instant community creative writing model',
  },

  // --- VISION / IMAGE ENGINES ---
  {
    id: 'gemini:gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    provider: 'Google AI Studio',
    providerKey: 'gemini',
    modelId: 'gemini-2.5-flash-image',
    capabilities: ['image'],
    badge: 'Recommended',
    description: 'Context-aware scene illustrations aligned with chosen artistic styles',
  },
  {
    id: 'gemini:imagen-4-ultra-generate',
    name: 'Imagen 4 Ultra',
    provider: 'Google AI Studio',
    providerKey: 'gemini',
    modelId: 'imagen-4-ultra-generate',
    capabilities: ['image'],
    badge: 'Photorealism',
    description: 'Google state-of-the-art cinematic image generation',
  },
  {
    id: 'gemini:imagen-4-generate',
    name: 'Imagen 4 Studio',
    provider: 'Google AI Studio',
    providerKey: 'gemini',
    modelId: 'imagen-4-generate',
    capabilities: ['image'],
    badge: 'Studio Quality',
    description: 'Masterpiece illustration with exquisite atmospheric lighting',
  },
  {
    id: 'openai:dall-e-3',
    name: 'DALL-E 3',
    provider: 'OpenAI',
    providerKey: 'openai',
    modelId: 'dall-e-3',
    capabilities: ['image'],
    badge: 'High Detail',
    description: 'Faithful prompt adherence with vivid artistic rendering',
  },
  {
    id: 'pollinations:nanobanana-2',
    name: 'Nano Banana 2 (Free)',
    provider: 'Pollinations.ai',
    providerKey: 'pollinations',
    modelId: 'nanobanana-2',
    capabilities: ['image'],
    badge: '100% Free',
    description: 'HDR crisp scene artwork with vibrant color grading',
  },
  {
    id: 'pollinations:flux',
    name: 'Flux.1 Schnell (Free)',
    provider: 'Pollinations.ai',
    providerKey: 'pollinations',
    modelId: 'flux',
    capabilities: ['image'],
    badge: 'Flux Open',
    description: 'State of the art open-weight image synthesis',
  },
  {
    id: 'cloudflare:flux-schnell',
    name: 'Cloudflare Flux.1 (Free Tier)',
    provider: 'Cloudflare Workers AI',
    providerKey: 'cloudflare',
    modelId: 'flux-schnell',
    capabilities: ['image'],
    badge: '10K Daily Free',
    description: 'Edge-rendered Flux.1 model with sub-second generation',
  },
  {
    id: 'cloudflare:@cf/stabilityai/stable-diffusion-xl-base-1.0',
    name: 'Cloudflare SDXL 1.0 (Free Tier)',
    provider: 'Cloudflare Workers AI',
    providerKey: 'cloudflare',
    modelId: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    capabilities: ['image'],
    badge: '10K Neurons/Day',
    description: 'Cloudflare edge-accelerated SDXL base model with 10K free neural steps daily',
  },
  {
    id: 'cloudflare:saurav-z-gateway',
    name: 'Cloudflare saurav-z Gateway',
    provider: 'Cloudflare Workers AI',
    providerKey: 'cloudflare',
    modelId: 'saurav-z-gateway',
    capabilities: ['image'],
    badge: 'Unlimited BYO',
    description: 'Self-hosted free-image-generation-api Worker gateway endpoint',
  },
  // Pixazo Dedicated Media Generation Gateway (Permanent Free Tier)
  {
    id: 'pixazo:flux-schnell',
    name: 'Pixazo Flux Schnell (Free Tier)',
    provider: 'Pixazo API',
    providerKey: 'pixazo',
    modelId: 'flux-schnell',
    capabilities: ['image'],
    badge: 'Permanent Free',
    description: 'Dedicated media generation gateway supporting Flux Schnell up to 1024px',
  },
  {
    id: 'pixazo:stable-diffusion-3.5',
    name: 'Pixazo SD 3.5 Large (Free Tier)',
    provider: 'Pixazo API',
    providerKey: 'pixazo',
    modelId: 'stable-diffusion-3.5',
    capabilities: ['image'],
    badge: 'SD 3.5 Free',
    description: 'Stable Diffusion 3.5 Large with free subscription key without upfront card',
  },
  {
    id: 'pixazo:sdxl-base-1.0',
    name: 'Pixazo SDXL 1.0 (Free Tier)',
    provider: 'Pixazo API',
    providerKey: 'pixazo',
    modelId: 'sdxl-base-1.0',
    capabilities: ['image'],
    badge: 'SDXL Free',
    description: 'Permanent free tier SDXL base model up to 1024px resolution',
  },
  // FluxNote API (100 Free Monthly Credits)
  {
    id: 'fluxnote:fluxnote-ultra',
    name: 'FluxNote Ultra (100 Free Cr/mo)',
    provider: 'FluxNote',
    providerKey: 'fluxnote',
    modelId: 'fluxnote-ultra',
    capabilities: ['image'],
    badge: '100 Free Cr/mo',
    description: 'Watermark-free imagery across 20+ models with 100 free monthly credits',
  },
  {
    id: 'fluxnote:fluxnote-cinematic',
    name: 'FluxNote Cinematic',
    provider: 'FluxNote',
    providerKey: 'fluxnote',
    modelId: 'fluxnote-cinematic',
    capabilities: ['image'],
    badge: 'Cinematic',
    description: 'High-contrast narrative cinematic lighting and realism',
  },
  {
    id: 'fluxnote:fluxnote-anime',
    name: 'FluxNote Anime Studio',
    provider: 'FluxNote',
    providerKey: 'fluxnote',
    modelId: 'fluxnote-anime',
    capabilities: ['image'],
    badge: 'Anime',
    description: 'Vibrant Japanese animation art style',
  },
  // Hugging Face Inference API (Free Serverless)
  {
    id: 'huggingface:black-forest-labs/FLUX.1-schnell',
    name: 'Hugging Face FLUX.1 Schnell',
    provider: 'Hugging Face',
    providerKey: 'huggingface',
    modelId: 'black-forest-labs/FLUX.1-schnell',
    capabilities: ['image'],
    badge: 'Free Serverless',
    description: 'Serverless calls to community-hosted FLUX.1 Schnell at no cost',
  },
  {
    id: 'huggingface:stabilityai/stable-diffusion-xl-base-1.0',
    name: 'Hugging Face SDXL Base',
    provider: 'Hugging Face',
    providerKey: 'huggingface',
    modelId: 'stabilityai/stable-diffusion-xl-base-1.0',
    capabilities: ['image'],
    badge: 'Free Serverless',
    description: 'Community-hosted SDXL 1.0 text-to-image pipeline',
  },
  {
    id: 'huggingface:stabilityai/stable-diffusion-3.5-large',
    name: 'Hugging Face SD 3.5 Large',
    provider: 'Hugging Face',
    providerKey: 'huggingface',
    modelId: 'stabilityai/stable-diffusion-3.5-large',
    capabilities: ['image'],
    badge: 'SD 3.5',
    description: 'Flagship open weights Stable Diffusion 3.5 Large inference',
  },
  // Leonardo.ai (150 Tokens/Day Recurring)
  {
    id: 'leonardo:leonardo-phoenix',
    name: 'Leonardo Phoenix (150 Tokens/Day)',
    provider: 'Leonardo.ai',
    providerKey: 'leonardo',
    modelId: 'leonardo-phoenix',
    capabilities: ['image'],
    badge: '150 Tokens/Day',
    description: 'Free recurring allowance of 150 tokens every 24h without credit card',
  },
  {
    id: 'leonardo:leonardo-kino-xl',
    name: 'Leonardo Kino XL (Cinematic)',
    provider: 'Leonardo.ai',
    providerKey: 'leonardo',
    modelId: 'leonardo-kino-xl',
    capabilities: ['image'],
    badge: 'Kino XL',
    description: 'Cinematic widescreen rendering with dramatic focal framing',
  },
  {
    id: 'leonardo:leonardo-diffusion-xl',
    name: 'Leonardo Diffusion XL',
    provider: 'Leonardo.ai',
    providerKey: 'leonardo',
    modelId: 'leonardo-diffusion-xl',
    capabilities: ['image'],
    badge: 'Diffusion XL',
    description: 'Versatile photoreal and fantasy aesthetic diffusion engine',
  },
  // Replicate (~$5 Computational Credits Free Trial)
  {
    id: 'replicate:black-forest-labs/flux-schnell',
    name: 'Replicate FLUX.1 Schnell ($5 Free)',
    provider: 'Replicate',
    providerKey: 'replicate',
    modelId: 'black-forest-labs/flux-schnell',
    capabilities: ['image'],
    badge: '$5 Free Credits',
    description: 'Run cloud-hosted FLUX.1 Schnell with free trial computation credits',
  },
  {
    id: 'replicate:stability-ai/sdxl',
    name: 'Replicate SDXL 1.0',
    provider: 'Replicate',
    providerKey: 'replicate',
    modelId: 'stability-ai/sdxl',
    capabilities: ['image'],
    badge: 'SDXL',
    description: 'Official Stability AI SDXL on Replicate infrastructure',
  },
  {
    id: 'puter:puter-flux',
    name: 'Puter AI Flux (Free)',
    provider: 'Puter AI',
    providerKey: 'puter',
    modelId: 'flux',
    capabilities: ['image'],
    badge: 'Free',
    description: 'Browser-native cloud accelerated scene rendering',
  },

  // --- AUDIO / NARRATION ENGINES ---
  {
    id: 'gemini:gemini-tts-puck',
    name: 'Gemini Voice: Puck (Storyteller)',
    provider: 'Google Gemini',
    providerKey: 'gemini',
    modelId: 'Puck',
    capabilities: ['audio'],
    badge: 'Recommended',
    description: 'Warm, engaging classic audio storytelling cadence',
  },
  {
    id: 'gemini:gemini-tts-fenrir',
    name: 'Gemini Voice: Fenrir (Dramatic)',
    provider: 'Google Gemini',
    providerKey: 'gemini',
    modelId: 'Fenrir',
    capabilities: ['audio'],
    badge: 'Dramatic',
    description: 'Deep, resonant, suspenseful fantasy & thriller narration',
  },
  {
    id: 'gemini:gemini-tts-kore',
    name: 'Gemini Voice: Kore (Soothing)',
    provider: 'Google Gemini',
    providerKey: 'gemini',
    modelId: 'Kore',
    capabilities: ['audio'],
    badge: 'Soothing',
    description: 'Gentle, melodious bedtime and poetic prose reading',
  },
  {
    id: 'gemini:gemini-tts-aoede',
    name: 'Gemini Voice: Aoede (Expressive)',
    provider: 'Google Gemini',
    providerKey: 'gemini',
    modelId: 'Aoede',
    capabilities: ['audio'],
    badge: 'Expressive',
    description: 'Lyrical character narration with natural inflections',
  },
  {
    id: 'openai:tts-1-alloy',
    name: 'OpenAI TTS: Alloy',
    provider: 'OpenAI',
    providerKey: 'openai',
    modelId: 'alloy',
    capabilities: ['audio'],
    badge: 'Studio',
    description: 'Balanced, modern neutral studio narration voice',
  },
  {
    id: 'openai:tts-1-onyx',
    name: 'OpenAI TTS: Onyx',
    provider: 'OpenAI',
    providerKey: 'openai',
    modelId: 'onyx',
    capabilities: ['audio'],
    badge: 'Deep Baritone',
    description: 'Deep baritone voice with gravitas and authority',
  },
  {
    id: 'browser:webspeech',
    name: 'Browser WebSpeech API',
    provider: 'Local Device',
    providerKey: 'browser',
    modelId: 'webspeech',
    capabilities: ['audio'],
    badge: 'Offline / Free',
    description: 'Synthesizes locally in browser without using any API tokens',
  },
  {
    id: 'pollinations:pollinations-audio',
    name: 'Pollinations Audio (Free)',
    provider: 'Pollinations.ai',
    providerKey: 'pollinations',
    modelId: 'audio-free',
    capabilities: ['audio'],
    badge: '100% Free',
    description: 'Free open audio voice narration engine',
  },
];

class ModelRegistryServiceImpl {
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Initial check and synchronization
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn('Listener error in ModelRegistryService:', err);
      }
    });
  }

  // --- CUSTOM ENDPOINTS MANAGEMENT ---

  public getCustomEndpoints(): CustomModelEndpoint[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CUSTOM_MODELS);
      if (!data) return [];
      return JSON.parse(data) as CustomModelEndpoint[];
    } catch (err) {
      console.warn('Failed to load custom endpoints:', err);
      return [];
    }
  }

  public saveCustomEndpoint(
    endpoint: Omit<CustomModelEndpoint, 'id' | 'createdAt'> & { id?: string }
  ): CustomModelEndpoint {
    const endpoints = this.getCustomEndpoints();
    const id = endpoint.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newEndpoint: CustomModelEndpoint = {
      ...endpoint,
      id,
      createdAt: endpoint.id ? (endpoints.find(e => e.id === endpoint.id)?.createdAt || Date.now()) : Date.now(),
    };

    const index = endpoints.findIndex((e) => e.id === id);
    if (index >= 0) {
      endpoints[index] = newEndpoint;
    } else {
      endpoints.push(newEndpoint);
    }

    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_MODELS, JSON.stringify(endpoints));
    } catch (err) {
      console.error('Failed to save custom endpoints to localStorage:', err);
    }

    this.notify();
    return newEndpoint;
  }

  public deleteCustomEndpoint(id: string): void {
    const endpoints = this.getCustomEndpoints().filter((e) => e.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_MODELS, JSON.stringify(endpoints));
    } catch (err) {
      console.error('Failed to update localStorage after endpoint deletion:', err);
    }

    // Reset active engines if they were pointing to this custom endpoint
    const customId = `custom:${id}`;
    if (this.getActiveEngine('text') === customId) {
      this.setActiveEngine('text', 'gemini:gemini-2.5-flash');
    }
    if (this.getActiveEngine('vision') === customId) {
      this.setActiveEngine('vision', 'gemini:gemini-2.5-flash-image');
    }
    if (this.getActiveEngine('audio') === customId) {
      this.setActiveEngine('audio', 'gemini:gemini-tts-puck');
    }

    this.notify();
  }

  // --- QUERY MODELS ---

  public getModelsByCapability(capability: CapabilityType): RegisteredModel[] {
    const builtin = BUILTIN_MODELS.filter((m) => m.capabilities.includes(capability));
    const custom = this.getCustomEndpoints()
      .filter((e) => e.capabilities.includes(capability))
      .map((e) => ({
        id: `custom:${e.id}`,
        name: e.name,
        provider: PROVIDER_LABELS[e.provider] || 'Custom Provider',
        providerKey: e.provider,
        modelId: e.modelId,
        capabilities: e.capabilities,
        isCustom: true,
        endpointId: e.id,
        badge: 'Custom',
        description: `Custom ${e.provider} endpoint at ${e.baseUrl || 'default URL'}`,
        baseUrl: e.baseUrl,
        apiKey: e.apiKey,
      }));

    return [...builtin, ...custom];
  }

  public getModelById(id: string): RegisteredModel | undefined {
    if (id.startsWith('custom:')) {
      const endpointId = id.replace('custom:', '');
      const endpoint = this.getCustomEndpoints().find((e) => e.id === endpointId);
      if (endpoint) {
        return {
          id,
          name: endpoint.name,
          provider: PROVIDER_LABELS[endpoint.provider] || 'Custom Provider',
          providerKey: endpoint.provider,
          modelId: endpoint.modelId,
          capabilities: endpoint.capabilities,
          isCustom: true,
          endpointId: endpoint.id,
          badge: 'Custom',
          baseUrl: endpoint.baseUrl,
          apiKey: endpoint.apiKey,
        };
      }
    }
    return BUILTIN_MODELS.find((m) => m.id === id);
  }

  // --- ACTIVE ENGINES STATE PERSISTENCE ---

  public getActiveEngine(capability: CapabilityType | 'vision'): string {
    const key =
      capability === 'text'
        ? STORAGE_KEY_ACTIVE_TEXT
        : capability === 'image' || capability === 'vision'
        ? STORAGE_KEY_ACTIVE_VISION
        : STORAGE_KEY_ACTIVE_AUDIO;

    try {
      const saved = localStorage.getItem(key);
      if (saved) return saved;
    } catch {}

    // Defaults
    if (capability === 'text') return 'gemini:gemini-2.5-flash';
    if (capability === 'image' || (capability as string) === 'vision') return 'gemini:gemini-2.5-flash-image';
    return 'gemini:gemini-tts-puck';
  }

  public setActiveEngine(capability: CapabilityType | 'vision', modelId: string): void {
    const key =
      capability === 'text'
        ? STORAGE_KEY_ACTIVE_TEXT
        : capability === 'image' || capability === 'vision'
        ? STORAGE_KEY_ACTIVE_VISION
        : STORAGE_KEY_ACTIVE_AUDIO;

    try {
      localStorage.setItem(key, modelId);
    } catch (err) {
      console.warn('Failed to save active engine:', err);
    }
    this.notify();
  }

  public getAllActiveEngines(): { textEngine: string; visionEngine: string; audioEngine: string } {
    return {
      textEngine: this.getActiveEngine('text'),
      visionEngine: this.getActiveEngine('image'),
      audioEngine: this.getActiveEngine('audio'),
    };
  }

  // --- VALIDATION & CONNECTION TEST ---

  public async testConnection(endpoint: {
    provider: ProviderType;
    baseUrl: string;
    modelId: string;
    apiKey: string;
  }): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const startTime = performance.now();
    const cleanUrl = (endpoint.baseUrl || PROVIDER_DEFAULT_BASE_URLS[endpoint.provider] || '').replace(/\/+$/, '');
    const cleanKey = endpoint.apiKey?.trim();

    try {
      if (endpoint.provider === 'google') {
        if (!cleanKey) {
          return { success: false, message: 'Google API key is required to test connection.' };
        }
        const testUrl = `${cleanUrl || 'https://generativelanguage.googleapis.com'}/v1beta/models/${endpoint.modelId || 'gemini-2.5-flash'}?key=${cleanKey}`;
        const res = await fetch(testUrl, { method: 'GET' });
        const latencyMs = Math.round(performance.now() - startTime);

        if (res.ok) {
          return {
            success: true,
            message: `Connected successfully to Google AI Studio (${endpoint.modelId}) in ${latencyMs}ms.`,
            latencyMs,
          };
        } else {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${res.status} ${res.statusText}`;
          return {
            success: false,
            message: `Google API Error: ${errMsg}`,
            latencyMs,
          };
        }
      }

      if (endpoint.provider === 'anthropic') {
        if (!cleanKey) {
          return { success: false, message: 'Anthropic API key is required.' };
        }
        const testUrl = `${cleanUrl || 'https://api.anthropic.com/v1'}/messages`;
        const res = await fetch(testUrl, {
          method: 'POST',
          headers: {
            'x-api-key': cleanKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'dangerously-allow-browser': 'true',
          },
          body: JSON.stringify({
            model: endpoint.modelId || 'claude-3-5-haiku-20241022',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'ping' }],
          }),
        });
        const latencyMs = Math.round(performance.now() - startTime);

        if (res.ok || res.status === 200) {
          return {
            success: true,
            message: `Connected successfully to Anthropic (${endpoint.modelId}) in ${latencyMs}ms.`,
            latencyMs,
          };
        } else {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${res.status} ${res.statusText}`;
          return {
            success: false,
            message: `Anthropic Error: ${errMsg}`,
            latencyMs,
          };
        }
      }

      // OpenAI, DeepSeek, or generic OpenAI-Compatible
      const targetUrl = cleanUrl || PROVIDER_DEFAULT_BASE_URLS[endpoint.provider];
      if (!targetUrl) {
        return { success: false, message: 'A valid Base URL is required.' };
      }

      // First attempt: lightweight chat completion ping
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (cleanKey) {
        headers['Authorization'] = `Bearer ${cleanKey}`;
      }

      const res = await fetch(`${targetUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: endpoint.modelId || 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 2,
        }),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (res.ok) {
        return {
          success: true,
          message: `Verified endpoint & model (${endpoint.modelId}) in ${latencyMs}ms!`,
          latencyMs,
        };
      }

      // If chat completions gave an error, parse details
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || errData.message || `HTTP ${res.status} ${res.statusText}`;

      // Check if it's an auth error vs model error
      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          message: `Authentication Failed (${res.status}): Please check your API key for this endpoint.`,
          latencyMs,
        };
      }

      if (res.status === 404) {
        // Try testing /models endpoint to see if server is alive
        const modelsRes = await fetch(`${targetUrl}/models`, { method: 'GET', headers }).catch(() => null);
        if (modelsRes && modelsRes.ok) {
          return {
            success: false,
            message: `Server reached, but Model ID '${endpoint.modelId}' was not found. Please verify the exact model name.`,
            latencyMs,
          };
        }
      }

      return {
        success: false,
        message: `Endpoint Error (${res.status}): ${errMsg}`,
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      const isCorsOrNetwork = err?.message?.includes('Failed to fetch') || err?.name === 'TypeError';
      return {
        success: false,
        message: isCorsOrNetwork
          ? `Network / CORS Error: Could not reach "${cleanUrl}". Ensure server is online, URL is correct, and CORS allows browser requests.`
          : `Connection Test Failed: ${err?.message || err}`,
        latencyMs,
      };
    }
  }
}

export const ModelRegistryService = new ModelRegistryServiceImpl();
