import { GoogleGenAI, Type, Modality } from '@google/genai';
import OpenAI from 'openai';

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

// Helper to get the correct AI client instance
const getAiClient = (apiKey?: string | null): GoogleGenAI => {
  // The app is designed to allow a user-provided API key, which takes precedence.
  // If not provided, it attempts to fall back to the environment variable.
  const keyToUse = apiKey || process.env.API_KEY;
  if (!keyToUse) {
    throw new Error("API key is not configured. Please provide your Gemini API key in the settings.");
  }
  return new GoogleGenAI({ apiKey: keyToUse });
};

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
  provider: 'gemini' | 'groq' | 'openrouter' | 'siliconflow' | 'pollinations' | 'others' = 'gemini',
  otherApiKey?: string, // For non-Gemini providers
  targetAudience: 'children' | 'teen' | 'adult' = 'children'
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
      const jsonString = responseText.trim();
      try {
        return JSON.parse(jsonString);
      } catch (error) {
        console.error("Failed to parse story JSON from model response:", jsonString);
        throw new Error("The AI returned an invalid story format. Please try generating the story again.");
      }
    } else {
      // OpenAI Compatible Providers (Groq, OpenRouter, SiliconFlow, Pollinations, Others)
      if (!otherApiKey && provider !== 'pollinations') {
        throw new Error(`API Key for ${provider} is missing.`);
      }

      let baseURL = '';
      switch (provider) {
        case 'groq': baseURL = 'https://api.groq.com/openai/v1'; break;
        case 'openrouter': baseURL = 'https://openrouter.ai/api/v1'; break;
        case 'siliconflow': baseURL = 'https://api.siliconflow.cn/v1'; break;
        case 'pollinations': baseURL = 'https://gen.pollinations.ai/v1'; break;
        case 'others': baseURL = 'https://api.openai.com/v1'; break; // Default to OpenAI compatible for others
      }

      // Pollinations might work without a key for some endpoints, but let's use it if provided or a dummy one if required by library
      const effectiveApiKey = otherApiKey || (provider === 'pollinations' ? 'dummy' : '');

      const openai = getOpenAIClient(effectiveApiKey, baseURL);

      try {
        const completion = await openai.chat.completions.create({
          model: model === 'gemini-2.5-flash' ? 'gpt-3.5-turbo' : model, // Fallback if using non-gemini provider with default model
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `The story should be about: "${prompt}". Return ONLY valid JSON.` }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('No content returned from AI');
        
        return JSON.parse(content);
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
  isFirstSegment: boolean = false
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

  const systemInstruction = `You are a master storyteller writing an interactive story in the ${genre} genre, in the ${language} language. 
  
  Target Audience: ${targetAudience}
  ${audienceInstruction}
  
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
      const jsonString = responseText.trim();
      try {
        return JSON.parse(jsonString);
      } catch (error) {
        console.error("Failed to parse segment JSON from model response:", jsonString);
        throw new Error("The AI returned an invalid story format. Please try generating again.");
      }
    } else {
      // OpenAI Compatible Providers
      if (!otherApiKey && provider !== 'pollinations') {
        throw new Error(`API Key for ${provider} is missing.`);
      }

      let baseURL = '';
      switch (provider) {
        case 'groq': baseURL = 'https://api.groq.com/openai/v1'; break;
        case 'openrouter': baseURL = 'https://openrouter.ai/api/v1'; break;
        case 'siliconflow': baseURL = 'https://api.siliconflow.cn/v1'; break;
        case 'pollinations': baseURL = 'https://gen.pollinations.ai/v1'; break;
        case 'others': baseURL = 'https://api.openai.com/v1'; break; 
      }

      const effectiveApiKey = otherApiKey || (provider === 'pollinations' ? 'dummy' : '');
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
        
        return JSON.parse(content);
      } catch (error: any) {
        console.error(`${provider} generation failed:`, error);
        throw new Error(`${provider} generation failed: ${error.message}`);
      }
    }
  });
};

export const generateImage = async (
  prompt: string,
  apiKey: string | null,
  imageStyle: string,
  model: string = 'gemini-3.1-flash-lite-image',
  provider: 'gemini' | 'pollinations' | 'siliconflow' = 'gemini',
  otherApiKey?: string
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

  } else if (provider === 'pollinations') {
    // Pollinations.ai (Free, URL-based)
    const encodedPrompt = encodeURIComponent(fullPrompt);
    // Add a random seed to prevent caching of the same prompt
    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=768&seed=${seed}&model=flux`;
    return url; // Return the URL directly

  } else if (provider === 'siliconflow') {
    if (!otherApiKey) throw new Error("SiliconFlow API Key is required.");
    
    const openai = getOpenAIClient(otherApiKey, 'https://api.siliconflow.cn/v1');
    
    try {
      const response = await openai.images.generate({
        model: model,
        prompt: fullPrompt,
        n: 1,
        size: "1024x1024", // Standard size
      });
      
      return response.data[0].url || '';
    } catch (error: any) {
      console.error("SiliconFlow image generation failed:", error);
      throw new Error(`SiliconFlow image generation failed: ${error.message}`);
    }
  }

  throw new Error(`Provider ${provider} not supported for images.`);
};

export const generateCoverImage = async (
  prompt: string,
  apiKey: string | null,
  imageStyle: string,
  model: string = 'gemini-3.1-flash-lite-image',
  provider: 'gemini' | 'pollinations' | 'siliconflow' = 'gemini',
  otherApiKey?: string
): Promise<string> => {
    // This function is specifically for the PDF cover, but can reuse the main image generation logic.
    return generateImage(prompt, apiKey, imageStyle, model, provider, otherApiKey);
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
  provider: 'gemini' | 'groq' | 'openrouter' | 'siliconflow' | 'pollinations' | 'others' = 'gemini',
  otherApiKey?: string,
  model: string = 'gemini-2.5-flash'
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
  } else {
    // OpenAI Compatible Providers
    if (!otherApiKey && provider !== 'pollinations') {
        throw new Error(`API Key for ${provider} is missing.`);
    }
    
    let baseURL = '';
    switch (provider) {
      case 'groq': baseURL = 'https://api.groq.com/openai/v1'; break;
      case 'openrouter': baseURL = 'https://openrouter.ai/api/v1'; break;
      case 'siliconflow': baseURL = 'https://api.siliconflow.cn/v1'; break;
      case 'pollinations': baseURL = 'https://gen.pollinations.ai/v1'; break;
      case 'others': baseURL = 'https://api.openai.com/v1'; break; // Default to OpenAI compatible for others
    }

    const effectiveApiKey = otherApiKey || (provider === 'pollinations' ? 'dummy' : '');
    const openai = getOpenAIClient(effectiveApiKey, baseURL);
    
    // Fallback model if the provided model is not compatible with the provider
    let effectiveModel = model;
    if (provider === 'pollinations' && !['openai', 'openai-fast', 'openai-large', 'qwen-coder', 'mistral'].includes(model)) {
        effectiveModel = 'openai';
    } else if (provider === 'others' && model.startsWith('gemini')) {
        effectiveModel = 'gpt-4o-mini'; // Fallback for OpenAI-compatible providers
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