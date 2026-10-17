import JSZip from 'jszip';
import { EpubBookData, ChapterInfo } from '../types';

/**
 * Strips HTML tags and normalizes whitespace from chapter content
 */
function cleanHtml(htmlContent: string): { title: string; cleanText: string } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Remove scripts, styles, svg, and audio/video elements
    const unwanted = doc.querySelectorAll('script, style, svg, audio, video, nav');
    unwanted.forEach(el => el.remove());

    // Try finding chapter title from h1, h2, h3 or document title
    let title = '';
    const heading = doc.querySelector('h1, h2, h3, .chapter-title, .title');
    if (heading && heading.textContent?.trim()) {
      title = heading.textContent.trim();
    } else if (doc.title && doc.title.trim()) {
      title = doc.title.trim();
    }

    const text = (doc.body ? doc.body.textContent || '' : doc.documentElement.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();

    return { title, cleanText: text };
  } catch {
    // Fallback regex clean
    const noTags = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return { title: '', cleanText: noTags };
  }
}

/**
 * Parses an EPUB file into structured metadata, cover image, and text content
 */
export async function parseEpubFile(file: File): Promise<EpubBookData> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. Locate container.xml
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) {
    throw new Error('Tập tin không phải là định dạng EPUB hợp lệ (thiếu container.xml).');
  }

  const containerXmlText = await containerFile.async('text');
  const domParser = new DOMParser();
  const containerDoc = domParser.parseFromString(containerXmlText, 'application/xml');

  const rootfileEl = containerDoc.querySelector('rootfile');
  const opfPath = rootfileEl?.getAttribute('full-path');

  if (!opfPath) {
    throw new Error('Không thể xác định đường dẫn OPF trong tệp EPUB.');
  }

  // 2. Read OPF file
  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error(`Không tìm thấy tệp OPF tại: ${opfPath}`);
  }

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
  const opfXmlText = await opfFile.async('text');
  const opfDoc = domParser.parseFromString(opfXmlText, 'application/xml');

  // 3. Extract Metadata
  const getMetaText = (tagName: string): string => {
    // Check both dc:tag and plain tag
    const el = opfDoc.querySelector(`dc\\:${tagName}, ${tagName}`);
    return el?.textContent?.trim() || '';
  };

  const title = getMetaText('title') || file.name.replace(/\.epub$/i, '');
  const author = getMetaText('creator') || 'Tác giả không rõ';
  const description = getMetaText('description') || '';
  const language = getMetaText('language') || 'vi';
  const publisher = getMetaText('publisher') || '';

  // 4. Map Manifest items
  interface ManifestItem {
    id: string;
    href: string;
    mediaType: string;
    properties?: string;
  }
  const manifestMap = new Map<string, ManifestItem>();
  const manifestItems = opfDoc.querySelectorAll('manifest > item');
  manifestItems.forEach(item => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type');
    const properties = item.getAttribute('properties') || '';
    if (id && href && mediaType) {
      manifestMap.set(id, { id, href, mediaType, properties });
    }
  });

  // 5. Extract Cover Image
  let coverDataUrl: string | undefined = undefined;
  let coverItemId: string | null = null;

  // Check <meta name="cover" content="..."/>
  const coverMeta = opfDoc.querySelector('meta[name="cover"]');
  if (coverMeta) {
    coverItemId = coverMeta.getAttribute('content');
  }

  // Check item with properties="cover-image"
  if (!coverItemId) {
    for (const [id, item] of manifestMap.entries()) {
      if (item.properties?.includes('cover-image')) {
        coverItemId = id;
        break;
      }
    }
  }

  // Check item with id or href containing 'cover' and image mime
  if (!coverItemId) {
    for (const [id, item] of manifestMap.entries()) {
      if (
        item.mediaType.startsWith('image/') &&
        (id.toLowerCase().includes('cover') || item.href.toLowerCase().includes('cover'))
      ) {
        coverItemId = id;
        break;
      }
    }
  }

  if (coverItemId && manifestMap.has(coverItemId)) {
    const item = manifestMap.get(coverItemId)!;
    const coverPath = opfDir + item.href;
    // Decode URI path in case of spaces
    const resolvedPath = decodeURIComponent(coverPath);
    const coverZipFile = zip.file(resolvedPath) || zip.file(item.href);

    if (coverZipFile) {
      const base64Data = await coverZipFile.async('base64');
      coverDataUrl = `data:${item.mediaType};base64,${base64Data}`;
    }
  }

  // If no cover found yet, search for first image with decent name or size
  if (!coverDataUrl) {
    for (const item of manifestMap.values()) {
      if (item.mediaType.startsWith('image/') && !item.href.includes('thumb')) {
        const fullPath = decodeURIComponent(opfDir + item.href);
        const zFile = zip.file(fullPath) || zip.file(item.href);
        if (zFile) {
          const base64Data = await zFile.async('base64');
          coverDataUrl = `data:${item.mediaType};base64,${base64Data}`;
          break;
        }
      }
    }
  }

  // 6. Extract Chapters in Spine Reading Order
  const spineItemrefs = opfDoc.querySelectorAll('spine > itemref');
  const chapters: ChapterInfo[] = [];
  let totalWords = 0;
  let chapterIndex = 1;

  for (let i = 0; i < spineItemrefs.length; i++) {
    const idref = spineItemrefs[i].getAttribute('idref');
    if (!idref || !manifestMap.has(idref)) continue;

    const item = manifestMap.get(idref)!;
    if (!item.mediaType.includes('html') && !item.mediaType.includes('xml')) continue;

    const fullPath = decodeURIComponent(opfDir + item.href);
    const chapterFile = zip.file(fullPath) || zip.file(item.href);
    if (!chapterFile) continue;

    const rawHtml = await chapterFile.async('text');
    const { title: rawTitle, cleanText } = cleanHtml(rawHtml);

    if (cleanText.length < 40) {
      // Skip tiny empty placeholder pages
      continue;
    }

    const words = cleanText.split(/\s+/).filter(Boolean).length;
    totalWords += words;

    const chTitle = rawTitle || `Chương ${chapterIndex}`;
    chapters.push({
      id: idref,
      title: chTitle,
      text: cleanText,
      wordCount: words,
    });
    chapterIndex++;
  }

  // 7. Synthesize Smart Text Sample for deep, comprehensive review without exceeding context
  // Collect book overview, prologue/intro, representative sections throughout the book
  let sampledContent = `THÔNG TIN SÁCH:\n- Tựa đề: ${title}\n- Tác giả: ${author}\n- Ngôn ngữ: ${language}\n- Nhà xuất bản: ${publisher || 'N/A'}\n- Tổng số chương: ${chapters.length}\n- Tổng số từ thực tế: ${totalWords.toLocaleString()} từ\n`;

  if (description) {
    sampledContent += `\nGIỚI THIỆU GỐC CỦA TÁC PHẨM:\n${description}\n`;
  }

  sampledContent += `\nMỤC LỤC & DANH SÁCH CHƯƠNG:\n`;
  chapters.slice(0, 40).forEach((ch, idx) => {
    sampledContent += `${idx + 1}. ${ch.title} (~${ch.wordCount} từ)\n`;
  });

  sampledContent += `\nNỘI DUNG VĂN BẢN TRÍCH MẪU ĐỂ ĐÁNH GIÁ VĂN PHONG VÀ TƯ TƯỞNG:\n`;
  // Include first 3-4 chapters thoroughly (worldbuilding, voice, setting)
  const initialChapters = chapters.slice(0, 4);
  initialChapters.forEach(ch => {
    const snippet = ch.text.slice(0, 4500);
    sampledContent += `\n--- [${ch.title}] ---\n${snippet}\n`;
  });

  // Include samples from middle sections (pacing, style progression)
  if (chapters.length > 5) {
    const midIdx = Math.floor(chapters.length / 2);
    const midChapters = chapters.slice(midIdx, midIdx + 3);
    midChapters.forEach(ch => {
      const snippet = ch.text.slice(0, 3500);
      sampledContent += `\n--- [${ch.title}] ---\n${snippet}\n`;
    });
  }

  // Include pen-ultimate reflections (avoiding final surprise ending, focusing on themes)
  if (chapters.length > 8) {
    const lateChapter = chapters[chapters.length - 2];
    if (lateChapter) {
      const snippet = lateChapter.text.slice(0, 3000);
      sampledContent += `\n--- [Đoạn trích gần kết: ${lateChapter.title}] ---\n${snippet}\n`;
    }
  }

  const bookId = 'book_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  return {
    id: bookId,
    fileName: file.name,
    title,
    author,
    description,
    coverDataUrl,
    language,
    publisher,
    totalWords,
    totalChapters: chapters.length,
    chapters,
    fullTextSample: sampledContent,
  };
}
