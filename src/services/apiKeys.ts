const STORAGE_KEY = 'matchabook_api_keys';

/** Tách khóa theo dấu phẩy, chấm phẩy, xuống dòng hoặc khoảng trắng; bỏ trùng. */
export function parseKeys(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of String(raw || '').split(/[\s,;]+/)) {
    const k = part.trim().replace(/^["']|["']$/g, '');
    if (k) seen.add(k);
  }
  return Array.from(seen);
}

export function loadKeys(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? parseKeys(arr.join('\n')) : [];
  } catch {
    return [];
  }
}

export function saveKeys(keys: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    /* localStorage không khả dụng */
  }
}

export function maskKey(k: string): string {
  if (k.length <= 10) return '••••••';
  return `${k.slice(0, 6)}••••••${k.slice(-4)}`;
}

export type KeyStatus = 'ok' | 'invalid' | 'limited' | 'error';

/**
 * Kiểm tra khóa có hợp lệ không (gọi thẳng Google từ trình duyệt, không qua máy chủ).
 * Lưu ý: chỉ xác nhận khóa đúng, không xác nhận còn hạn mức hay không.
 */
export async function testKey(key: string): Promise<KeyStatus> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(key)}`
    );
    if (res.ok) return 'ok';
    if (res.status === 429) return 'limited';
    if (res.status === 400 || res.status === 401 || res.status === 403) return 'invalid';
    return 'error';
  } catch {
    return 'error';
  }
}
