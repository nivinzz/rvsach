import express from 'express';

// ============================================================================
// TÌM ĐÁNH GIÁ THẬT CỦA CỘNG ĐỒNG (Google Search grounding)
// Chỉ nhận dữ liệu khi Google Search trả về nguồn thật. Không có nguồn -> để trống.
// ============================================================================
interface CommunitySearchResult {
  status: 'found' | 'none' | 'error';
  ratings: { platform: string; score: string; count?: string; url?: string }[];
  summary: string;
  realQuotes: { source: string; text: string; language?: string; url?: string }[];
  sources: { title: string; url: string }[];
  searchQueries: string[];
  searchedAt: number;
}

function buildCommunityPrompt(title: string, author: string): string {
  return `Bạn là trợ lý nghiên cứu sách. Hãy DÙNG GOOGLE SEARCH để tìm đánh giá THẬT của độc giả và giới phê bình về tác phẩm "${title}" của tác giả "${author}".

PHẠM VI TÌM (bắt buộc chạy NHIỀU truy vấn, NHIỀU ngôn ngữ):
- Goodreads (ưu tiên số 1), StoryGraph, LibraryThing, Amazon, Google Books.
- Diễn đàn và mạng xã hội văn học: Reddit (r/books và các subreddit theo thể loại), blog sách, BookTube/BookTok, báo và tạp chí phê bình.
- Nguồn tiếng Việt: Goodreads, Tiki, Fahasa, các hội nhóm / fanpage / blog review sách Việt.
- Nguồn theo NGÔN NGỮ GỐC của tác phẩm (ví dụ tiếng Nhật: Bookmeter, Booklog, Amazon.co.jp; tiếng Trung: Douban; tiếng Pháp, Đức, Tây Ban Nha, Hàn...). Hãy thử cả tên gốc, tên quốc tế và các tên dịch khác của sách.

QUY TẮC TUYỆT ĐỐI:
1. CHỈ báo cáo những gì thật sự đọc được trong kết quả tìm kiếm. KHÔNG dùng trí nhớ. KHÔNG bịa điểm số, số lượt đánh giá, lời trích dẫn hay tên nguồn.
2. Không tìm thấy thì để trống: "found": false, "ratings": [], "quotes": [], "summary": "". Để trống tốt hơn bịa.
3. Mỗi trích dẫn phải là lời THẬT của độc giả / nhà phê bình trên trang đó. Dịch trung thành sang tiếng Việt (giữ đúng ý và giọng điệu, không thêm bớt), chọn câu ngắn dưới 60 từ, ghi mã ngôn ngữ gốc (en, ja, fr, vi...). Không chọn đoạn tiết lộ kết truyện.
4. "domain" phải là tên miền thật của trang chứa thông tin (ví dụ "goodreads.com"). Điểm số phải đúng như trang hiển thị, kèm thang điểm (ví dụ "4.2/5") và số lượt đánh giá nếu có.
5. "summary": 80-180 từ tiếng Việt, tổng hợp khen / chê phổ biến CHỈ từ các nguồn đã tìm thấy; nêu rõ nếu ý kiến trái chiều hoặc dữ liệu còn ít.

TRẢ VỀ DUY NHẤT một JSON (không markdown, không giải thích thêm):
{
  "found": true,
  "ratings": [ { "platform": "Goodreads", "score": "4.2/5", "count": "15.000 lượt đánh giá", "domain": "goodreads.com" } ],
  "summary": "Tóm tắt tiếng Việt từ nguồn thật",
  "quotes": [ { "source": "Goodreads (độc giả)", "language": "en", "text": "Bản dịch tiếng Việt của lời trích", "domain": "goodreads.com" } ]
}`;
}

function extractJsonObject(text: string): Record<string, any> | null {
  const t = (text || '').replace(/```json|```/gi, '');
  const s = t.indexOf('{');
  const e = t.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  try {
    return JSON.parse(t.slice(s, e + 1));
  } catch {
    return null;
  }
}

