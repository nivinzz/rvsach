import { SavedReviewRecord } from '../types';

/**
 * Vẽ "thẻ card" review (bìa tím + điểm + bảng điểm + nhân vật chính) thành ảnh PNG
 * bằng Canvas 2D thuần – không cần thư viện ngoài, không dính lỗi CORS / CSS.
 */

type Ctx = CanvasRenderingContext2D;

const FONT = '"Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const W = 1080; // chiều rộng ảnh (px logic)
const SCALE = 2; // xuất @2x cho nét
const OUTER = 36; // lề nền matcha quanh thẻ
const PAD = 52; // padding trong thẻ

const C = {
  matchaBg: '#eef5dc',
  lime300: '#bef264',
  lime200: '#d9f99d',
  lime500: '#84cc16',
  lime600: '#65a30d',
  limeInk: '#1a2e05',
  purple200: '#e9d5ff',
  purple300: '#d8b4fe',
  purple500: '#a855f7',
  white: '#ffffff',
};

/* ───────────────────────── helpers ───────────────────────── */

function setFont(ctx: Ctx, weight: number | string, size: number, italic = false) {
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT}`;
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function ellipsize(ctx: Ctx, text: string, maxW: number) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s.replace(/[\s,.;:]+$/, '') + '…';
}

function wrapLines(ctx: Ctx, text: string, maxW: number, maxLines = Infinity): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (!cur || ctx.measureText(test).width <= maxW) {
      cur = test;
    } else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines - 1);
    // dòng cuối: gộp phần còn lại rồi cắt cho vừa + dấu …
    let last = lines.slice(maxLines - 1).join(' ');
    while (last.length > 1 && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
    kept.push(last.replace(/[\s,.;:]+$/, '') + '…');
    return kept;
  }
  return lines;
}

/** Rút gọn đoạn văn: lấy mệnh đề đầu cho gọn, không cắt cụt giữa chừng */
function shorten(text: string, maxChars: number) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= maxChars) return t;
  const slice = t.slice(0, maxChars);
  const lastComma = Math.max(slice.lastIndexOf(','), slice.lastIndexOf(';'));
  if (lastComma > 30) return slice.slice(0, lastComma) + '.';
  const lastSpace = slice.lastIndexOf(' ');
  return slice.slice(0, lastSpace > 0 ? lastSpace : maxChars) + '…';
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function starPath(ctx: Ctx, cx: number, cy: number, outer: number, inner: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function limeGradient(ctx: Ctx, x: number, y: number, w: number) {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, C.lime500);
  g.addColorStop(1, C.lime600);
  return g;
}

/** Vẽ pill, trả về chiều rộng. */
function pill(
  ctx: Ctx,
  x: number,
  y: number,
  text: string,
  o: {
    h: number;
    padX: number;
    size: number;
    weight?: number;
    bg: string | CanvasGradient;
    color: string;
    border?: string;
    upper?: boolean;
    spacing?: number;
    maxW?: number;
  },
  draw = true
) {
  setFont(ctx, o.weight ?? 600, o.size);
  ctx.letterSpacing = o.spacing ? `${o.spacing}px` : '0px';
  const label = o.upper ? text.toUpperCase() : text;
  const maxText = o.maxW ? o.maxW - o.padX * 2 : Infinity;
  const shown = ellipsize(ctx, label, maxText);
  const w = ctx.measureText(shown).width + o.padX * 2;
  if (draw) {
    rr(ctx, x, y, w, o.h, o.h / 2);
    ctx.fillStyle = o.bg;
    ctx.fill();
    if (o.border) {
      ctx.strokeStyle = o.border;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.fillStyle = o.color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(shown, x + o.padX, y + o.h / 2 + 1);
  }
  ctx.letterSpacing = '0px';
  return w;
}

function sectionHeading(ctx: Ctx, x: number, y: number, text: string) {
  setFont(ctx, 700, 19);
  ctx.letterSpacing = '3px';
  ctx.fillStyle = C.lime300;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.letterSpacing = '0px';
}

/* ───────────────────────── layout / draw ───────────────────────── */

interface Assets {
  cover: HTMLImageElement | null;
}

function render(ctx: Ctx, record: SavedReviewRecord, assets: Assets, draw: boolean, totalH: number): number {
  const { book, review } = record;
  const cardX = OUTER;
  const cardW = W - OUTER * 2;
  const x0 = cardX + PAD;
  const innerW = cardW - PAD * 2;
  const cardY = OUTER;

  /* ---- nền thẻ ---- */
  if (draw) {
    ctx.fillStyle = C.matchaBg;
    ctx.fillRect(0, 0, W, totalH);

    ctx.save();
    ctx.shadowColor = 'rgba(46, 8, 84, 0.28)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    rr(ctx, cardX, cardY, cardW, totalH - OUTER * 2, 44);
    ctx.fillStyle = '#3b0764';
    ctx.fill();
    ctx.restore();

    ctx.save();
    rr(ctx, cardX, cardY, cardW, totalH - OUTER * 2, 44);
    ctx.clip();
    const bg = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + totalH);
    bg.addColorStop(0, '#2e0854');
    bg.addColorStop(0.5, '#4c1190');
    bg.addColorStop(1, '#1d3b0a');
    ctx.fillStyle = bg;
    ctx.fillRect(cardX, cardY, cardW, totalH);

    const glow1 = ctx.createRadialGradient(cardX + cardW, cardY, 0, cardX + cardW, cardY, 460);
    glow1.addColorStop(0, 'rgba(132, 204, 22, 0.22)');
    glow1.addColorStop(1, 'rgba(132, 204, 22, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(cardX, cardY, cardW, totalH);

    const glow2 = ctx.createRadialGradient(cardX, cardY + totalH, 0, cardX, cardY + totalH, 520);
    glow2.addColorStop(0, 'rgba(168, 85, 247, 0.28)');
    glow2.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(cardX, cardY, cardW, totalH);
    ctx.restore();

    // viền mảnh
    rr(ctx, cardX, cardY, cardW, totalH - OUTER * 2, 44);
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /* ---- HERO ---- */
  const heroTop = cardY + PAD;
  const coverW = 270;
  const coverX = x0;
  const coverY = heroTop + 16; // chừa chỗ cho chip điểm
  let coverH = 380;
  if (assets.cover) {
    const ratio = assets.cover.naturalHeight / assets.cover.naturalWidth;
    coverH = Math.max(300, Math.min(400, coverW * ratio));
  }

  if (draw) {
    // bóng + khung bìa
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 14;
    rr(ctx, coverX, coverY, coverW, coverH, 24);
    ctx.fillStyle = '#1e0538';
    ctx.fill();
    ctx.restore();

    ctx.save();
    rr(ctx, coverX, coverY, coverW, coverH, 24);
    ctx.clip();
    if (assets.cover) {
      const iw = assets.cover.naturalWidth;
      const ih = assets.cover.naturalHeight;
      const scale = Math.max(coverW / iw, coverH / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.drawImage(assets.cover, coverX + (coverW - dw) / 2, coverY + (coverH - dh) / 2, dw, dh);
    } else {
      const fg = ctx.createLinearGradient(coverX, coverY, coverX + coverW, coverY + coverH);
      fg.addColorStop(0, '#6b21a8');
      fg.addColorStop(0.5, '#3b0764');
      fg.addColorStop(1, '#365314');
      ctx.fillStyle = fg;
      ctx.fillRect(coverX, coverY, coverW, coverH);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      setFont(ctx, 700, 28);
      ctx.fillStyle = C.white;
      const tl = wrapLines(ctx, book.title, coverW - 56, 4);
      const th = tl.length * 36;
      tl.forEach((l, i) => ctx.fillText(l, coverX + coverW / 2, coverY + coverH / 2 - th / 2 + i * 36));
      setFont(ctx, 500, 18);
      ctx.fillStyle = C.lime200;
      ctx.fillText(ellipsize(ctx, book.author, coverW - 56), coverX + coverW / 2, coverY + coverH - 64);
      setFont(ctx, 700, 13);
      ctx.letterSpacing = '3px';
      ctx.fillStyle = C.lime300;
      ctx.fillText('EPUB REVIEW', coverX + coverW / 2, coverY + 26);
      ctx.letterSpacing = '0px';
    }
    ctx.restore();

    rr(ctx, coverX, coverY, coverW, coverH, 24);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 5;
    ctx.stroke();

    // chip điểm – luôn nằm TRÊN bìa
    const scoreText = String(review.overallScore);
    setFont(ctx, 800, 30);
    const tw = ctx.measureText(scoreText).width;
    const chipW = tw + 24 + 44 + 20;
    const chipH = 52;
    const chipX = coverX + coverW - chipW + 18;
    const chipY = coverY - 22;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    rr(ctx, chipX, chipY, chipW, chipH, chipH / 2);
    ctx.fillStyle = limeGradient(ctx, chipX, chipY, chipW);
    ctx.fill();
    ctx.restore();
    rr(ctx, chipX, chipY, chipW, chipH, chipH / 2);
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    starPath(ctx, chipX + 34, chipY + chipH / 2 + 1, 12, 5);
    ctx.fillStyle = C.limeInk;
    ctx.fill();
    ctx.fillStyle = C.limeInk;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(scoreText, chipX + 54, chipY + chipH / 2 + 2);
  }

  // thông số dưới bìa
  let sy = coverY + coverH + 22;
  const stats = [
    `${book.totalWords.toLocaleString('en-US')} từ`,
    review.estimatedReadTime,
  ].filter(Boolean);
  for (const s of stats) {
    const w = pill(
      ctx,
      0,
      0,
      s,
      { h: 38, padX: 20, size: 17, weight: 500, bg: 'rgba(255,255,255,0.12)', color: C.purple200, maxW: coverW },
      false
    );
    if (draw) {
      pill(ctx, coverX + (coverW - w) / 2, sy, s, {
        h: 38,
        padX: 20,
        size: 17,
        weight: 500,
        bg: 'rgba(255,255,255,0.12)',
        color: C.purple200,
        maxW: coverW,
      });
    }
    sy += 38 + 10;
  }
  const coverBottom = sy - 10;

  /* ---- cột phải ---- */
  const rx = coverX + coverW + 48;
  const rw = x0 + innerW - rx;
  let ry = heroTop + 4;

  // thể loại
  {
    let px = rx;
    let py = ry;
    const tags = [
      { t: review.genre, main: true },
      ...(review.subGenres || []).slice(0, 3).map((t) => ({ t, main: false })),
    ];
    for (const tag of tags) {
      const opts = tag.main
        ? { h: 36, padX: 18, size: 15, weight: 700, spacing: 1, upper: true, bg: 'rgba(190,242,100,0.18)', border: 'rgba(190,242,100,0.5)', color: C.lime300, maxW: rw }
        : { h: 36, padX: 16, size: 16, weight: 500, bg: 'rgba(107,33,168,0.55)', color: C.purple200, maxW: rw };
      const w = pill(ctx, 0, 0, tag.t, opts, false);
      if (px + w > rx + rw && px > rx) {
        px = rx;
        py += 36 + 10;
      }
      if (draw) pill(ctx, px, py, tag.t, opts);
      px += w + 10;
    }
    ry = py + 36 + 26;
  }

  // tiêu đề
  setFont(ctx, 800, 56);
  const titleLines = wrapLines(ctx, book.title, rw, 3);
  if (draw) {
    ctx.fillStyle = C.white;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    titleLines.forEach((l, i) => ctx.fillText(l, rx, ry + i * 68));
  }
  ry += titleLines.length * 68 + 10;

  // tác giả
  {
    setFont(ctx, 500, 25);
    const label = 'Tác giả: ';
    const lw = ctx.measureText(label).width;
    setFont(ctx, 700, 25);
    const name = ellipsize(ctx, book.author, rw - lw);
    if (draw) {
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      setFont(ctx, 500, 25);
      ctx.fillStyle = C.lime300;
      ctx.fillText(label, rx, ry);
      setFont(ctx, 700, 25);
      ctx.fillStyle = C.white;
      ctx.fillText(name, rx + lw, ry);
    }
    ry += 34;
    if (book.publisher) {
      setFont(ctx, 400, 17);
      if (draw) {
        ctx.fillStyle = C.purple300;
        ctx.fillText(ellipsize(ctx, book.publisher, rw), rx, ry);
      }
      ry += 26;
    }
    ry += 14;
  }

  // tagline
  {
    setFont(ctx, 400, 23, true);
    const padT = 20;
    const tl = wrapLines(ctx, `“${review.tagline}”`, rw - 56, 4);
    const lh = 33;
    const h = padT * 2 + tl.length * lh;
    if (draw) {
      rr(ctx, rx, ry, rw, h, 20);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fill();
      ctx.save();
      rr(ctx, rx, ry, rw, h, 20);
      ctx.clip();
      ctx.fillStyle = C.lime300;
      ctx.fillRect(rx, ry, 6, h);
      ctx.restore();
      setFont(ctx, 400, 23, true);
      ctx.fillStyle = '#f3e8ff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      tl.forEach((l, i) => ctx.fillText(l, rx + 32, ry + padT + i * lh + 2));
    }
    ry += h + 22;
  }

  // verdict
  {
    const opts = { h: 50, padX: 28, size: 22, weight: 700, bg: limeGradient(ctx, rx, ry, 300), color: C.limeInk, maxW: rw };
    if (draw) pill(ctx, rx, ry, review.verdict, opts);
    ry += 50 + 18;
  }

  // đối tượng độc giả
  {
    setFont(ctx, 700, 18);
    const lines = wrapLines(ctx, review.targetAudience, rw - 40, 3);
    const lh = 27;
    const h = 20 + 22 + lines.length * lh + 16;
    if (draw) {
      rr(ctx, rx, ry, rw, h, 18);
      ctx.fillStyle = 'rgba(88,28,135,0.55)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(168,85,247,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      setFont(ctx, 600, 14);
      ctx.letterSpacing = '2px';
      ctx.fillStyle = C.purple300;
      ctx.fillText('DÀNH CHO', rx + 20, ry + 16);
      ctx.letterSpacing = '0px';
      setFont(ctx, 700, 18);
      ctx.fillStyle = C.lime200;
      lines.forEach((l, i) => ctx.fillText(l, rx + 20, ry + 42 + i * lh));
    }
    ry += h;
  }

  let y = Math.max(coverBottom, ry) + 40;

  /* ---- BẢNG ĐIỂM ---- */
  const scores = (review.scoreBreakdown || []).slice(0, 6);
  if (scores.length) {
    if (draw) {
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(x0, y, innerW, 2);
    }
    y += 34;

    // heading + tổng điểm
    if (draw) {
      sectionHeading(ctx, x0, y + 20, 'Bảng điểm');
      const t = `${review.overallScore}/10`;
      setFont(ctx, 800, 24);
      const tw = ctx.measureText(t).width + 36;
      const bx = x0 + innerW - tw;
      rr(ctx, bx, y, tw, 42, 21);
      ctx.fillStyle = 'rgba(190,242,100,0.16)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(190,242,100,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = C.lime300;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t, bx + tw / 2, y + 22);
    }
    y += 42 + 26;

    const gap = 40;
    const colW = (innerW - gap) / 2;
    const rowH = 64;
    const rowGap = 20;
    scores.forEach((s, i) => {
      const isLastOdd = scores.length % 2 === 1 && i === scores.length - 1;
      const col = isLastOdd ? 0 : i % 2;
      const row = isLastOdd ? Math.ceil(scores.length / 2) - 1 : Math.floor(i / 2);
      const w = isLastOdd ? innerW : colW;
      const cx = x0 + col * (colW + gap);
      const cy = y + row * (rowH + rowGap);
      if (!draw) return;

      setFont(ctx, 600, 20);
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      const valueText = `${s.score}/10`;
      setFont(ctx, 800, 20);
      const vw = ctx.measureText(valueText).width;
      setFont(ctx, 600, 20);
      ctx.fillStyle = C.white;
      ctx.fillText(ellipsize(ctx, s.category, w - vw - 16), cx, cy);
      setFont(ctx, 800, 20);
      ctx.fillStyle = C.lime300;
      ctx.textAlign = 'right';
      ctx.fillText(valueText, cx + w, cy);

      const by = cy + 40;
      rr(ctx, cx, by, w, 14, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fill();
      const fw = Math.max(14, (w * Math.min(10, Math.max(0, s.score))) / 10);
      const g = ctx.createLinearGradient(cx, 0, cx + w, 0);
      g.addColorStop(0, '#9333ea');
      g.addColorStop(1, C.lime500);
      rr(ctx, cx, by, fw, 14, 7);
      ctx.fillStyle = g;
      ctx.fill();
    });
    const rows = Math.ceil(scores.length / 2);
    y += rows * rowH + (rows - 1) * rowGap + 40;
  }

  /* ---- NHÂN VẬT CHÍNH ---- */
  const chars = (review.characters || []).slice(0, 4);
  if (chars.length) {
    if (draw) {
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(x0, y, innerW, 2);
    }
    y += 34;
    if (draw) sectionHeading(ctx, x0, y + 12, 'Nhân vật chính');
    y += 24 + 24;

    const gap = 24;
    const colW = (innerW - gap) / 2;
    const padIn = 22;
    const lh = 27;

    // tính chiều cao từng thẻ
    const prepared = chars.map((ch) => {
      setFont(ctx, 400, 18);
      const lines = wrapLines(ctx, shorten(ch.personality, 105), colW - padIn * 2, 3);
      return { ch, lines };
    });
    const rowsCount = Math.ceil(prepared.length / 2);
    for (let r = 0; r < rowsCount; r++) {
      const pair = prepared.slice(r * 2, r * 2 + 2);
      const maxLines = Math.max(...pair.map((p) => p.lines.length));
      const cardH = padIn + 30 + 12 + 30 + 12 + maxLines * lh + padIn - 4;
      pair.forEach((p, ci) => {
        const cx = x0 + ci * (colW + gap);
        if (draw) {
          rr(ctx, cx, y, colW, cardH, 22);
          ctx.fillStyle = 'rgba(255,255,255,0.07)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.13)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          setFont(ctx, 700, 22);
          ctx.fillStyle = C.white;
          ctx.fillText(ellipsize(ctx, p.ch.name, colW - padIn * 2), cx + padIn, y + padIn);

          pill(ctx, cx + padIn, y + padIn + 30 + 10, p.ch.role, {
            h: 30,
            padX: 14,
            size: 14,
            weight: 700,
            bg: 'rgba(190,242,100,0.16)',
            border: 'rgba(190,242,100,0.45)',
            color: C.lime300,
            maxW: colW - padIn * 2,
          });

          setFont(ctx, 400, 18);
          ctx.fillStyle = '#e9d5ff';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          p.lines.forEach((l, i) => ctx.fillText(l, cx + padIn, y + padIn + 30 + 10 + 30 + 14 + i * lh));
        }
      });
      y += cardH + (r < rowsCount - 1 ? gap : 0);
    }
    y += 36;
  }

  /* ---- chân thẻ ---- */
  {
    if (draw) {
      setFont(ctx, 500, 16);
      ctx.letterSpacing = '1px';
      ctx.fillStyle = 'rgba(216,180,254,0.8)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const date = new Date(record.createdAt).toLocaleDateString('vi-VN');
      ctx.fillText(`MATCHABOOK  •  THẨM ĐỊNH SÁCH  •  ${date}`, cardX + cardW / 2, y);
      ctx.letterSpacing = '0px';
    }
    y += 16 + PAD;
  }

  return y + OUTER; // tổng chiều cao canvas
}

/* ───────────────────────── public API ───────────────────────── */

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load(`400 20px "Be Vietnam Pro"`),
      document.fonts.load(`500 20px "Be Vietnam Pro"`),
      document.fonts.load(`600 20px "Be Vietnam Pro"`),
      document.fonts.load(`700 20px "Be Vietnam Pro"`),
      document.fonts.load(`800 20px "Be Vietnam Pro"`),
      document.fonts.load(`italic 400 20px "Be Vietnam Pro"`),
    ]);
    await document.fonts.ready;
  } catch {
    /* dùng font dự phòng */
  }
}

export async function renderReviewCard(record: SavedReviewRecord): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const cover = record.book.coverDataUrl ? await loadImage(record.book.coverDataUrl) : null;
  const assets: Assets = { cover };

  // Lượt 1: đo chiều cao
  const scratch = document.createElement('canvas');
  scratch.width = W;
  scratch.height = 10;
  const sctx = scratch.getContext('2d')!;
  const totalH = Math.ceil(render(sctx, record, assets, false, 0));

  // Lượt 2: vẽ thật
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = totalH * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  ctx.imageSmoothingQuality = 'high';
  render(ctx, record, assets, true, totalH);
  return canvas;
}

function slugify(s: string) {
  return (
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'review'
  );
}

export async function downloadReviewCard(record: SavedReviewRecord) {
  const canvas = await renderReviewCard(record);
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('Không tạo được ảnh');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `matchabook-${slugify(record.book.title)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
