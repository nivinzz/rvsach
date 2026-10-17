import { BookReview, SavedReviewRecord } from '../types';

/** Chỉ trả về dữ liệu cộng đồng đã được tìm bằng nguồn thật (status = found). */
export function getVerifiedCommunity(review: SavedReviewRecord['review']) {
  const c = review.communityReviews;
  return c && c.status === 'found' ? c : undefined;
}

function ratingsText(review: SavedReviewRecord['review']): string {
  const c = getVerifiedCommunity(review);
  return (c?.ratings || [])
    .map(r => `${r.platform} ${r.score}${r.count ? ` (${r.count})` : ''}`)
    .join(' • ');
}

function escHtml(t: string): string {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Format for Social Media (Facebook, Threads, Instagram)
 * Includes real community/Goodreads rating and character profiles.
 */
export function formatForSocialMedia(record: SavedReviewRecord): string {
  const { book, review } = record;
  const scoreStars = '★'.repeat(Math.round(review.overallScore / 2)) + '☆'.repeat(5 - Math.round(review.overallScore / 2));

  let text = `REVIEW SÁCH: ${book.title.toUpperCase()}\n`;
  text += `Tác giả: ${book.author}\n`;
  text += `Thể loại: ${review.genre} (${review.subGenres.join(', ')})\n`;
  text += `Đánh giá chuyên gia: ${review.overallScore}/10 ${scoreStars} — ${review.verdict}\n`;

  if (ratingsText(review)) {
    text += `Điểm cộng đồng: ${ratingsText(review)}\n`;
  }
  text += `\n`;

  text += `"${review.tagline}"\n\n`;

  text += `✦ ĐÔI NÉT VỀ TÁC PHẨM:\n${review.overview}\n\n`;

  if (review.characters && review.characters.length > 0) {
    text += `✦ HỆ THỐNG NHÂN VẬT & TÍNH CÁCH:\n`;
    review.characters.forEach(c => {
      text += `  • ${c.name} (${c.role}): ${c.personality}\n`;
    });
    text += `\n`;
  }

  text += `✦ VĂN PHONG & NGHỆ THUẬT TRẦN THUẬT:\n${review.narrativeStyle}\n\n`;

  text += `✦ CHIỀU SÂU TÂM LÝ:\n${review.characterDepth}\n\n`;

  if (getVerifiedCommunity(review)?.summary) {
    text += `✦ GÓC NHÌN TỪ ĐỘC GIẢ & CỘNG ĐỒNG (tổng hợp từ nguồn thật):\n${getVerifiedCommunity(review)!.summary}\n\n`;
  }

  text += `✦ ĐIỂM SÁNG NỔI BẬT (~70%):\n`;
  review.strengths.forEach(s => {
    text += `  ✓ ${s}\n`;
  });
  text += `\n`;

  text += `✦ NHƯỢC ĐIỂM & ĐIỂM TRỪ CĂN KE (~30%):\n`;
  review.limitations.forEach(l => {
    text += `  ! ${l}\n`;
  });
  text += `\n`;

  text += `✦ AI NÊN ĐỌC CUỐN SÁCH NÀY?\n${review.targetAudience}\n\n`;

  text += `✦ KẾT LUẬN:\n${review.readingVerdict}\n\n`;

  const safeTitleTag = book.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '');
  const safeAuthorTag = book.author.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '');
  text += `#ReviewSach #SachHayNenDoc #${safeTitleTag} #${safeAuthorTag} #DocSachMoiNgay`;

  return text;
}

/**
 * Format for Blogspot / Website (Self-contained, beautiful Inline HTML)
 */
