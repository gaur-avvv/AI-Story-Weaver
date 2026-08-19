import { StorySegment } from '../types';

export interface PdfExportOptions {
  title: string;
  author?: string;
  genre: string;
  audience: string;
  segments: StorySegment[];
  pdfMargin?: number;
  pdfTheme?: 'midnight' | 'classic_ivory' | 'emerald_parchment' | 'cyberpunk' | 'royal_slate' | 'sunset_crimson';
  fontSize?: number;
  onProgress?: (progress: number, message: string) => void;
}

export interface ProcessedPdfImage {
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  aspectRatio: number;
}

/**
 * Loads an image from URL or data-URI and converts it into a DataURL with exact aspect ratio metadata for jsPDF.
 */
async function loadImageDataWithAspect(url: string): Promise<ProcessedPdfImage | null> {
  if (!url) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const nw = img.naturalWidth || img.width || 1024;
        const nh = img.naturalHeight || img.height || 768;
        const aspectRatio = nw / nh;

        const canvas = document.createElement('canvas');
        // Cap max canvas dimension for sharp rendering while preventing memory spikes
        const maxDim = 1600;
        let targetW = nw;
        let targetH = nh;
        if (nw > maxDim || nh > maxDim) {
          if (nw >= nh) {
            targetW = maxDim;
            targetH = Math.round(maxDim / aspectRatio);
          } else {
            targetH = maxDim;
            targetW = Math.round(maxDim * aspectRatio);
          }
        }

        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
          resolve({
            dataUrl,
            naturalWidth: nw,
            naturalHeight: nh,
            aspectRatio
          });
        } else {
          resolve({
            dataUrl: url,
            naturalWidth: nw,
            naturalHeight: nh,
            aspectRatio
          });
        }
      } catch (err) {
        console.warn('Canvas toDataURL fallback for PDF image:', err);
        resolve(null);
      }
    };
    img.onerror = () => {
      resolve(null);
    };
    // 4 second timeout safeguard so PDF generation never stalls on slow network images
    setTimeout(() => resolve(null), 4000);
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
 * Generates a formatted, publication-ready PDF Storybook Blob with strictly preserved image aspect ratios.
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
    bgRgb = [4, 31, 24];
    textRgb = [236, 253, 245];
    accentRgb = [52, 211, 153];
    dividerRgb = [6, 78, 59];
  } else if (pdfTheme === 'royal_slate') {
    bgRgb = [15, 23, 42];
    textRgb = [248, 250, 252];
    accentRgb = [251, 191, 36];
    dividerRgb = [51, 65, 85];
  } else if (pdfTheme === 'cyberpunk') {
    bgRgb = [9, 9, 11];
    textRgb = [250, 250, 250];
    accentRgb = [244, 63, 94];
    dividerRgb = [39, 39, 42];
  } else if (pdfTheme === 'sunset_crimson') {
    bgRgb = [28, 13, 24];
    textRgb = [255, 241, 242];
    accentRgb = [251, 113, 133];
    dividerRgb = [76, 29, 64];
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
  doc.text(titleLines, pageWidth / 2, 68, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.text(`✦ NOVELLAIO STORY STUDIO ✦`, pageWidth / 2, 80, { align: 'center' });

  // Optional Cover Illustration (Strictly Proportional, Never Stretched)
  const coverImage = segments[0]?.imageUrl ? await loadImageDataWithAspect(segments[0].imageUrl) : null;
  if (coverImage) {
    try {
      const maxCoverW = usableWidth * 0.90;
      const maxCoverH = 105; // max allowable height in mm
      let imgW = maxCoverW;
      let imgH = imgW / coverImage.aspectRatio;

      if (imgH > maxCoverH) {
        imgH = maxCoverH;
        imgW = imgH * coverImage.aspectRatio;
      }

      const imgX = (pageWidth - imgW) / 2;
      const imgY = 88 + (maxCoverH - imgH) / 2;

      // Subtle background outline for cover frame
      doc.setDrawColor(dividerRgb[0], dividerRgb[1], dividerRgb[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(imgX - 0.5, imgY - 0.5, imgW + 1, imgH + 1, 2, 2, 'S');

      doc.addImage(coverImage.dataUrl, 'JPEG', imgX, imgY, imgW, imgH, undefined, 'FAST');
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
  doc.text(`Author: ${author} • Genre: ${genre}`, pageWidth / 2, pageHeight - 30, { align: 'center' });

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

    let currentY = margin + 8;

    // Optional Segment Illustration with Exact Proportional Calculation (Zero Distortion)
    if (seg.imageUrl) {
      try {
        const imgData = await loadImageDataWithAspect(seg.imageUrl);
        if (imgData) {
          const maxImgWidth = usableWidth;
          const maxImgHeight = 85; // mm ceiling for image height
          let renderW = maxImgWidth;
          let renderH = renderW / imgData.aspectRatio;

          if (renderH > maxImgHeight) {
            renderH = maxImgHeight;
            renderW = renderH * imgData.aspectRatio;
          }

          // Center horizontally within margins
          const renderX = margin + (usableWidth - renderW) / 2;

          // Elegant rounded frame outline
          doc.setDrawColor(dividerRgb[0], dividerRgb[1], dividerRgb[2]);
          doc.setLineWidth(0.35);
          doc.roundedRect(renderX - 0.5, currentY - 0.5, renderW + 1, renderH + 1, 2, 2, 'S');

          doc.addImage(imgData.dataUrl, 'JPEG', renderX, currentY, renderW, renderH, undefined, 'FAST');
          currentY += renderH + 8;
        }
      } catch (imgErr) {
        console.warn(`Could not render image for chapter ${i + 1}:`, imgErr);
      }
    }

    // Paragraph Text with User-Configured Readability Font Size
    const userFontScale = (options.fontSize ? options.fontSize / 18 : 1);
    const effectiveFontSize = Math.max(8, Math.min(18, 10.5 * userFontScale));
    const lineHeight = Math.max(4.5, effectiveFontSize * 0.54); // mm per line

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(effectiveFontSize);
    doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);

    const splitText: string[] = doc.splitTextToSize(seg.paragraph || '', usableWidth);
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
