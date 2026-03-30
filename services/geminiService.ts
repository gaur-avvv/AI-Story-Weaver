import { GoogleGenAI, Type, Modality } from '@google/genai';
import OpenAI from 'openai';

const getAiClient = (apiKey?: string | null): GoogleGenAI => {
  const keyToUse = apiKey || process.env.API_KEY;
  if (!keyToUse) {
    throw new Error("API key is not configured. Please provide your Gemini API key in the settings.");
  }
  return new GoogleGenAI({ apiKey: keyToUse });
};

const getOpenAIClient = (apiKey: string, baseURL: string): OpenAI => {
  return new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true });
};

// --- Fallback Mechanism ---
export interface FallbackNotification {
  originalProvider: string;
  fallbackProvider: string;
  reason: string;
}

type FallbackCallback = (notification: FallbackNotification) => void;
let _fallbackCallback: FallbackCallback | null = null;

export const setFallbackCallback = (cb: FallbackCallback | null) => {
  _fallbackCallback = cb;
};

const notifyFallback = (originalProvider: string, fallbackProvider: string, reason: string) => {
  if (_fallbackCallback) {
    _fallbackCallback({ originalProvider, fallbackProvider, reason });
  }
};

const PROVIDER_BASE_URLS: Record<string, string> = {
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  siliconflow: 'https://api.siliconflow.cn/v1',
  pollinations: 'https://gen.pollinations.ai/v1',
  others: 'https://api.openai.com/v1',
};

const getBaseURL = (provider: string): string => {
  return PROVIDER_BASE_URLS[provider] || 'https://api.openai.com/v1';
};

const POLLINATIONS_TEXT_MODEL = 'openai';
const POLLINATIONS_IMAGE_MODEL = 'flux';

const storySchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'The title of the story.' },
    paragraphs: { type: Type.ARRAY, description: 'The paragraphs of the story.', items: { type: Type.STRING } },
  },
  required: ['title', 'paragraphs'],
};

const getLengthDescription = (length: 'very_short' | 'short' | 'medium' | 'long' | 'very_long'): string => {
  switch (length) {
    case 'very_short': return 'between 1 and 2';
    case 'short': return 'between 3 and 4';
    case 'medium': return 'between 5 and 6';
    case 'long': return 'between 7 and 8';
    case 'very_long': return 'between 9 and 12';
    default: return 'between 5 and 6';
  }
};

// --- Text Generation helpers ---
const generateStoryWithGemini = async (
  prompt: string, systemInstruction: string, apiKey: string | null, model: string
): Promise<{ title: string; paragraphs: string[] }> => {
  const ai = getAiClient(apiKey);
  const response = await ai.models.generateContent({
    model, contents: `The story should be about: "${prompt}"`,
    config: { systemInstruction, responseMimeType: 'application/json', responseSchema: storySchema },
  });
  return JSON.parse(response.text.trim());
};

const generateStoryWithOpenAI = async (
  prompt: string, systemInstruction: string, apiKey: string, model: string, provider: string
): Promise<{ title: string; paragraphs: string[] }> => {
  const openai = getOpenAIClient(apiKey, getBaseURL(provider));
  const completion = await openai.chat.completions.create({
    model, messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: `The story should be about: "${prompt}". Return ONLY valid JSON.` }
    ],
    response_format: { type: 'json_object' },
  });
  const content = completion.choices[0].message.content;
  if (!content) throw new Error('No content returned from AI');
  return JSON.parse(content);
};

const generateStoryWithPollinations = async (
  prompt: string, systemInstruction: string, model: string = POLLINATIONS_TEXT_MODEL
): Promise<{ title: string; paragraphs: string[] }> => {
  const openai = getOpenAIClient('dummy', PROVIDER_BASE_URLS.pollinations);
  const completion = await openai.chat.completions.create({
    model, messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: `The story should be about: "${prompt}". Return ONLY valid JSON.` }
    ],
    response_format: { type: 'json_object' },
  });
  const content = completion.choices[0].message.content;
  if (!content) throw new Error('No content returned from Pollinations');
  return JSON.parse(content);
};

