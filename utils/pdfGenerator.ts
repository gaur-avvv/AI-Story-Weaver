import { StorySegment } from '../types';

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

/**
 * Loads an image from URL or data-URI and converts it into a DataURL safe for jsPDF.
 */
async function loadImageDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 800;
        canvas.height = img.naturalHeight || img.height || 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        } else {
          resolve(null);
        }
      } catch (err) {
        console.warn('Canvas toDataURL fallback for PDF image:', err);
        resolve(null);
      }
    };
    img.onerror = () => {
      resolve(null);
    };
    // 3.5 second timeout safeguard so PDF generation never stalls on slow network images
    setTimeout(() => resolve(null), 3500);
    img.src = url;
  });
}

/**
 * Safe resolver for jsPDF constructor across dynamic import, npm bundle, and window globals.
 */
async function getJsPdfConstructor(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).jspdf?.jsPDF) {
    return (window as any).jspdf.jsPDF;
  }
  if (typeof window !== 'undefined' && (window as any).jsPDF) {
    return (window as any).jsPDF;
  }
  try {
    const mod = await import('jspdf');
    const ctor = mod.jsPDF || (mod as any).default?.jsPDF || mod.default;
    if (typeof ctor === 'function') {
      return ctor;
    }
  } catch (err) {
    console.warn('Dynamic import of jspdf failed, attempting window fallback:', err);
  }

  if (typeof window !== 'undefined' && (window as any).jspdf?.jsPDF) {
    return (window as any).jspdf.jsPDF;
  }
  throw new Error('Unable to initialize PDF generator. jsPDF module not found.');
}

/**
 * Generates a formatted, publication-ready PDF Storybook Blob.
 */
export async function generatePdfWithWorker(options: PdfExportOptions): Promise<Blob> {
  const { 
    title = 'Untitled Story', 
    author = 'Novellaio AI Creator', 
    genre = 'Fantasy', 
    audience = 'All Ages', 
    segments = [], 
    pdfMargin = 20, 
    pdfTheme = 'classic_ivory', 
    onProgress 
  } = options;

  onProgress?.(10, 'Initializing PDF storybook engine...');
  const JsPDF = await getJsPdfConstructor();

  onProgress?.(25, 'Configuring layout & typography...');
  const doc = new JsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = Math.max(12, Math.min(35, pdfMargin || 20));
  const usableWidth = pageWidth - (margin * 2);

  // Theme Color Palette Definitions
  let bgRgb = [252, 250, 246]; // classic_ivory
  let textRgb = [30, 41, 59];
  let accentRgb = [147, 51, 234];
  let dividerRgb = [226, 232, 240];

  if (pdfTheme === 'midnight') {
    bgRgb = [15, 23, 42];
    textRgb = [241, 245, 249];
    accentRgb = [168, 85, 247];
    dividerRgb = [51, 65, 85];
  } else if (pdfTheme === 'emerald_parchment') {
    bgRgb = [240, 253, 244];
    textRgb = [6, 78, 59];
    accentRgb = [16, 185, 129];
    dividerRgb = [167, 243, 208];
  } else if (pdfTheme === 'cyberpunk') {
    bgRgb = [18, 18, 24];
    textRgb = [244, 114, 182];
    accentRgb = [56, 189, 248];
    dividerRgb = [63, 63, 70];
  }

  // Cover Page
  onProgress?.(35, 'Designing cover page...');
  doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative Top Accent
  doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.rect(margin, margin, usableWidth, 2, 'F');

  // Title & Studio Brand
  doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  const titleLines = doc.splitTextToSize(title || 'Untitled Story', usableWidth);
  doc.text(titleLines, pageWidth / 2, 72, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.text(`✦ NOVELLAIO STORY STUDIO ✦`, pageWidth / 2, 84, { align: 'center' });

  // Optional Cover Illustration
  const coverImage = segments[0]?.imageUrl ? await loadImageDataUrl(segments[0].imageUrl) : null;
  if (coverImage) {
    try {
      const imgBoxW = usableWidth * 0.88;
      const imgBoxH = 110;
      const imgX = (pageWidth - imgBoxW) / 2;
      const imgY = 95;
      doc.addImage(coverImage, 'JPEG', imgX, imgY, imgBoxW, imgBoxH, undefined, 'FAST');
    } catch (e) {
      console.warn('Could not render cover illustration in PDF worker:', e);
    }
  }

  // Decorative Middle Divider
  doc.setDrawColor(dividerRgb[0], dividerRgb[1], dividerRgb[2]);
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - 35, pageHeight - 50, pageWidth / 2 + 35, pageHeight - 50);

  // Author & Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
  doc.text(`Created with Novellaio Story Studio`, pageWidth / 2, pageHeight - 38, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 150);
  doc.text(`Author: ${author}`, pageWidth / 2, pageHeight - 30, { align: 'center' });

  const totalSegments = segments.length;
  let currentPageIndex = 1;

  // Render Chapters
  for (let i = 0; i < totalSegments; i++) {
    const seg = segments[i];
    const pct = Math.min(95, Math.round(40 + ((i + 1) / totalSegments) * 55));
    onProgress?.(pct, `Formatting Chapter ${i + 1} of ${totalSegments}...`);

    doc.addPage();
    currentPageIndex++;

    // Background
    doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.text(title.slice(0, 45) || 'Story', margin, margin - 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 150);
    const chapterHeading = `Chapter ${seg.chapterNumber || (i + 1)}: ${seg.chapterTitle || 'The Journey'}`;
    doc.text(chapterHeading.slice(0, 45), pageWidth - margin, margin - 4, { align: 'right' });

    // Header Line
    doc.setDrawColor(dividerRgb[0], dividerRgb[1], dividerRgb[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, margin, pageWidth - margin, margin);

    let currentY = margin + 10;

    // Optional Segment Illustration
    if (seg.imageUrl) {
      try {
        const dataUrl = await loadImageDataUrl(seg.imageUrl);
        if (dataUrl) {
          const imgWidth = usableWidth;
          const imgHeight = Math.min(75, imgWidth * 0.52);
          doc.addImage(dataUrl, 'JPEG', margin, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 8;
        }
      } catch (imgErr) {
        console.warn(`Could not render image for chapter ${i + 1}:`, imgErr);
      }
    }

    // Paragraph Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);

    const splitText: string[] = doc.splitTextToSize(seg.paragraph || '', usableWidth);
    const lineHeight = 5.6; // mm per line
    const footerCutoff = pageHeight - margin - 12;

    for (let lineIdx = 0; lineIdx < splitText.length; lineIdx++) {
      if (currentY + lineHeight > footerCutoff) {
        // Add continuation page
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(140, 140, 150);
        doc.text(`Page ${currentPageIndex}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

        doc.addPage();
        currentPageIndex++;
        doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // Header on continuation page
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
        doc.text(title.slice(0, 45) || 'Story', margin, margin - 4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(140, 140, 150);
        doc.text(`${chapterHeading.slice(0, 40)} (Cont.)`, pageWidth - margin, margin - 4, { align: 'right' });

        doc.setDrawColor(dividerRgb[0], dividerRgb[1], dividerRgb[2]);
        doc.setLineWidth(0.3);
        doc.line(margin, margin, pageWidth - margin, margin);

        currentY = margin + 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
      }

      doc.text(splitText[lineIdx], margin, currentY);
      currentY += lineHeight;
    }

    // Page Footer
    doc.setDrawColor(dividerRgb[0], dividerRgb[1], dividerRgb[2]);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(140, 140, 150);
    doc.text(`Page ${currentPageIndex}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  onProgress?.(100, 'PDF Storybook export ready!');
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