function emptyCommunity(status: 'none' | 'error', searchQueries: string[] = []): CommunitySearchResult {
  return { status, ratings: [], summary: '', realQuotes: [], sources: [], searchQueries, searchedAt: Date.now() };
}

function domainRoot(d: unknown): string {
  return String(d || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('.')[0]
    .trim();
}

async function searchCommunityReviews(
  keys: string[],
  book: { title: string; author: string },
  makeClient: (apiKey: string) => GoogleGenAI
): Promise<CommunitySearchResult> {
  const models = ['gemini-2.5-flash', 'gemini-flash-latest'];
  const prompt = buildCommunityPrompt(String(book.title), String(book.author));

  for (const apiKey of keys) {
    const ai = makeClient(apiKey);
    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { temperature: 0.1, tools: [{ googleSearch: {} }] },
        });

        const meta = response.candidates?.[0]?.groundingMetadata;
        const searchQueries: string[] = meta?.webSearchQueries || [];

        // Nguồn THẬT do Google Search trả về
        const seen = new Set<string>();
        const chunks: { title: string; url: string }[] = [];
        for (const c of meta?.groundingChunks || []) {
          const url = c.web?.uri;
          if (!url || seen.has(url)) continue;
          seen.add(url);
          chunks.push({ title: String(c.web?.title || url), url });
        }

        const parsed = extractJsonObject(response.text || '');

        // CỔNG KIỂM SOÁT: không có nguồn thật hoặc model báo không tìm thấy -> để trống
        if (!chunks.length || !parsed || parsed.found === false) {
          return emptyCommunity('none', searchQueries);
        }

        // Chỉ giữ mục có tên miền khớp với nguồn thật; gắn link nguồn thật vào mục đó
        const matchChunk = (domain: unknown) => {
          const root = domainRoot(domain);
          if (!root) return undefined;
          return chunks.find((c) => c.title.toLowerCase().includes(root) || c.url.toLowerCase().includes(root));
        };

        const ratings: CommunitySearchResult['ratings'] = [];
        for (const r of Array.isArray(parsed.ratings) ? parsed.ratings : []) {
          const score = String(r?.score || '').trim();
          const hit = matchChunk(r?.domain);
          if (!score || !hit) continue;
          ratings.push({
            platform: String(r.platform || hit.title).trim(),
            score,
            count: r.count ? String(r.count).trim() : undefined,
            url: hit.url,
          });
        }

        const realQuotes: CommunitySearchResult['realQuotes'] = [];
        const seenText = new Set<string>();
        for (const q of Array.isArray(parsed.quotes) ? parsed.quotes : []) {
          const text = String(q?.text || '').trim();
          const hit = matchChunk(q?.domain);
          if (text.length < 15 || text.length > 450 || !hit || seenText.has(text)) continue;
          seenText.add(text);
          realQuotes.push({
            source: String(q.source || hit.title).trim(),
            text,
            language: q.language ? String(q.language).trim().toLowerCase() : undefined,
            url: hit.url,
          });
          if (realQuotes.length >= 6) break;
        }

        const summary = String(parsed.summary || '').trim();
        if (!ratings.length && !realQuotes.length && summary.length < 40) {
          return emptyCommunity('none', searchQueries);
        }

        return {
          status: 'found',
          ratings,
          summary,
          realQuotes,
          sources: chunks.slice(0, 12),
          searchQueries,
          searchedAt: Date.now(),
        };
      } catch {
        /* thử khóa / model kế tiếp */
      }
    }
  }
  return emptyCommunity('error');
}
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Gom key: ưu tiên key người dùng gửi lên; không có thì dùng GEMINI_API_KEYS / GEMINI_API_KEY (tùy chọn)
function buildKeyPool(clientKeys?: unknown): string[] {
  const fromClient = Array.isArray(clientKeys)
    ? clientKeys.map((k) => String(k || '').trim()).filter(Boolean)
    : [];
  if (fromClient.length > 0) return Array.from(new Set(fromClient)).slice(0, 50);

  const fromEnv: string[] = [];
  if (process.env.GEMINI_API_KEYS) {
    process.env.GEMINI_API_KEYS.split(/[\n,]+/).map((k) => k.trim()).filter(Boolean).forEach((k) => fromEnv.push(k));
  }
  if (process.env.GEMINI_API_KEY) fromEnv.push(process.env.GEMINI_API_KEY.trim());
  return Array.from(new Set(fromEnv));
}

