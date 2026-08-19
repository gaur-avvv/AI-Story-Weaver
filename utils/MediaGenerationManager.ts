/**
 * MediaGenerationManager
 * 
 * Centralized sequential queue and memory manager for media (image and audio) generation.
 * Enforces strictly sequential (one-by-one) generation to avoid API rate limits and browser memory saturation.
 * Features:
 *  - Deterministic FIFO execution queue: strictly one task at a time.
 *  - Exponential backoff retry strategy with jitter to handle transient network errors (e.g. 1000ms -> 2000ms -> 4000ms).
 *  - Model profile switching and progressive provider fallback on repeated errors.
 *  - Real-time client memory pressure monitoring and GPU context eviction.
 */

import { DeviceProfile, checkDeviceProfile, checkMemoryPressure } from './hardwareDetector';
import { generateImage, generateTTSAudio, buildSceneImagePrompt } from '../services/geminiService';

export interface MediaTask {
  id: string;
  segmentId: string;
  paragraph: string;
  type: 'image' | 'audio';
  status: 'pending' | 'processing' | 'retrying' | 'completed' | 'failed';
  retryAttempt: number;
  maxRetries: number;
  userApiKey: string | null;
  settings: any;
  onProgress?: (status: 'processing' | 'retrying', attempt: number) => void;
  onSuccess?: (resultUrl: string) => void;
  onError?: (err: Error) => void;
}

export type MediaQueueListener = (tasks: MediaTask[]) => void;

