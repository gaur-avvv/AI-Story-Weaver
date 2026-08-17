import type { StorySegment } from '../types';

// Simple, self-contained pure TypeScript ZIP encoder for browser EPUB generation
class SimpleZip {
  private files: { name: string; data: Uint8Array; isStored?: boolean }[] = [];

  addFile(name: string, content: string | Uint8Array, isStored = false) {
    let data: Uint8Array;
    if (typeof content === 'string') {
      data = new TextEncoder().encode(content);
    } else {
      data = content;
    }
    this.files.push({ name, data, isStored });
  }

  // Calculate standard CRC32
  private crc32(data: Uint8Array): number {
    let crc = 0 ^ (-1);
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  generateBlob(): Blob {
    let localHeadersSize = 0;
    let centralDirSize = 0;

    const fileEntries: {
      nameBytes: Uint8Array;
      data: Uint8Array;
      crc: number;
      offset: number;
    }[] = [];

    // Measure offsets
    let currentOffset = 0;
    for (const file of this.files) {
      const nameBytes = new TextEncoder().encode(file.name);
      const crc = this.crc32(file.data);
      fileEntries.push({
        nameBytes,
        data: file.data,
        crc,
        offset: currentOffset,
      });

      // 30 bytes fixed header + name length + data length
      const localSize = 30 + nameBytes.length + file.data.length;
      currentOffset += localSize;
      localHeadersSize += localSize;

      // 46 bytes central directory header + name length
      centralDirSize += 46 + nameBytes.length;
    }

    const totalSize = localHeadersSize + centralDirSize + 22; // 22 bytes for End of Central Directory
    const buffer = new Uint8Array(totalSize);
    const view = new DataView(buffer.buffer);

    // 1. Write Local File Headers and Data
    let pos = 0;
    for (let i = 0; i < fileEntries.length; i++) {
      const entry = fileEntries[i];
      const { nameBytes, data, crc } = entry;

      // Local file header signature 0x04034b50
      view.setUint32(pos, 0x04034b50, true); pos += 4;
      view.setUint16(pos, 20, true); pos += 2; // version needed (2.0)
      view.setUint16(pos, 0, true); pos += 2;  // flags
      view.setUint16(pos, 0, true); pos += 2;  // compression method (0 = store)
      view.setUint16(pos, 0, true); pos += 2;  // mod time
      view.setUint16(pos, 0, true); pos += 2;  // mod date
      view.setUint32(pos, crc, true); pos += 4; // crc32
      view.setUint32(pos, data.length, true); pos += 4; // compressed size
      view.setUint32(pos, data.length, true); pos += 4; // uncompressed size
      view.setUint16(pos, nameBytes.length, true); pos += 2; // file name length
      view.setUint16(pos, 0, true); pos += 2; // extra field length

      buffer.set(nameBytes, pos); pos += nameBytes.length;
      buffer.set(data, pos); pos += data.length;
    }

    const centralDirOffset = pos;

    // 2. Write Central Directory Headers
    for (let i = 0; i < fileEntries.length; i++) {
      const entry = fileEntries[i];
      const { nameBytes, data, crc, offset } = entry;

      // Central file header signature 0x02014b50
      view.setUint32(pos, 0x02014b50, true); pos += 4;
      view.setUint16(pos, 20, true); pos += 2; // version made by
      view.setUint16(pos, 20, true); pos += 2; // version needed
      view.setUint16(pos, 0, true); pos += 2;  // flags
      view.setUint16(pos, 0, true); pos += 2;  // compression method (0 = store)
      view.setUint16(pos, 0, true); pos += 2;  // mod time
      view.setUint16(pos, 0, true); pos += 2;  // mod date
      view.setUint32(pos, crc, true); pos += 4; // crc32
      view.setUint32(pos, data.length, true); pos += 4; // compressed size
      view.setUint32(pos, data.length, true); pos += 4; // uncompressed size
      view.setUint16(pos, nameBytes.length, true); pos += 2; // file name length
      view.setUint16(pos, 0, true); pos += 2; // extra field length
      view.setUint16(pos, 0, true); pos += 2; // file comment length
      view.setUint16(pos, 0, true); pos += 2; // disk number start
      view.setUint16(pos, 0, true); pos += 2; // internal file attributes
      view.setUint32(pos, 0, true); pos += 4; // external file attributes
      view.setUint32(pos, offset, true); pos += 4; // relative offset of local header

      buffer.set(nameBytes, pos); pos += nameBytes.length;
    }

    // 3. Write End of Central Directory Record (EOCD)
    view.setUint32(pos, 0x06054b50, true); pos += 4; // EOCD signature
    view.setUint16(pos, 0, true); pos += 2; // disk number
    view.setUint16(pos, 0, true); pos += 2; // disk with CD
    view.setUint16(pos, fileEntries.length, true); pos += 2; // total entries on disk
    view.setUint16(pos, fileEntries.length, true); pos += 2; // total entries
    view.setUint32(pos, centralDirSize, true); pos += 4; // size of CD
    view.setUint32(pos, centralDirOffset, true); pos += 4; // offset of CD
    view.setUint16(pos, 0, true); pos += 2; // comment length

    return new Blob([buffer], { type: 'application/epub+zip' });
  }
}

// Pre-computed CRC-32 table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  CRC_TABLE[i] = c >>> 0;
}

export interface EpubOptions {
  title: string;
  author?: string;
  genre?: string;
  audience?: string;
  segments: StorySegment[];
  coverImageUrl?: string;
}