export const generateStory = async (
  prompt: string, language: string, apiKey: string | null, genre: string,
  length: 'very_short' | 'short' | 'medium' | 'long' | 'very_long',
  model: string = 'gemini-2.5-flash',
  provider: 'gemini' | 'groq' | 'openrouter' | 'siliconflow' | 'pollinations' | 'others' = 'gemini',
  otherApiKey?: string, targetAudience: 'children' | 'teen' | 'adult' = 'children'
): Promise<{ title: string; paragraphs: string[] }> => {
  const lengthDescription = getLengthDescription(length);
  let audienceInstruction = '';
  switch (targetAudience) {
    case 'children':
      audienceInstruction = 'Ensure the story is imaginative, engaging, and easy for a child to understand. Use simple language, positive themes, and a clear moral or lesson. Avoid scary or inappropriate content.'; break;
    case 'teen':
      audienceInstruction = 'The story should be engaging for teenagers, with slightly more complex themes and vocabulary. It can include elements of adventure, mystery, or coming-of-age. The tone should be relatable to young adults.'; break;
    case 'adult':
      audienceInstruction = 'The story is for an adult audience. It can explore mature themes, complex character development, and sophisticated vocabulary. The tone should be appropriate for the genre, whether it be dark, romantic, or intellectual.'; break;
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

  // Try primary provider, fallback to Pollinations on failure
  try {
    if (provider === 'gemini') {
      return await generateStoryWithGemini(prompt, systemInstruction, apiKey, model);
    } else if (provider === 'pollinations') {
      return await generateStoryWithPollinations(prompt, systemInstruction, model);
    } else {
      if (!otherApiKey) throw new Error(`API Key for ${provider} is missing.`);
      return await generateStoryWithOpenAI(prompt, systemInstruction, otherApiKey, model, provider);
    }
  } catch (primaryError: unknown) {
    const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
    console.warn(`Primary text provider (${provider}) failed: ${primaryMessage}. Trying fallback...`);
    if (provider !== 'pollinations') {
      try {
        notifyFallback(provider, 'pollinations', primaryMessage);
        return await generateStoryWithPollinations(prompt, systemInstruction, POLLINATIONS_TEXT_MODEL);
      } catch (fallbackError: unknown) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        throw new Error(`Text generation failed with ${provider} (${primaryMessage}) and fallback pollinations (${fallbackMessage}).`);
      }
    }
    throw primaryError;
  }
};

// --- Image Generation with Fallback ---
const getImageStylePrompt = (imageStyle: string): string => {
  switch (imageStyle) {
    case 'whimsical': return 'whimsical storybook illustration, soft pastel colors, dreamy atmosphere, detailed line work, magical, charming, hand-drawn aesthetic';
    case 'realistic': return 'photorealistic, cinematic lighting, 8k resolution, highly detailed, sharp focus, depth of field, professional photography';
    case 'cartoon': return 'vibrant cartoon style, bold outlines, bright flat colors, expressive characters, 2d animation style, fun and energetic';
    case 'watercolor': return 'watercolor painting, soft bleeding edges, artistic, textured paper, gentle strokes, dreamy, ethereal';
    case 'oil_painting': return 'classic oil painting, rich textures, visible brushstrokes, dramatic lighting, fine art style, masterpiece';
    case 'anime': return 'anime style, studio ghibli inspired, lush backgrounds, vibrant colors, cel shaded, detailed character design';
    case 'pixel_art': return 'pixel art, 16-bit retro game style, vibrant colors, clean sprites, nostalgic, detailed pixel work';
    case '3d_render': return '3d render, pixar style, cute, soft global illumination, clay material, high fidelity, octane render';
    case 'noir': return 'film noir style, black and white, high contrast, dramatic shadows, mysterious atmosphere, cinematic composition';
    case 'cyberpunk': return 'cyberpunk style, neon lights, futuristic city, high tech, dark atmosphere, glowing accents, detailed sci-fi elements';
    case 'vintage': return 'vintage illustration, 1950s style, retro color palette, textured, nostalgic, classic storybook feel';
    case 'abstract': return 'abstract art, geometric shapes, bold colors, surreal, interpretive, artistic, modern art style';
    default: return 'digital art, high quality, detailed, vibrant colors, professional illustration';
  }
};

const generateImageWithGemini = async (fullPrompt: string, apiKey: string | null, model: string): Promise<string> => {
  const ai = getAiClient(apiKey);
  const response = await ai.models.generateContent({ model, contents: { parts: [{ text: fullPrompt }] } });
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
  if (textPart?.text) throw new Error('Image generation failed: The model returned text instead of an image.');
  throw new Error('Image generation failed: No image data returned.');
};

