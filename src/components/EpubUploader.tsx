import React, { useState, useRef } from 'react';
import { EpubBookData } from '../types';
import { parseEpubFile } from '../services/epubParser';
import { UploadCloud, BookOpen, FileUp, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  onBookLoaded: (book: EpubBookData) => void;
  isLoading: boolean;
  statusMessage?: string;
}

export const EpubUploader: React.FC<Props> = ({ onBookLoaded, isLoading, statusMessage }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localParsing, setLocalParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.epub') && file.type !== 'application/epub+zip') {
      setErrorMsg('Vui lòng chọn hoặc kéo thả tệp định dạng .epub chuẩn.');
      return;
    }

    setErrorMsg(null);
    setLocalParsing(true);

    try {
      const bookData = await parseEpubFile(file);
      setLocalParsing(false);
      onBookLoaded(bookData);
    } catch (err: unknown) {
      setLocalParsing(false);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Không thể đọc tệp EPUB: ${msg}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Drag & Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative overflow-hidden rounded-3xl border-2 border-dashed p-8 md:p-12 text-center transition-all duration-300 cursor-pointer ${
          isDragOver
            ? 'border-lime-500 bg-lime-50/70 scale-[1.01] shadow-xl'
            : 'border-purple-300/80 bg-white hover:border-purple-500 hover:bg-purple-50/40 shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".epub,application/epub+zip"
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-800 to-lime-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/10 group-hover:scale-105 transition-transform">
            {localParsing || isLoading ? (
              <Loader2 className="w-9 h-9 animate-spin text-lime-200" />
            ) : (
              <UploadCloud className="w-10 h-10 text-lime-100" />
            )}
          </div>

          <div className="space-y-1.5 max-w-md">
            <h3 className="text-lg md:text-xl font-bold text-purple-950">
              Kéo thả hoặc tải lên sách EPUB (.epub)
            </h3>
            <p className="text-xs md:text-sm text-slate-500">
              Hệ thống sẽ tự động đọc toàn bộ cấu trúc sách, trích xuất ảnh bìa, kiểm đếm số từ và chuẩn bị bài review chuyên sâu 2000 - 6000 từ.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-900 text-white font-semibold text-xs md:text-sm hover:bg-purple-950 transition shadow-sm">
            <FileUp className="w-4 h-4 text-lime-400" />
            <span>Chọn file từ thiết bị</span>
          </div>
        </div>

        {/* Status message */}
        {(localParsing || isLoading) && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 space-y-3 z-20">
            <Loader2 className="w-10 h-10 animate-spin text-purple-800" />
            <p className="font-semibold text-purple-950 text-sm md:text-base animate-pulse">
              {statusMessage || 'Đang giải mã tệp EPUB và phân tích văn bản...'}
            </p>
            <p className="text-xs text-slate-500">Vui lòng chờ trong giây lát</p>
          </div>
        )}
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs md:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong>Lỗi tải sách:</strong> {errorMsg}
          </div>
        </div>
      )}

    </div>
  );
};
