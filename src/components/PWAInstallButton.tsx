import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Check } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleInstallClick = async () => {
    if (isInstalled) {
      showToast('Ứng dụng đã được cài đặt trên thiết bị của bạn!');
      return;
    }

    if (isInstallable) {
      // Trigger native browser install dialog directly from Android/Chromium
      const success = await install();
      if (success) {
        showToast('Đang tiến hành cài đặt ứng dụng...');
      }
      return;
    }

    // When prompt is not available yet or on iOS Safari
    if (isIOS) {
      showToast("Trên iPhone: Nhấn nút Chia sẻ của Safari ➔ Chọn 'Thêm vào MH chính' để cài app.");
    } else {
      showToast("Nhấn menu trình duyệt (⋮) ➔ Chọn 'Cài đặt ứng dụng' hoặc 'Thêm vào Màn hình chính'.");
    }
  };

  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-lime-100 text-lime-800 border border-lime-300">
        <Check className="w-3.5 h-3.5 text-lime-700" />
        <span className="hidden xs:inline">Đã cài</span>
      </span>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-800 to-lime-700 hover:from-purple-900 hover:to-lime-800 text-white text-xs font-bold px-3 py-2 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
        title="Cài đặt ứng dụng trực tiếp lên màn hình"
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span>Cài app</span>
      </button>

      {/* Floating toast notification without any share sheet or blocking modal */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-purple-950 text-lime-300 text-xs px-4 py-2.5 rounded-xl shadow-xl border border-lime-400/30 animate-in fade-in slide-in-from-bottom-2 text-center max-w-sm mx-auto">
          {toastMessage}
        </div>
      )}
    </>
  );
};
