import React, { useState } from 'react';
import { SavedReviewRecord } from '../types';
import { Search, BookOpen, Star, Trash2, ExternalLink, Calendar, Sparkles, Share2, Code } from 'lucide-react';
import { formatForSocialMedia, formatForBlogspotHtml } from '../services/copyFormatters';

interface Props {
  reviews: SavedReviewRecord[];
  onSelectReview: (record: SavedReviewRecord) => void;
  onDeleteReview: (id: string) => void;
  onNewReview: () => void;
}

export const SavedReviewsLibrary: React.FC<Props> = ({
  reviews,
  onSelectReview,
  onDeleteReview,
  onNewReview,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  // Collect unique genres
  const genres = Array.from(new Set(reviews.map(r => r.review.genre))).filter(Boolean);

  const filtered = reviews.filter(r => {
    const matchesSearch =
      r.book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.review.genre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = selectedGenre === 'all' || r.review.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const handleQuickCopy = (record: SavedReviewRecord, type: 'social' | 'html', e: React.MouseEvent) => {
    e.stopPropagation();
    const text = type === 'social' ? formatForSocialMedia(record) : formatForBlogspotHtml(record);
    navigator.clipboard.writeText(text);
    setCopyNotice(`Đã sao chép format ${type === 'social' ? 'Mạng xã hội' : 'HTML Blogspot'}!`);
    setTimeout(() => setCopyNotice(null), 2500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Toast Notice */}
      {copyNotice && (
        <div className="fixed top-6 right-6 z-50 bg-purple-950 text-lime-300 border border-lime-400 px-4 py-2.5 rounded-xl shadow-xl font-semibold text-xs animate-in slide-in-from-top-3 duration-200">
          {copyNotice}
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-purple-200/90 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-purple-950 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-lime-700" />
            <span>Tủ sách & Bài review đã lưu</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng cộng {reviews.length} cuốn sách trong bộ sưu tập của bạn
          </p>
        </div>

        <button
          onClick={onNewReview}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-800 to-lime-700 hover:from-purple-900 hover:to-lime-800 text-white text-xs font-semibold shadow-md transition cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4 text-lime-300" />
          <span>Review sách mới</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tựa sách, tác giả, thể loại..."
            className="w-full rounded-2xl border border-purple-200 bg-white pl-10 pr-4 py-2.5 text-xs text-purple-950 placeholder:text-slate-400 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400/20"
          />
        </div>

        {genres.length > 0 && (
          <select
            value={selectedGenre}
            onChange={e => setSelectedGenre(e.target.value)}
            className="rounded-2xl border border-purple-200 bg-white px-3.5 py-2.5 text-xs font-medium text-purple-950 focus:border-purple-600 focus:outline-none"
          >
            <option value="all">Tất cả thể loại ({reviews.length})</option>
            {genres.map((g, idx) => (
              <option key={idx} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Books Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-purple-200 p-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-purple-700" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-purple-950 text-base">
              {reviews.length === 0 ? 'Chưa có cuốn sách nào được review' : 'Không tìm thấy kết quả phù hợp'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {reviews.length === 0
                ? 'Hãy tải lên cuốn sách EPUB đầu tiên để xem bài thẩm định tác phẩm và điểm số chuyên sâu.'
                : 'Thử tìm kiếm với từ khóa khác hoặc bỏ chọn bộ lọc thể loại.'}
            </p>
          </div>
          {reviews.length === 0 && (
            <button
              onClick={onNewReview}
              className="px-5 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-semibold text-xs shadow-sm cursor-pointer transition"
            >
              Tải lên file EPUB ngay
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(record => {
            const { book, review } = record;
            return (
              <div
                key={record.id}
                onClick={() => onSelectReview(record)}
                className="group relative bg-white rounded-3xl border border-purple-200/80 hover:border-purple-500/80 p-4 transition-all duration-300 hover:shadow-xl cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Book Card Top: Cover & Main Details */}
                  <div className="flex gap-4 items-start">
                    {/* Thumbnail */}
                    <div className="w-20 h-28 rounded-xl overflow-hidden bg-purple-100 shrink-0 shadow-sm border border-purple-200/60 relative group-hover:scale-105 transition-transform">
                      {book.coverDataUrl ? (
                        <img
                          src={book.coverDataUrl}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-800 to-lime-800 p-2 flex flex-col justify-between text-white text-[9px] text-center">
                          <span className="font-bold text-lime-300">EPUB</span>
                          <span className="line-clamp-2 font-serif">{book.title}</span>
                          <span className="text-[8px] text-purple-200">{review.genre}</span>
                        </div>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-lime-700 bg-lime-50 border border-lime-200 px-2 py-0.5 rounded-full line-clamp-1">
                          {review.genre}
                        </span>
                        <div className="flex items-center gap-1 text-xs font-black text-lime-700">
                          <Star className="w-3.5 h-3.5 fill-lime-600 text-lime-600" />
                          <span>{review.overallScore}</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-purple-950 text-sm line-clamp-2 leading-snug group-hover:text-purple-700 transition">
                        {book.title}
                      </h4>

                      <p className="text-xs text-slate-600 line-clamp-1 font-medium">
                        {book.author}
                      </p>

                      <div className="text-[11px] text-purple-900 font-semibold bg-purple-50 px-2 py-0.5 rounded-lg inline-block">
                        {review.verdict}
                      </div>
                    </div>
                  </div>

                  {/* Tagline snippet */}
                  <p className="mt-3 text-xs text-slate-600 italic line-clamp-2 border-l-2 border-lime-500 pl-2">
                    "{review.tagline}"
                  </p>
                </div>

                {/* Card Bottom Toolbar */}
                <div className="mt-4 pt-3 border-t border-purple-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {new Date(record.createdAt).toLocaleDateString('vi-VN')}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => handleQuickCopy(record, 'social', e)}
                      title="Copy cho Mạng xã hội"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => handleQuickCopy(record, 'html', e)}
                      title="Copy HTML cho Blogspot"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-lime-700 hover:bg-lime-100 transition cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm(`Bạn có chắc chắn muốn xóa bài review cuốn "${book.title}" khỏi IndexedDB?`)) {
                          onDeleteReview(record.id);
                        }
                      }}
                      title="Xóa khỏi IndexedDB"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