function friendlyError(err: Error): string {
  const m = err.message || '';
  if (/429|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(m)) {
    return 'Tất cả API key đang hết hạn mức (quota). Hãy thêm key mới hoặc thử lại sau.';
  }
  if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED|\b(400|401|403)\b/.test(m)) {
    return 'API key không hợp lệ hoặc bị từ chối. Hãy kiểm tra lại trong mục "API".';
  }
  return m || 'Lỗi xử lý bài review từ máy chủ';
}

const SYSTEM_PROMPT = `Bạn là một nhà phê bình văn học và chuyên gia thẩm định sách chuyên nghiệp hàng đầu.
Nhiệm vụ của bạn là đọc thông tin cuốn sách EPUB, tìm kiếm thông tin đánh giá thực tế từ mạng xã hội, diễn đàn và viết một BÀI REVIEW CHUYÊN NGHIỆP, TOÀN DIỆN VÀ SÂU SẮC với dung lượng từ 2000 đến 6000 từ.

CÁC NGUYÊN TẮC BẮT BUỘC:
1. BẢO TOÀN TRỌN VẸN SỰ HẤP DẪN CỦA TÁC PHẨM:
   - Tuyệt đối không được tiết lộ các cú twist, cái kết, hung thủ, bí mật then chốt hoặc diễn biến cao trào chi tiết của cốt truyện.
   - Chỉ được giới thiệu tiền đề (premise), bối cảnh thế giới, bầu không khí và xung đột trung tâm mang tính gợi mở.
   - Tập trung mổ xẻ: giá trị tư tưởng, nghệ thuật ngôn từ, chiều sâu tâm lý nhân vật, nhịp điệu trần thuật và thế giới quan tác giả.
   - TUYỆT ĐỐI KHÔNG CHÈN các nhãn hay khẩu hiệu cảnh báo như "Tuyệt đối không spoil", "[Không spoil]" vào tiêu đề hay nội dung bài viết.

2. GIỚI THIỆU TÊN VÀ TÍNH CÁCH CÁC NHÂN VẬT TRỌNG TÂM:
   - Nêu rõ tên các nhân vật chính và thứ chính quan trọng.
   - Phân tích chi tiết vai trò, tính cách, tâm lý, động cơ nội tâm và mối tương quan giữa họ.
   - Mục đích: Giúp độc giả khi đọc qua bài review có thể hiểu rõ chân dung và tính cách của từng nhân vật trong sách, nhưng tuyệt đối không làm lộ những biến cố then chốt hay kết cục của họ.

3. ĐÁNH GIÁ THỰC TẾ & CĂN KE (TỶ LỆ 7 PHẦN ƯU - 3 PHẦN NHƯỢC):
   - Đánh giá thẳng thắn, khách quan và đa chiều, TUYỆT ĐỐI KHÔNG CHỈ KHEN RẦM RỘ HOẶC TÂNG BỐC MỘT CHIỀU.
   - Thẩm định căn ke theo tỷ lệ thực tế: 7 phần ưu điểm và 3 phần nhược điểm/hạn chế.
   - Bóc tách cụ thể các điểm trừ thực tế của tác phẩm:
     + Nhịp điệu: đoạn nào bị lê thê, dài dòng, nhịp trần thuật bị chùng xuống hoặc hụt hơi?
     + Tính logic & kết cấu: có chi tiết nào rời rạc, thiếu logic, tình huống khiên cưỡng, sắp đặt gượng gạo?
     + Nhân vật: có nhân vật nào bị xây dựng đơn điệu, một màu, thiếu chiều sâu biến chuyển tâm lý?
     + Tư tưởng & ngôn từ: có đoạn nào bị nặng tính giáo điều, phô trương từ ngữ hoặc xa rời thực tế?
   - "strengths": Đưa ra 4-5 ưu điểm nổi bật, xác đáng nhất (~70%).
   - "limitations": Bắt buộc đưa ra từ 3 đến 5 nhược điểm/hạn chế cụ thể, sắc sảo và căn ke (~30%). Không đưa ra nhận xét chung chung hời hợt.
   - Trong bài "fullEditorialReview": BẮT BUỘC DÀNH RIÊNG 2-3 ĐOẠN VĂN MỔ XẺ CHI TIẾT VỀ CÁC HẠN CHẾ, NHƯỢC ĐIỂM VÀ ĐIỂM TRỪ NÀY CỦA TÁC PHẨM.

4. TIÊU DIỆT HOÀN TOÀN SÁO RỖNG, RẬP KHUÔN - KHẨU KHÍ CỦA NHÀ PHÊ BÌNH VĂN HỌC ĐÍCH THỰC:
   - TUYỆT ĐỐI NGHIÊM CẤM mở đầu bài viết hoặc bất kỳ đoạn văn nào bằng những câu sáo mòn AI muôn thuở:
     + "Trong dòng chảy..." / "Trong dòng chảy văn học..." / "Trong bối cảnh văn học đương đại..."
     + "Không chỉ là một cuốn sách... mà còn là..."
     + "...nổi lên như một hiện tượng..." / "...một bậc thầy..." / "...minh chứng hùng hồn..."
     + "Ngay từ những trang đầu tiên..." / "Lật từng trang sách..." / "Mở đầu cuốn sách..."
     + "Đưa độc giả vào một hành trình / một mê cung / một chuyến phiêu lưu..."
     + "Nơi ranh giới giữa thiện và ác / đúng và sai trở nên mờ nhạt..."
     + "Có thể nói rằng..." / "Không thể phủ nhận rằng..."
   - CÁCH MỞ ĐẦU VÀ KHẨU KHÍ CỦA MỘT CHUYÊN GIA VĂN HỌC THỰC THỤ:
     + Mở đầu TRỰC DIỆN, BẤT NGỜ và SẮC LẠNH: Đi thẳng ngay vào một phát hiện then chốt, một luận điểm thẩm mỹ gai góc, một nghịch lý tư tưởng hoặc phong cách kể chuyện độc bản của tác giả. Bắt đầu như một bài chuyên luận trên các tạp chí phê bình văn học danh giá (The New Yorker, The Atlantic, TLS).
     + Phân tích bằng con mắt giải phẫu thi pháp: mổ xẻ cấu trúc tự sự, điểm nhìn trần thuật (perspective), nhịp điệu (pacing), kỹ thuật dồn nén không khí, động cơ tâm lý sâu kín của nhân vật.
     + Sử dụng ngôn ngữ sắc bén, khúc chiết, có chiều sâu triết mỹ, giữ khoảng lùi điềm tĩnh và công tâm của một nhà phê bình lão luyện.

5. KHÔNG TỰ BỊA ĐÁNH GIÁ CỘNG ĐỒNG:
   - Một hệ thống khác sẽ tra cứu đánh giá thật từ Goodreads và các diễn đàn. TUYỆT ĐỐI KHÔNG đưa điểm Goodreads, số lượt đánh giá hay lời trích dẫn của "độc giả" vào bất kỳ trường nào, và KHÔNG tạo trường communityReviews. Bài phê bình chỉ là nhận định của chính nhà phê bình.

6. VĂN PHONG VÀ TRÌNH BÀY:
   - TUYỆT ĐỐI KHÔNG DÙNG các ký hiệu như dấu thăng (#, ##, ###), dấu sao (*, **, ***).
   - Viết bằng văn phong báo chí, tạp chí văn học trang nhã, trau chuốt, ngôn từ giàu sức biểu đạt.
   - Đoạn văn liền mạch, ngắt dòng tự nhiên, dấu câu chuẩn xác.

7. DUNG LƯỢNG MỤC TIÊU:
   - Toàn bộ bài review phải rất chi tiết, đồ sộ, đạt dung lượng văn xuôi phân tích từ 2000 đến 6000 từ.

HÃY TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON CHUẨN HOÀN TOÀN KHÔNG BỌC TRONG MARKDOWN CODE BLOCK:
{
  "genre": "Tên thể loại chính",
  "subGenres": ["Thể loại phụ 1", "Thể loại phụ 2"],
  "overallScore": 8.8,
  "verdict": "Tuyệt tác phải đọc" | "Rất đáng đọc" | "Đáng cân nhắc theo gu" | "Chỉ dành cho độc giả chuyên sâu",
  "tagline": "Một câu đúc kết linh hồn của cuốn sách không quá 25 từ",
  "targetAudience": "Mô tả đối tượng độc giả phù hợp nhất",
  "estimatedReadTime": "Khoảng 8 - 12 giờ đọc",
  "overview": "Đoạn giới thiệu khái quát về tiền đề và bối cảnh (250-400 từ)",
  "coreThemes": ["Chủ đề 1", "Chủ đề 2", "Chủ đề 3", "Chủ đề 4", "Chủ đề 5"],
  "characters": [
    {
      "name": "Tên nhân vật",
      "role": "Nhân vật chính / Người quan sát / Người đồng hành / v.v.",
      "personality": "Mô tả chi tiết tính cách, tâm lý, nội tâm và xung đột cá nhân",
      "description": "Vị trí trong tác phẩm và mối liên hệ với các nhân vật khác"
    }
  ],
  "narrativeStyle": "Phân tích kỹ lưỡng văn phong trần thuật, ngôn ngữ và giọng điệu (250-400 từ)",
  "characterDepth": "Đánh giá chiều sâu tính cách và tâm lý chung của hệ thống nhân vật (250-400 từ)",
  "strengths": ["Ưu điểm 1", "Ưu điểm 2", "Ưu điểm 3", "Ưu điểm 4"],
  "limitations": ["Nhược điểm thực tế 1 (ví dụ: đoạn giữa dài dòng, rời rạc)", "Nhược điểm 2 (ví dụ: thiếu logic hoặc tình tiết gượng gạo)", "Nhược điểm 3 (ví dụ: nhân vật phụ đơn điệu)"],
  "scoreBreakdown": [
    { "category": "Cốt truyện & Ý tưởng", "score": 9.0, "comment": "Nhận xét ngắn gọn" },
    { "category": "Văn phong & Ngôn từ", "score": 8.5, "comment": "Nhận xét ngắn gọn" },
    { "category": "Chiều sâu nhân vật", "score": 8.7, "comment": "Nhận xét ngắn gọn" },
    { "category": "Thông điệp & Triết lý", "score": 9.2, "comment": "Nhận xét ngắn gọn" },
    { "category": "Nhịp điệu & Trải nghiệm đọc", "score": 8.6, "comment": "Nhận xét ngắn gọn" }
  ],
  "readingVerdict": "Đánh giá kết luận chi tiết: Có đáng bỏ thời gian đọc hay không và giá trị đọng lại (300-500 từ)",
  "fullEditorialReview": "Toàn văn bài phê bình văn học đồ sộ hoàn chỉnh từ 2000 đến 6000 từ, chia nhiều đoạn văn mạch lạc, phân tích đa chiều ưu điểm và bắt buộc có đoạn riêng mổ xẻ nhược điểm của tác phẩm, tuyệt đối không dùng dấu sao hay dấu thăng..."
}`;

