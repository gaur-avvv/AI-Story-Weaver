import { GoogleGenAI, Type, Modality } from '@google/genai';
import OpenAI from 'openai';
import { globalStoryGraph } from './storyGraphState';

// Helper to retry external API calls with exponential backoff and jitter
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1000,
  backoffFactor = 2
): Promise<T> {
  let attempt = 0;
  let delay = initialDelayMs;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const isMissingKey = err?.message?.includes('API key is not configured') || err?.message?.includes('missing');
      if (attempt >= maxRetries || isMissingKey) {
        throw err;
      }
      console.warn(`[API Retry] Attempt ${attempt}/${maxRetries} failed: ${err?.message || err}. Retrying in ${delay}ms...`);
      const jitter = Math.floor(Math.random() * 200);
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
      delay *= backoffFactor;
    }
  }
}

// Helper to safely extract and parse JSON from any AI output (handling markdown fences, reasoning tags, etc.)
export function extractJson<T = any>(rawText: string): T {
  if (!rawText) throw new Error("Empty AI response received.");
  
  let cleaned = rawText.trim();
  // Strip DeepSeek / Qwen reasoning <think>...</think> blocks
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  
  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Strip markdown code fences (```json ... ``` or ``` ...)
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // Extract from the first '{' to the last '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonSubstring = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonSubstring);
    } catch {}
    try {
      const sanitized = jsonSubstring
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/[\u0000-\u001F]+/g, " ");
      return JSON.parse(sanitized);
    } catch {}
  }

  // Extract from the first '[' to the last ']' for array responses
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const jsonSubstring = cleaned.substring(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(jsonSubstring);
    } catch {}
  }

  throw new Error(`Failed to parse valid JSON from AI response: ${cleaned.slice(0, 150)}...`);
}

// Call Puter AI Chat (100% Free, no API key required)
async function callPuterAiChat(prompt: string, systemPrompt: string, model: string = 'openai/gpt-5.4-nano'): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).puter?.ai) {
    throw new Error("Puter.js AI is not initialized. Please ensure your internet connection is active.");
  }
  const puter = (window as any).puter;
  const fullPrompt = `${systemPrompt}\n\nUser Request:\n${prompt}\n\nIMPORTANT: Respond with ONLY a valid JSON object matching the requested schema. Do not enclose in markdown explanation outside the JSON.`;
  
  const response = await puter.ai.chat(fullPrompt, { model });
  if (typeof response === 'string') return response;
  if (Array.isArray(response?.message?.content)) {
    return response.message.content.map((c: any) => (typeof c === 'string' ? c : c?.text || '')).join('');
  }
  if (typeof response?.message?.content === 'string') return response.message.content;
  if (response?.text) return response.text;
  if (response?.content) return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  if (response?.toString && typeof response.toString === 'function' && response.toString() !== '[object Object]') {
    return response.toString();
  }
  return JSON.stringify(response);
}

// Helper to get the correct AI client instance
const getAiClient = (apiKey?: string | null): GoogleGenAI => {
  // The app is designed to allow a user-provided API key, which takes precedence.
  // If not provided, it attempts to fall back to the environment variable.
  const keyToUse = apiKey || process.env.API_KEY || (process.env as any)?.GEMINI_API_KEY || (import.meta as any)?.env?.VITE_GEMINI_API_KEY || (import.meta as any)?.env?.GEMINI_API_KEY;
  if (!keyToUse) {
    throw new Error("API key is not configured. Please provide your Gemini API key in the settings.");
  }
  return new GoogleGenAI({ apiKey: keyToUse });
};

export function getOpenAIProviderConfig(
  provider: string,
  options?: { apiKey?: string; customBaseUrl?: string; cloudflareAccountId?: string }
): { baseURL: string; effectiveApiKey: string } {
  let baseURL = '';
  switch (provider) {
    case 'zai':
      baseURL = 'https://api.z.ai/api/paas/v4';
      break;
    case 'inception':
      baseURL = 'https://api.inceptionlabs.ai/v1';
      break;
    case 'groq':
      baseURL = 'https://api.groq.com/openai/v1';
      break;
    case 'cerebras':
      baseURL = 'https://api.cerebras.ai/v1';
      break;
    case 'mistral':
      baseURL = 'https://api.mistral.ai/v1';
      break;
    case 'cohere':
      baseURL = 'https://api.cohere.com/compatibility/v1';
      break;
    case 'nvidia':
      baseURL = 'https://integrate.api.nvidia.com/v1';
      break;
    case 'openrouter':
      baseURL = 'https://openrouter.ai/api/v1';
      break;
    case 'requesty':
      baseURL = 'https://router.requesty.ai/v1';
      break;
    case 'huggingface':
      baseURL = 'https://router.huggingface.co/novita/v1';
      break;
    case 'cloudflare': {
      const accountId = options?.cloudflareAccountId || 'your-account-id';
      baseURL = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
      break;
    }
    case 'siliconflow':
      baseURL = 'https://api.siliconflow.cn/v1';
      break;
    case 'pollinations':
      baseURL = 'https://gen.pollinations.ai/v1';
      break;
    case 'openai':
      baseURL = 'https://api.openai.com/v1';
      break;
    case 'others':
    default:
      baseURL = options?.customBaseUrl?.trim() || 'https://api.openai.com/v1';
      break;
  }

  const effectiveApiKey = options?.apiKey || (provider === 'pollinations' ? 'dummy' : '');
  return { baseURL, effectiveApiKey };
}

const getOpenAIClient = (apiKey: string, baseURL: string): OpenAI => {
  return new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
    dangerouslyAllowBrowser: true // Required for client-side usage
  });
};


const storySchema = {
// ... (keep existing storySchema)
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'The title of the story.',
    },
    paragraphs: {
      type: Type.ARRAY,
      description: 'The paragraphs of the story.',
      items: { type: Type.STRING },
    },
  },
  required: ['title', 'paragraphs'],
};

const getLengthDescription = (length: 'very_short' | 'short' | 'medium' | 'long' | 'very_long'): string => {
  switch (length) {
    case 'very_short':
      return 'between 1 and 2';
    case 'short':
      return 'between 3 and 4';
    case 'medium':
      return 'between 5 and 6';
    case 'long':
      return 'between 7 and 8';
    case 'very_long':
      return 'between 9 and 12';
    default:
      return 'between 5 and 6';
  }
};


export const generateStory = async (
  prompt: string,
  language: string,
  apiKey: string | null, // This is the Gemini API Key
  genre: string,
  length: 'very_short' | 'short' | 'medium' | 'long' | 'very_long',
  model: string = 'gemini-2.5-flash',
  provider: string = 'gemini',
  otherApiKey?: string, // For non-Gemini providers
  targetAudience: 'children' | 'teen' | 'adult' = 'children',
  options?: { customBaseUrl?: string; cloudflareAccountId?: string }
): Promise<{ title: string; paragraphs: string[] }> => {
  
  const lengthDescription = getLengthDescription(length);
  
  let audienceInstruction = '';
  switch (targetAudience) {
    case 'children':
      audienceInstruction = 'Ensure the story is imaginative, engaging, and easy for a child to understand. Use simple language, positive themes, and a clear moral or lesson. Avoid scary or inappropriate content.';
      break;
    case 'teen':
      audienceInstruction = 'The story should be engaging for teenagers, with slightly more complex themes and vocabulary. It can include elements of adventure, mystery, or coming-of-age. The tone should be relatable to young adults.';
      break;
    case 'adult':
      audienceInstruction = 'The story is for an adult audience. It can explore mature themes, complex character development, and sophisticated vocabulary. The tone should be appropriate for the genre, whether it be dark, romantic, or intellectual.';
      break;
  }

  const systemInstruction = `You are a master storyteller. Write a captivating short story in the ${genre} genre, in the ${language} language. 
  
  Target Audience: ${targetAudience}
  ${audienceInstruction}
  
  Structure:
  The story must have a title and be ${lengthDescription} paragraphs long.
  Each paragraph should be distinct and move the story forward.
  
  Output Format:
  Return the response as a JSON object with "title" and "paragraphs" fields.
  Example: { "title": "The Title", "paragraphs": ["Paragraph 1...", "Paragraph 2..."] }`;

  return withRetry(async () => {
    if (provider === 'gemini') {
      const ai = getAiClient(apiKey);
      const response = await ai.models.generateContent({
        model: model,
        contents: `The story should be about: "${prompt}"`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: storySchema,
        },
      });
      const responseText = response.text;
      if (!responseText) {
        throw new Error("The AI model returned an empty response. Please try generating the story again.");
      }
      return extractJson(responseText);
    } else if (provider === 'puter') {
      // Puter.js 100% Free AI
      const raw = await callPuterAiChat(`The story should be about: "${prompt}"`, systemInstruction, model || 'openai/gpt-5.4-nano');
      return extractJson(raw);
    } else {
      // OpenAI Compatible Providers (Groq, OpenRouter, Z.AI, Cerebras, Mistral, Cohere, NVIDIA, Requesty, Hugging Face, Cloudflare, SiliconFlow, Pollinations, OpenAI, Others)
      if (!otherApiKey && provider !== 'pollinations') {
        throw new Error(`API Key for ${provider} is missing. Please provide it in Settings.`);
      }

      const { baseURL, effectiveApiKey } = getOpenAIProviderConfig(provider, {
        apiKey: otherApiKey,
        customBaseUrl: options?.customBaseUrl,
        cloudflareAccountId: options?.cloudflareAccountId,
      });

      const openai = getOpenAIClient(effectiveApiKey, baseURL);

      try {
        const completion = await openai.chat.completions.create({
          model: model === 'gemini-2.5-flash' ? 'gpt-3.5-turbo' : model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `The story should be about: "${prompt}". Return ONLY valid JSON.` }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('No content returned from AI');
        
        return extractJson(content);
      } catch (error: any) {
        console.error(`${provider} generation failed:`, error);
        throw new Error(`${provider} generation failed: ${error.message}`);
      }
    }
  });
};

const segmentSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    paragraph: { type: "string" },
    choices: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["paragraph"]
};

export const generateStorySegment = async (
  prompt: string,
  previousParagraphs: string[],
  language: string,
  apiKey: string | null,
  genre: string,
  model: string = 'gemini-2.5-flash',
  provider: string = 'gemini',
  otherApiKey?: string,
  targetAudience: string = 'children',
  isLastSegment: boolean = false,
  isFirstSegment: boolean = false,
  graphContext?: string,
  options?: { customBaseUrl?: string; cloudflareAccountId?: string }
): Promise<{ title?: string; paragraph: string; choices?: string[] }> => {
  let audienceInstruction = '';
  switch (targetAudience) {
    case 'children':
      audienceInstruction = 'Ensure the story is imaginative, engaging, and easy for a child to understand. Use simple language, positive themes, and a clear moral or lesson. Avoid scary or inappropriate content.';
      break;
    case 'teen':
      audienceInstruction = 'The story should be engaging for teenagers, with slightly more complex themes and vocabulary. It can include elements of adventure, mystery, or coming-of-age. The tone should be relatable to young adults.';
      break;
    case 'adult':
      audienceInstruction = 'The story is for an adult audience. It can explore mature themes, complex character development, and sophisticated vocabulary. The tone should be appropriate for the genre, whether it be dark, romantic, or intellectual.';
      break;
  }

  const effectiveGraphContext = graphContext || globalStoryGraph.getLoreContextForPrompt();
  const lorePrompt = effectiveGraphContext ? `\nKnowledge Graph & Character Emotional Trends Context (Maintain strict continuity with these entities, relationship connections, and character emotional arcs):\n${effectiveGraphContext}\n` : '';
  const inconsistencyAudit = globalStoryGraph.getInconsistencyAudit();
  const inconsistencyPrompt = inconsistencyAudit 
    ? `\nPotential Plot Inconsistencies & Continuity Audit (Query from Global Story Graph - DO NOT contradict these established facts):\n${inconsistencyAudit}\n`
    : '';

  const systemInstruction = `You are a master storyteller writing an interactive story in the ${genre} genre, in the ${language} language. 
  
  Target Audience: ${targetAudience}
  ${audienceInstruction}
  ${lorePrompt}
  ${inconsistencyPrompt}
  
  Instructions:
  ${isFirstSegment ? 'This is the start of the story. You must provide a "title" for the story.' : 'This is a continuation of the story. Do NOT provide a title.'}
  Write exactly ONE new paragraph that advances the story based on the user's prompt or choice.
  ${isLastSegment ? 'This is the final paragraph. Bring the story to a satisfying conclusion. Do NOT provide choices.' : 'Provide exactly THREE short narrative choices for what happens next in the "choices" array.'}
  
  Output Format:
  Return the response as a JSON object with a "paragraph" field. 
  ${isFirstSegment ? 'Include a "title" field.' : ''}
  ${!isLastSegment ? 'Include a "choices" field containing 3 options.' : ''}`;

  const historyContext = previousParagraphs.length > 0 
    ? `\n\nPrevious story so far:\n${previousParagraphs.join('\n\n')}\n\nContinue the story based on the user's choice: `
    : `\n\nThe story should be about: `;

  const fullPrompt = `${historyContext}"${prompt}"`;

  return withRetry(async () => {
    if (provider === 'gemini') {
      const ai = getAiClient(apiKey);
      const response = await ai.models.generateContent({
        model: model,
        contents: fullPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          // We cast as any because Schema is complex, but the API handles standard JSON schema structure
          responseSchema: segmentSchema as any,
        },
      });
      const responseText = response.text;
      if (!responseText) {
        throw new Error("The AI model returned an empty response. Please try generating again.");
      }
      return extractJson(responseText);
    } else if (provider === 'puter') {
      const raw = await callPuterAiChat(fullPrompt, systemInstruction, model || 'openai/gpt-5.4-nano');
      return extractJson(raw);
    } else {
      // OpenAI Compatible Providers
      if (!otherApiKey && provider !== 'pollinations') {
        throw new Error(`API Key for ${provider} is missing. Please provide it in Settings.`);
      }

      const { baseURL, effectiveApiKey } = getOpenAIProviderConfig(provider, {
        apiKey: otherApiKey,
        customBaseUrl: options?.customBaseUrl,
        cloudflareAccountId: options?.cloudflareAccountId,
      });

      const openai = getOpenAIClient(effectiveApiKey, baseURL);

      try {
        const completion = await openai.chat.completions.create({
          model: model === 'gemini-2.5-flash' ? 'gpt-3.5-turbo' : model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `${fullPrompt}. Return ONLY valid JSON matching the requested structure.` }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('No content returned from AI');
        
        return extractJson(content);
      } catch (error: any) {
        console.error(`${provider} generation failed:`, error);
        throw new Error(`${provider} generation failed: ${error.message}`);
      }
    }
  });
};

const chapterResponseSchema = {
  type: "object",
  properties: {
    chapterTitle: { 
      type: "string", 
      description: "The title or subtitle of this chapter (e.g. 'Chapter 2: The Lost Temple')." 
    },
    paragraphs: {
      type: "array",
      items: { type: "string" },
      description: "The sequence of paragraphs advancing the chapter according to the requested length."
    },
    choices: {
      type: "array",
      items: { type: "string" },
      description: "Three exciting narrative choices for what can happen next."
    }
  },
  required: ["chapterTitle", "paragraphs"]
};

export const generateNextChapter = async (
  previousParagraphs: string[],
  storyTitle: string,
  chapterNumber: number,
  language: string,
  apiKey: string | null,
  genre: string,
  length: 'very_short' | 'short' | 'medium' | 'long' | 'very_long',
  model: string = 'gemini-2.5-flash',
  provider: string = 'gemini',
  otherApiKey?: string,
  targetAudience: string = 'children',
  userGuidance?: string,
  options?: { customBaseUrl?: string; cloudflareAccountId?: string }
): Promise<{ chapterTitle: string; paragraphs: string[]; choices?: string[] }> => {
  const lengthDescription = getLengthDescription(length);
  
  let audienceInstruction = '';
  switch (targetAudience) {
    case 'children':
      audienceInstruction = 'Ensure the story is imaginative, engaging, and easy for a child to understand. Use simple language, positive themes, and a clear moral or lesson. Avoid scary or inappropriate content.';
      break;
    case 'teen':
      audienceInstruction = 'The story should be engaging for teenagers, with slightly more complex themes and vocabulary. It can include elements of adventure, mystery, or coming-of-age. The tone should be relatable to young adults.';
      break;
    case 'adult':
      audienceInstruction = 'The story is for an adult audience. It can explore mature themes, complex character development, and sophisticated vocabulary. The tone should be appropriate for the genre, whether it be dark, romantic, or intellectual.';
      break;
  }

  const loreContext = globalStoryGraph.getLoreContextForPrompt();
  const lorePrompt = loreContext ? `\nKnowledge Graph Lore Context:\n${loreContext}\n` : '';
  const inconsistencyAudit = globalStoryGraph.getInconsistencyAudit();
  const inconsistencyPrompt = inconsistencyAudit 
    ? `\nPotential Plot Inconsistencies & Continuity Audit (Query from Global Story Graph - DO NOT contradict these facts):\n${inconsistencyAudit}\n`
    : '';

  const systemInstruction = `You are a master storyteller writing the next chapter of an epic story titled "${storyTitle}".
Genre: ${genre}, Language: ${language}
Target Audience: ${targetAudience}
${audienceInstruction}
${lorePrompt}
${inconsistencyPrompt}

Instructions:
- Write Chapter ${chapterNumber} of the story.
- Generate an imaginative chapter title (e.g. "Chapter ${chapterNumber}: <Subtitle>").
- Provide exactly ${lengthDescription} connected, vivid narrative paragraphs that continue the plot seamlessly from previous events.
- Provide exactly THREE exciting narrative choices for future branches in the "choices" field.

Output Format:
Return a JSON object with:
- "chapterTitle": String
- "paragraphs": Array of strings (each string is one paragraph)
- "choices": Array of 3 strings (interactive options)`;

  const historyContext = `Previous story events so far:\n${previousParagraphs.slice(-6).join('\n\n')}`;
  const guidance = userGuidance ? `\n\nDirect user guidance for this chapter: "${userGuidance}"` : '';
  const fullPrompt = `${historyContext}${guidance}\n\nWrite Chapter ${chapterNumber} now.`;

  return withRetry(async () => {
    if (provider === 'gemini') {
      const ai = getAiClient(apiKey);
      const response = await ai.models.generateContent({
        model: model,
        contents: fullPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: chapterResponseSchema as any,
        },
      });
      const responseText = response.text;
      if (!responseText) throw new Error("The AI model returned an empty response.");
      return extractJson(responseText);
    } else if (provider === 'puter') {
      const raw = await callPuterAiChat(fullPrompt, systemInstruction, model || 'openai/gpt-5.4-nano');
      return extractJson(raw);
    } else {
      if (!otherApiKey && provider !== 'pollinations') {
        throw new Error(`API Key for ${provider} is missing. Please provide it in Settings.`);
      }

      const { baseURL, effectiveApiKey } = getOpenAIProviderConfig(provider, {
        apiKey: otherApiKey,
        customBaseUrl: options?.customBaseUrl,
        cloudflareAccountId: options?.cloudflareAccountId,
      });

      const openai = getOpenAIClient(effectiveApiKey, baseURL);
      const completion = await openai.chat.completions.create({
        model: model === 'gemini-2.5-flash' ? 'gpt-3.5-turbo' : model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `${fullPrompt}. Return valid JSON.` }
        ],
        response_format: { type: 'json_object' },
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('No content returned from AI');
      return extractJson(content);
    }
  });
};

