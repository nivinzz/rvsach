import React, { useState } from 'react';
import { KeyRound, X, Trash2, Plus, CheckCircle2, XCircle, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { parseKeys, maskKey, testKey, KeyStatus } from '../services/apiKeys';

interface Props {
  open: boolean;
  onClose: () => void;
  keys: string[];
  onChange: (keys: string[]) => void;
}

const STATUS_UI: Record<KeyStatus | 'checking', { text: string; cls: string }> = {
  ok: { text: 'Hợp lệ', cls: 'text-lime-700' },
  invalid: { text: 'Khóa sai', cls: 'text-red-600' },
  limited: { text: 'Hết hạn mức', cls: 'text-amber-600' },
  error: { text: 'Không kiểm tra được', cls: 'text-slate-500' },
  checking: { text: 'Đang kiểm tra...', cls: 'text-slate-500' },
};

export const ApiKeyManager: React.FC<Props> = ({ open, onClose, keys, onChange }) => {
  const [draft, setDraft] = useState('');
  const [statuses, setStatuses] = useState<Record<string, KeyStatus | 'checking'>>({});
  const [added, setAdded] = useState<number | null>(null);

  if (!open) return null;

  const handleAdd = () => {
    const incoming = parseKeys(draft);
    if (!incoming.length) return;
    const merged = Array.from(new Set([...keys, ...incoming]));
    setAdded(merged.length - keys.length);
    onChange(merged);
    setDraft('');
  };

  const handleRemove = (k: string) => onChange(keys.filter(x => x !== k));

  const handleClear = () => {
    if (keys.length && confirm('Xóa toàn bộ API key đã lưu trên thiết bị này?')) {
      onChange([]);
      setStatuses({});
    }
  };

  const handleTestAll = async () => {
    setStatuses(Object.fromEntries(keys.map(k => [k, 'checking'])));
    await Promise.all(
      keys.map(async k => {
        const s = await testKey(k);
        setStatuses(prev => ({ ...prev, [k]: s }));
      })
    );
  };

  const handleRemoveInvalid = () => {
    const bad = keys.filter(k => statuses[k] === 'invalid');
    if (bad.length) onChange(keys.filter(k => !bad.includes(k)));
  };

  const hasInvalid = keys.some(k => statuses[k] === 'invalid');

  return (
    <div
      className="fixed inset-0 z-50 bg-purple-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 no-print"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl border border-purple-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-purple-100">
          <div className="flex items-center gap-2 font-bold text-purple-950">
            <KeyRound className="w-5 h-5 text-lime-700" />
            Quản lý API key Gemini
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-purple-50 cursor-pointer" aria-label="Đóng">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex gap-2 text-[11px] leading-relaxed text-slate-600 bg-purple-50/70 border border-purple-100 rounded-xl p-3">
            <ShieldCheck className="w-4 h-4 text-lime-700 shrink-0 mt-0.5" />
            <p>
              Key chỉ lưu trong trình duyệt của bạn. Khi tạo review, key được gửi kèm yêu cầu để máy chủ chuyển tiếp
              đến Google, không lưu lại. Nhập nhiều key để app tự xoay vòng khi một key hết hạn mức. Lấy key miễn phí tại
              aistudio.google.com/apikey.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-purple-950">Thêm key (cách nhau bằng dấu phẩy hoặc mỗi dòng một key)</label>
            <textarea
              value={draft}
              onChange={e => {
                setDraft(e.target.value);
                setAdded(null);
              }}
              rows={4}
              placeholder={'AIzaSy...xx, AIzaSy...yy\nAIzaSy...zz'}
              className="w-full rounded-xl border border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none p-3 text-xs font-mono resize-y"
              spellCheck={false}
              autoComplete="off"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleAdd}
                disabled={!parseKeys(draft).length}
                className="px-4 py-2 rounded-xl bg-purple-900 hover:bg-purple-950 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Lưu key{parseKeys(draft).length > 1 ? ` (${parseKeys(draft).length})` : ''}
              </button>
              {added !== null && (
                <span className="text-xs text-lime-700 font-semibold">
                  {added > 0 ? `Đã thêm ${added} key mới` : 'Các key này đã có sẵn'}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-950">Đã lưu: {keys.length} key</span>
              {keys.length > 0 && (
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <button onClick={handleTestAll} className="text-purple-800 hover:underline cursor-pointer">
                    Kiểm tra
                  </button>
                  {hasInvalid && (
                    <button onClick={handleRemoveInvalid} className="text-amber-700 hover:underline cursor-pointer">
                      Xóa key sai
                    </button>
                  )}
                  <button onClick={handleClear} className="text-red-600 hover:underline cursor-pointer">
                    Xóa hết
                  </button>
                </div>
              )}
            </div>

            {keys.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-center">
                Chưa có key nào. Thêm ít nhất 1 key để tạo review.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {keys.map((k, i) => {
                  const s = statuses[k];
                  const ui = s ? STATUS_UI[s] : null;
                  return (
                    <li key={k} className="flex items-center gap-2 bg-purple-50/50 border border-purple-100 rounded-xl px-3 py-2">
                      <span className="text-[10px] font-bold text-slate-400 w-4">{i + 1}</span>
                      <span className="font-mono text-xs text-slate-700 flex-1 truncate">{maskKey(k)}</span>
                      {ui && (
                        <span className={`text-[11px] font-semibold flex items-center gap-1 ${ui.cls}`}>
                          {s === 'checking' && <Loader2 className="w-3 h-3 animate-spin" />}
                          {s === 'ok' && <CheckCircle2 className="w-3 h-3" />}
                          {s === 'invalid' && <XCircle className="w-3 h-3" />}
                          {(s === 'limited' || s === 'error') && <AlertTriangle className="w-3 h-3" />}
                          {ui.text}
                        </span>
                      )}
                      <button
                        onClick={() => handleRemove(k)}
                        className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer"
                        aria-label="Xóa key"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {keys.length > 0 && (
              <p className="text-[11px] text-slate-400">
                “Kiểm tra” chỉ xác nhận key đúng, không cho biết key còn hạn mức hay không.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
