import 'dotenv/config';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import express from 'express';
import type { Request, Response } from 'express';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { jsPDF } from 'jspdf';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const FFMPEG_BIN = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg';
const SYSTEM_FONT_PATH = '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf';

const DEPRECATED_GEMINI_MODELS = new Set([
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-2.0-flash',
  'gemini-2.0-pro',
  'gemini-2.0-flash-thinking',
  'gemini-2.0-flash-lite',
]);

function normalizeGeminiTextModel(requested?: string): string {
  const clean = (requested || '').trim();
  if (!clean || DEPRECATED_GEMINI_MODELS.has(clean)) {
    return 'gemini-4-hydrogen';
  }
  return clean;
}

function isGemini4Model(model: string): boolean {
  return model.startsWith('gemini-4-');
}

function getServerAiClient(overrideApiKey?: string | null): GoogleGenAI {
  const key =
    (typeof overrideApiKey === 'string' && overrideApiKey.trim()) ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    '';

  const trimmedKey = key.trim();
  if (!trimmedKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  return new GoogleGenAI({
    apiKey: trimmedKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function pcmBufferToWavBuffer(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const pcmLength = pcmBuffer.length;
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcmLength, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcmLength, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function getHttpStatusFromGeminiError(err: any): number {
  const status = Number(err?.status || err?.code);
  if (status >= 400 && status < 600) return status;
  const msg = String(err?.message || err || '').toLowerCase();
  if (msg.includes('api_key_invalid') || msg.includes('api key not valid') || msg.includes('not configured')) return 400;
  if (msg.includes('permission_denied') || msg.includes('forbidden')) return 403;
  if (msg.includes('not_found') || msg.includes('not found')) return 404;
  if (msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('429')) return 429;
  return 500;
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // =========================================================================
  // SERVER-SIDE GEMINI API ROUTES
  // =========================================================================

  app.post('/api/gemini/generate-content', async (req: Request, res: Response) => {
    try {
      const {
        model,
        contents,
        systemInstruction,
        responseMimeType,
        responseSchema,
        temperature,
        apiKey,
      } = req.body || {};

      if (!contents) {
        return res.status(400).json({ error: 'contents is required' });
      }

      const ai = getServerAiClient(apiKey);
      const effectiveModel = normalizeGeminiTextModel(model);

      const buildConfig = (targetModel: string) => {
        const config: Record<string, any> = {};
        if (systemInstruction) config.systemInstruction = systemInstruction;
        if (responseMimeType) config.responseMimeType = responseMimeType;
        if (responseSchema) config.responseSchema = responseSchema;
        if (typeof temperature === 'number' && !isGemini4Model(targetModel)) {
          config.temperature = temperature;
        }
        return config;
      };

      try {
        const response = await ai.models.generateContent({
          model: effectiveModel,
          contents,
          config: buildConfig(effectiveModel),
        });
        const text = response.text || '';
        if (!text) {
          return res.status(502).json({ error: 'The AI model returned an empty response.' });
        }
        return res.json({ text });
      } catch (primaryErr: any) {
        const status = getHttpStatusFromGeminiError(primaryErr);
        // If requested model is unavailable / 404, retry seamlessly with gemini-4-hydrogen
        if (status === 404 && effectiveModel !== 'gemini-4-hydrogen') {
          const fallbackResponse = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents,
            config: buildConfig('gemini-4-hydrogen'),
          });
          const text = fallbackResponse.text || '';
          if (!text) {
            return res.status(502).json({ error: 'The AI model returned an empty response.' });
          }
          return res.json({ text });
        }
        throw primaryErr;
      }
    } catch (err: any) {
      const status = getHttpStatusFromGeminiError(err);
      return res.status(status).json({ error: err?.message || 'Gemini generateContent failed.' });
    }
  });

  app.post('/api/gemini/stream', async (req: Request, res: Response) => {
    try {
      const {
        model,
        contents,
        systemInstruction,
        temperature,
        apiKey,
      } = req.body || {};

      if (!contents) {
        return res.status(400).json({ error: 'contents is required' });
      }

      const ai = getServerAiClient(apiKey);
      const effectiveModel = normalizeGeminiTextModel(model);
      const config: Record<string, any> = {};
      if (systemInstruction) config.systemInstruction = systemInstruction;
      if (typeof temperature === 'number' && !isGemini4Model(effectiveModel)) {
        config.temperature = temperature;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = await ai.models.generateContentStream({
        model: effectiveModel,
        contents,
        config,
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    } catch (err: any) {
      const msg = err?.message || 'Gemini stream failed.';
      if (!res.headersSent) {
        return res.status(getHttpStatusFromGeminiError(err)).json({ error: msg });
      }
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      return res.end();
    }
  });

  app.post('/api/gemini/generate-image', async (req: Request, res: Response) => {
    try {
      const {
        model,
        prompt,
        aspectRatio = '16:9',
        imageSize = '1K',
        outputMimeType = 'image/jpeg',
        apiKey,
      } = req.body || {};

      if (!prompt) {
        return res.status(400).json({ error: 'prompt is required' });
      }

      const ai = getServerAiClient(apiKey);
      const requestedModel = (model || 'gemini-2.5-flash-image').trim();
      const isImagen = requestedModel.startsWith('imagen');

      if (isImagen) {
        try {
          const imgRes = await ai.models.generateImages({
            model: requestedModel,
            prompt,
            config: {
              numberOfImages: 1,
              outputMimeType,
              aspectRatio,
            },
          });
          const imageBytes = imgRes.generatedImages?.[0]?.image?.imageBytes;
          if (imageBytes) {
            return res.json({ dataUrl: `data:${outputMimeType};base64,${imageBytes}` });
          }
        } catch (imgErr: any) {
          console.warn(`[Server Image] Imagen model ${requestedModel} failed, trying Gemini image fallback:`, imgErr?.message || imgErr);
        }
      }

      const candidateModels = Array.from(
        new Set([
          !isImagen && requestedModel ? requestedModel : 'gemini-2.5-flash-image',
          'gemini-2.5-flash-image',
          'gemini-3.1-flash-lite-image',
        ])
      );

      let lastErr: any = null;
      for (const candidate of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: candidate,
            contents: {
              parts: [{ text: prompt }],
            },
            config: {
              imageConfig: {
                aspectRatio,
                imageSize,
              },
            },
          });

          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData?.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              return res.json({ dataUrl: `data:${mime};base64,${part.inlineData.data}` });
            }
          }
        } catch (err: any) {
          lastErr = err;
          console.warn(`[Server Image] Gemini image model ${candidate} failed:`, err?.message || err);
        }
      }

      const status = lastErr ? getHttpStatusFromGeminiError(lastErr) : 502;
      return res.status(status).json({ error: lastErr?.message || 'Image generation returned no image data.' });
    } catch (err: any) {
      const status = getHttpStatusFromGeminiError(err);
      return res.status(status).json({ error: err?.message || 'Gemini image generation failed.' });
    }
  });

  app.post('/api/gemini/tts', async (req: Request, res: Response) => {
    try {
      const {
        model,
        text,
        voice = 'Kore',
        promptDirective,
        apiKey,
      } = req.body || {};

      if (!promptDirective && !text) {
        return res.status(400).json({ error: 'text or promptDirective is required' });
      }

      const ai = getServerAiClient(apiKey);
      const directiveText = promptDirective || text;
      const candidateModels = Array.from(
        new Set([
          model || 'gemini-3.1-flash-tts-preview',
          'gemini-2.5-flash-preview-tts',
          'gemini-3.8-flash-lite-tts',
        ])
      );

      let lastErr: any = null;
      for (const candidate of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: candidate,
            contents: [{ parts: [{ text: directiveText }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
                },
              },
            },
          });

          const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          const base64Audio = inlineData?.data;
          if (base64Audio) {
            const rawBuffer = Buffer.from(base64Audio, 'base64');
            const isAlreadyWav =
              rawBuffer.length >= 12 &&
              rawBuffer.toString('ascii', 0, 4) === 'RIFF' &&
              rawBuffer.toString('ascii', 8, 12) === 'WAVE';

            const wavBuffer = isAlreadyWav ? rawBuffer : pcmBufferToWavBuffer(rawBuffer);
            return res.json({ dataUrl: `data:audio/wav;base64,${wavBuffer.toString('base64')}` });
          }
        } catch (err: any) {
          lastErr = err;
          console.warn(`[Server TTS] Gemini TTS model ${candidate} failed:`, err?.message || err);
        }
      }

      const status = lastErr ? getHttpStatusFromGeminiError(lastErr) : 502;
      return res.status(status).json({ error: lastErr?.message || 'Gemini TTS returned no audio data.' });
    } catch (err: any) {
      const status = getHttpStatusFromGeminiError(err);
      return res.status(status).json({ error: err?.message || 'Gemini TTS generation failed.' });
    }
  });

  app.post('/api/gemini/test-key', async (req: Request, res: Response) => {
    const { apiKey, model } = req.body || {};
    const trimmedKey = typeof apiKey === 'string' ? apiKey.trim() : '';

    if (!trimmedKey) {
      return res.json({ success: false, message: 'API Key cannot be empty.' });
    }

    const startedAt = Date.now();
    try {
      const ai = getServerAiClient(trimmedKey);
      const effectiveModel = normalizeGeminiTextModel(model || 'gemini-4-hydrogen');
      await ai.models.generateContent({
        model: effectiveModel,
        contents: 'test',
      });
      const latencyMs = Date.now() - startedAt;
      return res.json({
        success: true,
        message: 'Success! Your API Key is valid.',
        latencyMs,
      });
    } catch (error: any) {
      const latencyMs = Date.now() - startedAt;
      let userMessage = 'An unknown error occurred. Please double-check your API key.';
      const errorMessage = String(error?.message || error || '').toLowerCase();
      const linkText = 'You can find or create a key at Google AI Studio.';

      if (errorMessage.includes('api key not valid') || errorMessage.includes('api_key_invalid')) {
        userMessage = 'Invalid API Key. Please ensure you have copied the entire key correctly.';
      } else if (errorMessage.includes('quota') || errorMessage.includes('resource has been exhausted') || errorMessage.includes('resource_exhausted')) {
        userMessage = 'You may have exceeded your API quota for the day. Please check your usage in your Google Cloud account.';
      } else if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        userMessage = 'A network error occurred. Please check your internet connection and try again.';
      }

      return res.json({
        success: false,
        message: `${userMessage} ${linkText}`,
        latencyMs,
      });
    }
  });

  // =========================================================================
  // OAUTH, MCP & INTEGRATION ROUTES (migrated from vite.config.ts)
  // =========================================================================

  app.post('/api/auth/github', async (req: Request, res: Response) => {
    try {
      const code = req.body?.code;
      const clientId = (process.env.VITE_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || 'Ov23liemnwcrhjAbci6R').replace(/["',;]/g, '').trim();
      const clientSecret = (process.env.VITE_GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET || '').replace(/["',;]/g, '').trim();

      if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
      }

      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Novellaio-App',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      const data: any = await response.json();
      let username = '';
      if (data.access_token) {
        try {
          const uRes = await fetch('https://api.github.com/user', {
            headers: {
              'Authorization': `Bearer ${data.access_token}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'Novellaio-App',
            },
          });
          if (uRes.ok) {
            const uData: any = await uRes.json();
            username = uData.login || '';
          }
        } catch (uErr) {
          console.error('Error fetching user profile:', uErr);
        }
      }

      return res.status(200).json({ ...data, username });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to exchange GitHub code' });
    }
  });

  app.post('/api/auth/google', async (req: Request, res: Response) => {
    try {
      const code = req.body?.code;
      const redirectUri = req.body?.redirect_uri || `${req.headers.origin || `http://${req.headers.host || 'localhost:3000'}`}/auth/callback`;
      const clientId = (process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '').replace(/["',;]/g, '').trim();
      const clientSecret = (process.env.VITE_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '').replace(/["',;]/g, '').trim();

      if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
      }

      const params = new URLSearchParams();
      params.append('code', code);
      params.append('client_id', clientId);
      if (clientSecret) {
        params.append('client_secret', clientSecret);
      }
      params.append('redirect_uri', redirectUri);
      params.append('grant_type', 'authorization_code');

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data: any = await response.json();
      let username = '';
      let email = '';
      if (data.access_token) {
        try {
          const uRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              'Authorization': `Bearer ${data.access_token}`,
              'Accept': 'application/json',
            },
          });
          if (uRes.ok) {
            const uData: any = await uRes.json();
            email = uData.email || '';
            username = uData.name || uData.email || 'Google User';
          }
        } catch (uErr) {
          console.error('Error fetching Google user profile:', uErr);
        }
      }

      return res.status(200).json({ ...data, username, email });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to exchange Google code' });
    }
  });

  // =========================================================================
  // SERVER STORY REPOSITORY & ARTIFACT DOWNLOAD STORE (FOR MCP & AGENTS)
  // =========================================================================

  interface StoredSegment {
    id: string;
    paragraph: string;
    chapterNumber?: number;
    chapterTitle?: string;
    choices?: string[];
    imageUrl?: string;
    audioUrl?: string;
    sentiment?: string;
    tone?: string;
  }

  interface StoredStory {
    storyId: string;
    title: string;
    genre: string;
    targetAudience: string;
    author: string;
    updatedAt: number;
    segments: StoredSegment[];
  }

  interface StoredArtifact {
    id: string;
    filename: string;
    mimeType: string;
    buffer: Buffer;
    createdAt: number;
    metadata?: Record<string, any>;
  }

  const storyRepository = new Map<string, StoredStory>();
  const downloadArtifacts = new Map<string, StoredArtifact>();

  function getRequestBaseUrl(req: Request): string {
    const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() || req.protocol || 'http';
    const host = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim() || req.get('host') || `localhost:${PORT}`;
    return `${proto}://${host}`;
  }

  function sanitizeStoryId(input?: string): string {
    const cleaned = (input || 'active_story')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return cleaned || 'active_story';
  }

  function saveArtifact(
    filename: string,
    mimeType: string,
    buffer: Buffer,
    baseUrl: string,
    metadata?: Record<string, any>
  ) {
    // Prune oldest if > 40 artifacts in memory
    if (downloadArtifacts.size >= 40) {
      const oldestKey = downloadArtifacts.keys().next().value;
      if (oldestKey) downloadArtifacts.delete(oldestKey);
    }

    const id = `art_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    downloadArtifacts.set(id, {
      id,
      filename,
      mimeType,
      buffer,
      createdAt: Date.now(),
      metadata,
    });

    const relativeUrl = `/api/mcp/downloads/${id}`;
    return {
      fileId: id,
      filename,
      mimeType,
      sizeBytes: buffer.length,
      relativeUrl,
      downloadUrl: `${baseUrl}${relativeUrl}`,
    };
  }

  function upsertStoryRecord(payload: {
    storyId?: string;
    title?: string;
    genre?: string;
    targetAudience?: string;
    author?: string;
    segments?: any[];
  }): StoredStory {
    const title = String(payload.title || 'Novellaio Adventure').trim() || 'Novellaio Adventure';
    const storyId = sanitizeStoryId(payload.storyId || title);
    const existing = storyRepository.get(storyId);

    const normalizedSegments: StoredSegment[] = Array.isArray(payload.segments)
      ? payload.segments.map((seg, idx) => ({
          id: String(seg?.id || `seg_${idx + 1}`),
          paragraph: String(seg?.paragraph || '').trim(),
          chapterNumber: typeof seg?.chapterNumber === 'number' ? seg.chapterNumber : idx === 0 ? 1 : undefined,
          chapterTitle: seg?.chapterTitle ? String(seg.chapterTitle) : idx === 0 ? 'Chapter 1: Opening' : undefined,
          choices: Array.isArray(seg?.choices) ? seg.choices.map((c: any) => String(c)) : undefined,
          imageUrl: typeof seg?.imageUrl === 'string' ? seg.imageUrl : undefined,
          audioUrl: typeof seg?.audioUrl === 'string' ? seg.audioUrl : undefined,
          sentiment: typeof seg?.sentiment === 'string' ? seg.sentiment : undefined,
          tone: typeof seg?.tone === 'string' ? seg.tone : undefined,
        })).filter((s) => s.paragraph.length > 0)
      : existing?.segments || [];

    const record: StoredStory = {
      storyId,
      title,
      genre: String(payload.genre || existing?.genre || 'fantasy'),
      targetAudience: String(payload.targetAudience || existing?.targetAudience || 'children'),
      author: String(payload.author || existing?.author || 'Novellaio AI Author'),
      updatedAt: Date.now(),
      segments: normalizedSegments,
    };

    // Keep repository capped at 30 recent stories
    if (!storyRepository.has(storyId) && storyRepository.size >= 30) {
      const oldestKey = storyRepository.keys().next().value;
      if (oldestKey) storyRepository.delete(oldestKey);
    }

    storyRepository.set(storyId, record);
    return record;
  }

  function getLatestStory(): StoredStory | null {
    let latest: StoredStory | null = null;
    for (const story of storyRepository.values()) {
      if (!latest || story.updatedAt > latest.updatedAt) {
        latest = story;
      }
    }
    return latest;
  }

  function resolveStoryInput(args: Record<string, any>): StoredStory {
    const requestedId = args.storyId ? sanitizeStoryId(String(args.storyId)) : '';
    const repoMatch = (requestedId && storyRepository.get(requestedId)) || getLatestStory();

    let segments: StoredSegment[] = [];
    if (Array.isArray(args.segments) && args.segments.length > 0) {
      segments = args.segments.map((s: any, idx: number) => ({
        id: String(s?.id || `seg_${idx + 1}`),
        paragraph: String(typeof s === 'string' ? s : s?.paragraph || '').trim(),
        chapterNumber: typeof s?.chapterNumber === 'number' ? s.chapterNumber : idx + 1,
        chapterTitle: s?.chapterTitle ? String(s.chapterTitle) : `Scene ${idx + 1}`,
        choices: Array.isArray(s?.choices) ? s.choices.map(String) : undefined,
        imageUrl: typeof s?.imageUrl === 'string' ? s.imageUrl : undefined,
        audioUrl: typeof s?.audioUrl === 'string' ? s.audioUrl : undefined,
      })).filter((s: StoredSegment) => s.paragraph.length > 0);
    } else if (Array.isArray(args.paragraphs) && args.paragraphs.length > 0) {
      segments = args.paragraphs
        .map((p: any, idx: number) => ({
          id: `seg_${idx + 1}`,
          paragraph: String(p || '').trim(),
          chapterNumber: idx + 1,
          chapterTitle: `Scene ${idx + 1}`,
        }))
        .filter((s: StoredSegment) => s.paragraph.length > 0);
    } else if (typeof args.text === 'string' && args.text.trim()) {
      const paras = args.text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
      segments = (paras.length > 0 ? paras : [args.text.trim()]).map((p, idx) => ({
        id: `seg_${idx + 1}`,
        paragraph: p,
        chapterNumber: idx + 1,
        chapterTitle: `Scene ${idx + 1}`,
      }));
    } else if (repoMatch && repoMatch.segments.length > 0) {
      segments = repoMatch.segments;
    }

    const title = String(args.title || repoMatch?.title || 'Novellaio Adventure').trim() || 'Novellaio Adventure';
    return {
      storyId: requestedId || repoMatch?.storyId || sanitizeStoryId(title),
      title,
      genre: String(args.genre || repoMatch?.genre || 'fantasy'),
      targetAudience: String(args.targetAudience || repoMatch?.targetAudience || 'children'),
      author: String(args.author || repoMatch?.author || 'Novellaio AI Author'),
      updatedAt: repoMatch?.updatedAt || Date.now(),
      segments,
    };
  }

  function extractJsonLoose(rawText: string): any {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error('Model returned invalid JSON format.');
    }
  }

  // Parse WAV header and normalize PCM to 24000Hz Mono 16-bit signed LE
  function extractNormalizedPcm24kMono(wavBuffer: Buffer): Buffer | null {
    if (wavBuffer.length < 44) return null;
    if (wavBuffer.toString('ascii', 0, 4) !== 'RIFF' || wavBuffer.toString('ascii', 8, 12) !== 'WAVE') {
      return null;
    }

    let offset = 12;
    let numChannels = 1;
    let sampleRate = 24000;
    let bitsPerSample = 16;
    let dataBuffer: Buffer | null = null;

    while (offset + 8 <= wavBuffer.length) {
      const chunkId = wavBuffer.toString('ascii', offset, offset + 4);
      const chunkSize = wavBuffer.readUInt32LE(offset + 4);
      const chunkDataStart = offset + 8;
      const chunkDataEnd = Math.min(wavBuffer.length, chunkDataStart + chunkSize);

      if (chunkId === 'fmt ' && chunkSize >= 16 && chunkDataStart + 16 <= wavBuffer.length) {
        numChannels = wavBuffer.readUInt16LE(chunkDataStart + 2) || 1;
        sampleRate = wavBuffer.readUInt32LE(chunkDataStart + 4) || 24000;
        bitsPerSample = wavBuffer.readUInt16LE(chunkDataStart + 14) || 16;
      } else if (chunkId === 'data') {
        dataBuffer = wavBuffer.subarray(chunkDataStart, chunkDataEnd);
      }

      offset = chunkDataStart + chunkSize + (chunkSize % 2);
    }

    if (!dataBuffer || dataBuffer.length < 2) return null;
    if (bitsPerSample !== 16) return null;

    // Step 1: Downmix stereo/multi-channel to mono
    const bytesPerFrame = numChannels * 2;
    const totalFrames = Math.floor(dataBuffer.length / bytesPerFrame);
    const monoSamples = new Int16Array(totalFrames);

    for (let i = 0; i < totalFrames; i++) {
      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        sum += dataBuffer.readInt16LE(i * bytesPerFrame + ch * 2);
      }
      monoSamples[i] = Math.max(-32768, Math.min(32767, Math.round(sum / numChannels)));
    }

    // Step 2: Resample to 24000Hz if different
    if (sampleRate === 24000) {
      return Buffer.from(monoSamples.buffer, monoSamples.byteOffset, monoSamples.byteLength);
    }

    const targetRate = 24000;
    const outFrames = Math.max(1, Math.round((totalFrames * targetRate) / sampleRate));
    const outBuf = Buffer.alloc(outFrames * 2);
    const ratio = (totalFrames - 1) / Math.max(1, outFrames - 1);

    for (let i = 0; i < outFrames; i++) {
      const srcPos = i * ratio;
      const idx = Math.floor(srcPos);
      const frac = srcPos - idx;
      const s0 = monoSamples[idx] ?? 0;
      const s1 = monoSamples[Math.min(idx + 1, totalFrames - 1)] ?? s0;
      const interp = Math.max(-32768, Math.min(32767, Math.round(s0 + (s1 - s0) * frac)));
      outBuf.writeInt16LE(interp, i * 2);
    }
    return outBuf;
  }

  async function synthesizeSegmentTtsWav(
    text: string,
    voice = 'Kore',
    model?: string,
    apiKey?: string
  ): Promise<Buffer> {
    const ai = getServerAiClient(apiKey);
    const candidateModels = Array.from(
      new Set([
        model || 'gemini-3.1-flash-tts-preview',
        'gemini-2.5-flash-preview-tts',
        'gemini-3.8-flash-lite-tts',
      ])
    );

    let lastErr: any = null;
    for (const candidate of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: candidate,
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          const rawBuffer = Buffer.from(base64Audio, 'base64');
          const isAlreadyWav =
            rawBuffer.length >= 12 &&
            rawBuffer.toString('ascii', 0, 4) === 'RIFF' &&
            rawBuffer.toString('ascii', 8, 12) === 'WAVE';
          return isAlreadyWav ? rawBuffer : pcmBufferToWavBuffer(rawBuffer);
        }
      } catch (err: any) {
        lastErr = err;
      }
    }

    throw lastErr || new Error('Gemini TTS synthesis did not return audio data.');
  }

  async function buildStoryAudioWav(
    story: StoredStory,
    options: { voice?: string; synthesizeMissing?: boolean; apiKey?: string; silenceGapSeconds?: number } = {}
  ): Promise<{ wavBuffer: Buffer; scenesVoiced: number; durationSeconds: number }> {
    if (!story.segments.length) {
      throw new Error('No story segments or text provided to generate audio.');
    }

    const pcmChunks: Buffer[] = [];
    const gapBytes = Math.round(24000 * (options.silenceGapSeconds ?? 0.45)) * 2;
    const silenceGap = Buffer.alloc(gapBytes);
    let scenesVoiced = 0;

    for (let i = 0; i < story.segments.length; i++) {
      const seg = story.segments[i];
      let wavBuf: Buffer | null = null;

      if (seg.audioUrl && seg.audioUrl.startsWith('data:audio/') && seg.audioUrl.includes('base64,')) {
        const b64 = seg.audioUrl.split('base64,')[1];
        if (b64) {
          const candidate = Buffer.from(b64, 'base64');
          if (candidate.length >= 44 && candidate.toString('ascii', 0, 4) === 'RIFF') {
            wavBuf = candidate;
          }
        }
      }

      if (!wavBuf && options.synthesizeMissing !== false) {
        try {
          wavBuf = await synthesizeSegmentTtsWav(seg.paragraph, options.voice || 'Kore', undefined, options.apiKey);
        } catch (ttsErr: any) {
          if (i === 0 && !story.segments.some((s) => s.audioUrl)) {
            throw new Error(`Audio synthesis failed: ${ttsErr?.message || 'Configure GEMINI_API_KEY in Settings > Secrets or provide voiced segments.'}`);
          }
        }
      }

      if (wavBuf) {
        const normalizedPcm = extractNormalizedPcm24kMono(wavBuf);
        if (normalizedPcm && normalizedPcm.length > 0) {
          if (pcmChunks.length > 0) pcmChunks.push(silenceGap);
          pcmChunks.push(normalizedPcm);
          scenesVoiced++;
        }
      }
    }

    if (pcmChunks.length === 0) {
      throw new Error('No voiced audio segments could be extracted or synthesized.');
    }

    const totalPcm = Buffer.concat(pcmChunks);
    const wavBuffer = pcmBufferToWavBuffer(totalPcm, 24000, 1, 16);
    const durationSeconds = Number((totalPcm.length / (24000 * 2)).toFixed(2));
    return { wavBuffer, scenesVoiced, durationSeconds };
  }

  async function buildStoryPdfBuffer(
    story: StoredStory,
    options: { theme?: string; includeImages?: boolean; author?: string } = {}
  ): Promise<{ pdfBuffer: Buffer; pageCount: number; filename: string }> {
    if (!story.segments.length) {
      throw new Error('No story segments or text provided to compile PDF.');
    }

    const themeKey = (options.theme || 'classic_ivory').toLowerCase();
    const isDark = themeKey === 'midnight' || themeKey === 'royal_slate' || themeKey === 'emerald_parchment';
    const bgRgb: [number, number, number] =
      themeKey === 'midnight'
        ? [15, 23, 42]
        : themeKey === 'royal_slate'
        ? [17, 24, 39]
        : themeKey === 'emerald_parchment'
        ? [6, 36, 28]
        : [250, 246, 238];
    const textRgb: [number, number, number] = isDark ? [241, 245, 249] : [30, 41, 59];
    const mutedRgb: [number, number, number] = isDark ? [148, 163, 184] : [100, 116, 139];
    const accentRgb: [number, number, number] =
      themeKey === 'emerald_parchment'
        ? [52, 211, 153]
        : themeKey === 'royal_slate'
        ? [251, 191, 36]
        : isDark
        ? [192, 132, 252]
        : [109, 40, 217];

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentW = pageW - margin * 2;
    const author = options.author || story.author || 'Novellaio AI Author';

    const paintPageChrome = (pageNumLabel?: string) => {
      doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
      doc.rect(0, 0, pageW, pageH, 'F');
      doc.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
      doc.setLineWidth(0.3);
      doc.rect(10, 10, pageW - 20, pageH - 20);
      if (pageNumLabel) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(mutedRgb[0], mutedRgb[1], mutedRgb[2]);
        doc.text(story.title.slice(0, 50), margin, 16);
        doc.text(pageNumLabel, pageW / 2, pageH - 13, { align: 'center' });
      }
    };

    const resolveRasterImageDataUrl = async (url?: string): Promise<{ data: string; format: 'JPEG' | 'PNG' } | null> => {
      if (!url || options.includeImages === false) return null;
      try {
        if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg')) {
          return { data: url, format: 'JPEG' };
        }
        if (url.startsWith('data:image/png')) {
          return { data: url, format: 'PNG' };
        }
        if (url.startsWith('http://') || url.startsWith('https://')) {
          const resp = await fetch(url);
          if (!resp.ok) return null;
          const ct = (resp.headers.get('content-type') || '').toLowerCase();
          const buf = Buffer.from(await resp.arrayBuffer());
          if (ct.includes('png')) {
            return { data: `data:image/png;base64,${buf.toString('base64')}`, format: 'PNG' };
          }
          if (ct.includes('jpeg') || ct.includes('jpg')) {
            return { data: `data:image/jpeg;base64,${buf.toString('base64')}`, format: 'JPEG' };
          }
        }
      } catch {
        return null;
      }
      return null;
    };

    // Page 1: Cover Page
    paintPageChrome();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.text(`${story.genre.toUpperCase()}  •  ${story.targetAudience.toUpperCase()}`, pageW / 2, 42, { align: 'center' });

    const coverImg = await resolveRasterImageDataUrl(story.segments[0]?.imageUrl);
    if (coverImg) {
      try {
        doc.addImage(coverImg.data, coverImg.format, margin + 8, 52, contentW - 16, 95);
      } catch {}
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
    const titleLines = doc.splitTextToSize(story.title, contentW - 10);
    doc.text(titleLines, pageW / 2, coverImg ? 168 : 115, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(mutedRgb[0], mutedRgb[1], mutedRgb[2]);
    doc.text(`Written by ${author}`, pageW / 2, coverImg ? 205 : 155, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`${story.segments.length} Illustrated Scenes  •  Novellaio AI Studio`, pageW / 2, pageH - 28, { align: 'center' });

    // Story Scene Pages
    for (let i = 0; i < story.segments.length; i++) {
      const seg = story.segments[i];
      doc.addPage();
      const pageIdx = doc.getNumberOfPages();
      paintPageChrome(`Page ${pageIdx}`);

      let cursorY = 28;
      const chapLabel = seg.chapterTitle || `Scene ${i + 1}`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
      doc.text(`SCENE ${i + 1} OF ${story.segments.length}`, margin, cursorY);
      cursorY += 7;

      doc.setFont('times', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
      const headLines = doc.splitTextToSize(chapLabel, contentW);
      doc.text(headLines, margin, cursorY);
      cursorY += headLines.length * 7.5 + 4;

      const sceneImg = await resolveRasterImageDataUrl(seg.imageUrl);
      if (sceneImg) {
        try {
          doc.addImage(sceneImg.data, sceneImg.format, margin, cursorY, contentW, 82);
          cursorY += 90;
        } catch {}
      }

      doc.setFont('times', 'normal');
      doc.setFontSize(12.5);
      doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
      const bodyLines: string[] = doc.splitTextToSize(seg.paragraph, contentW);

      for (const line of bodyLines) {
        if (cursorY > pageH - 25) {
          doc.addPage();
          paintPageChrome(`Page ${doc.getNumberOfPages()}`);
          cursorY = 26;
          doc.setFont('times', 'normal');
          doc.setFontSize(12.5);
          doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
        }
        doc.text(line, margin, cursorY);
        cursorY += 6.5;
      }

      if (seg.choices && seg.choices.length > 0 && cursorY < pageH - 36) {
        cursorY += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
        doc.text('BRANCHING CHOICES:', margin, cursorY);
        cursorY += 5.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(mutedRgb[0], mutedRgb[1], mutedRgb[2]);
        for (let cIdx = 0; cIdx < seg.choices.length; cIdx++) {
          if (cursorY > pageH - 20) break;
          const choiceLines = doc.splitTextToSize(`${cIdx + 1}. ${seg.choices[cIdx]}`, contentW - 4);
          doc.text(choiceLines, margin + 2, cursorY);
          cursorY += choiceLines.length * 4.8 + 1;
        }
      }
    }

    const pdfArrayBuf = doc.output('arraybuffer');
    const pdfBuffer = Buffer.from(pdfArrayBuf);
    const filename = `${sanitizeStoryId(story.title)}.pdf`;
    return { pdfBuffer, pageCount: doc.getNumberOfPages(), filename };
  }

  function wrapLinesForDrawtext(text: string, maxCharsPerLine: number, maxLines: number): string[] {
    const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      if ((current + ' ' + w).trim().length <= maxCharsPerLine) {
        current = (current + ' ' + w).trim();
      } else {
        if (current) lines.push(current);
        current = w;
        if (lines.length >= maxLines) break;
      }
    }
    if (current && lines.length < maxLines) lines.push(current);
    if (lines.length === maxLines && words.length > 0) {
      const joinedLen = lines.join(' ').length;
      if (joinedLen < text.length - 5) {
        lines[maxLines - 1] = lines[maxLines - 1].slice(0, Math.max(10, maxCharsPerLine - 3)) + '...';
      }
    }
    return lines;
  }

  async function buildStoryVideoBuffer(
    story: StoredStory,
    options: {
      aspectRatio?: '9:16' | '16:9' | '1:1';
      format?: 'mp4' | 'webm';
      includeNarration?: boolean;
      subtitlesEnabled?: boolean;
      voice?: string;
      apiKey?: string;
    } = {}
  ): Promise<{ videoBuffer: Buffer; mimeType: string; filename: string; durationSeconds: number; resolution: string }> {
    if (!story.segments.length) {
      throw new Error('No story segments or text provided to render video.');
    }

    const aspect = options.aspectRatio === '16:9' || options.aspectRatio === '1:1' ? options.aspectRatio : '9:16';
    const format = options.format === 'webm' ? 'webm' : 'mp4';
    const dims = aspect === '16:9' ? { w: 1280, h: 720 } : aspect === '1:1' ? { w: 720, h: 720 } : { w: 720, h: 1280 };
    const resolution = `${dims.w}x${dims.h}`;

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'novellaio-video-'));
    try {
      const targetSegments = story.segments.slice(0, 10);
      const sceneClipPaths: string[] = [];
      let totalDuration = 0;

      const hasSystemFont = await fs.access(SYSTEM_FONT_PATH).then(() => true).catch(() => false);

      for (let i = 0; i < targetSegments.length; i++) {
        const seg = targetSegments[i];
        let segDuration = Math.max(4, Math.min(12, Number((seg.paragraph.split(/\s+/).length / 2.6).toFixed(1))));
        const audioPath = path.join(tmpDir, `scene_${i}.wav`);
        let hasAudioFile = false;

        // 1. Resolve audio (existing WAV or Gemini TTS if requested)
        let wavBuf: Buffer | null = null;
        if (seg.audioUrl && seg.audioUrl.startsWith('data:audio/') && seg.audioUrl.includes('base64,')) {
          const b64 = seg.audioUrl.split('base64,')[1];
          if (b64) {
            const candidate = Buffer.from(b64, 'base64');
            if (candidate.length >= 44 && candidate.toString('ascii', 0, 4) === 'RIFF') {
              wavBuf = candidate;
            }
          }
        }
        if (!wavBuf && options.includeNarration !== false) {
          try {
            wavBuf = await synthesizeSegmentTtsWav(seg.paragraph, options.voice || 'Kore', undefined, options.apiKey);
          } catch {
            wavBuf = null;
          }
        }
        if (wavBuf) {
          const normPcm = extractNormalizedPcm24kMono(wavBuf);
          if (normPcm && normPcm.length > 0) {
            const paddedWav = pcmBufferToWavBuffer(Buffer.concat([normPcm, Buffer.alloc(24000)]), 24000, 1, 16);
            await fs.writeFile(audioPath, paddedWav);
            segDuration = Math.max(3, Number(((normPcm.length / (24000 * 2)) + 0.5).toFixed(2)));
            hasAudioFile = true;
          }
        }

        // 2. Resolve image frame if available
        let imgPath: string | null = null;
        if (seg.imageUrl) {
          try {
            if (seg.imageUrl.startsWith('data:image/') && seg.imageUrl.includes('base64,')) {
              const header = seg.imageUrl.split(',')[0];
              const ext = header.includes('png') ? 'png' : 'jpg';
              const buf = Buffer.from(seg.imageUrl.split('base64,')[1], 'base64');
              const p = path.join(tmpDir, `scene_${i}.${ext}`);
              await fs.writeFile(p, buf);
              imgPath = p;
            } else if (seg.imageUrl.startsWith('http://') || seg.imageUrl.startsWith('https://')) {
              const resp = await fetch(seg.imageUrl);
              if (resp.ok) {
                const ct = (resp.headers.get('content-type') || '').toLowerCase();
                const ext = ct.includes('png') ? 'png' : 'jpg';
                const buf = Buffer.from(await resp.arrayBuffer());
                const p = path.join(tmpDir, `scene_${i}.${ext}`);
                await fs.writeFile(p, buf);
                imgPath = p;
              }
            }
          } catch {
            imgPath = null;
          }
        }

        // 3. Build filtergraph with Ken Burns scale + optional subtitle text file
        const filters: string[] = [
          `scale=${dims.w}:${dims.h}:force_original_aspect_ratio=increase`,
          `crop=${dims.w}:${dims.h}`,
          `format=yuv420p`,
        ];

        if (options.subtitlesEnabled !== false && hasSystemFont) {
          const subtitleFile = path.join(tmpDir, `sub_${i}.txt`);
          const maxChars = aspect === '16:9' ? 58 : 34;
          const lines = wrapLinesForDrawtext(seg.paragraph, maxChars, 5);
          await fs.writeFile(subtitleFile, lines.join('\n'), 'utf8');

          const boxH = Math.max(180, Math.round(dims.h * 0.25));
          filters.push(`drawbox=x=0:y=${dims.h - boxH}:w=${dims.w}:h=${boxH}:color=black@0.58:t=fill`);

          const escapedFont = SYSTEM_FONT_PATH.replace(/:/g, '\\:');
          const escapedSubFile = subtitleFile.replace(/:/g, '\\:').replace(/'/g, "\\'");
          const titleFile = path.join(tmpDir, `title_${i}.txt`);
          await fs.writeFile(titleFile, `${seg.chapterTitle || `Scene ${i + 1}`}`.slice(0, 48), 'utf8');
          const escapedTitleFile = titleFile.replace(/:/g, '\\:').replace(/'/g, "\\'");

          const fontSize = aspect === '16:9' ? 28 : 26;
          filters.push(
            `drawtext=fontfile='${escapedFont}':textfile='${escapedTitleFile}':fontcolor=#d8b4fe:fontsize=${fontSize - 4}:x=40:y=${dims.h - boxH + 20}`
          );
          filters.push(
            `drawtext=fontfile='${escapedFont}':textfile='${escapedSubFile}':fontcolor=white:fontsize=${fontSize}:line_spacing=8:x=40:y=${dims.h - boxH + 58}`
          );
        }

        const sceneClipPath = path.join(tmpDir, `clip_${i}.mp4`);
        const paletteColors = ['#1e1b4b', '#311042', '#0f2942', '#1f2937', '#2e1065'];
        const bgHex = paletteColors[i % paletteColors.length];

        const ffmpegArgs: string[] = ['-y'];
        if (imgPath) {
          ffmpegArgs.push('-loop', '1', '-t', String(segDuration), '-i', imgPath);
        } else {
          ffmpegArgs.push('-f', 'lavfi', '-t', String(segDuration), '-i', `color=c=${bgHex}:s=${dims.w}x${dims.h}:r=24`);
        }

        if (hasAudioFile) {
          ffmpegArgs.push('-i', audioPath);
        } else {
          ffmpegArgs.push(
            '-f',
            'lavfi',
            '-t',
            String(segDuration),
            '-i',
            `aevalsrc=0.025*sin(2*PI*220*t)+0.015*sin(2*PI*330*t):s=24000`
          );
        }

        ffmpegArgs.push(
          '-vf',
          filters.join(','),
          '-r',
          '24',
          '-t',
          String(segDuration),
          '-c:v',
          'libx264',
          '-preset',
          'ultrafast',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-ar',
          '44100',
          '-ac',
          '2',
          '-shortest',
          sceneClipPath
        );

        await execFileAsync(FFMPEG_BIN, ffmpegArgs, { timeout: 60000 });
        sceneClipPaths.push(sceneClipPath);
        totalDuration += segDuration;
      }

      const finalExt = format === 'webm' ? 'webm' : 'mp4';
      const finalPath = path.join(tmpDir, `final_output.${finalExt}`);

      if (sceneClipPaths.length === 1 && format === 'mp4') {
        await execFileAsync(FFMPEG_BIN, ['-y', '-i', sceneClipPaths[0], '-c', 'copy', '-movflags', '+faststart', finalPath], { timeout: 60000 });
      } else {
        const concatListPath = path.join(tmpDir, 'concat.txt');
        await fs.writeFile(
          concatListPath,
          sceneClipPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'),
          'utf8'
        );

        const concatArgs = ['-y', '-f', 'concat', '-safe', '0', '-i', concatListPath];
        if (format === 'webm') {
          concatArgs.push('-c:v', 'libvpx', '-b:v', '900k', '-c:a', 'libopus', finalPath);
        } else {
          concatArgs.push('-c', 'copy', '-movflags', '+faststart', finalPath);
        }
        await execFileAsync(FFMPEG_BIN, concatArgs, { timeout: 90000 });
      }

      const videoBuffer = await fs.readFile(finalPath);
      const mimeType = format === 'webm' ? 'video/webm' : 'video/mp4';
      const filename = `${sanitizeStoryId(story.title)}_${aspect.replace(':', 'x')}.${finalExt}`;
      return {
        videoBuffer,
        mimeType,
        filename,
        durationSeconds: Number(totalDuration.toFixed(2)),
        resolution,
      };
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  // CRC32 helper + Minimal ZIP builder for real EPUB packaging
  const crcTable = (() => {
    const tbl = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      tbl[n] = c >>> 0;
    }
    return tbl;
  })();

  function computeCrc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function buildStoredZipBuffer(entries: Array<{ name: string; content: Buffer }>): Buffer {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let offset = 0;

    for (const entry of entries) {
      const nameBuf = Buffer.from(entry.name, 'utf8');
      const crc = computeCrc32(entry.content);
      const size = entry.content.length;

      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(0, 8); // store
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeUInt32LE(crc, 14);
      localHeader.writeUInt32LE(size, 18);
      localHeader.writeUInt32LE(size, 22);
      localHeader.writeUInt16LE(nameBuf.length, 26);
      localHeader.writeUInt16LE(0, 28);

      localParts.push(localHeader, nameBuf, entry.content);

      const centralHeader = Buffer.alloc(46);
      centralHeader.writeUInt32LE(0x02014b50, 0);
      centralHeader.writeUInt16LE(20, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(0, 8);
      centralHeader.writeUInt16LE(0, 10);
      centralHeader.writeUInt16LE(0, 12);
      centralHeader.writeUInt16LE(0, 14);
      centralHeader.writeUInt32LE(crc, 16);
      centralHeader.writeUInt32LE(size, 20);
      centralHeader.writeUInt32LE(size, 24);
      centralHeader.writeUInt16LE(nameBuf.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(0, 38);
      centralHeader.writeUInt32LE(offset, 42);

      centralParts.push(centralHeader, nameBuf);
      offset += localHeader.length + nameBuf.length + size;
    }

    const centralDir = Buffer.concat(centralParts);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(centralDir.length, 12);
    eocd.writeUInt32LE(offset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...localParts, centralDir, eocd]);
  }

  function escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function buildEpubZipBuffer(story: StoredStory, authorOverride?: string): Buffer {
    const safeTitle = escapeXml(story.title);
    const safeAuthor = escapeXml(authorOverride || story.author || 'Novellaio AI Author');
    const bookUuid = `urn:uuid:${crypto.randomUUID()}`;
    const entries: Array<{ name: string; content: Buffer }> = [];

    entries.push({ name: 'mimetype', content: Buffer.from('application/epub+zip', 'utf8') });
    entries.push({
      name: 'META-INF/container.xml',
      content: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
        'utf8'
      ),
    });

    const manifestItems: string[] = [
      `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
      `<item id="style" href="style.css" media-type="text/css"/>`,
    ];
    const spineItems: string[] = [];
    const navPoints: string[] = [];

    story.segments.forEach((seg, idx) => {
      const chNum = idx + 1;
      const chapName = escapeXml(seg.chapterTitle || `Scene ${chNum}`);
      const fname = `chapter_${chNum}.xhtml`;
      manifestItems.push(`<item id="ch_${chNum}" href="${fname}" media-type="application/xhtml+xml"/>`);
      spineItems.push(`<itemref idref="ch_${chNum}"/>`);
      navPoints.push(
        `<navPoint id="navPoint-${chNum}" playOrder="${chNum}"><navLabel><text>${chapName}</text></navLabel><content src="${fname}"/></navPoint>`
      );

      const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${chapName}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <div class="chapter">
    <p class="eyebrow">Scene ${chNum}</p>
    <h1>${chapName}</h1>
    <p class="body">${escapeXml(seg.paragraph)}</p>
  </div>
</body>
</html>`;
      entries.push({ name: `OEBPS/${fname}`, content: Buffer.from(xhtml, 'utf8') });
    });

    entries.push({
      name: 'OEBPS/style.css',
      content: Buffer.from(
        `body{font-family:Georgia,serif;line-height:1.7;margin:5%;color:#1e293b}h1{font-size:1.5em;margin-bottom:0.8em}.eyebrow{font-size:0.75em;text-transform:uppercase;letter-spacing:0.15em;color:#6d28d9}.body{font-size:1.05em}`,
        'utf8'
      ),
    });

    entries.push({
      name: 'OEBPS/content.opf',
      content: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${safeTitle}</dc:title>
    <dc:creator>${safeAuthor}</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="BookId">${bookUuid}</dc:identifier>
  </metadata>
  <manifest>${manifestItems.join('\n')}</manifest>
  <spine toc="ncx">${spineItems.join('\n')}</spine>
</package>`,
        'utf8'
      ),
    });

    entries.push({
      name: 'OEBPS/toc.ncx',
      content: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="${bookUuid}"/></head>
  <docTitle><text>${safeTitle}</text></docTitle>
  <navMap>${navPoints.join('\n')}</navMap>
</ncx>`,
        'utf8'
      ),
    });

    return buildStoredZipBuffer(entries);
  }

  // REST routes for Story Repository & Artifact Downloads
  app.post('/api/stories/sync', (req: Request, res: Response) => {
    try {
      const record = upsertStoryRecord(req.body || {});
      return res.json({
        success: true,
        storyId: record.storyId,
        title: record.title,
        segmentCount: record.segments.length,
        updatedAt: record.updatedAt,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err?.message || 'Failed to sync story' });
    }
  });

  app.get('/api/stories', (_req: Request, res: Response) => {
    const stories = Array.from(storyRepository.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((s) => ({
        storyId: s.storyId,
        title: s.title,
        genre: s.genre,
        targetAudience: s.targetAudience,
        author: s.author,
        segmentCount: s.segments.length,
        voicedSegments: s.segments.filter((seg) => Boolean(seg.audioUrl)).length,
        illustratedSegments: s.segments.filter((seg) => Boolean(seg.imageUrl)).length,
        wordCount: s.segments.reduce((acc, seg) => acc + seg.paragraph.split(/\s+/).filter(Boolean).length, 0),
        updatedAt: s.updatedAt,
      }));
    return res.json({ stories });
  });

  const handleDownloadArtifact = (req: Request, res: Response) => {
    const fileId = String(req.params.fileId || '');
    const artifact = downloadArtifacts.get(fileId);
    if (!artifact) {
      return res.status(404).json({ error: 'Download artifact not found or expired.' });
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', artifact.mimeType);
    res.setHeader('Content-Length', String(artifact.buffer.length));
    res.setHeader('Content-Disposition', `attachment; filename="${artifact.filename.replace(/"/g, '')}"`);
    return res.status(200).send(artifact.buffer);
  };

  app.get('/api/mcp/downloads/:fileId', handleDownloadArtifact);
  app.get('/api/downloads/:fileId', handleDownloadArtifact);

  // =========================================================================
  // MCP TOOLS DEFINITION & EXECUTOR
  // =========================================================================

  const MCP_TOOLS = [
    {
      name: 'generate_story_chapter',
      description: 'Generate an interactive illustrated story chapter via Gemini with paragraph text, 3 branching decision choices, emotional sentiment, and visual prompt. Automatically updates or creates a story in the server repository.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Plot idea, premise, or chosen branch action' },
          storyId: { type: 'string', description: 'Optional existing storyId to append this chapter to' },
          title: { type: 'string', description: 'Optional story title' },
          genre: { type: 'string', description: 'Story genre (e.g. fantasy, sci-fi, cyberpunk, mystery, bedtime, adventure)', default: 'fantasy' },
          targetAudience: { type: 'string', enum: ['children', 'teen', 'adult'], default: 'children' },
          style: { type: 'string', description: 'Artistic visual style for illustrations', default: 'whimsical' },
          previousContext: { type: 'string', description: 'Summary of preceding chapter events' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'generate_full_story',
      description: 'Generates a complete multi-scene interactive storybook (3-6 scenes) with title, chapters, and arc progression, saving it to the studio repository so it can be downloaded as Audio, Video, PDF, or EPUB.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Core premise of the story' },
          genre: { type: 'string', description: 'Story genre', default: 'fantasy' },
          targetAudience: { type: 'string', enum: ['children', 'teen', 'adult'], default: 'children' },
          scenesCount: { type: 'number', description: 'Number of scenes to generate (2 to 6)', default: 4 },
          author: { type: 'string', description: 'Author name', default: 'Novellaio AI Author' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'synthesize_scene_art',
      description: 'Creates a contextual illustration prompt via Gemini and optionally renders an actual downloadable image file when renderImage is true.',
      inputSchema: {
        type: 'object',
        properties: {
          paragraph: { type: 'string', description: 'The story paragraph to illustrate' },
          style: { type: 'string', description: 'Art style (whimsical, anime, 3d_render, watercolor, cyberpunk, realistic)', default: 'whimsical' },
          genre: { type: 'string', description: 'Story genre', default: 'fantasy' },
          renderImage: { type: 'boolean', description: 'If true, generates a real downloadable illustration image and returns its downloadUrl', default: false },
        },
        required: ['paragraph'],
      },
    },
    {
      name: 'audit_narrative_flow',
      description: 'ADK agent tool to audit story pacing, vocabulary grade, emotional curve, and character consistency using Gemini plus quantitative lexical analysis.',
      inputSchema: {
        type: 'object',
        properties: {
          storyId: { type: 'string', description: 'Optional synced storyId to audit' },
          storyText: { type: 'string', description: 'Full story or chapter text' },
          genre: { type: 'string', description: 'Intended genre', default: 'fantasy' },
          targetAudience: { type: 'string', enum: ['children', 'teen', 'adult'], default: 'children' },
        },
      },
    },
    {
      name: 'generate_character_profile',
      description: 'Generates a grounded character dossier via Gemini including archetype, secret motivation, distinctive inventory, and relationship graph.',
      inputSchema: {
        type: 'object',
        properties: {
          characterName: { type: 'string', description: 'Name of the character' },
          role: { type: 'string', enum: ['protagonist', 'antagonist', 'companion', 'mentor', 'trickster'], default: 'protagonist' },
          genre: { type: 'string', default: 'fantasy' },
          storyContext: { type: 'string', description: 'Summary of scenes or narrative arc' },
        },
        required: ['characterName'],
      },
    },
    {
      name: 'list_saved_stories',
      description: 'Retrieves synced storybooks from the server studio repository including storyId, chapter counts, word count, and available media.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 10 },
          filterGenre: { type: 'string' },
        },
      },
    },
    {
      name: 'download_audio_file',
      description: 'Builds a stitched 24kHz 16-bit WAV audiobook file from a saved story or inline text/segments (synthesizing missing voiceover via Gemini TTS) and exposes a direct HTTP downloadUrl.',
      inputSchema: {
        type: 'object',
        properties: {
          storyId: { type: 'string', description: 'Synced storyId (defaults to active/latest story if omitted)' },
          title: { type: 'string', description: 'Story title if providing inline text or paragraphs' },
          text: { type: 'string', description: 'Optional inline story text to narrate into an audio file' },
          paragraphs: { type: 'array', items: { type: 'string' }, description: 'Optional list of scene paragraphs' },
          voice: { type: 'string', description: 'Gemini TTS voice (Kore, Puck, Charon, Fenrir, Aoede)', default: 'Kore' },
          includeBase64: { type: 'boolean', description: 'Include base64 payload in response', default: false },
        },
      },
    },
    {
      name: 'download_video_file',
      description: 'Renders a real MP4 or WebM story video reel with ffmpeg (scene visuals, animated subtitle overlays, and narration/harmonic audio) from a saved story or inline text, returning a direct downloadUrl.',
      inputSchema: {
        type: 'object',
        properties: {
          storyId: { type: 'string', description: 'Synced storyId (defaults to active/latest story if omitted)' },
          title: { type: 'string', description: 'Story title' },
          text: { type: 'string', description: 'Optional inline story text to render into video scenes' },
          paragraphs: { type: 'array', items: { type: 'string' }, description: 'Optional list of scene paragraphs' },
          aspectRatio: { type: 'string', enum: ['9:16', '16:9', '1:1'], default: '9:16' },
          format: { type: 'string', enum: ['mp4', 'webm'], default: 'mp4' },
          subtitlesEnabled: { type: 'boolean', default: true },
          includeNarration: { type: 'boolean', description: 'Synthesize Gemini TTS narration track when missing', default: true },
          voice: { type: 'string', default: 'Kore' },
          includeBase64: { type: 'boolean', default: false },
        },
      },
    },
    {
      name: 'download_pdf_file',
      description: 'Compiles a formatted illustrated PDF storybook (cover page, styled A4 scene pages, choices, page numbers) from a saved story or inline text and returns a direct downloadUrl.',
      inputSchema: {
        type: 'object',
        properties: {
          storyId: { type: 'string', description: 'Synced storyId (defaults to active/latest story if omitted)' },
          title: { type: 'string', description: 'Book title' },
          author: { type: 'string', description: 'Author name', default: 'Novellaio AI Author' },
          genre: { type: 'string', default: 'fantasy' },
          text: { type: 'string', description: 'Optional inline story text' },
          paragraphs: { type: 'array', items: { type: 'string' }, description: 'Optional list of scene paragraphs' },
          theme: { type: 'string', enum: ['classic_ivory', 'midnight', 'emerald_parchment', 'royal_slate'], default: 'classic_ivory' },
          includeImages: { type: 'boolean', default: true },
          includeBase64: { type: 'boolean', default: false },
        },
      },
    },
    {
      name: 'publish_ebook',
      description: 'Compiles an industry-standard EPUB 3.0 archive file (returning a direct downloadUrl) plus Amazon KDP categories, search keywords, and Gumroad marketing copy.',
      inputSchema: {
        type: 'object',
        properties: {
          storyId: { type: 'string', description: 'Synced storyId (defaults to active/latest story)' },
          title: { type: 'string', description: 'eBook Title' },
          author: { type: 'string', description: 'Author name', default: 'Novellaio AI Author' },
          genre: { type: 'string', description: 'Story genre', default: 'fantasy' },
          targetAudience: { type: 'string', default: 'children' },
          text: { type: 'string', description: 'Optional inline text if no story is synced' },
          suggestedPriceUsd: { type: 'number', description: 'Suggested retail price in USD', default: 3.99 },
        },
      },
    },
    {
      name: 'create_video_reel',
      description: 'Creates and renders a downloadable social video reel (.mp4) with synchronized subtitles and audio cues.',
      inputSchema: {
        type: 'object',
        properties: {
          storyId: { type: 'string' },
          title: { type: 'string', description: 'Video Title' },
          text: { type: 'string', description: 'Optional story text to turn into a reel' },
          aspectRatio: { type: 'string', enum: ['9:16', '16:9', '1:1'], default: '9:16' },
          genre: { type: 'string', default: 'fantasy' },
          subtitlesEnabled: { type: 'boolean', default: true },
        },
      },
    },
    {
      name: 'post_discord_webhook',
      description: 'Broadcasts a story chapter or community poll embed to a Discord webhook channel.',
      inputSchema: {
        type: 'object',
        properties: {
          webhookUrl: { type: 'string', description: 'Discord Webhook URL' },
          storyTitle: { type: 'string' },
          chapterTitle: { type: 'string' },
          paragraph: { type: 'string' },
          choices: { type: 'array', items: { type: 'string' } },
          imageUrl: { type: 'string' },
        },
        required: ['webhookUrl', 'storyTitle', 'paragraph'],
      },
    },
  ];

  async function executeMcpTool(
    toolName: string,
    args: Record<string, any>,
    baseUrl: string
  ): Promise<{ data: Record<string, any>; isError?: boolean; generatedSegment?: StoredSegment; download?: Record<string, any> }> {
    const safeArgs = args || {};

    if (toolName === 'list_saved_stories') {
      const limit = Math.max(1, Math.min(50, Number(safeArgs.limit) || 10));
      const filterGenre = safeArgs.filterGenre ? String(safeArgs.filterGenre).toLowerCase() : '';
      const stories = Array.from(storyRepository.values())
        .filter((s) => !filterGenre || s.genre.toLowerCase().includes(filterGenre))
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, limit)
        .map((s) => ({
          storyId: s.storyId,
          title: s.title,
          genre: s.genre,
          targetAudience: s.targetAudience,
          segmentCount: s.segments.length,
          wordCount: s.segments.reduce((acc, seg) => acc + seg.paragraph.split(/\s+/).filter(Boolean).length, 0),
          hasAudio: s.segments.some((seg) => Boolean(seg.audioUrl)),
          hasImages: s.segments.some((seg) => Boolean(seg.imageUrl)),
          updatedAt: new Date(s.updatedAt).toISOString(),
        }));
      return { data: { totalStories: stories.length, stories } };
    }

    if (toolName === 'generate_story_chapter') {
      const prompt = String(safeArgs.prompt || 'An unexpected discovery');
      const genre = String(safeArgs.genre || 'fantasy');
      const audience = String(safeArgs.targetAudience || 'children');
      const style = String(safeArgs.style || 'whimsical');
      const existingStory = safeArgs.storyId ? storyRepository.get(sanitizeStoryId(String(safeArgs.storyId))) : getLatestStory();
      const prevSummary =
        safeArgs.previousContext ||
        (existingStory ? existingStory.segments.slice(-3).map((s) => s.paragraph).join('\n\n') : '');
      const nextChapterNum = existingStory ? existingStory.segments.length + 1 : 1;

      try {
        const ai = getServerAiClient();
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `${prevSummary ? `Preceding scenes:\n${prevSummary}\n\n` : ''}Write Chapter ${nextChapterNum} continuing from: "${prompt}"`,
          config: {
            systemInstruction: `You are an acclaimed interactive fiction author writing for a "${audience}" audience in the "${genre}" genre.
Produce ONE vivid, richly paced narrative paragraph (90-140 words), an evocative chapterTitle, 3 mutually exclusive interactive choices (bold confrontation, clever deduction, diplomatic/unexpected route), primary sentiment, pacing stage, and a cinematic visualPrompt in "${style}" style. Return ONLY valid JSON.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                storyTitle: { type: Type.STRING },
                chapterTitle: { type: Type.STRING },
                paragraph: { type: Type.STRING },
                choices: { type: Type.ARRAY, items: { type: Type.STRING } },
                sentiment: { type: Type.STRING },
                pacing: { type: Type.STRING },
                visualPrompt: { type: Type.STRING },
              },
              required: ['chapterTitle', 'paragraph', 'choices'],
            },
          },
        });
        const parsed = extractJsonLoose(response.text || '{}');
        const newSeg: StoredSegment = {
          id: `seg_${Date.now()}`,
          chapterNumber: nextChapterNum,
          chapterTitle: String(parsed.chapterTitle || `Chapter ${nextChapterNum}`),
          paragraph: String(parsed.paragraph || ''),
          choices: Array.isArray(parsed.choices) ? parsed.choices.slice(0, 3).map(String) : [],
          sentiment: String(parsed.sentiment || 'mysterious'),
        };

        const storyTitle = String(safeArgs.title || existingStory?.title || parsed.storyTitle || `Chronicles of ${prompt.slice(0, 28)}`);
        const savedStory = upsertStoryRecord({
          storyId: safeArgs.storyId ? String(safeArgs.storyId) : existingStory?.storyId || storyTitle,
          title: storyTitle,
          genre,
          targetAudience: audience,
          segments: [...(existingStory?.segments || []), newSeg],
        });

        return {
          data: {
            storyId: savedStory.storyId,
            storyTitle: savedStory.title,
            chapterNumber: nextChapterNum,
            ...newSeg,
            pacing: parsed.pacing || 'rising_action',
            visualPrompt: parsed.visualPrompt || `${style} illustration for ${genre}: ${newSeg.paragraph.slice(0, 120)}`,
            totalScenesInStory: savedStory.segments.length,
          },
          generatedSegment: newSeg,
        };
      } catch (err: any) {
        return { isError: true, data: { error: `Gemini chapter generation failed: ${err?.message || err}` } };
      }
    }

    if (toolName === 'generate_full_story') {
      const prompt = String(safeArgs.prompt || 'A magical journey through uncharted skies');
      const genre = String(safeArgs.genre || 'fantasy');
      const audience = String(safeArgs.targetAudience || 'children');
      const scenesCount = Math.max(2, Math.min(6, Number(safeArgs.scenesCount) || 4));
      const author = String(safeArgs.author || 'Novellaio AI Author');

      try {
        const ai = getServerAiClient();
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Create a cohesive ${scenesCount}-scene illustrated interactive story about: "${prompt}".`,
          config: {
            systemInstruction: `You are a master interactive novelist for a "${audience}" audience in the "${genre}" genre. Generate a compelling title and ${scenesCount} sequential scenes forming a complete narrative arc (hook, complication, climax, resolution). Each scene needs a chapterTitle, a 75-115 word vivid paragraph, and sentiment. Return ONLY valid JSON.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                scenes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      chapterTitle: { type: Type.STRING },
                      paragraph: { type: Type.STRING },
                      sentiment: { type: Type.STRING },
                      choices: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['chapterTitle', 'paragraph'],
                  },
                },
              },
              required: ['title', 'scenes'],
            },
          },
        });
        const parsed = extractJsonLoose(response.text || '{}');
        const scenesRaw = Array.isArray(parsed.scenes) ? parsed.scenes : [];
        const segments: StoredSegment[] = scenesRaw.map((sc: any, idx: number) => ({
          id: `seg_${Date.now()}_${idx}`,
          chapterNumber: idx + 1,
          chapterTitle: String(sc?.chapterTitle || `Scene ${idx + 1}`),
          paragraph: String(sc?.paragraph || ''),
          sentiment: String(sc?.sentiment || 'wonder'),
          choices: Array.isArray(sc?.choices) ? sc.choices.slice(0, 3).map(String) : undefined,
        }));

        const saved = upsertStoryRecord({
          title: String(parsed.title || `Tale of ${prompt.slice(0, 28)}`),
          genre,
          targetAudience: audience,
          author,
          segments,
        });

        return {
          data: {
            storyId: saved.storyId,
            title: saved.title,
            genre: saved.genre,
            targetAudience: saved.targetAudience,
            scenesCount: saved.segments.length,
            segments: saved.segments,
          },
        };
      } catch (err: any) {
        return { isError: true, data: { error: `Full story generation failed: ${err?.message || err}` } };
      }
    }

    if (toolName === 'synthesize_scene_art') {
      const paragraph = String(safeArgs.paragraph || 'A magical scene unfolds');
      const style = String(safeArgs.style || 'whimsical');
      const genre = String(safeArgs.genre || 'fantasy');
      const renderImage = Boolean(safeArgs.renderImage);

      const ai = getServerAiClient();
      const dirRes = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Create a richly detailed art direction specification for this ${genre} scene in ${style} style:\n"${paragraph}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              imagePrompt: { type: Type.STRING },
              recommendedLighting: { type: Type.STRING },
              colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
              cameraFraming: { type: Type.STRING },
            },
            required: ['imagePrompt', 'recommendedLighting', 'colorPalette'],
          },
        },
      });
      const directive = extractJsonLoose(dirRes.text || '{}');

      let imageArtifact: Record<string, any> | undefined;
      if (renderImage) {
        const imgPrompt = String(directive.imagePrompt || `${style} ${genre} illustration of: ${paragraph}`);
        for (const candidate of ['gemini-2.5-flash-image', 'gemini-3.1-flash-lite-image']) {
          try {
            const imgRes = await ai.models.generateContent({
              model: candidate,
              contents: { parts: [{ text: imgPrompt }] },
              config: { imageConfig: { aspectRatio: '16:9', imageSize: '1K' } },
            });
            const part = (imgRes.candidates?.[0]?.content?.parts || []).find((p: any) => p.inlineData?.data);
            if (part?.inlineData?.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              const ext = mime.includes('png') ? 'png' : 'jpg';
              const buf = Buffer.from(part.inlineData.data, 'base64');
              imageArtifact = saveArtifact(`scene_art_${Date.now()}.${ext}`, mime, buf, baseUrl);
              break;
            }
          } catch {}
        }
      }

      return {
        data: {
          ...directive,
          artStyle: style,
          aspectRatio: '16:9',
          ...(imageArtifact ? { renderedImage: imageArtifact } : {}),
        },
        download: imageArtifact,
      };
    }

    if (toolName === 'audit_narrative_flow') {
      const resolved = resolveStoryInput({ storyId: safeArgs.storyId, text: safeArgs.storyText, genre: safeArgs.genre, targetAudience: safeArgs.targetAudience });
      const storyText = String(safeArgs.storyText || resolved.segments.map((s) => s.paragraph).join('\n\n') || '');
      if (!storyText.trim()) {
        return { isError: true, data: { error: 'Provide storyText or sync a story first before auditing.' } };
      }

      const words = storyText.split(/\s+/).filter(Boolean).length;
      const sentences = (storyText.match(/[.!?]+/g) || []).length || 1;
      const quoteMatches: string[] = Array.from(storyText.match(/"([^"]*)"|“([^”]*)”/g) || []);
      const dialogueWords = quoteMatches.reduce<number>((acc, q) => acc + q.split(/\s+/).filter(Boolean).length, 0);
      const dialoguePct = Math.min(100, Math.round((dialogueWords / Math.max(1, words)) * 100));
      const fkGrade = Math.max(1, Math.min(14, Number((0.39 * (words / sentences) + 1.8).toFixed(1))));

      try {
        const ai = getServerAiClient();
        const auditRes = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Audit this ${resolved.genre} story written for "${resolved.targetAudience}":\n\n${storyText.slice(0, 8000)}`,
          config: {
            systemInstruction: `You are a senior narrative editor. Evaluate pacing, character continuity, tension curve, dialogue effectiveness, and concrete recommendations. Return ONLY valid JSON.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                pacingScore: { type: Type.NUMBER },
                tensionLevel: { type: Type.STRING },
                pacingCurve: { type: Type.ARRAY, items: { type: Type.STRING } },
                charactersDetected: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['pacingScore', 'tensionLevel', 'pacingCurve', 'recommendations'],
            },
          },
        });
        const aiAudit = extractJsonLoose(auditRes.text || '{}');
        return {
          data: {
            pacingScore: Number(aiAudit.pacingScore) || 90,
            readabilityIndex: {
              fleschKincaidGrade: fkGrade,
              wordCount: words,
              sentenceCount: sentences,
              avgSentenceLength: Number((words / sentences).toFixed(1)),
            },
            narrativeArc: {
              tensionLevel: aiAudit.tensionLevel || 'Dynamic escalating arc',
              dialogueRatio: `${dialoguePct}% dialogue to ${100 - dialoguePct}% narrative prose`,
              pacingCurve: aiAudit.pacingCurve || ['Hook', 'Escalation', 'Turning Point'],
            },
            charactersDetected: aiAudit.charactersDetected || [],
            agentRecommendations: aiAudit.recommendations || [],
          },
        };
      } catch (err: any) {
        return {
          data: {
            pacingScore: 88,
            readabilityIndex: { fleschKincaidGrade: fkGrade, wordCount: words, sentenceCount: sentences },
            narrativeArc: { dialogueRatio: `${dialoguePct}% dialogue to ${100 - dialoguePct}% narrative prose`, pacingCurve: ['Opening', 'Development'] },
            agentRecommendations: [`Quantitative audit completed (${err?.message || 'Gemini critique unavailable'}).`],
          },
        };
      }
    }

    if (toolName === 'generate_character_profile') {
      const charName = String(safeArgs.characterName || 'Hero');
      const role = String(safeArgs.role || 'protagonist');
      const genre = String(safeArgs.genre || 'fantasy');
      const storyContext = String(safeArgs.storyContext || getLatestStory()?.segments.map((s) => s.paragraph).join(' ') || 'Exploring uncharted realms');

      const ai = getServerAiClient();
      const profileRes = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Generate a character dossier for "${charName}" (${role}) in a ${genre} story. Context: "${storyContext.slice(0, 2000)}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              archetype: { type: Type.STRING },
              traits: { type: Type.ARRAY, items: { type: Type.STRING } },
              secretMotivation: { type: Type.STRING },
              signatureItems: { type: Type.ARRAY, items: { type: Type.STRING } },
              narrativeCues: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['name', 'archetype', 'traits', 'secretMotivation', 'signatureItems', 'narrativeCues'],
          },
        },
      });
      return { data: extractJsonLoose(profileRes.text || '{}') };
    }

    if (toolName === 'download_audio_file') {
      const story = resolveStoryInput(safeArgs);
      if (!story.segments.length) {
        return { isError: true, data: { error: 'No story segments or inline text found. Pass text/paragraphs or sync a story first.' } };
      }
      const { wavBuffer, scenesVoiced, durationSeconds } = await buildStoryAudioWav(story, {
        voice: safeArgs.voice ? String(safeArgs.voice) : 'Kore',
        synthesizeMissing: true,
      });
      const filename = `${sanitizeStoryId(story.title)}_audiobook.wav`;
      const artifact = saveArtifact(filename, 'audio/wav', wavBuffer, baseUrl, {
        storyId: story.storyId,
        scenesVoiced,
        durationSeconds,
      });
      const payload: Record<string, any> = {
        status: 'ready',
        storyId: story.storyId,
        title: story.title,
        scenesVoiced,
        totalScenes: story.segments.length,
        durationSeconds,
        format: 'WAV (24kHz 16-bit PCM)',
        ...artifact,
      };
      if (safeArgs.includeBase64) {
        payload.dataBase64 = wavBuffer.toString('base64');
      }
      return { data: payload, download: artifact };
    }

    if (toolName === 'download_video_file' || toolName === 'create_video_reel') {
      const story = resolveStoryInput(safeArgs);
      if (!story.segments.length) {
        return { isError: true, data: { error: 'No story segments or inline text found. Pass text/paragraphs or sync a story first.' } };
      }
      const rendered = await buildStoryVideoBuffer(story, {
        aspectRatio: safeArgs.aspectRatio,
        format: safeArgs.format,
        includeNarration: safeArgs.includeNarration !== false,
        subtitlesEnabled: safeArgs.subtitlesEnabled !== false,
        voice: safeArgs.voice ? String(safeArgs.voice) : 'Kore',
      });
      const artifact = saveArtifact(rendered.filename, rendered.mimeType, rendered.videoBuffer, baseUrl, {
        storyId: story.storyId,
        resolution: rendered.resolution,
        durationSeconds: rendered.durationSeconds,
      });
      const payload: Record<string, any> = {
        status: 'ready',
        storyId: story.storyId,
        title: story.title,
        aspectRatio: safeArgs.aspectRatio || '9:16',
        resolution: rendered.resolution,
        durationSeconds: rendered.durationSeconds,
        subtitlesEnabled: safeArgs.subtitlesEnabled !== false,
        ...artifact,
      };
      if (safeArgs.includeBase64) {
        payload.dataBase64 = rendered.videoBuffer.toString('base64');
      }
      return { data: payload, download: artifact };
    }

    if (toolName === 'download_pdf_file') {
      const story = resolveStoryInput(safeArgs);
      if (!story.segments.length) {
        return { isError: true, data: { error: 'No story segments or inline text found. Pass text/paragraphs or sync a story first.' } };
      }
      const { pdfBuffer, pageCount, filename } = await buildStoryPdfBuffer(story, {
        theme: safeArgs.theme ? String(safeArgs.theme) : 'classic_ivory',
        includeImages: safeArgs.includeImages !== false,
        author: safeArgs.author ? String(safeArgs.author) : undefined,
      });
      const artifact = saveArtifact(filename, 'application/pdf', pdfBuffer, baseUrl, {
        storyId: story.storyId,
        pageCount,
      });
      const payload: Record<string, any> = {
        status: 'ready',
        storyId: story.storyId,
        title: story.title,
        pageCount,
        scenesCount: story.segments.length,
        theme: safeArgs.theme || 'classic_ivory',
        ...artifact,
      };
      if (safeArgs.includeBase64) {
        payload.dataBase64 = pdfBuffer.toString('base64');
      }
      return { data: payload, download: artifact };
    }

    if (toolName === 'publish_ebook') {
      const story = resolveStoryInput(safeArgs);
      if (!story.segments.length) {
        story.segments = [{ id: 'seg_1', chapterNumber: 1, chapterTitle: 'Chapter 1', paragraph: `${story.title} — an interactive illustrated adventure.` }];
      }
      const epubBuffer = buildEpubZipBuffer(story, safeArgs.author ? String(safeArgs.author) : undefined);
      const filename = `${sanitizeStoryId(story.title)}.epub`;
      const artifact = saveArtifact(filename, 'application/epub+zip', epubBuffer, baseUrl, { storyId: story.storyId });
      const price = Number(safeArgs.suggestedPriceUsd) || 3.99;

      return {
        data: {
          status: 'ready',
          title: story.title,
          ...artifact,
          kdpListing: {
            recommendedCategories: [`Fiction / ${story.genre}`, 'Juvenile Fiction / Action & Adventure'],
            searchKeywords: [story.genre.toLowerCase(), 'interactive story', 'illustrated chapter book', 'choose your own adventure'],
            suggestedRetailPriceUsd: price,
            kdpRoyaltyEstimate70Pct: (price * 0.7).toFixed(2),
          },
          gumroadCopy: {
            tagline: `Immerse yourself in ${story.title} — an illustrated interactive journey with branching story paths.`,
            includes: ['Standard eReader EPUB 3.0', 'High-res Printable PDF Book', 'Audio Narration'],
          },
        },
        download: artifact,
      };
    }

    if (toolName === 'post_discord_webhook') {
      const webhookUrl = String(safeArgs.webhookUrl || '');
      const storyTitle = String(safeArgs.storyTitle || 'Novellaio Chapter');
      const paragraph = String(safeArgs.paragraph || '');
      const choices = Array.isArray(safeArgs.choices) ? safeArgs.choices : [];
      const imageUrl = safeArgs.imageUrl ? String(safeArgs.imageUrl) : undefined;

      if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
        return { isError: true, data: { error: 'Valid Discord webhookUrl (https://discord.com/api/webhooks/...) is required.' } };
      }

      const embedFields = choices.map((c: string, idx: number) => ({
        name: `Choice ${idx + 1}`,
        value: String(c),
        inline: true,
      }));

      const discordPayload = {
        username: 'Novellaio AI',
        embeds: [
          {
            title: `📖 ${storyTitle}`,
            description: paragraph,
            color: 0x9333ea,
            fields: embedFields.length > 0 ? embedFields : undefined,
            image: imageUrl ? { url: imageUrl } : undefined,
            footer: { text: 'Novellaio Multi-Modal AI Studio' },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const dRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload),
      });

      return {
        isError: !dRes.ok,
        data: {
          status: dRes.ok ? 'delivered' : 'error',
          httpStatus: dRes.status,
          message: dRes.ok ? 'Successfully posted chapter embed to Discord webhook channel!' : 'Discord webhook returned error',
        },
      };
    }

    return {
      isError: true,
      data: { error: `Unknown MCP tool '${toolName}'.` },
    };
  }

  // Convert MCP JSON Schema definitions into @google/genai FunctionDeclarations
  function toGenAiSchema(prop: any): any {
    const typeMap: Record<string, Type> = {
      string: Type.STRING,
      number: Type.NUMBER,
      integer: Type.INTEGER,
      boolean: Type.BOOLEAN,
      array: Type.ARRAY,
      object: Type.OBJECT,
    };
    const out: any = {
      type: typeMap[prop?.type] || Type.STRING,
    };
    if (prop?.description) out.description = prop.description;
    if (Array.isArray(prop?.enum)) out.enum = prop.enum;
    if (prop?.items) out.items = toGenAiSchema(prop.items);
    if (prop?.properties) {
      out.properties = Object.fromEntries(
        Object.entries(prop.properties).map(([k, v]) => [k, toGenAiSchema(v)])
      );
    }
    return out;
  }

  const GEMINI_FUNCTION_DECLARATIONS = MCP_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: Type.OBJECT,
      properties: Object.fromEntries(
        Object.entries(tool.inputSchema.properties || {}).map(([k, v]) => [k, toGenAiSchema(v)])
      ),
      required: (tool.inputSchema as any).required || [],
    },
  }));

  // =========================================================================
  // MCP JSON-RPC & AGENT ORCHESTRATOR ENDPOINTS
  // =========================================================================

  app.get('/api/mcp/tools', (_req: Request, res: Response) => {
    return res.json({ tools: MCP_TOOLS });
  });

  app.get('/api/mcp', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(
      JSON.stringify(
        {
          name: 'Novellaio MCP Studio Server',
          version: '2.0.0',
          protocol: 'MCP (Model Context Protocol 2024-11-05)',
          endpoint: '/api/mcp',
          methodsSupported: [
            'initialize',
            'notifications/initialized',
            'ping',
            'tools/list',
            'tools/call',
            'resources/list',
            'resources/read',
            'prompts/list',
            'prompts/get',
          ],
          toolsCount: MCP_TOOLS.length,
          downloadTools: ['download_audio_file', 'download_video_file', 'download_pdf_file', 'publish_ebook'],
          description:
            'Model Context Protocol server for interactive storytelling, autonomous Gemini agent tool execution, and direct Audio/Video/PDF/EPUB downloads.',
        },
        null,
        2
      )
    );
  });

  app.post('/api/mcp', async (req: Request, res: Response) => {
    try {
      const reqPayload = req.body || {};
      const hasId = reqPayload.id !== undefined && reqPayload.id !== null;
      const id = hasId ? reqPayload.id : 1;
      const method = reqPayload.method;
      const params = reqPayload.params || {};
      const baseUrl = getRequestBaseUrl(req);

      if (typeof method === 'string' && method.startsWith('notifications/')) {
        return res.status(202).json({ jsonrpc: '2.0', result: {} });
      }

      if (method === 'initialize') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
              prompts: { listChanged: false },
            },
            serverInfo: {
              name: 'storyspark-mcp-server',
              version: '2.0.0',
            },
          },
        });
      }

      if (method === 'ping') {
        return res.status(200).json({ jsonrpc: '2.0', id, result: {} });
      }

      if (method === 'tools/list') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCP_TOOLS,
          },
        });
      }

      if (method === 'tools/call') {
        const toolName = String(params.name || '');
        const args = params.arguments || {};
        const execResult = await executeMcpTool(toolName, args, baseUrl);

        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(execResult.data, null, 2) }],
            structuredContent: execResult.data,
            isError: Boolean(execResult.isError),
          },
        });
      }

      if (method === 'resources/list') {
        const syncedResources = Array.from(storyRepository.values()).map((s) => ({
          uri: `story://library/${s.storyId}`,
          name: s.title,
          mimeType: 'application/json',
          description: `${s.genre} story (${s.segments.length} scenes)`,
        }));
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            resources: [
              ...syncedResources,
              {
                uri: 'story://templates/fantasy-quest',
                name: 'Fantasy Quest Starter',
                mimeType: 'application/json',
                description: 'Branching medieval fantasy adventure prompt template',
              },
              {
                uri: 'story://templates/cyberpunk-noir',
                name: 'Cyberpunk Detective Starter',
                mimeType: 'application/json',
                description: 'Neon metropolis interactive investigation template',
              },
              {
                uri: 'story://templates/bedtime-fable',
                name: 'Whimsical Bedtime Fable',
                mimeType: 'application/json',
                description: 'Gentle narrative with soothing pacing for children',
              },
            ],
          },
        });
      }

      if (method === 'resources/read') {
        const uri = String(params.uri || '');
        let resourceText = '';
        if (uri.startsWith('story://library/')) {
          const targetId = sanitizeStoryId(uri.replace('story://library/', ''));
          const found = storyRepository.get(targetId) || getLatestStory();
          resourceText = JSON.stringify(found || { error: 'Story not found in repository' }, null, 2);
        } else if (uri.includes('fantasy-quest')) {
          resourceText = JSON.stringify(
            {
              genre: 'fantasy',
              title: 'The Clockwork Citadel',
              starter: 'Deep within the mist-shrouded valley of Aethelgard, the brass spires of an ancient citadel stirred after seven centuries of slumber...',
              branchChoices: ['Ascend the spiraling observatory gears', 'Explore the sunken alchemical vaults', 'Consult the copper oracle'],
            },
            null,
            2
          );
        } else if (uri.includes('cyberpunk-noir')) {
          resourceText = JSON.stringify(
            {
              genre: 'cyberpunk',
              title: 'Neon Shadows in Sector 9',
              starter: 'Acid rain streaked across the cracked synth-glass of my flit-car as the dispatch pinged with an anomaly from the sub-level bio-labs...',
              branchChoices: ['Jack into the encrypted optical feed', 'Bribe the street-level cyber-doc for info', 'Confront the enforcers'],
            },
            null,
            2
          );
        } else {
          resourceText = JSON.stringify(
            {
              genre: 'bedtime',
              title: 'The Starlight Squirrel',
              starter: 'High in the canopy of the Whispering Woods, Barnaby the silver-furred squirrel gathered fallen stardust to light up the animal glade...',
              branchChoices: ['Share the stardust with the sleepy owls', 'Store the glow inside a crystal acorn', 'Follow the luminous moth across the brook'],
            },
            null,
            2
          );
        }

        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            contents: [{ uri, mimeType: 'application/json', text: resourceText }],
          },
        });
      }

      if (method === 'prompts/list') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            prompts: [
              {
                name: 'story_branch_generator',
                description: 'Prompt template to craft high-agency choices and cliffhangers',
                arguments: [{ name: 'currentChapter', required: true }],
              },
              {
                name: 'scene_art_director',
                description: 'Prompt template to direct AI art styles, color palettes, and lighting',
                arguments: [{ name: 'sceneryText', required: true }],
              },
            ],
          },
        });
      }

      if (method === 'prompts/get') {
        const promptName = params.name;
        const promptArgs = params.arguments || {};
        const promptContent =
          promptName === 'story_branch_generator'
            ? `You are a master interactive story architect. Context: "${promptArgs.currentChapter || 'Previous adventure'}". Craft 3 branching paths featuring distinct agency, tension, and emotional consequence.`
            : `You are a visionary art director. Scene: "${promptArgs.sceneryText || 'A dramatic scene'}". Formulate a high-definition diffusion prompt with cinematic lighting, depth of field, color grading, and textural detail.`;

        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            description: `Prompt template for ${promptName}`,
            messages: [
              {
                role: 'user',
                content: { type: 'text', text: promptContent },
              },
            ],
          },
        });
      }

      return res.status(404).json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method '${method}' not found on Novellaio MCP server.` },
      });
    } catch (err: any) {
      return res.status(500).json({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32603, message: err?.message || 'Internal MCP JSON-RPC Server Error' },
      });
    }
  });

  // Autonomous Gemini Function Calling Agent Orchestrator
  app.post('/api/agents/run', async (req: Request, res: Response) => {
    const startedAt = Date.now();
    try {
      const {
        goal,
        storyId,
        title,
        genre,
        targetAudience,
        segments,
        apiKey,
        model,
      } = req.body || {};

      if (!goal || typeof goal !== 'string') {
        return res.status(400).json({ error: 'goal is required' });
      }

      let activeStory: StoredStory | null = null;
      if (Array.isArray(segments) && segments.length > 0) {
        activeStory = upsertStoryRecord({ storyId, title, genre, targetAudience, segments });
      } else if (storyId && storyRepository.has(sanitizeStoryId(String(storyId)))) {
        activeStory = storyRepository.get(sanitizeStoryId(String(storyId))) || null;
      } else {
        activeStory = getLatestStory();
      }

      const ai = getServerAiClient(apiKey);
      const effectiveModel = normalizeGeminiTextModel(model || 'gemini-4-hydrogen');
      const baseUrl = getRequestBaseUrl(req);

      const storyBrief = activeStory
        ? `Active synced story: storyId="${activeStory.storyId}", title="${activeStory.title}", genre="${activeStory.genre}", audience="${activeStory.targetAudience}", scenes=${activeStory.segments.length}.\nLatest scene excerpt: "${activeStory.segments.slice(-1)[0]?.paragraph.slice(0, 320) || ''}"`
        : 'No active story is currently synced. Use generate_full_story, generate_story_chapter, or pass inline text when calling export/download tools.';

      const systemInstruction = `You are the Novellaio Autonomous Multi-Modal Agent.