const plotTwistsSchema = {
  type: Type.OBJECT,
  properties: {
    twists: {
      type: Type.ARRAY,
      description: "Three distinct recommended plot twists for the story.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          category: { type: Type.STRING },
          description: { type: Type.STRING },
          promptAction: { type: Type.STRING }
        },
        required: ["title", "category", "description", "promptAction"]
      }
    }
  },
  required: ["twists"]
};

export const generatePlotTwists = async (
  previousParagraphs: string[],
  storyTitle: string,
  genre: string,
  targetAudience: string = 'children',
  apiKey: string | null = null,
  provider: string = 'gemini',
  otherApiKey?: string,
  model: string = 'gemini-2.5-flash',
  graphContext?: string,
  options?: { customBaseUrl?: string; cloudflareAccountId?: string }
): Promise<import('../types').PlotTwistOption[]> => {
  const systemInstruction = `You are a creative narrative strategist and master plot architect.
Analyze the story "${storyTitle}" (Genre: ${genre}, Audience: ${targetAudience}).
${graphContext ? `Knowledge Graph Context:\n${graphContext}\n` : ''}

Your goal: Recommend THREE distinct, highly engaging next plot twists that completely transform or elevate the story trajectory in unexpected ways.

Categories to select from (pick 3 distinct categories):
- "revelation" (a shocking secret or truth unveiled)
- "supernatural" (an unexplainable phenomenon or magic anomaly)
- "betrayal" (a trusted ally turns or has hidden motives)
- "dramatic_shift" (an urgent environmental or situational disaster)
- "mystery" (a cryptic artifact, puzzle, or unknown entity appears)
- "action" (sudden confrontation or high-stakes race against time)

Format: Return a JSON object with a "twists" array of 3 objects, each containing:
- "title": Catchy 2-4 word twist title
- "category": One of the categories above
- "description": 1 sentence explaining the dramatic twist
- "promptAction": The exact prompt text to send to continue the story with this twist.`;

  const recentText = previousParagraphs.slice(-4).join('\n\n');
  const fullPrompt = `Story Context:\n${recentText}\n\nGenerate 3 recommended next plot twists now.`;

  return withRetry(async () => {
    if (provider === 'gemini') {
      const ai = getAiClient(apiKey);
      const response = await ai.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: plotTwistsSchema,
        },
      });
      const parsed = extractJson(response.text || '');
      return parsed.twists || [];
    } else if (provider === 'puter') {
      const raw = await callPuterAiChat(fullPrompt, systemInstruction, model || 'openai/gpt-5.4-nano');
      const parsed = extractJson(raw);
      return parsed.twists || [];
    } else {
      const { baseURL, effectiveApiKey } = getOpenAIProviderConfig(provider, {
        apiKey: otherApiKey,
        customBaseUrl: options?.customBaseUrl,
        cloudflareAccountId: options?.cloudflareAccountId,
      });
      const openai = getOpenAIClient(effectiveApiKey, baseURL);
      const completion = await openai.chat.completions.create({
        model: model === 'gemini-2.5-flash' ? 'gpt-3.5-turbo' : model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `${fullPrompt}. Return valid JSON.` }
        ],
        response_format: { type: 'json_object' },
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('No content returned from AI');
      const parsed = extractJson(content);
      return parsed.twists || [];
    }
  });
};