const generateImageWithPollinations = (fullPrompt: string, model: string = POLLINATIONS_IMAGE_MODEL): string => {
  const encodedPrompt = encodeURIComponent(fullPrompt);
  const seed = Math.floor(Math.random() * 1000000);
  return `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=768&seed=${seed}&model=${model}`;
};

const generateImageWithSiliconFlow = async (fullPrompt: string, apiKey: string, model: string): Promise<string> => {
  const openai = getOpenAIClient(apiKey, 'https://api.siliconflow.cn/v1');
  const response = await openai.images.generate({ model, prompt: fullPrompt, n: 1, size: "1024x1024" });
  return response.data[0].url || '';
};

export const generateImage = async (
  prompt: string, apiKey: string | null, imageStyle: string,
  model: string = 'gemini-2.5-flash-image',
  provider: 'gemini' | 'pollinations' | 'siliconflow' = 'gemini',
  otherApiKey?: string
): Promise<string> => {
  const stylePrompt = getImageStylePrompt(imageStyle);
  const fullPrompt = `Create a high-quality image for a story segment.
  Scene Description: ${prompt}
  Art Style: ${stylePrompt}
  Mood: Engaging and appropriate for the story context.
  Composition: Clear focal point, balanced composition.
  Ensure the image is safe for all audiences and does not contain text.`;

  try {
    if (provider === 'gemini') return await generateImageWithGemini(fullPrompt, apiKey, model);
    else if (provider === 'pollinations') return generateImageWithPollinations(fullPrompt, model);
    else if (provider === 'siliconflow') {
      if (!otherApiKey) throw new Error("SiliconFlow API Key is required.");
      return await generateImageWithSiliconFlow(fullPrompt, otherApiKey, model);
    }
    throw new Error(`Provider ${provider} not supported for images.`);
  } catch (primaryError: unknown) {
    const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
    console.warn(`Primary image provider (${provider}) failed: ${primaryMessage}. Trying fallback...`);
    if (provider !== 'pollinations') {
      try {
        notifyFallback(provider, 'pollinations', primaryMessage);
        return generateImageWithPollinations(fullPrompt, POLLINATIONS_IMAGE_MODEL);
      } catch (fallbackError: unknown) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        throw new Error(`Image generation failed with ${provider} (${primaryMessage}) and fallback pollinations (${fallbackMessage}).`);
      }
    }
    throw primaryError;
  }
};

export const generateCoverImage = async (
  prompt: string, apiKey: string | null, imageStyle: string,
  model: string = 'gemini-2.5-flash-image',
  provider: 'gemini' | 'pollinations' | 'siliconflow' = 'gemini',
  otherApiKey?: string
): Promise<string> => {
  return generateImage(prompt, apiKey, imageStyle, model, provider, otherApiKey);
};

