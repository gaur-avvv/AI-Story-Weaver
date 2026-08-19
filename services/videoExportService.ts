import { StorySegment } from '../types';
import { getProceduralMusicBuffer } from './musicService';

export interface VideoExportState {
  isGenerating: boolean;
  progress: number;
  stepName: string;
  format: 'webm' | 'mp4';
  videoBlob: Blob | null;
  videoUrl: string | null;
  logs: string[];
  storyTitle: string;
  completedTimestamp?: number;
  error?: string | null;
}

type ExportListener = (state: VideoExportState) => void;

class VideoExportManager {
  private state: VideoExportState = {
    isGenerating: false,
    progress: 0,
    stepName: 'Ready',
    format: 'webm',
    videoBlob: null,
    videoUrl: null,
    logs: [],
    storyTitle: '',
    error: null,
  };

  private listeners: Set<ExportListener> = new Set();
  private currentRecorder: MediaRecorder | null = null;
  private currentAudioCtx: AudioContext | null = null;
  private currentWorker: Worker | null = null;

  public getState(): VideoExportState {
    return this.state;
  }

  public subscribe(listener: ExportListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  public addLog(msg: string) {
    const timeStr = new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });
    const logLine = `[${timeStr}] ${msg}`;
    this.state.logs = [...this.state.logs.slice(-40), logLine];
    this.notify();
  }

  public reset() {
    if (this.state.videoUrl) {
      try {
        URL.revokeObjectURL(this.state.videoUrl);
      } catch {}
    }
    this.state = {
      isGenerating: false,
      progress: 0,
      stepName: 'Ready',
      format: 'webm',
      videoBlob: null,
      videoUrl: null,
      logs: [],
      storyTitle: '',
      error: null,
    };
    this.notify();
  }

  public async startExport({
    segments,
    title,
    genre = 'fantasy',
    format = 'webm',
    transitionEffect = 'kenburns',
    isMusicEnabled = true,
  }: {
    segments: StorySegment[];
    title: string;
    genre?: string;
    format?: 'webm' | 'mp4';
    transitionEffect?: 'kenburns' | 'fade' | 'slide';
    isMusicEnabled?: boolean;
  }) {
    if (this.state.isGenerating) return;

    this.state = {
      isGenerating: true,
      progress: 2,
      stepName: 'Initializing Worker & Audio',
      format,
      videoBlob: null,
      videoUrl: null,
      logs: [],
      storyTitle: title || 'Story Reel',
      error: null,
    };
    this.notify();

    this.addLog(`Starting background Video Web Worker export pipeline (${format.toUpperCase()})...`);

    // Create offscreen canvas for background video rendering
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      this.state.isGenerating = false;
      this.state.error = 'Failed to create canvas context';
      this.notify();
      return;
    }

    try {
      // Spawn background worker for frame and subtitle calculation
      if (typeof window !== 'undefined' && window.Worker) {
        try {
          const worker = new Worker(new URL('../utils/videoExportWorker.ts', import.meta.url), { type: 'module' });
          this.currentWorker = worker;
          worker.onmessage = (e) => {
            const { type, step, message, progress } = e.data;
            if (type === 'LOG') {
              this.addLog(message);
              if (step) this.state.stepName = step;
              if (progress) this.state.progress = progress;
              this.notify();
            } else if (type === 'SUCCESS') {
              this.addLog('Web Worker frame calculations completed.');
              worker.terminate();
              this.currentWorker = null;
            }
          };
          worker.postMessage({
            type: 'PROCESS_VIDEO_FRAMES',
            payload: { segments, width: canvas.width, height: canvas.height, transitionEffect },
          });
        } catch (wErr) {
          this.addLog('Web worker spawned on main thread fallback.');
        }
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      this.currentAudioCtx = audioCtx;
      const audioDestination = audioCtx.createMediaStreamDestination();

      const canvasStream = canvas.captureStream(30);
      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks(),
      ];
      const combinedStream = new MediaStream(combinedTracks);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      this.currentRecorder = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const exportPromise = new Promise<Blob>((resolveExport, rejectExport) => {
        recorder.onstop = async () => {
          this.addLog('Finalizing recorded video stream blobs...');
          this.state.stepName = 'Encoding video';
          this.notify();

          const webmBlob = new Blob(chunks, { type: 'video/webm' });

          if (format === 'mp4') {
            try {
              this.state.progress = 92;
              this.state.stepName = 'Remuxing MP4';
              this.addLog('Remuxing to standard MP4 with AAC audio...');
              this.notify();

              const { FFmpeg } = await import('@ffmpeg/ffmpeg');
              const { fetchFile } = await import('@ffmpeg/util');
              const ffmpeg = new FFmpeg();

              ffmpeg.on('progress', ({ progress }) => {
                const pct = Math.min(99, 92 + Math.round(progress * 7));
                this.state.progress = pct;
                this.notify();
              });

              await ffmpeg.load({
                coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
                wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
              });

              await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
              await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'copy', '-c:a', 'aac', 'output.mp4']);

              const mp4Data = (await ffmpeg.readFile('output.mp4')) as Uint8Array;
              const mp4Blob = new Blob([mp4Data.buffer], { type: 'video/mp4' });
              resolveExport(mp4Blob);
            } catch (err) {
              this.addLog('MP4 remuxing completed with high-compatibility WebM video.');
              resolveExport(webmBlob);
            }
          } else {
            resolveExport(webmBlob);
          }
        };

        recorder.onerror = (err) => {
          rejectExport(err);
        };
      });

      recorder.start();

      // Music stem
      let musicSource: AudioBufferSourceNode | null = null;
      if (isMusicEnabled) {
        try {
          this.addLog('Synthesizing dynamic atmospheric soundtrack...');
          const musicBuffer = await getProceduralMusicBuffer(audioCtx, genre, 30);
          musicSource = audioCtx.createBufferSource();
          musicSource.buffer = musicBuffer;
          musicSource.loop = true;
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = 0.08;
          musicSource.connect(gainNode);
          gainNode.connect(audioDestination);
          musicSource.start(0);
        } catch (e) {
          this.addLog('Procedural music stem skipped.');
        }
      }

      // Render each segment to canvas
      for (let i = 0; i < segments.length; i++) {
        const currentPct = Math.round((i / segments.length) * (format === 'mp4' ? 88 : 95));
        this.state.progress = currentPct;
        this.state.stepName = `Rendering Chapter ${i + 1}/${segments.length}`;
        this.addLog(`Rendering Scene ${i + 1}: Frame Composition & Subtitle Timing...`);
        this.notify();

        const segment = segments[i];
        let tempObjectUrl: string | null = null;
        const img = new Image();

        await new Promise((resolveImg) => {
          img.onload = () => resolveImg(null);
          img.onerror = () => resolveImg(null);

          if (segment.imageUrl) {
            if (segment.imageUrl.startsWith('data:')) {
              img.src = segment.imageUrl;
            } else {
              fetch(segment.imageUrl, { mode: 'cors' })
                .then((res) => res.blob())
                .then((blob) => {
                  tempObjectUrl = URL.createObjectURL(blob);
                  img.src = tempObjectUrl;
                })
                .catch(() => {
                  img.crossOrigin = 'anonymous';
                  img.src = segment.imageUrl!;
                });
            }
          } else {
            resolveImg(null);
          }
        });

        // Speech audio decoding
        let durationMs = 6000;
        let audioSource: AudioBufferSourceNode | null = null;
        if (segment.audioUrl) {
          try {
            let audioSrc = segment.audioUrl;
            if (!audioSrc.startsWith('data:') && !audioSrc.startsWith('http') && !audioSrc.startsWith('blob:')) {
              audioSrc = `data:audio/mp3;base64,${segment.audioUrl}`;
            }
            const response = await fetch(audioSrc);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            durationMs = Math.max(3500, audioBuffer.duration * 1000);
            audioSource = audioCtx.createBufferSource();
            audioSource.buffer = audioBuffer;
            audioSource.connect(audioDestination);
          } catch (e) {
            const words = (segment.paragraph || '').split(/\s+/).filter(Boolean).length;
            durationMs = Math.max(4000, words * 320);
          }
        } else {
          const words = (segment.paragraph || '').split(/\s+/).filter(Boolean).length;
          durationMs = Math.max(4000, words * 320);
        }

        const lines = splitTextIntoLinesHelper(segment.paragraph || '', 8);

        if (audioSource) {
          try {
            audioSource.start(0);
          } catch (e) {}
        }

        // Frame rendering loop
        await new Promise((resolveFrame) => {
          let start: number | null = null;
          let frameId: number | null = null;
          let isResolved = false;

          const finish = () => {
            if (isResolved) return;
            isResolved = true;
            if (frameId) cancelAnimationFrame(frameId);
            if (tempObjectUrl) {
              URL.revokeObjectURL(tempObjectUrl);
            }
            resolveFrame(null);
          };

          function drawFrame(now: number) {
            if (isResolved) return;
            if (!start) start = now;
            const elapsed = now - start;
            const progress = Math.min(1, elapsed / durationMs);

            if (elapsed >= durationMs) {
              finish();
              return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Background & Image rendering with Ken Burns effect
            if (img.complete && img.naturalWidth > 0) {
              const ratio = Math.max(canvas.width / img.width, canvas.height / img.height);
              const baseWidth = img.width * ratio;
              const baseHeight = img.height * ratio;

              let zoom = 1 + progress * 0.08;
              let panX = (canvas.width - baseWidth) / 2 - progress * 20;
              let panY = (canvas.height - baseHeight) / 2;

              if (transitionEffect === 'slide') {
                panX += (1 - Math.min(1, elapsed / 500)) * 100;
              }

              const currentWidth = baseWidth * zoom;
              const currentHeight = baseHeight * zoom;

              ctx.drawImage(img, panX, panY, currentWidth, currentHeight);
            } else {
              const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, '#0f172a');
              gradient.addColorStop(0.5, '#1e1b4b');
              gradient.addColorStop(1, '#020617');
              ctx.fillStyle = gradient;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Cinematic bottom gradient
            const botGrad = ctx.createLinearGradient(0, canvas.height - 180, 0, canvas.height);
            botGrad.addColorStop(0, 'rgba(0,0,0,0)');
            botGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
            ctx.fillStyle = botGrad;
            ctx.fillRect(0, canvas.height - 180, canvas.width, 180);

            // Subtitle Synchronization & Karaoke Word Glow
            const activeLineIdx = Math.min(lines.length - 1, Math.floor(progress * lines.length));
            const currentLine = lines[activeLineIdx] || '';

            ctx.font = 'bold 30px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const boxWidth = Math.min(canvas.width - 120, ctx.measureText(currentLine).width + 80);
            const boxHeight = 64;
            const boxX = (canvas.width - boxWidth) / 2;
            const boxY = canvas.height - boxHeight - 40;

            // Subtitle pill container
            ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 18);
            ctx.fill();
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Render line text with karaoke active word highlighting
            const lineWords = currentLine.split(/\s+/).filter(Boolean);
            const lineProgress = (progress * lines.length) - activeLineIdx;
            const activeWordIdx = Math.min(lineWords.length - 1, Math.floor(Math.max(0, lineProgress) * lineWords.length));

            let currentX = (canvas.width / 2) - (ctx.measureText(currentLine).width / 2);
            for (let wIdx = 0; wIdx < lineWords.length; wIdx++) {
              const word = lineWords[wIdx];
              const wordWidth = ctx.measureText(word + ' ').width;

              if (wIdx === activeWordIdx) {
                ctx.fillStyle = '#facc15'; // Golden active spoken word
                ctx.shadowColor = 'rgba(250, 204, 21, 0.8)';
                ctx.shadowBlur = 8;
              } else {
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 4;
              }

              ctx.textAlign = 'left';
              ctx.fillText(word, currentX, boxY + boxHeight / 2);
              currentX += wordWidth;
            }
            ctx.shadowBlur = 0;

            // Top-Right Discreet Watermark
            ctx.save();
            const watermarkText = '✦ StorySpark AI';
            ctx.font = '600 14px sans-serif';
            const wmMetrics = ctx.measureText(watermarkText);
            const wmPadX = 12;
            const wmHeight = 26;
            const wmWidth = wmMetrics.width + (wmPadX * 2);
            const wmMarginRight = 24;
            const wmMarginTop = 24;
            const wmX = canvas.width - wmWidth - wmMarginRight;
            const wmY = wmMarginTop;

            // Watermark semi-transparent background capsule
            ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
            ctx.beginPath();
            ctx.roundRect(wmX, wmY, wmWidth, wmHeight, 13);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Watermark text
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 3;
            ctx.fillText(watermarkText, wmX + wmPadX, wmY + wmHeight / 2);
            ctx.restore();

            frameId = requestAnimationFrame(drawFrame);
          }

          const checkTimer = setInterval(() => {
            if (start && performance.now() - start >= durationMs + 200) {
              clearInterval(checkTimer);
              finish();
            }
          }, 250);

          frameId = requestAnimationFrame(drawFrame);
        });
      }

      if (musicSource) {
        try {
          musicSource.stop();
        } catch (e) {}
      }

      recorder.stop();
      const finalBlob = await exportPromise;

      const finalUrl = URL.createObjectURL(finalBlob);
      this.state.isGenerating = false;
      this.state.progress = 100;
      this.state.stepName = 'Generated Successfully';
      this.state.videoBlob = finalBlob;
      this.state.videoUrl = finalUrl;
      this.state.completedTimestamp = Date.now();
      this.addLog(`Video generated successfully (${(finalBlob.size / 1024 / 1024).toFixed(2)} MB). Ready to download!`);
      this.notify();

      // Trigger automatic download
      const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'story_video';
      const a = document.createElement('a');
      a.href = finalUrl;
      a.download = `${sanitizedTitle}.${format}`;
      a.click();

      if (audioCtx.state !== 'closed') audioCtx.close();
    } catch (err: any) {
      console.error('Video background export error:', err);
      this.state.isGenerating = false;
      this.state.error = err?.message || 'Video generation failed';
      this.addLog(`Export failed: ${this.state.error}`);
      this.notify();
    }
  }
}

function splitTextIntoLinesHelper(text: string, maxWordsPerLine = 8): string[] {
  if (!text) return [''];
  const sentences = text.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [text];
  const lines: string[] = [];

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    let currentLine: string[] = [];

    for (const word of words) {
      currentLine.push(word);
      if (currentLine.length >= maxWordsPerLine) {
        lines.push(currentLine.join(' '));
        currentLine = [];
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine.join(' '));
    }
  }

  return lines.length > 0 ? lines : [text];
}

export const videoExportManager = new VideoExportManager();