export const generateImage = async (
  prompt: string,
  apiKey: string | null,
  imageStyle: string,
  model: string = 'gemini-3.1-flash-lite-image',
  provider: string = 'gemini',
  otherApiKey?: string,
  options?: { customBaseUrl?: string; cloudflareAccountId?: string }
): Promise<string> => {
  
  let stylePrompt = '';
  switch (imageStyle) {
    case 'whimsical':
      stylePrompt = 'whimsical storybook illustration, soft pastel colors, dreamy atmosphere, detailed line work, magical, charming, hand-drawn aesthetic';
      break;
    case 'realistic':
      stylePrompt = 'photorealistic, cinematic lighting, 8k resolution, highly detailed, sharp focus, depth of field, professional photography';
      break;
    case 'cartoon':
      stylePrompt = 'vibrant cartoon style, bold outlines, bright flat colors, expressive characters, 2d animation style, fun and energetic';
      break;
    case 'watercolor':
      stylePrompt = 'watercolor painting, soft bleeding edges, artistic, textured paper, gentle strokes, dreamy, ethereal';
      break;
    case 'oil_painting':
      stylePrompt = 'classic oil painting, rich textures, visible brushstrokes, dramatic lighting, fine art style, masterpiece';
      break;
    case 'anime':
      stylePrompt = 'anime style, studio ghibli inspired, lush backgrounds, vibrant colors, cel shaded, detailed character design';
      break;
    case 'pixel_art':
      stylePrompt = 'pixel art, 16-bit retro game style, vibrant colors, clean sprites, nostalgic, detailed pixel work';
      break;
    case '3d_render':
      stylePrompt = '3d render, pixar style, cute, soft global illumination, clay material, high fidelity, octane render';
      break;
    case 'noir':
      stylePrompt = 'film noir style, black and white, high contrast, dramatic shadows, mysterious atmosphere, cinematic composition';
      break;
    case 'cyberpunk':
      stylePrompt = 'cyberpunk style, neon lights, futuristic city, high tech, dark atmosphere, glowing accents, detailed sci-fi elements';
      break;
    case 'vintage':
      stylePrompt = 'vintage illustration, 1950s style, retro color palette, textured, nostalgic, classic storybook feel';
      break;
    case 'abstract':
      stylePrompt = 'abstract art, geometric shapes, bold colors, surreal, interpretive, artistic, modern art style';
      break;
    case 'disney_animation':
      stylePrompt = 'classic disney 2d animation style, hand-drawn, expressive characters, vibrant colors, magical atmosphere, nostalgic cell animation';
      break;
    case 'pixar_3d':
      stylePrompt = 'pixar 3d animation style, highly detailed textures, soft lighting, expressive large eyes, colorful, modern CGI movie look';
      break;
    case 'vintage_disney':
      stylePrompt = 'vintage disney animation, 1930s style, muted retro colors, rubber hose animation style, nostalgic, classic';
      break;
    case 'sketch':
      stylePrompt = 'rough sketch, loose lines, quick drawing, expressive, unpolished, artistic concept art';
      break;
    case 'pencil_sketch':
      stylePrompt = 'detailed pencil sketch, graphite, shading, cross-hatching, realistic pencil strokes, monochromatic';
      break;
    case 'claymation':
      stylePrompt = 'claymation style, stop motion, plasticine figures, textured fingerprints, miniature sets, quirky, tactile';
      break;
    case 'mosaic':
      stylePrompt = 'mosaic art style, small colored tiles, stained glass effect, intricate patterns, historical art, vibrant colors separated by dark lines';
      break;
    default:
      stylePrompt = 'digital art, high quality, detailed, vibrant colors, professional illustration';
  }

  const fullPrompt = `Create a high-quality image for a story segment.
  Scene Description: ${prompt}
  Art Style: ${stylePrompt}
  Mood: Engaging and appropriate for the story context.
  Composition: Clear focal point, balanced composition.
  Ensure the image is safe for all audiences and does not contain text.`;

  if (provider === 'gemini') {
    const ai = getAiClient(apiKey);
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: fullPrompt }],
      },
      config: {
          imageConfig: {
              aspectRatio: "1:1",
              imageSize: "1K"
          }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString: string = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    
    // Check for text refusal/error
    const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
    if (textPart?.text) {
        console.error("Image generation refused/text response:", textPart.text);
        throw new Error(`Image generation failed: The model returned text instead of an image. It might be due to safety filters.`);
    }

    throw new Error('Image generation failed: No image data returned.');

  } else if (provider === 'puter') {
    // Support Nano Banana models (Nano Banana, Lite, 2, 2 Lite, Pro, Ultra) and Flux on Puter
    const imgModel = model && model !== 'puter-txt2img' ? model : 'nanobanana-2-lite';
    
    // Check if Puter AI has txt2img
    if (typeof window !== 'undefined' && (window as any).puter?.ai?.txt2img) {
      try {
        const img = await (window as any).puter.ai.txt2img(fullPrompt, { model: imgModel });
        if (img?.src) return img.src;
        if (typeof img === 'string') return img;
      } catch (err) {
        console.warn("Puter txt2img fallback to Pollinations:", err);
      }
    }
    // Fallback smoothly to Pollinations with the requested Nano Banana / Flux model
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    return `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=768&seed=${seed}&model=${imgModel}`;

  } else if (provider === 'pollinations') {
    // Pollinations.ai (Free, URL-based) - supporting all Nano Banana and Flux suites
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    const pollinationsModel = model || 'nanobanana-2-lite';
    const url = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=768&seed=${seed}&model=${pollinationsModel}`;
    return url;

  } else if (provider === 'zai' || provider === 'openai' || provider === 'siliconflow' || provider === 'huggingface' || provider === 'cloudflare') {
    if (!otherApiKey && provider !== 'cloudflare') {
      throw new Error(`${provider} API Key is required for image generation.`);
    }
    
    const { baseURL, effectiveApiKey } = getOpenAIProviderConfig(provider, {
      apiKey: otherApiKey,
      customBaseUrl: options?.customBaseUrl,
      cloudflareAccountId: options?.cloudflareAccountId,
    });
    
    const openai = getOpenAIClient(effectiveApiKey, baseURL);
    
    try {
      const response = await openai.images.generate({
        model: model,
        prompt: fullPrompt,
        n: 1,
        size: "1024x1024",
      });
      
      const imageUrl = response.data[0]?.url || (response.data[0] as any)?.b64_json ? `data:image/png;base64,${(response.data[0] as any).b64_json}` : '';
      if (imageUrl) return imageUrl;
      throw new Error('No image URL returned.');
    } catch (error: any) {
      console.error(`${provider} image generation failed:`, error);
      // Fallback gracefully to Pollinations Nano Banana
      const encodedPrompt = encodeURIComponent(fullPrompt);
      const seed = Math.floor(Math.random() * 1000000);
      return `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=768&seed=${seed}&model=nanobanana-2-lite`;
    }
  }

  // Fallback to Pollinations
  const encodedPrompt = encodeURIComponent(fullPrompt);
  const seed = Math.floor(Math.random() * 1000000);
  return `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=768&seed=${seed}&model=nanobanana-2-lite`;
};

export const generateCoverImage = async (
  prompt: string,
  apiKey: string | null,
  imageStyle: string,
  model: string = 'gemini-3.1-flash-lite-image',
  provider: string = 'gemini',
  otherApiKey?: string,
  options?: { customBaseUrl?: string; cloudflareAccountId?: string }
): Promise<string> => {
    return generateImage(prompt, apiKey, imageStyle, model, provider, otherApiKey, options);
};

// Helper to convert 16-bit PCM (sample rate 24000, 1 channel) to WAV Base64
const pcmBase64ToWavBase64 = (pcmBase64: string): string => {
  const binaryString = atob(pcmBase64);
  const pcmLength = binaryString.length;
  
  // WAV Header is 44 bytes
  const wavBuffer = new ArrayBuffer(44 + pcmLength);
  const view = new DataView(wavBuffer);
  
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF'); // ChunkID
  view.setUint32(4, 36 + pcmLength, true); // ChunkSize
  writeString(8, 'WAVE'); // Format
  writeString(12, 'fmt '); // Subchunk1ID
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, 1, true); // NumChannels
  view.setUint32(24, 24000, true); // SampleRate
  view.setUint32(28, 24000 * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data'); // Subchunk2ID
  view.setUint32(40, pcmLength, true); // Subchunk2Size

  // Write PCM Data
  const uint8View = new Uint8Array(wavBuffer, 44);
  for (let i = 0; i < pcmLength; i++) {
    uint8View[i] = binaryString.charCodeAt(i);
  }

  // Convert ArrayBuffer back to Base64
  let wavBinary = '';
  const wavBytes = new Uint8Array(wavBuffer);
  for (let i = 0; i < wavBytes.length; i++) {
    wavBinary += String.fromCharCode(wavBytes[i]);
  }
  return window.btoa(wavBinary);
};

export const generateTTSAudio = async (
  text: string, 
  apiKey: string | null, 
  voice: string = 'Kore',
  model: string = 'gemini-3.1-flash-tts-preview',
  provider: 'gemini' | 'openai' | 'pollinations' = 'gemini',
  otherApiKey?: string
): Promise<string> => {
  
  if (provider === 'gemini') {
    const ai = getAiClient(apiKey);
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: `Say with a warm, friendly, and slightly animated storytelling voice: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice }, 
            },
        },
      },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const wavBase64 = pcmBase64ToWavBase64(base64Audio);
      return `data:audio/wav;base64,${wavBase64}`;
    }
    
    // Check for text refusal/error
    const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
    if (textPart?.text) {
        console.error("Audio generation refused/text response:", textPart.text);
        throw new Error(`Audio generation failed: The model returned text instead of audio.`);
    }
    
    throw new Error('Audio generation failed: No audio data returned.');
  } else if (provider === 'openai') {
    if (!otherApiKey) throw new Error("OpenAI API Key is required for Audio generation.");
    
    // Safeguard: Ensure we don't pass a Gemini model to OpenAI
    let safeModel = model;
    if (model.startsWith('gemini')) {
        console.warn(`Invalid model '${model}' for OpenAI provider. Defaulting to 'tts-1'.`);
        safeModel = 'tts-1';
    }

    const openai = getOpenAIClient(otherApiKey, 'https://api.openai.com/v1');
    
    try {
      const response = await openai.audio.speech.create({
        model: safeModel,
        voice: voice as any,
        input: text,
        response_format: 'mp3',
      });
      
      const buffer = await response.arrayBuffer();
      // Convert ArrayBuffer to Base64
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return `data:audio/mp3;base64,${window.btoa(binary)}`;
      
    } catch (error: any) {
      console.error("OpenAI TTS generation failed:", error);
      
      if (error?.status === 429 || error?.message?.includes('429')) {
        throw new Error("OpenAI Rate Limit Exceeded. Please check your plan and billing details.");
      }
      
      throw new Error(`OpenAI TTS generation failed: ${error.message}`);
    }
  } else if (provider === 'pollinations') {
    // Pollinations Audio (OpenAI Compatible)
    const effectiveApiKey = otherApiKey || 'dummy';
    const openai = getOpenAIClient(effectiveApiKey, 'https://gen.pollinations.ai/v1');

    try {
        const response = await openai.audio.speech.create({
            model: 'tts-1', // Pollinations uses tts-1 or similar standard model names
            voice: voice as any,
            input: text,
            response_format: 'mp3',
        });

        const buffer = await response.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return `data:audio/mp3;base64,${window.btoa(binary)}`;
    } catch (error: any) {
        console.error("Pollinations TTS generation failed:", error);
        throw new Error(`Pollinations TTS generation failed: ${error.message}`);
    }
  }

  throw new Error('Audio generation failed.');
};