export function formatForBlogspotHtml(record: SavedReviewRecord): string {
  const { book, review } = record;

  const coverHtml = book.coverDataUrl
    ? `<div style="text-align: center; margin-bottom: 24px;">
        <img src="${book.coverDataUrl}" alt="${book.title}" style="max-height: 380px; width: auto; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(88, 28, 135, 0.25); border: 3px solid #f3e8ff; display: inline-block;" />
      </div>`
    : '';

  const scoresHtml = review.scoreBreakdown
    .map(
      s => `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; color: #4c1d95; margin-bottom: 4px;">
          <span>${s.category}</span>
          <span style="color: #65a30d;">${s.score}/10</span>
        </div>
        <div style="background-color: #f3e8ff; height: 8px; border-radius: 999px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #7c3aed, #84cc16); width: ${s.score * 10}%; height: 100%; border-radius: 999px;"></div>
        </div>
        ${s.comment ? `<p style="font-size: 13px; color: #6b7280; margin: 4px 0 0 0;">${s.comment}</p>` : ''}
      </div>`
    )
    .join('');

  const themesHtml = review.coreThemes
    .map(
      t => `
      <span style="display: inline-block; background-color: #f7fee7; color: #3f6212; border: 1px solid #d9f99d; padding: 4px 10px; border-radius: 999px; font-size: 13px; font-weight: 500; margin: 0 6px 6px 0;">
        ${t}
      </span>`
    )
    .join('');

  const charactersHtml = (review.characters && review.characters.length > 0)
    ? `<div style="background: #ffffff; padding: 22px; border-radius: 14px; margin-bottom: 24px; border: 1px solid #f3e8ff;">
        <h2 style="font-size: 19px; color: #581c87; margin-top: 0; margin-bottom: 14px; font-weight: 700;">
          Hồ sơ Nhân vật & Tuyến Tính cách
        </h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
          ${review.characters.map(c => `
            <div style="background: #faf5ff; border: 1px solid #e9d5ff; padding: 14px; border-radius: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                <strong style="color: #4c1d95; font-size: 15px;">${c.name}</strong>
                <span style="font-size: 12px; color: #65a30d; font-weight: 600;">${c.role}</span>
              </div>
              <p style="font-size: 13px; color: #374151; margin: 0 0 4px 0; line-height: 1.5;">${c.personality}</p>
              ${c.description ? `<p style="font-size: 12px; color: #6b7280; margin: 0; font-style: italic;">${c.description}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </div>`
    : '';

  const strengthsHtml = review.strengths
    .map(s => `<li style="margin-bottom: 6px; color: #374151;">${s}</li>`)
    .join('');

  const limitationsHtml = review.limitations
    .map(l => `<li style="margin-bottom: 6px; color: #4b5563;">${l}</li>`)
    .join('');

  const comm = getVerifiedCommunity(review);
  const communityHtml = comm
    ? `<div style="background: #fdf4ff; border: 1px solid #f0abfc; padding: 20px; border-radius: 14px; margin-bottom: 24px;">
        <h3 style="color: #701a75; font-size: 16px; margin: 0 0 8px 0; font-weight: 700;">
          Đánh giá thực tế từ độc giả & diễn đàn ${ratingsText(review) ? `(${escHtml(ratingsText(review))})` : ''}
        </h3>
        ${comm.summary ? `<p style="font-size: 14px; line-height: 1.7; color: #4a044e; margin: 0 0 10px 0;">${escHtml(comm.summary)}</p>` : ''}
        ${(comm.realQuotes || [])
          .map(
            q =>
              `<blockquote style="margin: 8px 0; padding: 8px 12px; border-left: 3px solid #a855f7; font-size: 13.5px; font-style: italic; color: #4a044e;">“${escHtml(q.text)}”<br/><span style="font-style: normal; font-size: 12px; color: #86198f;">— ${escHtml(q.source)}${q.language && q.language !== 'vi' ? ` (dịch từ ${escHtml(q.language)})` : ''}</span></blockquote>`
          )
          .join('')}
      </div>`
    : '';

  const editorialParagraphsHtml = review.fullEditorialReview
    .split(/\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="line-height: 1.8; color: #1f2937; margin-bottom: 16px; font-size: 16px; text-align: justify;">${p}</p>`)
    .join('');

  return `<!-- Bài Review Sách Hoàn Chỉnh -->
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 780px; margin: 0 auto; padding: 28px; background: #faf7fc; border-radius: 18px; border: 1px solid #e9d5ff; color: #1e1b4b;">
  
  ${coverHtml}

  <div style="text-align: center; margin-bottom: 24px;">
    <span style="display: inline-block; background-color: #ede9fe; color: #6b21a8; padding: 4px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
      ${review.genre}
    </span>
    <h1 style="font-size: 28px; font-weight: 700; color: #3b0764; margin: 8px 0 6px 0;">
      ${book.title}
    </h1>
    <p style="font-size: 16px; color: #4d7c0f; font-weight: 600; margin: 0 0 12px 0;">
      Tác giả: ${book.author}
    </p>
    <div style="display: inline-flex; align-items: center; gap: 8px; background: #fdf4ff; border: 1px solid #f0abfc; padding: 6px 16px; border-radius: 999px;">
      <span style="font-size: 18px; font-weight: 800; color: #7e22ce;">${review.overallScore}/10</span>
      <span style="color: #65a30d; font-weight: 600; font-size: 14px;">• ${review.verdict}</span>
    </div>
  </div>

  <div style="background: #ffffff; border-left: 4px solid #84cc16; padding: 16px 20px; border-radius: 0 12px 12px 0; margin-bottom: 24px;">
    <p style="font-style: italic; color: #4c1d95; font-size: 16px; margin: 0; line-height: 1.6;">
      "${review.tagline}"
    </p>
  </div>

  <div style="background: #ffffff; padding: 22px; border-radius: 14px; margin-bottom: 24px; border: 1px solid #f3e8ff;">
    <h2 style="font-size: 19px; color: #581c87; margin-top: 0; margin-bottom: 12px; font-weight: 700;">
      Khái quát tác phẩm
    </h2>
    <p style="line-height: 1.7; color: #374151; font-size: 15px; margin: 0 0 14px 0; text-align: justify; text-justify: inter-word;">
      ${review.overview}
    </p>
    <div style="margin-top: 10px;">
      <strong style="font-size: 14px; color: #581c87; display: block; margin-bottom: 6px;">Chủ đề cốt lõi:</strong>
      ${themesHtml}
    </div>
  </div>

  ${charactersHtml}

  ${communityHtml}

  <div style="background: #ffffff; padding: 22px; border-radius: 14px; margin-bottom: 24px; border: 1px solid #f3e8ff;">
    <h2 style="font-size: 19px; color: #581c87; margin-top: 0; margin-bottom: 12px; font-weight: 700;">
      Điểm số & Phân tích chi tiết
    </h2>
    ${scoresHtml}
  </div>

  <div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
    <div style="flex: 1; min-width: 260px; background: #f7fee7; border: 1px solid #d9f99d; padding: 18px; border-radius: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h3 style="color: #365314; font-size: 16px; margin: 0; font-weight: 700;">
          Ưu điểm & Điểm sáng nổi bật
        </h3>
        <span style="background: #d9f99d; color: #365314; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px;">~70%</span>
      </div>
      <ul style="padding-left: 20px; margin: 0; font-size: 14px; line-height: 1.6;">
        ${strengthsHtml}
      </ul>
    </div>
    <div style="flex: 1; min-width: 260px; background: #fffbeb; border: 1px solid #fde68a; padding: 18px; border-radius: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h3 style="color: #92400e; font-size: 16px; margin: 0; font-weight: 700;">
          Nhược điểm & Góc nhìn căn ke
        </h3>
        <span style="background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px;">~30%</span>
      </div>
      <ul style="padding-left: 20px; margin: 0; font-size: 14px; line-height: 1.6;">
        ${limitationsHtml}
      </ul>
    </div>
  </div>

  <div style="background: #ffffff; padding: 24px; border-radius: 14px; margin-bottom: 24px; border: 1px solid #f3e8ff;">
    <h2 style="font-size: 21px; color: #3b0764; margin-top: 0; margin-bottom: 16px; font-weight: 700; border-bottom: 2px solid #f3e8ff; padding-bottom: 10px;">
      Bài phê bình toàn diện
    </h2>
    ${editorialParagraphsHtml}
  </div>

  <div style="background: linear-gradient(135deg, #4c1d95, #65a30d); color: #ffffff; padding: 22px; border-radius: 14px; text-align: center;">
    <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 18px; font-weight: 700;">
      Kết luận: Đáng đọc hay không?
    </h3>
    <p style="margin: 0; line-height: 1.7; font-size: 15px; opacity: 0.95; text-align: justify; text-justify: inter-word;">
      ${review.readingVerdict}
    </p>
    <div style="margin-top: 12px; font-size: 13px; opacity: 0.85;">
      Dành cho: ${review.targetAudience} • Thời gian đọc ước tính: ${review.estimatedReadTime}
    </div>
  </div>

</div>`;
}

/**
 * Clean plain text format
 */
export function formatForPlainText(record: SavedReviewRecord): string {
  const { book, review } = record;
  let text = `====================================================\n`;
  text += `BÀI PHÊ BÌNH VÀ REVIEW SÁCH: ${book.title.toUpperCase()}\n`;
  text += `Tác giả: ${book.author}\n`;
  text += `Thể loại: ${review.genre} (${review.subGenres.join(', ')})\n`;
  text += `Chấm điểm: ${review.overallScore}/10 — ${review.verdict}\n`;
  if (ratingsText(review)) {
    text += `Điểm cộng đồng: ${ratingsText(review)}\n`;
  }
  text += `Ước tính thời gian đọc: ${review.estimatedReadTime}\n`;
  text += `====================================================\n\n`;

  text += `THÔNG ĐIỆP CHỦ ĐẠO:\n${review.tagline}\n\n`;

  text += `1. KHÁI QUÁT TÁC PHẨM & BỐI CẢNH:\n${review.overview}\n\n`;

  if (review.characters && review.characters.length > 0) {
    text += `2. HỆ THỐNG NHÂN VẬT & TÍNH CÁCH:\n`;
    review.characters.forEach(c => {
      text += `• ${c.name} [${c.role}]: ${c.personality}\n`;
      if (c.description) text += `  (${c.description})\n`;
    });
    text += `\n`;
  }

  if (review.communityReviews?.summary) {
    text += `3. ĐÁNH GIÁ THỰC TẾ TỪ CỘNG ĐỒNG ĐỘC GIẢ:\n${review.communityReviews.summary}\n\n`;
  }

  text += `4. CÁC CHỦ ĐỀ CỐT LÕI:\n`;
  review.coreThemes.forEach(t => (text += `• ${t}\n`));
  text += `\n`;

  text += `5. VĂN PHONG VÀ NGHỆ THUẬT TRẦN THUẬT:\n${review.narrativeStyle}\n\n`;

  text += `6. CHIỀU SÂU VÀ TÂM LÝ NHÂN VẬT:\n${review.characterDepth}\n\n`;

  text += `7. ĐIỂM SỐ CHI TIẾT THEO TIÊU CHÍ:\n`;
  review.scoreBreakdown.forEach(s => {
    text += `• ${s.category}: ${s.score}/10 (${s.comment})\n`;
  });
  text += `\n`;

  text += `8. ĐÁNH GIÁ CĂN KE (TỶ LỆ 7 ƯU : 3 NHƯỢC):\n`;
  text += `✦ Ưu điểm & Điểm sáng nổi bật (~70%):\n`;
  review.strengths.forEach(s => (text += `  ✓ ${s}\n`));
  text += `✦ Nhược điểm & Hạn chế tác phẩm (~30%):\n`;
  review.limitations.forEach(l => (text += `  ! ${l}\n`));
  text += `\n`;

  text += `9. TOÀN VĂN BÀI PHÊ BÌNH:\n\n${review.fullEditorialReview}\n\n`;

  text += `10. KẾT LUẬN & ĐÁNH GIÁ ĐÁNG ĐỌC:\n${review.readingVerdict}\n`;
  text += `Đối tượng phù hợp: ${review.targetAudience}\n`;

  return text;
}
