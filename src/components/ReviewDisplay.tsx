import React, { useState } from 'react';
import { SavedReviewRecord } from '../types';
import {
  formatForSocialMedia,
  formatForBlogspotHtml,
  formatForPlainText,
} from '../services/copyFormatters';
import { downloadReviewCard } from '../services/cardImage';
import {
  Share2,
  Copy,
  Code,
  FileText,
  Printer,
  Check,
  Star,
  Clock,
  BookOpen,
  Award,
  Sparkles,
  Bookmark,
  ChevronDown,
  Quote,
  Layers,
  Heart,
  AlertCircle,
  Users,
  ImageDown,
  Loader2,
  ExternalLink,
  SearchX
} from 'lucide-react';

interface Props {
  record: SavedReviewRecord;
  onBack?: () => void;
  onDelete?: () => void;
}

export const ReviewDisplay: React.FC<Props> = ({ record, onBack, onDelete }) => {
  const { book, review } = record;
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'bento' | 'editorial'>('bento');
  const [isHtmlModalOpen, setIsHtmlModalOpen] = useState(false);
  const [isExportingCard, setIsExportingCard] = useState(false);

  const triggerCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(`Đã sao chép định dạng ${label}!`);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleCopySocial = () => {
    const text = formatForSocialMedia(record);
    triggerCopy(text, 'Mạng Xã Hội');
  };

  const handleCopyBlogspot = () => {
    const html = formatForBlogspotHtml(record);
    triggerCopy(html, 'Blogspot / HTML');
  };

  const handleCopyPlain = () => {
    const text = formatForPlainText(record);
    triggerCopy(text, 'Văn bản thuần');
  };

  const handleDownloadCard = async () => {
    if (isExportingCard) return;
    setIsExportingCard(true);
    try {
      await downloadReviewCard(record);
      setCopyFeedback('Đã tải ảnh thẻ review!');
    } catch (err) {
      console.error(err);
      setCopyFeedback('Không tạo được ảnh thẻ, thử lại nhé!');
    } finally {
      setIsExportingCard(false);
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Color mapping based on score
  const getScoreColor = (score: number) => {
    if (score >= 9) return 'from-purple-700 to-lime-600';
    if (score >= 8) return 'from-purple-600 to-lime-500';
    if (score >= 7) return 'from-purple-500 to-amber-500';
    return 'from-slate-500 to-slate-400';
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-16">
      {/* Toast Notification */}
      {copyFeedback && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-purple-950 text-lime-300 border border-lime-400/40 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300 font-semibold text-sm">
          <Check className="w-4 h-4 text-lime-400" />
          <span>{copyFeedback}</span>
        </div>
      )}

      {/* Action Navigation Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-purple-200/80 shadow-xs no-print">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-900 hover:bg-purple-100 transition cursor-pointer"
            >
              ← Quay lại tủ sách
            </button>
          )}
          <span className="text-xs text-slate-500 font-medium">
            {new Date(record.createdAt).toLocaleDateString('vi-VN')}
          </span>
        </div>

        {/* Copy Buttons in 2-column grid on mobile, flex on desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopySocial}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Định dạng bài đăng Facebook, Threads, Instagram"
          >
            <Share2 className="w-3.5 h-3.5 text-purple-700" />
            <span>Mạng Xã Hội</span>
          </button>

          <button
            onClick={handleCopyBlogspot}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-lime-50 hover:bg-lime-100 text-lime-900 border border-lime-300 text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Định dạng mã HTML có style đẹp sẵn để paste vào Blogspot / WordPress"
          >
            <Code className="w-3.5 h-3.5 text-lime-700" />
            <span>Blogspot / Web</span>
          </button>

          <button
            onClick={handleCopyPlain}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Copy văn bản thuần không có ký tự đặc biệt"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Văn bản thuần</span>
          </button>

          <button
            onClick={handleDownloadCard}
            disabled={isExportingCard}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 disabled:opacity-60 text-white border border-purple-900 text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Tải ảnh thẻ review (bìa, điểm, bảng điểm, nhân vật chính) về máy"
          >
            {isExportingCard ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImageDown className="w-3.5 h-3.5 text-lime-300" />
            )}
            <span>{isExportingCard ? 'Đang tạo ảnh…' : 'Tải ảnh thẻ'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
            title="In hoặc lưu PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In / PDF</span>
          </button>
        </div>
      </div>

      {/* HERO SECTION: Book Cover + Overview + Verdict Card (Poster Grade PDF & Print) */}
      <div className="hero-poster relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-purple-950 via-purple-900 to-lime-950 text-white p-4 sm:p-6 md:p-10 shadow-xl border border-purple-800/40 print:p-7 print:border-purple-600 print:mb-6">
        {/* Subtle decorative circles */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-lime-500/10 blur-3xl pointer-events-none print:hidden" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none print:hidden" />

        <div className="relative z-10 flex flex-col md:flex-row print:flex-row gap-6 md:gap-8 print:gap-8 items-center md:items-start print:items-start">
          {/* Cover Model Container */}
          <div className="shrink-0 flex flex-col items-center print:items-start">
            <div className="relative group">
              {book.coverDataUrl ? (
                <div className="book-cover-container relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 print:border-white/90 transition-transform duration-300 group-hover:scale-[1.02] max-w-[200px] md:max-w-[240px] print:w-[185px] print:max-w-[185px] print:shrink-0">
                  <img
                    src={book.coverDataUrl}
                    alt={book.title}
                    className="book-cover-img w-full h-auto object-cover max-h-[340px] print:max-h-[270px] block relative z-10"
                  />
                  {/* Subtle shine overlay (Hidden in print to avoid Chromium PDF masking bug) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10 pointer-events-none print:hidden" />
                </div>
              ) : (
                /* Fallback stylized book cover */
                <div className="book-cover-container w-48 h-64 md:w-56 md:h-76 print:w-[185px] print:h-[260px] rounded-2xl bg-gradient-to-br from-purple-800 via-purple-900 to-lime-900 border-4 border-lime-400/30 print:border-white/90 p-5 flex flex-col justify-between shadow-2xl relative">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] tracking-widest uppercase font-bold text-lime-300">
                      EPUB REVIEW
                    </span>
                    <Sparkles className="w-4 h-4 text-lime-400" />
                  </div>
                  <div className="text-center my-auto">
                    <h4 className="font-['Be_Vietnam_Pro',sans-serif] text-base md:text-lg font-bold text-white line-clamp-3 leading-snug">
                      {book.title}
                    </h4>
                    <p className="text-xs text-lime-200 mt-2 font-medium line-clamp-1">
                      {book.author}
                    </p>
                  </div>
                  <div className="border-t border-white/15 pt-2 flex justify-between items-center text-[10px] text-purple-200">
                    <span>MatchaBook</span>
                    <span>{review.genre}</span>
                  </div>
                </div>
              )}

              {/* Bookmark rating chip */}
              <div className="score-chip absolute -top-3 -right-3 z-30 bg-gradient-to-r from-lime-500 to-lime-600 text-lime-950 px-3 py-1.5 rounded-full font-black text-sm shadow-lg flex items-center gap-1 border-2 border-white print:border-white print:shadow-none">
                <Star className="w-3.5 h-3.5 fill-lime-950 text-lime-950" />
                <span>{review.overallScore}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] text-purple-200 print:text-purple-100">
              <span className="inline-flex items-center gap-1 bg-white/10 print:bg-white/20 px-2.5 py-1 rounded-full">
                <BookOpen className="w-3 h-3 text-lime-300" />
                {book.totalWords.toLocaleString()} từ
              </span>
              <span className="inline-flex items-center gap-1 bg-white/10 print:bg-white/20 px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3 text-lime-300" />
                {review.estimatedReadTime}
              </span>
            </div>
          </div>

          {/* Book Info & Verdict Header */}
          <div className="flex-1 space-y-4 text-center md:text-left print:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start print:justify-start gap-2">
              <span className="bg-lime-400/20 text-lime-300 border border-lime-400/40 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider print:bg-lime-400/30 print:text-lime-200">
                {review.genre}
              </span>
              {review.subGenres.map((sg, i) => (
                <span
                  key={i}
                  className="bg-purple-800/60 print:bg-purple-800/80 text-purple-200 px-2.5 py-1 rounded-full text-xs"
                >
                  {sg}
                </span>
              ))}
            </div>

            <h1 className="text-2xl md:text-4xl print:text-3xl font-extrabold tracking-normal text-white font-['Be_Vietnam_Pro',sans-serif] leading-tight">
              {book.title}
            </h1>

            <p className="text-base md:text-lg print:text-base text-lime-300 font-medium">
              Tác giả: <span className="text-white font-semibold">{book.author}</span>
              {book.publisher && <span className="text-purple-300 text-sm ml-2">({book.publisher})</span>}
            </p>

            {/* Tagline quote */}
            <div className="bg-white/10 print:bg-white/15 border-l-4 border-lime-400 p-4 rounded-r-2xl backdrop-blur-xs text-purple-100 text-sm md:text-base italic leading-relaxed text-justify">
              "{review.tagline}"
            </div>

            {/* Recommendation Verdict Badge */}
            <div className="flex flex-wrap items-center justify-center md:justify-start print:justify-start gap-3 pt-2">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-lime-500 to-lime-600 print:bg-lime-400 text-lime-950 font-bold px-4 py-2 rounded-2xl shadow-md text-sm">
                <Award className="w-4 h-4" />
                <span>{review.verdict}</span>
              </div>
              <div className="text-xs text-purple-200 bg-purple-900/60 print:bg-purple-900/80 px-3 py-2 rounded-xl border border-purple-700/50">
                <span>Dành cho: </span>
                <strong className="text-lime-200">{review.targetAudience}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW SWITCHER TABS */}
      <div className="flex justify-center border-b border-purple-200 no-print w-full">
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-purple-100/70 rounded-2xl border border-purple-200 w-full sm:w-auto">
          <button
            onClick={() => setActiveViewTab('bento')}
            className={`px-3 sm:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer text-center ${
              activeViewTab === 'bento'
                ? 'bg-purple-900 text-white shadow-sm'
                : 'text-purple-900 hover:bg-purple-200/60'
            }`}
          >
            Tổng Quan & Điểm Số
          </button>
          <button
            onClick={() => setActiveViewTab('editorial')}
            className={`px-3 sm:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              activeViewTab === 'editorial'
                ? 'bg-purple-900 text-white shadow-sm'
                : 'text-purple-900 hover:bg-purple-200/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-lime-400 shrink-0" />
            <span>Toàn Văn Phê Bình</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: BENTO OVERVIEW & SCORECARD */}
      <section className={`part-section part-bento ${activeViewTab === 'bento' ? '' : 'hidden'} print:block`}>
        {/* Tiêu đề PHẦN 1 – chỉ hiện khi in / xuất PDF */}
        <div className="print-part-title hidden print:flex items-center gap-3">
          <span className="bg-purple-900 text-lime-300 text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">Phần 1</span>
          <span className="text-purple-950 font-bold text-base">Tổng quan & Điểm số</span>
          <span className="flex-1 h-px bg-lime-500/50" />
        </div>
        <div className="reading-content space-y-4 sm:space-y-6 animate-in fade-in duration-300">
          {/* Bento Row 1: Overview & Score Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Left Column: Premise & Worldview (No Spoilers) */}
            <div className="lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-7 border border-purple-200/90 shadow-sm space-y-3.5 sm:space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-purple-100">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-purple-950 text-base md:text-lg">
                    Khái quát Tác phẩm
                  </h3>
                  <p className="text-xs text-slate-500">Giới thiệu tiền đề, bầu không khí và xung đột trung tâm</p>
                </div>
              </div>

              <p className="text-slate-700 leading-relaxed md:leading-loose text-[15px] sm:text-base md:text-lg text-justify font-normal">
                {review.overview}
              </p>

              {/* Core Themes Pills */}
              <div className="pt-2">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-900 block mb-2">
                  Tư tưởng & Chủ đề then chốt:
                </span>
                <div className="theme-grid grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                  {review.coreThemes.map((theme, i) => (
                    <span
                      key={i}
                      className="sm:odd:last:col-span-2 min-w-0 bg-lime-50 text-lime-900 border border-lime-300 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 shadow-2xs leading-snug"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-600 shrink-0" />
                      <span className="min-w-0 break-words">{theme}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Narrative Style Preview */}
              <div className="bg-purple-50/60 p-3 sm:p-4 rounded-xl border border-purple-100 space-y-1.5">
                <h4 className="text-xs sm:text-sm font-bold text-purple-950 uppercase tracking-wider">
                  Văn phong & Nghệ thuật trần thuật:
                </h4>
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed text-justify">
                  {review.narrativeStyle}
                </p>
              </div>
            </div>

            {/* Right Column: Score Breakdown */}
            <div className="lg:col-span-5 bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-7 border border-purple-200/90 shadow-sm space-y-3.5 sm:space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-purple-100 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-lime-100 text-lime-800 flex items-center justify-center font-bold">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-purple-950 text-base md:text-lg">
                        Bảng điểm theo Thể loại
                      </h3>
                      <p className="text-xs text-slate-500">Thẩm định công tâm từng khía cạnh</p>
                    </div>
                  </div>
                  <span className="text-lg font-black text-lime-700 bg-lime-50 px-2.5 py-1 rounded-xl border border-lime-200">
                    {review.overallScore}/10
                  </span>
                </div>

                <div className="space-y-4">
                  {review.scoreBreakdown.map((item, idx) => (
                    <div key={idx} className="space-y-1 print-avoid-break">
                      <div className="flex justify-between items-center text-xs md:text-sm">
                        <span className="font-semibold text-purple-950">{item.category}</span>
                        <span className="font-bold text-lime-700">{item.score}/10</span>
                      </div>
                      <div className="h-2.5 w-full bg-purple-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-700 to-lime-600 rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, item.score * 10)}%` }}
                        />
                      </div>
                      {item.comment && (
                        <p className="text-[12px] sm:text-xs text-slate-500 text-justify">{item.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Character Depth Note */}
              <div className="mt-4 pt-3 border-t border-purple-100">
                <span className="text-xs sm:text-sm font-bold text-purple-950 uppercase tracking-wider block mb-1">
                  Chiều sâu nhân vật:
                </span>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-justify">
                  {review.characterDepth}
                </p>
              </div>
            </div>
          </div>

          {/* Character Profiles (No Spoilers) */}
          {review.characters && review.characters.length > 0 && (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-7 border border-purple-200/90 shadow-sm space-y-3.5 sm:space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-purple-100">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-purple-950 text-base md:text-lg">
                    Hồ sơ Nhân vật & Tuyến Tính cách
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chân dung, tâm lý và vị trí biểu tượng của các nhân vật trong tác phẩm
                  </p>
                </div>
              </div>

              <div className="char-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch">
                {review.characters.map((char, idx) => (
                  <div
                    key={idx}
                    className="char-card print-avoid-break min-w-0 h-full flex flex-col gap-2.5 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-50/70 to-lime-50/40 border border-purple-100/90 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col items-start gap-1.5 min-w-0">
                      <h4 className="font-bold text-purple-950 text-[15px] leading-snug break-words min-w-0">
                        {char.name}
                      </h4>
                      <span className="inline-block max-w-full text-[10.5px] font-bold leading-snug text-lime-800 bg-lime-100 border border-lime-300 px-2.5 py-1 rounded-lg break-words">
                        {char.role}
                      </span>
                    </div>
                    <p className="text-slate-700 text-justify break-words">
                      <span className="font-semibold text-purple-900">Tính cách:</span> {char.personality}
                    </p>
                    {char.description && (
                      <p className="text-slate-500 italic border-t border-purple-100/70 pt-2 text-justify break-words">
                        {char.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Đánh giá THẬT từ cộng đồng – chỉ hiện dữ liệu có nguồn do Google Search tìm được */}
          {(() => {
            const comm = review.communityReviews;
            const status = comm?.status; // undefined = review cũ (AI tự viết) -> không hiển thị
            const LANG: Record<string, string> = {
              en: 'tiếng Anh', ja: 'tiếng Nhật', ko: 'tiếng Hàn', zh: 'tiếng Trung', fr: 'tiếng Pháp',
              de: 'tiếng Đức', es: 'tiếng Tây Ban Nha', it: 'tiếng Ý', ru: 'tiếng Nga', pt: 'tiếng Bồ Đào Nha',
              th: 'tiếng Thái', id: 'tiếng Indonesia'
            };
            const hasData = status === 'found' && comm;
            const hasRatings = !!comm?.ratings && comm.ratings.length > 0;
            const hasQuotes = !!comm?.realQuotes && comm.realQuotes.length > 0;

            const header = (
              <div className="flex items-center gap-2.5 pb-3 border-b border-purple-100">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${hasData ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {hasData ? <Star className="w-4 h-4 text-lime-300" /> : <SearchX className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-purple-950 text-base md:text-lg">
                    Đánh giá thực tế từ Độc giả & Diễn đàn
                  </h3>
                  <p className="text-xs text-slate-500">
                    {hasData
                      ? 'Tìm kiếm trực tiếp trên Goodreads, diễn đàn, báo chí (mọi ngôn ngữ), dịch sang tiếng Việt'
                      : 'Chỉ hiển thị dữ liệu có nguồn thật, không điền thông tin giả'}
                  </p>
                </div>
              </div>
            );

            if (!hasData) {
              const msg =
                status === 'none'
                  ? 'Đã tìm trên Goodreads, Reddit, các diễn đàn và trang review (nhiều ngôn ngữ) nhưng chưa thấy đánh giá đáng tin cậy nào về tác phẩm này. Vì vậy phần này để trống thay vì tự điền.'
                  : status === 'error'
                  ? 'Không thể tra cứu đánh giá cộng đồng lần này do lỗi kết nối hoặc hết hạn mức tìm kiếm. Hãy tạo lại review để thử tìm lại.'
                  : 'Review này được tạo trước khi có tra cứu nguồn thật nên không hiển thị dữ liệu cộng đồng (tránh thông tin do AI tự viết). Hãy tạo lại review để cập nhật.';
              return (
                <div className="print-avoid-break bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-7 border border-dashed border-purple-200 shadow-sm space-y-3">
                  {header}
                  <p className="text-sm text-slate-600 leading-relaxed">{msg}</p>
                </div>
              );
            }

            return (
              <div className="bg-gradient-to-br from-purple-50 via-white to-lime-50/50 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-7 border border-purple-200/90 shadow-sm space-y-3.5 sm:space-y-4">
                {header}

                {hasRatings && (
                  <div className="flex flex-wrap gap-2">
                    {comm!.ratings!.map((r, i) => {
                      const inner = (
                        <>
                          <span className="text-lime-700">{r.platform}:</span>
                          <span className="text-purple-800">{r.score}</span>
                          {r.count && <span className="font-medium text-slate-500">({r.count})</span>}
                        </>
                      );
                      const cls = 'bg-white px-3.5 py-1.5 rounded-xl border border-purple-200 shadow-2xs inline-flex items-center gap-1.5 text-xs font-bold text-purple-950';
                      return r.url ? (
                        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className={`${cls} hover:border-purple-400 transition`}>
                          {inner}
                          <ExternalLink className="w-3 h-3 text-purple-400 no-print" />
                        </a>
                      ) : (
                        <span key={i} className={cls}>{inner}</span>
                      );
                    })}
                  </div>
                )}

                {comm!.summary && (
                  <p className="text-slate-700 text-[15px] sm:text-base md:text-lg leading-relaxed md:leading-loose text-justify">
                    {comm!.summary}
                  </p>
                )}

                {hasQuotes && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 items-stretch">
                    {comm!.realQuotes!.map((q, idx) => (
                      <div key={idx} className="print-avoid-break h-full flex flex-col gap-2 bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-purple-100/90 shadow-2xs">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 min-w-0">
                          <Quote className="w-3.5 h-3.5 text-lime-600 shrink-0" />
                          <span className="truncate">{q.source}</span>
                        </div>
                        <p className="text-[13px] sm:text-sm text-slate-700 italic leading-relaxed text-justify break-words">
                          “{q.text}”
                        </p>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                          <span>
                            {q.language && q.language !== 'vi' ? `Dịch từ ${LANG[q.language] || q.language}` : 'Nguyên văn tiếng Việt'}
                          </span>
                          {q.url && (
                            <a href={q.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 font-semibold no-print">
                              Xem nguồn <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {comm!.sources && comm!.sources.length > 0 && (
                  <div className="pt-3 border-t border-purple-100 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Nguồn đã tra cứu ({comm!.sources.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {comm!.sources.map((src, i) => (
                        <a
                          key={i}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="max-w-full truncate text-[11px] text-purple-700 bg-white border border-purple-100 hover:border-purple-300 rounded-full px-2.5 py-1 transition"
                          title={src.title}
                        >
                          {src.title}
                        </a>
                      ))}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Lời trích được dịch sang tiếng Việt từ nguồn gốc; hãy bấm vào nguồn để đối chiếu trước khi trích lại.
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Bento Row 2: Strengths & Limitations (Đánh giá căn ke 7:3) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-lime-600"></span>
                Thẩm định thực tế & căn ke (Tỷ lệ 7 ưu : 3 nhược)
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">Phê bình đa chiều, không khen thưởng một phía</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6">
              {/* Strengths (70%) */}
              <div className="bg-gradient-to-br from-lime-50/90 via-white to-lime-100/40 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-lime-200/90 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h4 className="font-bold text-lime-950 text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-lime-700 shrink-0" />
                      <span>Ưu điểm & Điểm sáng nổi bật</span>
                    </h4>
                    <span className="bg-lime-200/90 text-lime-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                      ~70% Giá trị
                    </span>
                  </div>
                  <ul className="space-y-2.5 sm:space-y-3 text-[13.5px] sm:text-sm md:text-base text-lime-950">
                    {review.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-lime-200 text-lime-900 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                          ✓
                        </span>
                        <span className="leading-relaxed flex-1 text-justify">{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Limitations / Real Critique (30%) */}
              <div className="bg-gradient-to-br from-amber-50/80 via-white to-rose-50/40 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-amber-200/90 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h4 className="font-bold text-amber-950 text-base flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Nhược điểm & Góc nhìn căn ke</span>
                    </h4>
                    <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                      ~30% Hạn chế
                    </span>
                  </div>
                  <ul className="space-y-2.5 sm:space-y-3 text-[13.5px] sm:text-sm md:text-base text-slate-800">
                    {review.limitations.map((lim, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                          !
                        </span>
                        <span className="leading-relaxed flex-1 text-justify">{lim}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Final Verdict Banner */}
          <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-lime-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 text-white shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-lime-300 font-bold text-xs uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>Phán quyết chung thẩm: Có đáng đọc không?</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold font-serif leading-snug">
              {review.verdict} — {book.title}
            </h3>
            <p className="text-purple-100 text-[15px] sm:text-base md:text-lg leading-relaxed md:leading-loose text-justify">
              {review.readingVerdict}
            </p>
          </div>
        </div>
      </section>

      {/* TAB CONTENT 2: FULL EDITORIAL ARTICLE (1000 - 3000 words) */}
      <section className={`part-section part-editorial ${activeViewTab === 'editorial' ? '' : 'hidden'} print:block`}>
        {/* Tiêu đề PHẦN 2 – chỉ hiện khi in / xuất PDF */}
        <div className="print-part-title hidden print:flex items-center gap-3">
          <span className="bg-purple-900 text-lime-300 text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">Phần 2</span>
          <span className="text-purple-950 font-bold text-base">Toàn văn phê bình</span>
          <span className="flex-1 h-px bg-lime-500/50" />
        </div>
        <div className="reading-content bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-8 md:p-12 border border-purple-200/90 shadow-sm space-y-6 sm:space-y-8 animate-in fade-in duration-300">
          <div className="border-b border-purple-100 pb-6 text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-lime-700 uppercase tracking-widest bg-lime-100 px-3 py-1 rounded-full">
              Chuyên luận phê bình văn học
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-purple-950 font-serif leading-tight">
              {book.title}
            </h2>
            <p className="text-sm md:text-base text-slate-600 font-medium">
              Tác giả: <strong className="text-purple-900">{book.author}</strong> • Thẩm định bởi MatchaBook Editorial
            </p>
            <div className="flex items-center justify-center gap-3 text-xs text-slate-400 pt-1">
              <span>Dung lượng: ~{review.wordCount} từ</span>
              <span>•</span>
              <span>Thẩm định văn học chuyên sâu</span>
            </div>
          </div>

          {/* Clean paragraphs with strict 2-side justification */}
          <div className="editorial-article max-w-none text-slate-800 leading-loose text-base md:text-lg space-y-6 font-['Be_Vietnam_Pro',serif]">
            {(review.fullEditorialReview.includes('\n\n')
              ? review.fullEditorialReview.split(/\n\s*\n/)
              : review.fullEditorialReview.split(/\n+/)
            )
              .map(p => p.trim())
              .filter(Boolean)
              .map((paragraph, idx) => (
                <p key={idx} className="text-justify text-slate-700 leading-relaxed md:leading-loose text-[16px] sm:text-[17px] md:text-[18px]">
                  {paragraph}
                </p>
              ))}
          </div>

          {/* Signoff badge */}
          <div className="pt-8 border-t border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-lime-500" />
              <span>Đã tự động lưu vào Tủ sách của bạn</span>
            </div>
            <button
              onClick={handleCopyBlogspot}
              className="inline-flex items-center gap-1.5 text-purple-700 hover:text-purple-900 font-semibold cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Lấy mã HTML để đăng lên Blogspot / WordPress →</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