export const enhancePrompt = async (
  prompt: string,
  apiKey: string | null,
  provider: string = 'gemini',
  otherApiKey?: string,
  model: string = 'gemini-2.5-flash',
  options?: { customBaseUrl?: string; cloudflareAccountId?: string }
): Promise<string> => {
  const systemInstruction = `You are a creative writing assistant. Your task is to take a simple story idea and expand it into a rich, detailed, and engaging prompt for a story generator. 
  Keep the enhanced prompt under 3 sentences but make it evocative and specific. 
  Do not add "Here is an enhanced prompt:" or similar prefixes. Just return the prompt itself.`;

  if (provider === 'gemini') {
    const ai = getAiClient(apiKey);
    const response = await ai.models.generateContent({
      model: model,
      contents: `Enhance this story idea: "${prompt}"`,
      config: {
        systemInstruction,
      },
    });
    const responseText = response.text;
    return responseText ? responseText.trim() : prompt;
  } else if (provider === 'puter') {
    try {
      const resp = await callPuterAiChat(`Enhance this story idea: "${prompt}"`, systemInstruction, model || 'openai/gpt-5.4-nano');
      return resp.trim();
    } catch {
      return prompt;
    }
  } else {
    // OpenAI Compatible Providers
    if (!otherApiKey && provider !== 'pollinations') {
        throw new Error(`API Key for ${provider} is missing. Please provide it in Settings.`);
    }
    
    const { baseURL, effectiveApiKey } = getOpenAIProviderConfig(provider, {
      apiKey: otherApiKey,
      customBaseUrl: options?.customBaseUrl,
      cloudflareAccountId: options?.cloudflareAccountId,
    });

    const openai = getOpenAIClient(effectiveApiKey, baseURL);
    
    // Fallback model if the provided model is not compatible with the provider
    let effectiveModel = model;
    if (provider === 'pollinations' && !['openai', 'openai-fast', 'openai-large', 'qwen-coder', 'mistral', 'deepseek', 'deepseek-v3', 'llama', 'gemini'].includes(model)) {
        effectiveModel = 'openai';
    } else if ((provider === 'others' || provider === 'openai') && model.startsWith('gemini')) {
        effectiveModel = 'gpt-4o-mini';
    }
    
    const completion = await openai.chat.completions.create({
      model: effectiveModel, 
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Enhance this story idea: "${prompt}"` }
      ],
    });

    return completion.choices[0].message.content?.trim() || prompt;
  }
};

export const testApiKey = async (apiKey: string): Promise<{ success: boolean; message: string; }> => {
  if (!apiKey) return { success: false, message: 'API Key cannot be empty.' };
  try {
    const ai = getAiClient(apiKey);
    // A simple, low-cost call to verify the key and model access.
    await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'test' });
    return { success: true, message: 'Success! Your API Key is valid.' };
  } catch (error: any) {
    console.error("API Key test failed:", error);
    let userMessage = "An unknown error occurred. Please double-check your API key.";
    const errorMessage = error.toString().toLowerCase();
    const linkText = "You can find or create a key at the Google AI Studio.";

    if (errorMessage.includes('api key not valid')) {
      userMessage = "Invalid API Key. Please ensure you have copied the entire key correctly.";
    } else if (errorMessage.includes('quota') || errorMessage.includes('resource has been exhausted')) {
      userMessage = "You may have exceeded your API quota for the day. Please check your usage in your Google Cloud account.";
    } else if (errorMessage.includes('fetch')) {
      userMessage = "A network error occurred. Please check your internet connection and try again.";
    }
    
    return { 
        success: false, 
        message: `${userMessage} ${linkText}`
    };
  }
};

export const testProviderKey = async (
  provider: string,
  key: string,
  options?: { customBaseUrl?: string; cloudflareAccountId?: string }
): Promise<{ success: boolean; message: string }> => {
  if (provider === 'puter' || provider === 'pollinations') {
    return { success: true, message: 'Free provider - no API key required!' };
  }
  if (!key) return { success: false, message: 'API Key cannot be empty.' };

  if (provider === 'gemini') {
    return testApiKey(key);
  }

  try {
    const { baseURL, effectiveApiKey } = getOpenAIProviderConfig(provider, {
      apiKey: key,
      customBaseUrl: options?.customBaseUrl,
      cloudflareAccountId: options?.cloudflareAccountId,
    });
    const openai = getOpenAIClient(effectiveApiKey, baseURL);
    
    // Choose a very lightweight model for rapid verification
    let testModel = 'gpt-3.5-turbo';
    if (provider === 'groq') testModel = 'llama-3.1-8b-instant';
    else if (provider === 'inception') testModel = 'mercury-2';
    else if (provider === 'cerebras') testModel = 'llama3.1-8b';
    else if (provider === 'mistral') testModel = 'mistral-small-latest';
    else if (provider === 'cohere') testModel = 'command-r-08-2024';
    else if (provider === 'nvidia') testModel = 'meta/llama-3.3-70b-instruct';
    else if (provider === 'openrouter') testModel = 'meta-llama/llama-3.2-3b-instruct:free';
    else if (provider === 'requesty') testModel = 'meta-llama/llama-3.3-70b';
    else if (provider === 'zai') testModel = 'glm-4-flash';
    else if (provider === 'siliconflow') testModel = 'Qwen/Qwen2.5-7B-Instruct';
    else if (provider === 'huggingface') testModel = 'meta-llama/Llama-3.3-70B-Instruct';
    else if (provider === 'cloudflare') testModel = '@cf/meta/llama-3.3-70b-instruct';
    else if (provider === 'openai') testModel = 'gpt-4o-mini';

    await openai.chat.completions.create({
      model: testModel,
      messages: [{ role: 'user', content: 'test connection' }],
      max_tokens: 2,
    });

    return { success: true, message: `Success! ${provider.toUpperCase()} API Key is verified and ready to use.` };
  } catch (err: any) {
    console.error(`Test key failed for ${provider}:`, err);
    return { 
      success: false, 
      message: err.message?.includes('401') 
        ? 'Invalid API Key or unauthorized.' 
        : err.message?.includes('429') 
          ? 'Rate limit reached or quota exceeded.' 
          : `Connection test result: ${err.message || 'Check key and parameters.'}` 
    };
  }
};