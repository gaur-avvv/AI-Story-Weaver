import { StorySegment } from '../types';

/**
 * Downloads a Blob as a file in the browser.
 */
export function downloadBlobAsFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Clean a string for use in safe filesystem filenames.
 */
export function sanitizeFilename(str: string, fallback = 'story'): string {
  const clean = str
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return clean || fallback;
}

/**
 * Checks if the story has at least one segment with audio generated.
 */
export function hasAvailableAudio(segments: StorySegment[]): boolean {
  return Boolean(segments && segments.some(s => Boolean(s.audioUrl)));
}

/**
 * Counts total segments that have synthesized audio available.
 */
export function countAudioSegments(segments: StorySegment[]): number {
  return segments ? segments.filter(s => Boolean(s.audioUrl)).length : 0;
}

/**
 * Convert any audioUrl (data-URI, base64, or HTTP/blob URL) into an ArrayBuffer.
 */
export async function audioUrlToArrayBuffer(urlOrBase64: string): Promise<{ buffer: ArrayBuffer; mimeType: string }> {
  if (!urlOrBase64) {
    throw new Error('No audio source provided.');
  }

  // Handle data URI
  if (urlOrBase64.startsWith('data:')) {
    const parts = urlOrBase64.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'audio/mp3';
    const base64Data = parts[1] || '';
    const binary = atob(base64Data);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { buffer: bytes.buffer, mimeType };
  }

  // Handle HTTP / Blob URL
  if (urlOrBase64.startsWith('http://') || urlOrBase64.startsWith('https://') || urlOrBase64.startsWith('blob:')) {
    const response = await fetch(urlOrBase64);
    if (!response.ok) {
      throw new Error(`Failed to download audio track: ${response.statusText}`);
    }
    const mimeType = response.headers.get('content-type') || 'audio/mp3';
    const buffer = await response.arrayBuffer();
    return { buffer, mimeType };
  }

  // Assume raw base64 data
  try {
    const binary = atob(urlOrBase64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { buffer: bytes.buffer, mimeType: 'audio/mp3' };
  } catch (err) {
    throw new Error('Invalid audio data format.');
  }
}

/**
 * Converts a standard Web Audio AudioBuffer into a 16-bit PCM WAV Blob.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numFrames = buffer.length;
  const dataByteCount = numFrames * blockAlign;
  const headerByteCount = 44;
  const totalByteCount = headerByteCount + dataByteCount;

  const arrayBuffer = new ArrayBuffer(totalByteCount);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteCount, true);
  writeString(8, 'WAVE');

  // "fmt " chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // PCM Format (1)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // "data" chunk
  writeString(36, 'data');
  view.setUint32(40, dataByteCount, true);

  // Interleave channels & write PCM samples
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channelData[c][i];
      // Clamp between -1.0 and 1.0
      sample = Math.max(-1, Math.min(1, sample));
      // Convert float sample to 16-bit signed integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Downloads a single scene's audio narration.
 */
export async function downloadSingleSegmentAudio(
  segment: StorySegment,
  index: number,
  storyTitle = 'story'
): Promise<boolean> {
  if (!segment.audioUrl) {
    throw new Error('No audio found for this scene.');
  }

  const cleanTitle = sanitizeFilename(storyTitle);
  const chapterName = segment.chapterTitle
    ? sanitizeFilename(segment.chapterTitle)
    : `scene-${index + 1}`;

  const { buffer, mimeType } = await audioUrlToArrayBuffer(segment.audioUrl);
  const ext = mimeType.includes('wav') ? 'wav' : 'mp3';
  const blob = new Blob([buffer], { type: mimeType });
  const filename = `${cleanTitle}-${chapterName}.${ext}`;

  downloadBlobAsFile(blob, filename);
  return true;
}

/**
 * Stitches and downloads the full story audiobook / narration audio track as a single master audio file.
 */
export async function downloadFullStoryAudio(
  segments: StorySegment[],
  storyTitle = 'story',
  onProgress?: (progress: number, message: string) => void
): Promise<{ success: boolean; filename?: string; error?: string }> {
  const audioSegments = segments.filter(s => Boolean(s.audioUrl));

  if (audioSegments.length === 0) {
    return {
      success: false,
      error: 'No narration audio has been generated for this story yet. Please enable voice narration or wait for synthesis to complete.'
    };
  }

  const cleanTitle = sanitizeFilename(storyTitle, 'novellaio-audiobook');

  // Single segment shortcut: download directly without needing AudioContext re-encoding
  if (audioSegments.length === 1) {
    onProgress?.(50, 'Preparing audio track download...');
    const single = audioSegments[0];
    const originalIndex = segments.findIndex(s => s.id === single.id);
    await downloadSingleSegmentAudio(single, originalIndex >= 0 ? originalIndex : 0, storyTitle);
    onProgress?.(100, 'Audio track downloaded!');
    return { success: true, filename: `${cleanTitle}.mp3` };
  }

  // Multi-segment: Decode and stitch seamlessly using Web Audio API
  try {
    onProgress?.(10, 'Initializing audio synthesis engine...');
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Web Audio API is not supported in this browser environment.');
    }

    const audioCtx = new AudioContextClass();
    const decodedBuffers: AudioBuffer[] = [];
    const totalSegments = audioSegments.length;

    for (let i = 0; i < totalSegments; i++) {
      const seg = audioSegments[i];
      const stepPct = 15 + Math.round((i / totalSegments) * 55);
      onProgress?.(
        stepPct,
        `Processing narration for Scene ${i + 1} of ${totalSegments}...`
      );

      const { buffer } = await audioUrlToArrayBuffer(seg.audioUrl!);
      
      // decodeAudioData requires a fresh copy of the array buffer in some browsers
      const bufferCopy = buffer.slice(0);
      const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        audioCtx.decodeAudioData(bufferCopy, resolve, reject);
      });

      decodedBuffers.push(audioBuffer);
    }

    onProgress?.(75, 'Stitching multi-scene narrative audio tracks...');

    // Determine target audio properties
    const targetSampleRate = decodedBuffers[0]?.sampleRate || 24000;
    const maxChannels = Math.max(...decodedBuffers.map(b => b.numberOfChannels), 1);

    // 0.45 second silence gap between scenes for natural pacing
    const pauseDurationSeconds = 0.45;
    const pauseFrames = Math.round(pauseDurationSeconds * targetSampleRate);

    // Calculate total frames
    let totalFrames = 0;
    for (let i = 0; i < decodedBuffers.length; i++) {
      totalFrames += decodedBuffers[i].length;
      if (i < decodedBuffers.length - 1) {
        totalFrames += pauseFrames;
      }
    }

    // Create the master destination AudioBuffer
    const masterBuffer = audioCtx.createBuffer(maxChannels, totalFrames, targetSampleRate);

    let currentFrameOffset = 0;
    for (let i = 0; i < decodedBuffers.length; i++) {
      const segBuffer = decodedBuffers[i];
      const segFrames = segBuffer.length;

      for (let channel = 0; channel < maxChannels; channel++) {
        const targetChannelData = masterBuffer.getChannelData(channel);
        // If source buffer is mono but target is stereo, use mono channel 0 for both
        const srcChannelIndex = channel < segBuffer.numberOfChannels ? channel : 0;
        const srcChannelData = segBuffer.getChannelData(srcChannelIndex);

        targetChannelData.set(srcChannelData, currentFrameOffset);
      }

      currentFrameOffset += segFrames;

      // Add silence gap between segments
      if (i < decodedBuffers.length - 1) {
        currentFrameOffset += pauseFrames;
      }
    }

    onProgress?.(90, 'Encoding master 16-bit PCM WAV audiobook track...');
    const wavBlob = audioBufferToWavBlob(masterBuffer);

    const filename = `${cleanTitle}-complete-audiobook.wav`;
    downloadBlobAsFile(wavBlob, filename);

    onProgress?.(100, 'Audiobook download complete!');
    return { success: true, filename };
  } catch (err: any) {
    console.error('Audio concatenation export error:', err);
    return {
      success: false,
      error: err.message || 'Failed to assemble and export combined audio track.'
    };
  }
}
