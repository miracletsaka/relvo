/**
 * lib/review-card-canvas.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Portrait review card — 900×1200 (3:4 aspect, Instagram/social friendly)
 *
 * Layout (top→bottom):
 *
 *   ┌────────────────────────────┐
 *   │  Product image (top ~48%)  │  full-bleed, with bottom fade
 *   ├────────────────────────────┤
 *   │  Company logo + org name   │  logo left if available, name beside/below
 *   │  ─────────────────────── │  thin accent divider
 *   │  [Reviewer photo] Name     │  photo circle left, name right
 *   │  ★ ★ ★ ★ ★               │  stars
 *   │  "Review body text…"       │  wrapped, no word break
 *   │                            │
 *   │  ✓ VERIFIED  [accent pill] │  bottom
 *   └────────────────────────────┘
 *
 * If no product image: full card is navy gradient, no top photo area.
 * If no company logo: org name is shown as large text instead.
 */

export type ReviewCardOptions = {
  authorName:        string;
  rating:            number;
  body:              string;
  reviewerPhotoUrl?: string | null;
  productImageUrl?:  string | null;
  orgName?:          string;
  orgLogoUrl?:       string | null;   // ← NEW: company logo
  primaryColor?:     string;          // default #1a2f4e
  accentColor?:      string;          // default #f59e0b
};

