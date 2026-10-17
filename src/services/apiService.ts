import { loadKeys } from './apiKeys';
import { EpubBookData, BookReview, ReviewScore, CommunityReviewsData, CharacterProfile } from '../types';

/**
 * Strips raw AI markdown asterisks and hash markers
 */
export function sanitizeReviewText(text: string): string {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/^\s*\*\s+/gm, '• ')
    .replace(/`{1,3}/g, '')
    .replace(/\n{4,}/g, '\n\n')
    .trim();
}

/**
 * Clean review data structure to guarantee no AI marks
 */
function sanitizeReviewObject(review: BookReview): BookReview {
  return {
    ...review,
    tagline: sanitizeReviewText(review.tagline),
    overview: sanitizeReviewText(review.overview),
    narrativeStyle: sanitizeReviewText(review.narrativeStyle),
    characterDepth: sanitizeReviewText(review.characterDepth),
    readingVerdict: sanitizeReviewText(review.readingVerdict),
    targetAudience: sanitizeReviewText(review.targetAudience),
    fullEditorialReview: sanitizeReviewText(review.fullEditorialReview),
    coreThemes: (review.coreThemes || []).map(sanitizeReviewText),
    strengths: (review.strengths || []).map(sanitizeReviewText),
    limitations: (review.limitations || []).map(sanitizeReviewText),
    subGenres: (review.subGenres || []).map(sanitizeReviewText),
    characters: Array.isArray(review.characters)
      ? review.characters.map(c => ({
          name: sanitizeReviewText(c.name),
          role: sanitizeReviewText(c.role),
          personality: sanitizeReviewText(c.personality),
          description: sanitizeReviewText(c.description),
        }))
      : undefined,
    scoreBreakdown: (review.scoreBreakdown || []).map(s => ({
      ...s,
      category: sanitizeReviewText(s.category),
      comment: sanitizeReviewText(s.comment),
    })),
    communityReviews: review.communityReviews
      ? {
          ...review.communityReviews,
          summary: sanitizeReviewText(review.communityReviews.summary || ''),
          ratings: (review.communityReviews.ratings || []).map(r => ({
            ...r,
            platform: sanitizeReviewText(r.platform),
            score: sanitizeReviewText(r.score),
            count: r.count ? sanitizeReviewText(r.count) : undefined,
          })),
          realQuotes: (review.communityReviews.realQuotes || []).map(q => ({
            ...q,
            source: sanitizeReviewText(q.source),
            text: sanitizeReviewText(q.text),
          })),
        }
      : undefined,
  };
}

/**
 * Normalizes and validates the review object structure
 */
function validateAndNormalizeReview(book: EpubBookData, data: Record<string, unknown>): BookReview {
  const scores: ReviewScore[] = Array.isArray(data.scoreBreakdown)
    ? data.scoreBreakdown.map((s: Record<string, unknown>) => ({
        category: String(s.category || 'Tiêu chí đánh giá'),
        score: Number(s.score) || 8.5,
        comment: String(s.comment || ''),
      }))
    : [
        { category: 'Cốt truyện & Khung bối cảnh', score: 9.0, comment: 'Bố cục thế giới ấn tượng, lớp lang sâu sắc.' },
        { category: 'Văn phong & Ngôn từ', score: 8.8, comment: 'Ngôn từ giàu tính tạo hình, mượt mà và gợi cảm.' },
        { category: 'Chiều sâu tâm lý nhân vật', score: 8.9, comment: 'Tâm lý nhân vật có chiều sâu và độ đa diện cao.' },
        { category: 'Thông điệp & Triết lý', score: 9.2, comment: 'Đọng lại nhiều trăn trở sâu sắc cho độc giả.' },
        { category: 'Nhịp điệu & Trải nghiệm đọc', score: 8.7, comment: 'Lôi cuốn, nhịp trần thuật vừa vặn.' },
      ];

  const fullEditorial = String(data.fullEditorialReview || data.overview || 'Bài review chi tiết.');
  const words = fullEditorial.split(/\s+/).filter(Boolean).length;

  const validVerdicts: BookReview['verdict'][] = [
    'Tuyệt tác phải đọc',
    'Rất đáng đọc',
    'Đáng cân nhắc theo gu',
    'Chỉ dành cho độc giả chuyên sâu',
  ];
  let verdict: BookReview['verdict'] = 'Rất đáng đọc';
  if (validVerdicts.includes(data.verdict as BookReview['verdict'])) {
    verdict = data.verdict as BookReview['verdict'];
  }

  // Parse characters profile
  const characters: CharacterProfile[] = Array.isArray(data.characters)
    ? data.characters.map((c: Record<string, unknown>) => ({
        name: String(c.name || 'Nhân vật'),
        role: String(c.role || 'Nhân vật trọng tâm'),
        personality: String(c.personality || 'Đa diện, chiều sâu tâm lý phong phú'),
        description: String(c.description || ''),
      }))
    : [];

  // Đánh giá cộng đồng: chỉ nhận dữ liệu do server tìm bằng Google Search (có status).
  // Không có status = model tự viết -> bỏ, tránh hiển thị dữ liệu bịa.
  let communityReviews: CommunityReviewsData | undefined = undefined;
  if (data.communityReviews && typeof data.communityReviews === 'object') {
    const raw = data.communityReviews as Record<string, unknown>;
    const status = raw.status === 'found' || raw.status === 'none' || raw.status === 'error' ? raw.status : undefined;
    if (status) {
      const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
      communityReviews = {
        status,
        ratings: arr<Record<string, unknown>>(raw.ratings).map(r => ({
          platform: String(r.platform || ''),
          score: String(r.score || ''),
          count: r.count ? String(r.count) : undefined,
          url: r.url ? String(r.url) : undefined,
        })),
        summary: raw.summary ? String(raw.summary) : '',
        realQuotes: arr<Record<string, unknown>>(raw.realQuotes).map(q => ({
          source: String(q.source || 'Độc giả'),
          text: String(q.text || ''),
          language: q.language ? String(q.language) : undefined,
          url: q.url ? String(q.url) : undefined,
        })),
        sources: arr<Record<string, unknown>>(raw.sources).map(x => ({
          title: String(x.title || ''),
          url: String(x.url || ''),
        })),
        searchQueries: arr<unknown>(raw.searchQueries).map(String),
        searchedAt: Number(raw.searchedAt) || Date.now(),
      };
    }
  }

  const review: BookReview = {
    genre: String(data.genre || 'Văn học & Tư tưởng'),
    subGenres: Array.isArray(data.subGenres) ? data.subGenres.map(String) : ['Tiểu thuyết', 'Tâm lý xã hội'],
    overallScore: Math.min(10, Math.max(1, Number(data.overallScore) || 8.9)),
    verdict,
    tagline: String(data.tagline || `Khám phá chiều sâu tư tưởng và nghệ thuật của tác phẩm ${book.title}.`),
    targetAudience: String(data.targetAudience || 'Độc giả yêu thích những tác phẩm có chiều sâu tư tưởng và cảm xúc.'),
    estimatedReadTime: String(data.estimatedReadTime || `${Math.max(1, Math.round(book.totalWords / 250 / 60))} giờ đọc`),
    overview: String(data.overview || 'Tác phẩm mở ra một không gian văn học độc đáo với những xung đột đa diện.'),
    coreThemes: Array.isArray(data.coreThemes)
      ? data.coreThemes.map(String)
      : ['Bản ngã và xã hội', 'Ý nghĩa của sự tồn tại', 'Những lựa chọn số phận'],
    characters: characters.length > 0 ? characters : undefined,
    narrativeStyle: String(data.narrativeStyle || 'Văn phong tinh tế, nhịp điệu uyển chuyển và giàu chất suy tưởng.'),
    characterDepth: String(data.characterDepth || 'Các nhân vật được xây dựng với diễn biến tâm lý phức hợp, chân thực.'),
    strengths: Array.isArray(data.strengths)
      ? data.strengths.map(String)
      : ['Ý niệm sâu sắc', 'Không khí trần thuật cuốn hút', 'Ngôn từ giàu biểu cảm'],
    limitations: Array.isArray(data.limitations)
      ? data.limitations.map(String)
      : ['Đòi hỏi sự tĩnh tại để cảm nhận trọn vẹn lớp tư tưởng sâu kín'],
    scoreBreakdown: scores,
    communityReviews,
    readingVerdict: String(
      data.readingVerdict ||
        `Đây là một tác phẩm rất đáng đọc dành cho những ai tìm kiếm trải nghiệm văn chương đong đầy suy ngẫm.`
    ),
    fullEditorialReview: fullEditorial,
    wordCount: words,
  };

  return sanitizeReviewObject(review);
}

/**
 * Call /api/review (gửi kèm API key của người dùng, server xoay vòng giữa các key)
 */
async function callServerSideReviewApi(book: EpubBookData, targetWordCount: number): Promise<BookReview> {
  const rotatingApiKeys = loadKeys();
  if (rotatingApiKeys.length === 0) {
    throw new Error('Bạn chưa thêm API key. Bấm nút "API" trên thanh menu để thêm key Gemini.');
  }

  const payload = {
    rotatingApiKeys,
    book: {
      id: book.id,
      title: book.title,
      author: book.author,
      language: book.language,
      totalWords: book.totalWords,
      totalChapters: book.totalChapters,
      fileName: book.fileName,
      description: book.description,
    },
    contentSample: book.fullTextSample,
    targetWordCount: targetWordCount || 3500,
  };

  const response = await fetch('/api/review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Máy chủ phản hồi mã lỗi HTTP ${response.status}`);
  }

  const data = await response.json();
  const review = data.review;

  if (!review) {
    throw new Error('Dữ liệu review trả về từ máy chủ không hợp lệ.');
  }

  return validateAndNormalizeReview(book, review);
}

/**
 * Generate Book Review
 */
export async function generateBookReview(
  book: EpubBookData,
  targetWordCount: number,
  onStatusUpdate?: (status: string) => void
): Promise<{ review: BookReview }> {
  onStatusUpdate?.('Đang đọc sách, phân tích nhân vật và tra cứu đánh giá thực tế...');
  const review = await callServerSideReviewApi(book, targetWordCount);
  return { review };
}
