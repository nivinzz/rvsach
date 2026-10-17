import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-purple-950/90 text-lime-300 border border-lime-500/40 px-4 py-2 text-xs font-semibold shadow-2xl backdrop-blur-md animate-bounce">
      <WifiOff className="h-4 w-4 text-lime-400" />
      <span>Đang ở chế độ Ngoại tuyến (Offline). Bạn vẫn có thể xem lại toàn bộ sách đã lưu trong IndexedDB.</span>
    </div>
  );
};
