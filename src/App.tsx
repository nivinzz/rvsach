/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { EpubBookData, SavedReviewRecord } from './types';
import { EpubUploader } from './components/EpubUploader';
import { ReviewDisplay } from './components/ReviewDisplay';
import { SavedReviewsLibrary } from './components/SavedReviewsLibrary';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { FontSizeAdjuster } from './components/FontSizeAdjuster';
import { ApiKeyManager } from './components/ApiKeyManager';
import { loadKeys, saveKeys } from './services/apiKeys';
import {
  saveReviewToDB,
  getAllSavedReviews,
  deleteReviewFromDB,
} from './services/storage';
import { generateBookReview } from './services/apiService';
import {
  BookOpen,
  Library,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Sliders,
  KeyRound,
} from 'lucide-react';

export default function App() {
  // Navigation: 'upload' | 'review' | 'library'
  const [activeTab, setActiveTab] = useState<'upload' | 'review' | 'library'>('upload');

  // Book & Review state
  const [currentBook, setCurrentBook] = useState<EpubBookData | null>(null);
  const [currentRecord, setCurrentRecord] = useState<SavedReviewRecord | null>(null);

  // Target word count: 2000 to 6000 words
  const [targetWordCount, setTargetWordCount] = useState<number>(3500);

  // Loading & Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Storage state
  const [savedReviews, setSavedReviews] = useState<SavedReviewRecord[]>([]);

  // API keys do người dùng nhập (lưu trong localStorage)
  const [apiKeys, setApiKeys] = useState<string[]>(() => loadKeys());
  const [showKeyManager, setShowKeyManager] = useState(false);

  const handleKeysChange = (keys: string[]) => {
    setApiKeys(keys);
    saveKeys(keys);
  };

  // Load reviews on mount
  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const records = await getAllSavedReviews();
      setSavedReviews(records);
    } catch (err) {
      console.error('Error loading saved reviews', err);
    }
  };

  const handleBookLoaded = (book: EpubBookData) => {
    setCurrentBook(book);
  };

  const handleStartReview = async () => {
    if (!currentBook) return;

    if (apiKeys.length === 0) {
      setShowKeyManager(true);
      return;
    }

    setIsGenerating(true);
    setStatusMessage('Đang đọc sách, phân tích nhân vật và tra cứu đánh giá...');

    try {
      const { review } = await generateBookReview(
        currentBook,
        targetWordCount,
        (msg: string) => setStatusMessage(msg)
      );

      const record: SavedReviewRecord = {
        id: 'rev_' + Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        book: {
          title: currentBook.title,
          author: currentBook.author,
          coverDataUrl: currentBook.coverDataUrl,
          language: currentBook.language,
          publisher: currentBook.publisher,
          totalWords: currentBook.totalWords,
          fileName: currentBook.fileName,
        },
        review,
        tags: [review.genre, ...review.subGenres],
      };

      await saveReviewToDB(record);
      await loadReviews();

      setCurrentRecord(record);
      setActiveTab('review');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Không thể hoàn thành bài review: ${msg}`);
    } finally {
      setIsGenerating(false);
      setStatusMessage('');
    }
  };

  const handleSelectRecordFromLibrary = (record: SavedReviewRecord) => {
    setCurrentRecord(record);
    setActiveTab('review');
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await deleteReviewFromDB(id);
      await loadReviews();
      if (currentRecord?.id === id) {
        setCurrentRecord(null);
        setActiveTab('library');
      }
    } catch (err) {
      console.error('Error deleting review', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7fc] text-slate-800 flex flex-col selection:bg-purple-200 selection:text-purple-950">
      <OfflineIndicator />

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-purple-200/80 shadow-xs no-print">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-15 sm:h-16 flex items-center justify-between gap-2">
          {/* Logo & Brand */}
          <div
            onClick={() => setActiveTab('upload')}
            className="flex items-center gap-2 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-purple-900 to-lime-600 flex items-center justify-center shadow-md shadow-purple-900/10 group-hover:scale-105 transition-transform p-1.5 shrink-0">
              <img src="/icon.svg" alt="MatchaBook Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-purple-950">
                  Matcha<span className="text-lime-700">Book</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-lime-100 text-lime-900 border border-lime-300">
                  Review
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden md:block">
                Thẩm định sách chuyên sâu • 2000 - 6000 từ
              </p>
            </div>
          </div>

          {/* Desktop Navigation Controls */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'text-purple-900 hover:bg-purple-100/70'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-lime-400" />
              <span>Review Mới</span>
            </button>

            {currentRecord && (
              <button
                onClick={() => setActiveTab('review')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'review'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'text-purple-900 hover:bg-purple-100/70'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-700" />
                <span>Xem Review</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('library')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'text-purple-900 hover:bg-purple-100/70'
              }`}
            >
              <Library className="w-3.5 h-3.5 text-purple-700" />
              <span>Tủ sách</span>
              {savedReviews.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-lime-500 text-lime-950 font-black">
                  {savedReviews.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowKeyManager(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                apiKeys.length === 0
                  ? 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100'
                  : 'border-transparent text-purple-900 hover:bg-purple-100/70'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-lime-700" />
              <span>API</span>
              <span
                className={`px-1.5 rounded-full text-[10px] font-black ${
                  apiKeys.length === 0 ? 'bg-amber-400 text-amber-950' : 'bg-lime-500 text-lime-950'
                }`}
              >
                {apiKeys.length}
              </span>
            </button>

            <PWAInstallButton />
          </div>

          {/* Mobile Right: Direct PWA Install button */}
          <div className="sm:hidden flex items-center gap-1.5">
            <button
              onClick={() => setShowKeyManager(true)}
              className={`h-9 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border ${
                apiKeys.length === 0
                  ? 'border-amber-400 bg-amber-50 text-amber-900'
                  : 'border-purple-200 bg-white text-purple-900'
              }`}
              aria-label="Quản lý API key"
            >
              <KeyRound className="w-3.5 h-3.5 text-lime-700" />
              <span>{apiKeys.length}</span>
            </button>
            <PWAInstallButton />
          </div>
        </div>

        {/* Mobile Balanced Menu in Full-Width Grid (No horizontal scroll, clean columns) */}
        <div className="sm:hidden px-3 pb-2 pt-1 border-t border-purple-100/80 bg-purple-50/50">
          <div className={`grid ${currentRecord ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 w-full`}>
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                activeTab === 'upload'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-white text-purple-950 border border-purple-200/80 hover:bg-purple-100/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-lime-500 shrink-0" />
              <span className="truncate">Review Mới</span>
            </button>

            {currentRecord && (
              <button
                onClick={() => setActiveTab('review')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                  activeTab === 'review'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'bg-white text-purple-950 border border-purple-200/80 hover:bg-purple-100/50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">Xem Review</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('library')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                activeTab === 'library'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-white text-purple-950 border border-purple-200/80 hover:bg-purple-100/50'
              }`}
            >
              <Library className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="truncate">Tủ sách</span>
              {savedReviews.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-lime-500 text-lime-950 font-black">
                  {savedReviews.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-2 sm:px-6 py-4 md:py-8">
        {/* TAB 1: UPLOAD & WORKFLOW */}
        {activeTab === 'upload' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Value proposition Banner */}
            <div className="text-center max-w-2xl mx-auto space-y-3 pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-semibold border border-purple-200">
                <ShieldCheck className="w-3.5 h-3.5 text-lime-700" />
                <span>Thẩm định văn học khách quan • Tra cứu đánh giá độc giả thực tế</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-purple-950 font-serif tracking-tight leading-tight">
                Review Nhanh Sách EPUB
                <br />
                <span className="bg-gradient-to-r from-purple-800 via-purple-700 to-lime-700 bg-clip-text text-transparent">
                  Đọc Toàn Diện, Thấu Đáo & Không Tiết Lộ Cốt Truyện
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Đọc toàn bộ cuốn sách, nhận diện thể loại, phân tích văn phong, chân dung tính cách từng nhân vật, tra cứu đánh giá thực tế từ cộng đồng và đúc kết xem tác phẩm có đáng đọc hay không. Tự động lưu trữ để đọc lại bất cứ lúc nào.
              </p>
            </div>

            {/* Nhắc thêm API key khi chưa có */}
            {apiKeys.length === 0 && (
              <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 text-xs text-amber-950">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Bạn chưa thêm API key Gemini. Cần ít nhất 1 key để tạo review.</span>
                </div>
                <button
                  onClick={() => setShowKeyManager(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer shrink-0"
                >
                  Thêm API key
                </button>
              </div>
            )}

            {/* EPUB Drag & Drop Uploader */}
            <EpubUploader
              onBookLoaded={handleBookLoaded}
              isLoading={isGenerating}
              statusMessage={statusMessage}
            />

            {/* Book Preview Ready Card (When book is loaded) */}
            {currentBook && !isGenerating && (
              <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 md:p-8 border-2 border-purple-300 shadow-xl space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between border-b border-purple-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-lime-500 animate-ping" />
                    <h3 className="font-bold text-purple-950 text-base md:text-lg">
                      Sách đã được nạp thành công!
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-slate-500 bg-purple-50 px-2.5 py-1 rounded-lg">
                    {currentBook.totalChapters} chương • {currentBook.totalWords.toLocaleString()} từ
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                  {/* Cover */}
                  <div className="w-24 h-34 rounded-xl overflow-hidden bg-purple-100 shrink-0 shadow-md border border-purple-200">
                    {currentBook.coverDataUrl ? (
                      <img
                        src={currentBook.coverDataUrl}
                        alt={currentBook.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-800 to-lime-700 p-2 flex flex-col justify-between text-white text-[10px] text-center">
                        <span className="font-bold text-lime-300">EPUB</span>
                        <span className="line-clamp-3 font-serif font-semibold">{currentBook.title}</span>
                        <span className="text-[9px] text-purple-200">MatchaBook</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata preview */}
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <h4 className="text-lg md:text-xl font-bold text-purple-950 font-serif leading-snug">
                      {currentBook.title}
                    </h4>
                    <p className="text-sm font-semibold text-lime-800">
                      Tác giả: {currentBook.author}
                    </p>
                    {currentBook.description && (
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {currentBook.description.replace(/<[^>]+>/g, '')}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start text-xs text-slate-500">
                      <span className="bg-purple-50 text-purple-900 px-2 py-0.5 rounded-md font-medium">
                        Ngôn ngữ: {currentBook.language || 'vi'}
                      </span>
                      {currentBook.publisher && (
                        <span className="bg-purple-50 text-purple-900 px-2 py-0.5 rounded-md font-medium">
                          NXB: {currentBook.publisher}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Target Word Count Slider (2000 - 6000 words) */}
                <div className="bg-purple-50/60 border border-purple-200/80 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-purple-700" />
                      Độ dài bài review mong muốn:
                    </span>
                    <span className="text-xs font-bold text-lime-800 bg-lime-100 border border-lime-300 px-2.5 py-0.5 rounded-full">
                      {targetWordCount} từ
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2000}
                    max={6000}
                    step={250}
                    value={targetWordCount}
                    onChange={e => setTargetWordCount(Number(e.target.value))}
                    className="w-full accent-lime-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>2,000 từ</span>
                    <span>3,500 từ (tiêu chuẩn)</span>
                    <span>6,000 từ</span>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  onClick={handleStartReview}
                  disabled={isGenerating}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-900 via-purple-800 to-lime-700 hover:from-purple-950 hover:to-lime-800 text-white font-bold text-base shadow-xl shadow-purple-950/15 transition-all duration-200 transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-lime-300" />
                  <span>Bắt đầu Thẩm định & Tạo Review Chi tiết ({targetWordCount} từ)</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Quick Feature Highlights Bento */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto pt-4">
              <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  1
                </div>
                <h4 className="font-bold text-purple-950 text-sm">Không tiết lộ cốt truyện</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tập trung đánh giá tiền đề, thế giới quan, nghệ thuật ngôn từ, giữ trọn vẹn sự bất ngờ cho bạn khi đọc sách.
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-xl bg-lime-100 text-lime-800 flex items-center justify-center font-bold">
                  2
                </div>
                <h4 className="font-bold text-purple-950 text-sm">Tủ sách lưu trữ cá nhân</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Toàn bộ bài review và ảnh bìa được lưu trực tiếp vào máy của bạn, mở ra xem lại nhanh chóng bất cứ lúc nào.
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  3
                </div>
                <h4 className="font-bold text-purple-950 text-sm">Đánh giá thực tế từ cộng đồng</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tổng hợp điểm số và nhận xét từ Goodreads, các diễn đàn và hội nhóm đọc sách thật, tuyệt đối không bịa đặt.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE REVIEW DISPLAY */}
        {activeTab === 'review' && currentRecord && (
          <ReviewDisplay
            record={currentRecord}
            onBack={() => setActiveTab('library')}
            onDelete={() => handleDeleteRecord(currentRecord.id)}
          />
        )}

        {/* TAB 3: SAVED REVIEWS LIBRARY */}
        {activeTab === 'library' && (
          <SavedReviewsLibrary
            reviews={savedReviews}
            onSelectReview={handleSelectRecordFromLibrary}
            onDeleteReview={handleDeleteRecord}
            onNewReview={() => {
              setCurrentBook(null);
              setActiveTab('upload');
            }}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-purple-200/80 bg-white/60 py-6 text-center text-xs text-slate-500 no-print">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-purple-950">MatchaBook</span>
            <span>•</span>
            <span className="text-slate-600">Ứng dụng thẩm định & review sách</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Lưu trữ trên thiết bị</span>
            <span>•</span>
            <span>Tra cứu độc giả thực tế</span>
          </div>
        </div>
      </footer>

      {/* Floating Auto-Hiding Font Size Adjuster (Tăng/giảm cỡ chữ tỉ lệ) */}
      <FontSizeAdjuster />

      <ApiKeyManager
        open={showKeyManager}
        onClose={() => setShowKeyManager(false)}
        keys={apiKeys}
        onChange={handleKeysChange}
      />
    </div>
  );
}
