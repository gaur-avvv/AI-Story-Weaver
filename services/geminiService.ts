import { GoogleGenAI, Type, Modality } from '@google/genai';

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

const getLengthDescription = (length: 'short' | 'medium' | 'long'): string => {
  switch (length) {
    case 'short':
      return 'between 3 and 4';
    case 'medium':
      return 'between 5 and 6';
    case 'long':
      return 'between 7 and 8';
    default:
      return 'between 5 and 6';
  }
};


export const generateStory = async (
  prompt: string,
  language: string,
  apiKey: string | null,
  genre: string,
  length: 'short' | 'medium' | 'long',
): Promise<{ title: string; paragraphs: string[] }> => {
  const ai = getAiClient(apiKey);
  const lengthDescription = getLengthDescription(length);
  const systemInstruction = `You are a master storyteller for children. Write a captivating short story in the ${genre} genre, in the ${language} language. The story must have a title and be ${lengthDescription} paragraphs long. Ensure the story is imaginative, engaging, and easy for a child to understand.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `The story should be about: "${prompt}"`,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: storySchema,
    },
  });
  const jsonString = response.text.trim();
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to parse story JSON from model response:", jsonString);
    throw new Error("The AI returned an invalid story format. Please try generating the story again.");
  }
};

export const generateImage = async (prompt: string, apiKey: string | null, imageStyle: string): Promise<string> => {
  const ai = getAiClient(apiKey);
  const fullPrompt = `An illustration for a children's storybook. The scene is: ${prompt}. The style should be ${imageStyle}, vibrant, detailed, and magical.`;
  
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: fullPrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '4:3',
    },
  });

  if (response.generatedImages && response.generatedImages.length > 0) {
    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  }
  throw new Error('Image generation failed.');
};

export const generateCoverImage = async (prompt: string, apiKey: string | null, imageStyle: string): Promise<string> => {
    // This function is specifically for the PDF cover, but can reuse the main image generation logic.
    return generateImage(prompt, apiKey, imageStyle);
};

export const generateTTSAudio = async (text: string, apiKey: string | null): Promise<string> => {
  const ai = getAiClient(apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say with a warm, friendly, and slightly animated storytelling voice: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
          voiceConfig: {
            // Using a voice that's good for storytelling
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
      },
    },
  });
  
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    // Return the raw base64 encoded audio data. The client will handle decoding.
    return base64Audio;
  }
  throw new Error('Audio generation failed.');
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