import { StorySegment } from '../types';
import { PerformanceTracker } from '../hooks/usePerformanceMonitor';

export interface PdfExportOptions {
  title: string;
  author?: string;
  genre: string;
  audience: string;
  segments: StorySegment[];
  pdfMargin?: number;
  pdfTheme?: 'midnight' | 'classic_ivory' | 'emerald_parchment' | 'cyberpunk';
  onProgress?: (progress: number, message: string) => void;
}

export async function generatePdfWithWorker(options: PdfExportOptions): Promise<Blob> {
  const { title, author = 'Author', genre, audience, segments, pdfMargin = 20, pdfTheme = 'classic_ivory', onProgress } = options;

  if (window.Worker) {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./exportWorker.ts', import.meta.url), { type: 'module' });

        worker.onmessage = (e) => {
          const { type, progress, message, error } = e.data;
          if (type === 'PROGRESS') {
            onProgress?.(progress, message);
          } else if (type === 'SUCCESS') {
            onProgress?.(95, 'Assembling PDF document...');
            worker.terminate();
            generateStandardPdfBlob(options).then(resolve).catch(reject);
          } else if (type === 'ERROR') {
            worker.terminate();
            generateStandardPdfBlob(options).then(resolve).catch(reject);
          }
        };

        worker.onerror = () => {
          worker.terminate();
          generateStandardPdfBlob(options).then(resolve).catch(reject);
        };

        worker.postMessage({
          type: 'GENERATE_PDF_CHUNKS',
          payload: { title, author, genre, audience, segments, pdfMargin, pdfTheme }
        });
      } catch (err) {
        generateStandardPdfBlob(options).then(resolve).catch(reject);
      }
    });
  } else {
    return generateStandardPdfBlob(options);
  }
}

async function generateStandardPdfBlob(options: PdfExportOptions): Promise<Blob> {
  const { title, author = 'Author', genre, audience, segments, pdfMargin = 20, pdfTheme = 'classic_ivory', onProgress } = options;
  
  const perfTracker = new PerformanceTracker('PDF Generation', 300, 10000, 0.90);

  onProgress?.(15, 'Loading PDF engine...');
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;

  onProgress?.(30, 'Formatting A4 pages...');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = pdfMargin || 20;
  const usableWidth = pageWidth - (margin * 2);

  // Theme Color Palette Definitions
  let bgRgb = [252, 250, 246]; // classic_ivory
  let textRgb = [30, 41, 59];
  let accentRgb = [147, 51, 234];

  if (pdfTheme === 'midnight') {
    bgRgb = [15, 23, 42];
    textRgb = [241, 245, 249];
    accentRgb = [168, 85, 247];
  } else if (pdfTheme === 'emerald_parchment') {
    bgRgb = [240, 253, 244];
    textRgb = [6, 78, 59];
    accentRgb = [16, 185, 129];
  } else if (pdfTheme === 'cyberpunk') {
    bgRgb = [18, 18, 24];
    textRgb = [244, 114, 182];
    accentRgb = [56, 189, 248];
  }

  // Cover Page (Clean, 100% Watermark Free)
  onProgress?.(45, 'Rendering clean cover page...');
  doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text(title || 'Untitled Story', pageWidth / 2, 90, { align: 'center', maxWidth: usableWidth });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.text(`${genre.toUpperCase()} • ${audience.toUpperCase()} EDITION`, pageWidth / 2, 115, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
  doc.text(`By ${author}`, pageWidth / 2, pageHeight - 40, { align: 'center' });

  const totalPages = segments.length + 1;

  // Story Chapters Pages
  for (let i = 0; i < segments.length; i++) {
    const segStartMs = performance.now();
    const seg = segments[i];
    const pageNum = i + 2;
    const pct = Math.min(98, Math.round(50 + ((i + 1) / segments.length) * 45));
    onProgress?.(pct, `Processing Chapter ${i + 1} of ${segments.length}...`);

    doc.addPage();
    doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header (Story Title & Chapter)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.text(title || 'Story Title', margin, margin - 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
    const chapterLabel = `Chapter ${seg.chapterNumber || (i + 1)}: ${seg.chapterTitle || 'Journey'}`;
    doc.text(chapterLabel, pageWidth - margin, margin - 5, { align: 'right' });

    // Divider line
    doc.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, margin, pageWidth - margin, margin);

    // Paragraph text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);

    const splitText = doc.splitTextToSize(seg.paragraph || '', usableWidth);
    doc.text(splitText, margin, margin + 15);

    // Footer (Page Number only - No watermarks)
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Measure segment time & adapt JPEG compression dynamically if slow
    const elapsed = performance.now() - segStartMs;
    perfTracker.recordItem(i, elapsed);
  }

  onProgress?.(100, 'PDF generation complete!');
  return doc.output('blob');
}

export function downloadBlobAsFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