// --- Audio Generation with Fallback ---
const generateAudioWithGemini = async (text: string, apiKey: string | null, voice: string, model: string): Promise<string> => {
  const ai = getAiClient(apiKey);
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: `Say with a warm, friendly, and slightly animated storytelling voice: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  });
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) return base64Audio;
  const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
  if (textPart?.text) throw new Error('Audio generation failed: The model returned text instead of audio.');
  throw new Error('Audio generation failed: No audio data returned.');
};

const generateAudioWithOpenAI = async (text: string, apiKey: string, voice: string, model: string): Promise<string> => {
  let safeModel = model;
  if (model.startsWith('gemini')) safeModel = 'tts-1';
  const openai = getOpenAIClient(apiKey, 'https://api.openai.com/v1');
  const response = await openai.audio.speech.create({
    model: safeModel, voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
    input: text, response_format: 'mp3',
  });
  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
};

const generateAudioWithPollinations = async (text: string, apiKey: string | undefined, voice: string): Promise<string> => {
  const openai = getOpenAIClient(apiKey || 'dummy', PROVIDER_BASE_URLS.pollinations);
  const response = await openai.audio.speech.create({
    model: 'tts-1', voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
    input: text, response_format: 'mp3',
  });
  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
};

export const generateTTSAudio = async (
  text: string, apiKey: string | null, voice: string = 'Kore',
  model: string = 'gemini-2.5-flash-preview-tts',
  provider: 'gemini' | 'openai' | 'pollinations' = 'gemini',
  otherApiKey?: string
): Promise<string> => {
  try {
    if (provider === 'gemini') return await generateAudioWithGemini(text, apiKey, voice, model);
    else if (provider === 'openai') {
      if (!otherApiKey) throw new Error("OpenAI API Key is required for Audio generation.");
      return await generateAudioWithOpenAI(text, otherApiKey, voice, model);
    } else if (provider === 'pollinations') {
      return await generateAudioWithPollinations(text, otherApiKey, voice);
    }
    throw new Error('Audio generation failed: Unknown provider.');
  } catch (primaryError: unknown) {
    const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
    if (primaryMessage.includes('Rate Limit') || primaryMessage.includes('429') || primaryMessage.includes('quota')) throw primaryError;
    console.warn(`Primary audio provider (${provider}) failed: ${primaryMessage}. Trying fallback...`);
    if (provider !== 'pollinations') {
      try {
        const fallbackVoice = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(voice) ? voice : 'nova';
        notifyFallback(provider, 'pollinations', primaryMessage);
        return await generateAudioWithPollinations(text, undefined, fallbackVoice);
      } catch (fallbackError: unknown) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        throw new Error(`Audio generation failed with ${provider} (${primaryMessage}) and fallback pollinations (${fallbackMessage}).`);
      }
    }
    throw primaryError;
  }
};

export const enhancePrompt = async (
  prompt: string, apiKey: string | null,
  provider: 'gemini' | 'groq' | 'openrouter' | 'siliconflow' | 'pollinations' | 'others' = 'gemini',
  otherApiKey?: string, model: string = 'gemini-2.5-flash'
): Promise<string> => {
  const systemInstruction = `You are a creative writing assistant. Your task is to take a simple story idea and expand it into a rich, detailed, and engaging prompt for a story generator. 
  Keep the enhanced prompt under 3 sentences but make it evocative and specific. 
  Do not add "Here is an enhanced prompt:" or similar prefixes. Just return the prompt itself.`;

  try {
    if (provider === 'gemini') {
      const ai = getAiClient(apiKey);
      const response = await ai.models.generateContent({
        model, contents: `Enhance this story idea: "${prompt}"`,
        config: { systemInstruction },
      });
      return response.text.trim();
    } else {
      if (!otherApiKey && provider !== 'pollinations') throw new Error(`API Key for ${provider} is missing.`);
      const openai = getOpenAIClient(otherApiKey || (provider === 'pollinations' ? 'dummy' : ''), getBaseURL(provider));
      let effectiveModel = model;
      if (provider === 'pollinations' && !['openai', 'openai-fast', 'openai-large', 'qwen-coder', 'mistral'].includes(model))
        effectiveModel = 'openai';
      else if (provider === 'others' && model.startsWith('gemini'))
        effectiveModel = 'gpt-4o-mini';
      const completion = await openai.chat.completions.create({
        model: effectiveModel, messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `Enhance this story idea: "${prompt}"` }
        ],
      });
      return completion.choices[0].message.content?.trim() || prompt;
    }
  } catch (primaryError: unknown) {
    const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
    console.warn(`Enhance prompt failed with ${provider}: ${primaryMessage}. Trying fallback...`);
    if (provider !== 'pollinations') {
      try {
        notifyFallback(provider, 'pollinations', primaryMessage);
        const openai = getOpenAIClient('dummy', PROVIDER_BASE_URLS.pollinations);
        const completion = await openai.chat.completions.create({
          model: POLLINATIONS_TEXT_MODEL, messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `Enhance this story idea: "${prompt}"` }
          ],
        });
        return completion.choices[0].message.content?.trim() || prompt;
      } catch {
        return prompt;
      }
    }
    return prompt;
  }
};

export const testApiKey = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
  if (!apiKey) return { success: false, message: 'API Key cannot be empty.' };
  try {
    const ai = getAiClient(apiKey);
    await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'test' });
    return { success: true, message: 'Success! Your API Key is valid.' };
  } catch (error: unknown) {
    console.error("API Key test failed:", error);
    let userMessage = "An unknown error occurred. Please double-check your API key.";
    const errorMessage = String(error).toLowerCase();
    const linkText = "You can find or create a key at the Google AI Studio.";
    if (errorMessage.includes('api key not valid'))
      userMessage = "Invalid API Key. Please ensure you have copied the entire key correctly.";
    else if (errorMessage.includes('quota') || errorMessage.includes('resource has been exhausted'))
      userMessage = "You may have exceeded your API quota for the day. Please check your usage in your Google Cloud account.";
    else if (errorMessage.includes('fetch'))
      userMessage = "A network error occurred. Please check your internet connection and try again.";
    return { success: false, message: `${userMessage} ${linkText}` };
  }
};