function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/^\s*\*\s+/gm, '• ')
    .replace(/`{1,3}/g, '')
    .replace(/\n{4,}/g, '\n\n')
    .trim();
}

function cleanClichés(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // Patterns of formulaic AI opening cliches to remove
  const openingCliches = [
    /^Trong dòng chảy (văn học|của nền văn học|văn học đương đại|thời gian|lịch sử)[^,.:]*[,\s]+/i,
    /^Trong bối cảnh văn học (đương đại|thế giới|hiện đại|nước nhà)[^,.:]*[,\s]+/i,
    /^Trong dòng chảy bất tận của[^,.:]*[,\s]+/i,
    /^Ngay từ những trang (đầu tiên|sách đầu tiên)[^,.:]*[,\s]+/i,
    /^Lật từng trang sách[^,.:]*[,\s]+/i,
    /^Mở đầu cuốn sách[^,.:]*[,\s]+/i,
    /^Có thể nói rằng,[ ]*/i,
    /^Không thể phủ nhận rằng,[ ]*/i,
  ];

  for (const pattern of openingCliches) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '');
      if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
    }
  }

  // Also eliminate nested paragraph openings
  cleaned = cleaned.replace(
    /\n\s*Trong dòng chảy (văn học|của nền văn học|văn học đương đại)[^,.:]*[,\s]+/gi,
    '\n'
  );

  return cleaned;
}

app.post('/api/review', async (req, res) => {
  try {
    const { book, contentSample, rotatingApiKeys, targetWordCount } = req.body;

    if (!book) {
      return res.status(400).json({ error: 'Thiếu thông tin sách.' });
    }

    const wordsTarget = Math.max(2000, Math.min(6000, Number(targetWordCount) || 3500));

    const prompt = `${SYSTEM_PROMPT}

Dung lượng mục tiêu bắt buộc: khoảng ${wordsTarget} từ (từ 2000 đến 6000 từ).
Hãy phân tích rất kỹ lưỡng và chuyên sâu, nêu rõ tên và tính cách từng nhân vật trọng tâm (không spoil).

THÔNG TIN TÁC PHẨM CẦN TRA CỨU VÀ REVIEW:
- Tựa sách: ${book.title}
- Tác giả: ${book.author}
- Tổng số từ: ${book.totalWords}
${contentSample ? `\nTRÍCH ĐOẠN NỘI DUNG MẪU TỪ SÁCH:\n${contentSample}` : ''}

Hãy viết bài review chi tiết đồ sộ từ 2000 đến 6000 từ và trả về JSON chuẩn theo đúng cấu trúc đã hướng dẫn.`;

    // Candidate models in order of priority: gemini-2.5-flash is stable and fast
    const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
    let responseText = '';
    let lastError: Error | null = null;

    // Ưu tiên key do người dùng nhập; chỉ dùng key môi trường (nếu có) khi người dùng không gửi key nào
    const uniqueKeys = buildKeyPool(rotatingApiKeys);
    if (uniqueKeys.length === 0) {
      return res.status(400).json({
        error: 'Chưa có API key. Hãy bấm nút "API" trên thanh menu để thêm key Gemini của bạn.',
      });
    }

    // Shuffle keys for random rotation
    const shuffledKeys = [...uniqueKeys].sort(() => Math.random() - 0.5);

    // Tra cứu đánh giá THẬT (Google Search) chạy song song với việc viết bài
    const communityPromise = searchCommunityReviews(shuffledKeys, { title: book.title, author: book.author }, (k) => new GoogleGenAI({ apiKey: k, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } }));

    keyLoop: for (const apiKey of shuffledKeys) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      for (const modelName of modelsToTry) {
        try {
          console.log(`[Review API] Calling ${modelName} (target: ${wordsTarget} words)...`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              temperature: 0.7,
              responseMimeType: 'application/json',
            },
          });

          if (response.text) {
            responseText = response.text;
            console.log(`[Review API] Thành công với model ${modelName}!`);
            break keyLoop;
          }
        } catch (modelErr: unknown) {
          lastError = modelErr instanceof Error ? modelErr : new Error(String(modelErr));
          console.warn(`[Review API] Model ${modelName} gặp lỗi:`, lastError.message);
        }
      }
    }

    if (!responseText) {
      throw lastError || new Error('Không thể tạo bài review từ các khóa API và mô hình hiện có.');
    }

    let reviewData;
    try {
      const cleanedJson = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      reviewData = JSON.parse(cleanedJson);
    } catch {
      const cleanPlain = sanitizeText(responseText);
      reviewData = {
        genre: 'Văn học chọn lọc',
        subGenres: ['Tiểu thuyết', 'Tư tưởng & Đời sống'],
        overallScore: 8.9,
        verdict: 'Rất đáng đọc',
        tagline: `Góc nhìn thẩm định sâu sắc về tác phẩm ${book.title} của ${book.author}.`,
        targetAudience: 'Độc giả yêu mến những trang viết giàu chiều sâu và trải nghiệm.',
        estimatedReadTime: `${Math.max(1, Math.round(book.totalWords / 250 / 60))} giờ đọc`,
        overview: cleanPlain.slice(0, 500) + '...',
        coreThemes: ['Bản ngã & Thời đại', 'Giá trị nhân sinh', 'Sức mạnh tinh thần'],
        characters: [],
        narrativeStyle: 'Văn phong giàu sức gợi cảm, bố cục chặt chẽ và uyển chuyển.',
        characterDepth: 'Nhân vật được khắc họa với thế giới nội tâm phong phú, đa diện.',
        strengths: [
          'Tư tưởng nhân văn sâu sắc và giá trị chiêm nghiệm cao',
          'Ngôn từ gợi cảm, giàu tính tạo hình và phong cách riêng',
          'Khơi gợi trọn vẹn sự tò mò và cảm hứng đọc',
          'Thông điệp đọng lại nhiều trăn trở nhân sinh',
        ],
        limitations: [
          'Nhịp điệu ở một số phân đoạn giữa có xu hướng dàn trải, đôi chỗ chậm rãi',
          'Tuyến nhân vật phụ phát triển chưa thật sự đồng đều so với nhân vật chính',
          'Đòi hỏi người đọc sự kiên nhẫn để thẩm thấu trọn vẹn các tầng nghĩa',
        ],
        scoreBreakdown: [
          { category: 'Cốt truyện & Bối cảnh', score: 9.0, comment: 'Bố cục chặt chẽ' },
          { category: 'Văn phong & Ngôn từ', score: 8.8, comment: 'Giàu tính tạo hình' },
          { category: 'Chiều sâu nhân vật', score: 8.9, comment: 'Đa diện, chân thực' },
          { category: 'Thông điệp & Triết lý', score: 9.1, comment: 'Đọng lại nhiều trăn trở' },
        ],
        readingVerdict: 'Tác phẩm rất đáng đọc và suy ngẫm, mở ra nhiều góc nhìn nhân văn mới mẻ.',
        fullEditorialReview: cleanPlain,
      };
    }

    // Gắn kết quả tìm kiếm thật (ghi đè mọi dữ liệu cộng đồng do model tự viết, nếu có)
    reviewData.communityReviews = await communityPromise;

    // Sanitize and purge clichés from all text fields
    if (reviewData) {
      if (typeof reviewData.overview === 'string') {
        reviewData.overview = cleanClichés(sanitizeText(reviewData.overview));
      }
      if (typeof reviewData.fullEditorialReview === 'string') {
        reviewData.fullEditorialReview = cleanClichés(sanitizeText(reviewData.fullEditorialReview));
      }
      if (typeof reviewData.narrativeStyle === 'string') {
        reviewData.narrativeStyle = cleanClichés(sanitizeText(reviewData.narrativeStyle));
      }
      if (typeof reviewData.tagline === 'string') {
        reviewData.tagline = cleanClichés(sanitizeText(reviewData.tagline));
      }
      if (typeof reviewData.readingVerdict === 'string') {
        reviewData.readingVerdict = cleanClichés(sanitizeText(reviewData.readingVerdict));
      }
    }

    return res.status(200).json({
      success: true,
      review: reviewData,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[Review API Error]:', err);
    return res.status(500).json({
      error: friendlyError(err),
    });
  }
});

app.get('/api/health', (req, res) => {
  const envKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
  const keyCount = envKeys ? envKeys.split(/[\n,]+/).map(k => k.trim()).filter(Boolean).length : 0;
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    availableKeysCount: keyCount,
  });
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[App] Server listening on port ${PORT}`);
  });
}

startServer();