// Portrait 3:4
export const CARD_W = 900;
export const CARD_H = 1200;

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Cannot load: ${url}`));
    img.src = url;
  });
}

/** Clip-and-draw image filling a rounded rect (object-fit: cover) */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
  r = 0
) {
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();

  const ir = img.naturalWidth / img.naturalHeight;
  const br = w / h;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (ir > br) { sw = sh * br; sx = (img.naturalWidth - sw) / 2; }
  else          { sh = sw / br; sy = (img.naturalHeight - sh) / 2; }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

/** Rounded-rect path helper */
function rr(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, radius: number
) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x,     y,     x + r, y);
  ctx.closePath();
}

/**
 * Wrap text into lines that fit maxWidth — never breaks mid-word.
 * Returns array of {line, y} with pre-calculated positions.
 */
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words  = text.split(" ");
  const lines: string[] = [];
  let cur = "";

  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    // If a single word is already wider than maxWidth, push it alone
    if (ctx.measureText(test).width > maxWidth) {
      if (cur) lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function drawReviewCard(
  canvas: HTMLCanvasElement,
  opts: ReviewCardOptions
): Promise<void> {
  canvas.width  = CARD_W;
  canvas.height = CARD_H;

  const ctx = canvas.getContext("2d")!;

  const navy    = opts.primaryColor || "#1a2f4e";
  const accent  = opts.accentColor  || "#f59e0b";
  const white   = "#ffffff";
  const PAD     = 52;   // horizontal padding inside card
  const INNER_W = CARD_W - PAD * 2;

  // Pre-load all images (fail gracefully)
  const [reviewerImg, productImg, logoImg] = await Promise.all([
    opts.reviewerPhotoUrl ? loadImg(opts.reviewerPhotoUrl).catch(() => null) : null,
    opts.productImageUrl  ? loadImg(opts.productImageUrl).catch(() => null)  : null,
    opts.orgLogoUrl       ? loadImg(opts.orgLogoUrl).catch(() => null)       : null,
  ]);

  // ── 1. Outer card background ───────────────────────────────────────────────
  // Warm off-white outer shell
  ctx.fillStyle = "#f0eeeb";
  rr(ctx, 0, 0, CARD_W, CARD_H, 36);
  ctx.fill();

  const INSET = 16;  // gap between outer shell and inner card
  const IW    = CARD_W - INSET * 2;
  const IH    = CARD_H - INSET * 2;
  const IX    = INSET;
  const IY    = INSET;

  // ── 2. Inner navy card ─────────────────────────────────────────────────────
  const navyGrad = ctx.createLinearGradient(IX, IY, IX, IY + IH);
  navyGrad.addColorStop(0,   lighten(navy, 12));
  navyGrad.addColorStop(0.6, navy);
  navyGrad.addColorStop(1,   darken(navy, 16));
  ctx.fillStyle = navyGrad;
  rr(ctx, IX, IY, IW, IH, 26);
  ctx.fill();

  // ── 3. Product / hero image — top portion ─────────────────────────────────
  const HAS_PRODUCT = !!productImg;
  const PHOTO_H     = HAS_PRODUCT ? Math.round(CARD_H * 0.40) : 0;  // top 40%
  const CONTENT_Y   = IY + PHOTO_H;

  if (productImg) {
    // Draw image clipped to the top rounded section of the inner card
    ctx.save();
    rr(ctx, IX, IY, IW, IH, 26);
    ctx.clip();
    drawCover(ctx, productImg, IX, IY, IW, PHOTO_H + 40, 0);  // +40 to avoid gap
    ctx.restore();

    // Gradient fade from image into navy panel
    const fadeGrad = ctx.createLinearGradient(0, CONTENT_Y - 140, 0, CONTENT_Y + 20);
    fadeGrad.addColorStop(0, `${navy}00`);
    fadeGrad.addColorStop(1, navy);
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(IX, CONTENT_Y - 140, IW, 160);
  }

  // ── 4. Company logo + org name row ────────────────────────────────────────
  let cy = CONTENT_Y + (HAS_PRODUCT ? 28 : 52);

  if (logoImg) {
    // Logo — max 120×48, fit contain
    const MAX_LW = 140;
    const MAX_LH = 52;
    const lr     = logoImg.naturalWidth / logoImg.naturalHeight;
    let lw = MAX_LW, lh = MAX_LH;
    if (lr > MAX_LW / MAX_LH) lh = Math.round(lw / lr);
    else                       lw = Math.round(lh * lr);

    // White pill background for logo
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    rr(ctx, PAD - 6, cy - 6, lw + 12, lh + 12, 10);
    ctx.fill();

    // Draw logo
    ctx.save();
    rr(ctx, PAD, cy, lw, lh, 8);
    ctx.clip();
    ctx.drawImage(logoImg, PAD, cy, lw, lh);
    ctx.restore();

    // Org name beside logo (if both exist)
    if (opts.orgName) {
      ctx.fillStyle    = "rgba(255,255,255,0.60)";
      ctx.font         = `600 22px 'Inter','Helvetica Neue',sans-serif`;
      ctx.textAlign    = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(
        opts.orgName,
        PAD + lw + 14,
        cy + lh / 2,
        INNER_W - lw - 20
      );
    }

    cy += lh + 22;

  } else if (opts.orgName) {
    // No logo — just the org name, larger
    ctx.fillStyle    = "rgba(255,255,255,0.55)";
    ctx.font         = `700 26px 'Inter','Helvetica Neue',sans-serif`;
    ctx.textAlign    = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(opts.orgName, PAD, cy + 26, INNER_W);
    cy += 52;
  }

  // ── 5. Thin accent divider ────────────────────────────────────────────────
  ctx.fillStyle = `${accent}55`;
  ctx.fillRect(PAD, cy, INNER_W, 1.5);
  cy += 20;

  // ── 6. Reviewer photo circle + author name ────────────────────────────────
  const PHOTO_R  = 46;   // circle radius
  const PHOTO_CX = PAD + PHOTO_R;
  const PHOTO_CY = cy + PHOTO_R;

  if (reviewerImg) {
    // Subtle white ring
    ctx.beginPath();
    ctx.arc(PHOTO_CX, PHOTO_CY, PHOTO_R + 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fill();

    // Clip to circle and draw
    ctx.save();
    ctx.beginPath();
    ctx.arc(PHOTO_CX, PHOTO_CY, PHOTO_R, 0, Math.PI * 2);
    ctx.clip();
    const d = PHOTO_R * 2;
    drawCover(ctx, reviewerImg, PHOTO_CX - PHOTO_R, PHOTO_CY - PHOTO_R, d, d, 0);
    ctx.restore();
  } else {
    // Accent colour initials circle
    ctx.beginPath();
    ctx.arc(PHOTO_CX, PHOTO_CY, PHOTO_R, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();

    const initials = (opts.authorName || "?")
      .split(" ").map(w => w[0] || "").slice(0, 2).join("").toUpperCase();
    ctx.fillStyle    = navy;
    ctx.font         = `900 30px 'Inter','Helvetica Neue',sans-serif`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, PHOTO_CX, PHOTO_CY);
  }

  // Author name — to the right of the photo
  const NAME_X = PAD + PHOTO_R * 2 + 20;
  const NAME_W = INNER_W - PHOTO_R * 2 - 20;
  ctx.fillStyle    = white;
  ctx.font         = `800 38px 'Inter','Helvetica Neue',sans-serif`;
  ctx.textAlign    = "left";
  ctx.textBaseline = "middle";
  // Measure and scale down if name too wide
  let nameFontSize = 38;
  while (ctx.measureText(opts.authorName || "").width > NAME_W && nameFontSize > 20) {
    nameFontSize -= 2;
    ctx.font = `800 ${nameFontSize}px 'Inter','Helvetica Neue',sans-serif`;
  }
  ctx.fillText(opts.authorName || "", NAME_X, PHOTO_CY, NAME_W);

  cy = PHOTO_CY + PHOTO_R + 28;

  // ── 7. Stars ──────────────────────────────────────────────────────────────
  const STAR_SIZE = 42;
  const STAR_GAP  = 6;
  const fullStars = Math.round(opts.rating);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle    = i < fullStars ? accent : `${accent}30`;
    ctx.font         = `700 ${STAR_SIZE}px serif`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("★", PAD + i * (STAR_SIZE + STAR_GAP) + STAR_SIZE / 2, cy + STAR_SIZE);
  }
  cy += STAR_SIZE + 24;

  // ── 8. Review body — wrapped, no mid-word breaks ──────────────────────────
  const BODY_FONT_SIZE = 30;
  const BODY_LINE_H    = 46;
  // Reserve space for bottom badge
  const BOTTOM_RESERVE = 90;
  const MAX_BODY_H     = CARD_H - cy - INSET - BOTTOM_RESERVE;
  const MAX_BODY_LINES = Math.floor(MAX_BODY_H / BODY_LINE_H);

  ctx.font      = `italic 700 ${BODY_FONT_SIZE}px Georgia, 'Times New Roman', serif`;
  ctx.fillStyle = white;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const rawBody  = opts.body ? `\u201c${opts.body}\u201d` : "";
  const allLines = wrapLines(ctx, rawBody, INNER_W);
  const visible  = allLines.slice(0, MAX_BODY_LINES);

  // If truncated, replace last line's end with ellipsis
  if (allLines.length > MAX_BODY_LINES && visible.length > 0) {
    const last = visible[visible.length - 1];
    ctx.font = `italic 700 ${BODY_FONT_SIZE}px Georgia, 'Times New Roman', serif`;
    let truncated = last;
    while (ctx.measureText(`${truncated}…\u201d`).width > INNER_W && truncated.length > 10) {
      truncated = truncated.slice(0, -1).trimEnd();
    }
    visible[visible.length - 1] = `${truncated}…\u201d`;
  }

  visible.forEach((line, i) => {
    ctx.fillText(line, PAD, cy + i * BODY_LINE_H + BODY_FONT_SIZE);
  });

  cy += visible.length * BODY_LINE_H + 16;

  // ── 9. Verified badge — bottom right ──────────────────────────────────────
  const BADGE_W = 180;
  const BADGE_H = 44;
  const BADGE_X = CARD_W - INSET - PAD / 2 - BADGE_W;
  const BADGE_Y = CARD_H - INSET - 18 - BADGE_H;

  rr(ctx, BADGE_X, BADGE_Y, BADGE_W, BADGE_H, 22);
  ctx.fillStyle = `${accent}20`;
  ctx.fill();
  rr(ctx, BADGE_X, BADGE_Y, BADGE_W, BADGE_H, 22);
  ctx.strokeStyle = `${accent}70`;
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  ctx.fillStyle    = accent;
  ctx.font         = `800 14px 'Inter', monospace`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("✓  VERIFIED REVIEW", BADGE_X + BADGE_W / 2, BADGE_Y + BADGE_H / 2);

  // ── 10. NeuroFlow watermark — bottom left ─────────────────────────────────
  ctx.fillStyle    = "rgba(255,255,255,0.18)";
  ctx.font         = `600 14px 'Inter', sans-serif`;
  ctx.textAlign    = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Powered by Relvō", INSET + PAD / 2, BADGE_Y + BADGE_H / 2);
}

// ── Colour helpers ─────────────────────────────────────────────────────────────

function adjustHex(hex: string, amt: number): string {
  const h     = hex.replace("#", "");
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const r = clamp(parseInt(h.slice(0,2), 16) + amt);
  const g = clamp(parseInt(h.slice(2,4), 16) + amt);
  const b = clamp(parseInt(h.slice(4,6), 16) + amt);
  return "#" + [r,g,b].map(v => v.toString(16).padStart(2,"0")).join("");
}

function lighten(hex: string, amt: number) { return adjustHex(hex, +amt); }
function darken (hex: string, amt: number) { return adjustHex(hex, -amt); }