You have direct access to MCP tools including story authoring, narrative auditing, character profiling, scene art synthesis, and direct file export tools (download_audio_file, download_video_file, download_pdf_file, publish_ebook).
${storyBrief}
When the user asks for files (audio, video, PDF, or eBook) or story actions, invoke the appropriate tools with accurate arguments (always pass storyId="${activeStory?.storyId || ''}" if acting on the synced story). After tool execution, summarize results concisely and include any returned download links.`;

      const contents: any[] = [
        { role: 'user', parts: [{ text: goal }] },
      ];

      const toolCalls: Array<{ name: string; args: any; result: any; isError: boolean }> = [];
      const downloads: Array<Record<string, any>> = [];
      const generatedSegments: StoredSegment[] = [];
      let finalSummary = '';

      for (let turn = 0; turn < 6; turn++) {
        const response = await ai.models.generateContent({
          model: effectiveModel,
          contents,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: GEMINI_FUNCTION_DECLARATIONS }],
          },
        });

        const calls = response.functionCalls;
        if (!calls || calls.length === 0) {
          finalSummary = response.text || 'Agent execution completed.';
          break;
        }

        const modelParts = response.candidates?.[0]?.content?.parts || [];
        contents.push({ role: 'model', parts: modelParts });

        const responseParts: any[] = [];
        for (const fc of calls) {
          const toolName = String(fc.name || '');
          const fcArgs = (fc.args || {}) as Record<string, any>;
          const exec = await executeMcpTool(toolName, fcArgs, baseUrl);
          toolCalls.push({
            name: toolName,
            args: fcArgs,
            result: exec.data,
            isError: Boolean(exec.isError),
          });
          if (exec.download) downloads.push(exec.download);
          if (exec.generatedSegment) generatedSegments.push(exec.generatedSegment);

          responseParts.push({
            functionResponse: {
              name: toolName,
              response: exec.data,
            },
          });
        }

        contents.push({ role: 'user', parts: responseParts });
        if (turn === 5) {
          finalSummary = 'Agent completed multi-step tool execution.';
        }
      }

      const updatedStory = activeStory ? storyRepository.get(activeStory.storyId) : getLatestStory();

      return res.json({
        summary: finalSummary,
        model: effectiveModel,
        toolCalls,
        downloads,
        generatedSegments,
        updatedStory,
        latencyMs: Date.now() - startedAt,
      });
    } catch (err: any) {
      const status = getHttpStatusFromGeminiError(err);
      return res.status(status).json({ error: err?.message || 'Autonomous agent run failed.' });
    }
  });

  app.post('/api/integrations/discord-webhook', async (req: Request, res: Response) => {
    try {
      const { webhookUrl, payload } = req.body || {};
      if (!webhookUrl) {
        return res.status(400).json({ error: 'webhookUrl is required' });
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return res.status(response.ok ? 200 : response.status).json({
        success: response.ok,
        status: response.status,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to post Discord webhook' });
    }
  });

  // =========================================================================
  // VITE MIDDLEWARE (DEV) OR STATIC ASSETS (PROD)
  // =========================================================================

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.use((req: Request, res: Response, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distDir, 'index.html'));
      }
      return next();
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Novellaio server running on http://0.0.0.0:${PORT}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start Novellaio server:', err);
  process.exit(1);
});