export function generateEpubBlob(options: EpubOptions): Blob {
  const {
    title = 'Novellaio Storybook',
    author = 'Novellaio AI Creator',
    genre = 'Fantasy',
    audience = 'Children',
    segments = [],
  } = options;

  const zip = new SimpleZip();
  const bookId = `urn:uuid:${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // 1. mimetype (MUST be first and uncompressed)
  zip.addFile('mimetype', 'application/epub+zip', true);

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.addFile('META-INF/container.xml', containerXml);

  // 3. OEBPS/style.css
  const stylesheet = `
body {
  font-family: "Georgia", "Palatino", "Times New Roman", serif;
  line-height: 1.7;
  color: #1e293b;
  margin: 10% 8%;
  background-color: #fdfbf7;
}
h1 {
  font-size: 2.2em;
  color: #4c1d95;
  text-align: center;
  margin-bottom: 0.2em;
  font-weight: 700;
}
h2 {
  font-size: 1.5em;
  color: #6d28d9;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.3em;
  margin-top: 1.5em;
}
p {
  font-size: 1.1em;
  margin-bottom: 1.2em;
  text-indent: 1.5em;
  text-align: justify;
}
.cover-meta {
  text-align: center;
  color: #64748b;
  font-style: italic;
  margin-bottom: 2em;
}
.choices-box {
  background: #f1f5f9;
  border-left: 4px solid #8b5cf6;
  padding: 1em;
  margin: 1.5em 0;
  border-radius: 4px;
}
.choice-item {
  font-weight: 600;
  color: #5b21b6;
  margin-bottom: 0.5em;
}
`;
  zip.addFile('OEBPS/style.css', stylesheet);

  // 4. Generate Chapter XHTML Files
  const chapterManifest: { id: string; href: string; title: string }[] = [];

  // Title Page
  const titleXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${escapeXml(title)}</h1>
  <div class="cover-meta">
    <p style="text-indent: 0;"><strong>Author:</strong> ${escapeXml(author)}</p>
    <p style="text-indent: 0;"><strong>Genre:</strong> ${escapeXml(genre)} | <strong>Audience:</strong> ${escapeXml(audience)}</p>
    <p style="text-indent: 0;"><em>Published with Novellaio Multi-Modal AI Studio</em></p>
  </div>
  <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 2em 0;"/>
</body>
</html>`;
  zip.addFile('OEBPS/title.xhtml', titleXhtml);
  chapterManifest.push({ id: 'title-page', href: 'title.xhtml', title: 'Title Page' });

  // Individual Chapters
  segments.forEach((seg, index) => {
    const chNum = seg.chapterNumber || (index + 1);
    const chTitle = seg.chapterTitle || `Chapter ${chNum}`;
    const fileId = `chapter_${chNum}`;
    const fileName = `chapter_${chNum}.xhtml`;

    let choicesHtml = '';
    if (seg.choices && seg.choices.length > 0) {
      choicesHtml = `<div class="choices-box"><p style="text-indent:0; font-weight:bold; margin-bottom:0.5em;">Branching Path Decisions:</p><ul>`;
      seg.choices.forEach(choice => {
        choicesHtml += `<li class="choice-item">${escapeXml(choice)}</li>`;
      });
      choicesHtml += `</ul></div>`;
    }

    const chapterXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${escapeXml(chTitle)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h2>Chapter ${chNum}: ${escapeXml(chTitle)}</h2>
  <p>${escapeXml(seg.paragraph)}</p>
  ${choicesHtml}
</body>
</html>`;

    zip.addFile(`OEBPS/${fileName}`, chapterXhtml);
    chapterManifest.push({ id: fileId, href: fileName, title: chTitle });
  });

  // 5. OEBPS/toc.ncx (EPUB2 compatibility)
  let ncxNavPoints = '';
  chapterManifest.forEach((ch, idx) => {
    ncxNavPoints += `
    <navPoint id="navpoint-${idx + 1}" playOrder="${idx + 1}">
      <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
      <content src="${ch.href}"/>
    </navPoint>`;
  });

  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <docAuthor><text>${escapeXml(author)}</text></docAuthor>
  <navMap>${ncxNavPoints}
  </navMap>
</ncx>`;
  zip.addFile('OEBPS/toc.ncx', ncx);

  // 6. OEBPS/content.opf
  let opfManifestItems = `
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="title-page" href="title.xhtml" media-type="application/xhtml+xml"/>`;
  
  let opfSpineItems = `
    <itemref idref="title-page"/>`;

  chapterManifest.forEach(ch => {
    if (ch.id !== 'title-page') {
      opfManifestItems += `\n    <item id="${ch.id}" href="${ch.href}" media-type="application/xhtml+xml"/>`;
      opfSpineItems += `\n    <itemref idref="${ch.id}"/>`;
    }
  });

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator opf:role="aut">${escapeXml(author)}</dc:creator>
    <dc:identifier id="BookID" opf:scheme="UUID">${bookId}</dc:identifier>
    <dc:language>en</dc:language>
    <dc:publisher>Novellaio AI Studio</dc:publisher>
    <dc:subject>${escapeXml(genre)}</dc:subject>
    <dc:description>An interactive illustrated adventure generated with Novellaio AI.</dc:description>
    <dc:date>${new Date().toISOString().split('T')[0]}</dc:date>
  </metadata>
  <manifest>${opfManifestItems}
  </manifest>
  <spine toc="ncx">${opfSpineItems}
  </spine>
  <guide>
    <reference type="toc" title="Table of Contents" href="title.xhtml"/>
    <reference type="text" title="Beginning" href="chapter_1.xhtml"/>
  </guide>
</package>`;
  zip.addFile('OEBPS/content.opf', opf);

  return zip.generateBlob();
}

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
