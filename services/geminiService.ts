import { GoogleGenAI, Type, Modality } from '@google/genai';

const defaultApiKeys = [
  "AIzaSyAq8IONY8F2qrhIgOVZxZFyg0H4KkaXoco",
  "AIzaSyD38wnis1C-FEa8fXVy_CSpCkC2m0lxD40"
];
let activeApiKeys = [...defaultApiKeys];
let currentKeyIndex = 0;

export const setUserApiKey = (userKey: string | null) => {
  if (userKey && userKey.trim() !== '') {
    // Prepend the user key, ensuring no duplicates from the default list
    activeApiKeys = [userKey, ...defaultApiKeys.filter(k => k !== userKey)];
  } else {
    // If user key is removed or empty, revert to defaults
    activeApiKeys = [...defaultApiKeys];
  }
  // Reset index whenever the key list changes
  currentKeyIndex = 0;
};

const getAiInstance = () => new GoogleGenAI({ apiKey: activeApiKeys[currentKeyIndex] });

async function apiCallWithRetry<T>(apiLogic: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  try {
    const ai = getAiInstance();
    return await apiLogic(ai);
  } catch (error) {
    const errorMessage = (error as Error).message || '';
    const isQuotaError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED');
    const isAuthError = errorMessage.includes('API key not valid');

    if ((isQuotaError || isAuthError) && currentKeyIndex < activeApiKeys.length - 1) {
      console.warn(`API key ${currentKeyIndex + 1} failed or is exhausted. Switching to the next key.`);
      currentKeyIndex++;
      // Retry the call with the new key
      return apiCallWithRetry(apiLogic);
    } else {
      if (isQuotaError || isAuthError) {
        throw new Error("All available API keys have exceeded their quota or are invalid. Please check your keys and plan.");
      }
      throw error;
    }
  }
}

export const resetApiKeyIndex = () => {
  currentKeyIndex = 0;
};


const storySchema = {
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

export const generateStory = async (
  prompt: string,
): Promise<{ title: string; paragraphs: string[] }> => {
  return apiCallWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a short story based on this prompt: "${prompt}". The story should have a title and be between 5 and 6 paragraphs long.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: storySchema,
      },
    });
    const jsonString = response.text.trim();
    return JSON.parse(jsonString);
  });
};

export const generateImage = async (prompt: string): Promise<string> => {
  return apiCallWithRetry(async (ai) => {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '4:3',
      },
    });
    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  });
};

export const generateCoverImage = async (prompt: string): Promise<string> => {
  return apiCallWithRetry(async (ai) => {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '3:4', // Portrait aspect ratio for a book cover
      },
    });

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  });
};


// --- Text-to-Speech Generation ---

interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

const parseMimeType = (mimeType: string): WavConversionOptions => {
  const defaults = { numChannels: 1, sampleRate: 24000, bitsPerSample: 16 };
  const parts = mimeType.split(';');
  const formatPart = parts.find(p => p.trim().startsWith('audio/L'));
  if (formatPart) {
    const bits = parseInt(formatPart.split('audio/L')[1], 10);
    if (!isNaN(bits)) {
      defaults.bitsPerSample = bits;
    }
  }
  const ratePart = parts.find(p => p.trim().startsWith('rate='));
  if (ratePart) {
    const rate = parseInt(ratePart.split('=')[1], 10);
    if (!isNaN(rate)) {
      defaults.sampleRate = rate;
    }
  }
  return defaults;
};

const createWavHeader = (
  dataLength: number,
  options: WavConversionOptions,
): ArrayBuffer => {
  const { numChannels, sampleRate, bitsPerSample } = options;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true); // little-endian
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM
  view.setUint16(20, 1, true); // AudioFormat 1 = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  return buffer;
};

export const generateTTSAudio = async (text: string): Promise<string> => {
  return apiCallWithRetry(async (ai) => {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ role: 'user', parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
      },
    });

    let audioData = '';
    let mimeType = '';

    for await (const chunk of responseStream) {
      const inlineData = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inlineData) {
        audioData += inlineData.data;
        if (!mimeType) mimeType = inlineData.mimeType;
      }
    }

    if (!audioData || !mimeType) {
      throw new Error('No audio data received from API.');
    }

    const binaryString = atob(audioData);
    const len = binaryString.length;
    const audioBytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      audioBytes[i] = binaryString.charCodeAt(i);
    }
    
    const options = parseMimeType(mimeType);
    const header = createWavHeader(audioBytes.length, options);
    
    const wavBytes = new Uint8Array(header.byteLength + audioBytes.length);
    wavBytes.set(new Uint8Array(header), 0);
    wavBytes.set(audioBytes, header.byteLength);

    const blob = new Blob([wavBytes], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  });
};