class MediaGenerationManagerClass {
  private queue: MediaTask[] = [];
  private isProcessing: boolean = false;
  private currentRunningTaskId: string | null = null;
  private listeners: Set<MediaQueueListener> = new Set();
  private forceLowMemoryMode: boolean = false;
  private currentDeviceProfile: DeviceProfile | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      checkDeviceProfile().then(p => {
        this.currentDeviceProfile = p;
        if (p.isLowEnd) {
          this.forceLowMemoryMode = true;
        }
      });
    }
  }

  public subscribe(listener: MediaQueueListener): () => void {
    this.listeners.add(listener);
    listener([...this.queue]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = [...this.queue];
    this.listeners.forEach(l => l(snapshot));
  }

  public getActiveTaskForSegment(segmentId: string, type: 'image' | 'audio'): MediaTask | undefined {
    return this.queue.find(t => t.segmentId === segmentId && t.type === type);
  }

  /**
   * Release any canvas/WebGL contexts to free GPU RAM when memory pressure is high
   */
  public releaseGpuContext() {
    try {
      if (typeof document !== 'undefined') {
        const canvases = document.querySelectorAll('canvas.temporary-buffer, canvas[data-disposable="true"]');
        canvases.forEach(c => {
          const canvas = c as HTMLCanvasElement;
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, 1, 1);
        });
      }
      console.info('[MediaGenerationManager] Released transient GPU canvas contexts.');
    } catch (e) {
      console.warn('[MediaGenerationManager] Could not release GPU contexts:', e);
    }
  }

  /**
   * Enqueues an image or audio generation task to be processed strictly one-by-one in FIFO order.
   */
  public enqueue(task: Omit<MediaTask, 'status' | 'retryAttempt' | 'maxRetries'> & { maxRetries?: number }): string {
    // Remove existing pending task for this segment and type if any to prevent duplicate backlog
    this.queue = this.queue.filter(t => !(t.segmentId === task.segmentId && t.type === task.type && t.status === 'pending'));

    const newTask: MediaTask = {
      ...task,
      status: 'pending',
      retryAttempt: 0,
      maxRetries: task.maxRetries ?? 3,
    };

    this.queue.push(newTask);
    this.notify();
    this.processNext();
    return newTask.id;
  }

  /**
   * Strictly processes the next task in the queue.
   * Guarantees at most ONE task executes at any given instant.
   */
  private async processNext() {
    if (this.isProcessing) {
      return;
    }

    const nextTask = this.queue.find(t => t.status === 'pending' || t.status === 'retrying');
    if (!nextTask) {
      this.isProcessing = false;
      this.currentRunningTaskId = null;
      return;
    }

    this.isProcessing = true;
    this.currentRunningTaskId = nextTask.id;
    nextTask.status = 'processing';
    nextTask.onProgress?.('processing', nextTask.retryAttempt);
    this.notify();

    // Check real-time memory pressure before dispatching heavy model workloads
    const memoryStatus = checkMemoryPressure();
    if (memoryStatus.isCritical || this.forceLowMemoryMode) {
      this.releaseGpuContext();
      this.forceLowMemoryMode = true;
    }

    try {
      let resultUrl = '';
      if (nextTask.type === 'image') {
        resultUrl = await this.executeImageWithExponentialBackoff(nextTask);
      } else {
        resultUrl = await this.executeAudioWithExponentialBackoff(nextTask);
      }

      nextTask.status = 'completed';
      this.notify();
      nextTask.onSuccess?.(resultUrl);
    } catch (err: any) {
      console.error(`[MediaGenerationManager] Task ${nextTask.id} failed after all retries:`, err);
      nextTask.status = 'failed';
      this.notify();
      nextTask.onError?.(err);
    } finally {
      // Remove completed/failed task from queue
      this.queue = this.queue.filter(t => t.id !== nextTask.id);
      this.notify();
      this.currentRunningTaskId = null;
      this.isProcessing = false;

      // Rate limit smoothing delay (500ms) between tasks before consuming next item in queue
      setTimeout(() => {
        this.processNext();
      }, 500);
    }
  }

  /**
   * Calculates exponential backoff delay with jitter:
   * baseDelay * 2^(attempt - 1) + randomJitter
   */
  private getBackoffDelay(attempt: number, baseDelay: number = 1000): number {
    const exponential = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.floor(Math.random() * 300); // 0-300ms jitter to prevent thundering herd
    return exponential + jitter;
  }

  /**
   * Executes image generation with exponential backoff and progressive provider fallback
   */
  private async executeImageWithExponentialBackoff(task: MediaTask): Promise<string> {
    const { paragraph, userApiKey, settings } = task;
    const maxAttempts = task.maxRetries;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      task.retryAttempt = attempt;
      
      if (attempt > 1) {
        const delayMs = this.getBackoffDelay(attempt - 1, 1000);
        task.status = 'retrying';
        task.onProgress?.('retrying', attempt);
        this.notify();
        console.warn(`[MediaManager] Transient error detected. Retrying image generation for segment ${task.segmentId} (Attempt ${attempt}/${maxAttempts}) with exponential backoff in ${delayMs}ms...`);
        await new Promise(res => setTimeout(res, delayMs));
      }

      try {
        // If memory is critical or we've failed twice, auto-switch to zero-cost cloud Pollinations
        const useCloudFallback = this.forceLowMemoryMode || attempt >= 2;
        const providerToUse = useCloudFallback ? 'pollinations' : settings.imageProvider;
        const modelToUse = useCloudFallback ? 'nanobanana-2-lite' : settings.imageModel;
        const effectiveImgKey = (providerToUse === 'pollinations' && settings.pollinationsApiKey) 
          ? settings.pollinationsApiKey 
          : settings.imageApiKey;

        const url = await generateImage(
          paragraph,
          userApiKey,
          settings.imageStyle,
          modelToUse,
          providerToUse,
          effectiveImgKey,
          {
            customBaseUrl: settings.customBaseUrl,
            cloudflareAccountId: settings.cloudflareAccountId,
            genre: settings.genre,
            targetAudience: settings.targetAudience,
          }
        );

        if (url) return url;
      } catch (err: any) {
        console.warn(`[MediaManager] Image generation attempt ${attempt}/${maxAttempts} failed:`, err?.message || err);
        
        if (attempt === maxAttempts) {
          // Final safety fallback: Direct zero-cost deterministic Pollinations URL with full scene prompt
          const fullScenePrompt = buildSceneImagePrompt(
            paragraph,
            settings.imageStyle,
            settings.genre,
            settings.targetAudience
          );
          const seed = Math.floor(Math.random() * 1000000);
          const rawKey = settings.pollinationsApiKey ? settings.pollinationsApiKey.replace(/^Bearer\s+/i, '').trim() : '';
          const keyParam = rawKey ? `&key=${encodeURIComponent(rawKey)}` : '';
          return `https://image.pollinations.ai/prompt/${encodeURIComponent(fullScenePrompt)}?width=1024&height=1024&seed=${seed}&model=nanobanana-2-lite&nologo=true${keyParam}`;
        }
      }
    }

    throw new Error(`Image generation failed after ${maxAttempts} exponential backoff attempts.`);
  }

  /**
   * Executes audio generation with exponential backoff
   */
  private async executeAudioWithExponentialBackoff(task: MediaTask): Promise<string> {
    const { paragraph, userApiKey, settings } = task;
    const maxAttempts = task.maxRetries;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      task.retryAttempt = attempt;

      if (attempt > 1) {
        const delayMs = this.getBackoffDelay(attempt - 1, 1000);
        task.status = 'retrying';
        task.onProgress?.('retrying', attempt);
        this.notify();
        console.warn(`[MediaManager] Transient error detected. Retrying TTS audio for segment ${task.segmentId} (Attempt ${attempt}/${maxAttempts}) with exponential backoff in ${delayMs}ms...`);
        await new Promise(res => setTimeout(res, delayMs));
      }

      try {
        const usePollinations = attempt >= 2;
        const providerToUse = usePollinations ? 'pollinations' : settings.audioProvider;
        const effectiveAudioKey = (providerToUse === 'pollinations' && settings.pollinationsApiKey)
          ? settings.pollinationsApiKey
          : settings.audioApiKey;

        const audioUrl = await generateTTSAudio(
          paragraph,
          userApiKey,
          settings.voice,
          settings.audioModel,
          providerToUse,
          effectiveAudioKey,
          {
            genre: settings.genre,
            targetAudience: settings.targetAudience,
            sentiment: settings.sentiment,
            voiceStyleConfig: settings.voiceStyleConfig,
          }
        );

        if (audioUrl) return audioUrl;
      } catch (err: any) {
        console.warn(`[MediaManager] Audio generation attempt ${attempt}/${maxAttempts} failed:`, err?.message || err);
        if (attempt === maxAttempts) {
          throw err;
        }
      }
    }

    throw new Error(`Audio generation failed after ${maxAttempts} exponential backoff attempts.`);
  }
}

export const mediaGenerationManager = new MediaGenerationManagerClass();
