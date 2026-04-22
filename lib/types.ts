

// ─────────────────────────────────────────────────────────────
// TEMPLATE SHAPE TYPE — supports all renderer shape kinds
// ─────────────────────────────────────────────────────────────

export type GradientStop = { stop: number; color: string };
 
export type TemplateShape = {
  id: string;
  type:
    | "text"
    | "image"
    | "rectangle"
    | "rounded-rect"
    | "triangle"
    | "circle"
    | "gradient-overlay"
    | "gradient-line"
    | "glow-blob"
    | "dot-grid"
    | "pattern-overlay"
    | "star"
    | "arc"
    | "wave-line"
    | "cross"
    | "sparkle"
    | "hexagon";
 
  x: number;
  y: number;
  width: number;
  height: number;
 
  zIndex?: number;
  opacity?: number;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  backgroundColor?: string;
 
  // ── Text ────────────────────────────────────────────────────────────────
  text?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
 
  // ── Shadow ───────────────────────────────────────────────────────────────
  shadowBlur?: number;
  shadowX?: number;
  shadowY?: number;
  shadowColor?: string;
 
  // ── Data binding ─────────────────────────────────────────────────────────
  dataField?: string;
 
  // ── Image / slot ─────────────────────────────────────────────────────────
  src?: string;
  slotKey?: string;
  slotType?: "logo" | "image" | "contact"|"sponsor" | "accreditation";
  slotRole?:
    | "hero"
    | "secondary"
    | "reviewer"          // identity photo on review card
    | "product"           // product/showcase image on review card
    | "mockup"            // left phone mockup (showcase template)
    | "mockup_primary"    // right phone mockup (showcase template)
    | "sponsor"           // sponsor logo strip
    | "testimonial"       // identity photo on testimonial card
    | "badge"              // badge icon (e.g. "Top Rated" badge on review card)
    | "accreditation"     // accreditation badge
    | "logo";             // brand/org logo
  slotVisibleWhenEmpty?: boolean;
  fit?: "cover" | "contain";
 
  padding?: number;
  radius?: number;
  direction?: "left" | "right";
 
  // ── Gradient ─────────────────────────────────────────────────────────────
  gradientColors?: GradientStop[];
  gradientAngle?: number;
 
  // ── Glow blob ────────────────────────────────────────────────────────────
  glowRadius?: number;
 
  // ── Dot grid ─────────────────────────────────────────────────────────────
  dotColor?: string;
  dotSpacing?: number;
  dotRadius?: number;
 
  // ── Pattern overlay ───────────────────────────────────────────────────────
  patternType?: "dots" | "lines" | "mesh" | "noise";
  patternColor?: string;
  patternOpacity?: number;
  backgroundPattern?: string;   // "dots" | etc — used by diploma blueprint
  patternSpacing?: number;
 
  // ── Star ─────────────────────────────────────────────────────────────────
  points?: number;
 
  // ── Arc ──────────────────────────────────────────────────────────────────
  startAngle?: number;
  endAngle?: number;
 
  // ── Wave line ────────────────────────────────────────────────────────────
  waveColor?: string;
  waveAmplitude?: number;
  waveFrequency?: number;
};

// Template that contains shapes and logo placement
export interface Template {
  id: string
  name: string
  description?: string | undefined
  backgroundImage?: string | null
  canvasWidth: number
  canvasHeight: number
  shapes: TemplateShape[]
  logoPlacement?: {
    url: string
    x: number
    y: number
    width: number
    height: number
    opacity: number
  }
  createdAt: string
  updatedAt: string
}

// Shape editing state
export interface ShapeEditState {
  selectedShapeId: string | null
  isResizing: boolean
  isDragging: boolean
  dragStart?: { x: number; y: number }
}

// Campaign data structure - holds all user input
export interface CampaignData {
  hook: string;
  subheading: string;
  bullets: string[];
  proof: string;
  cta: string;
  toneName?  : string
  logo?: string;
  heroImage?: string;

  imageSlots?: {
    [key: string]: {
      url?: string;
    };
  };

  ctaLink?: string;
  hashtags: string;
  companyName: string;
  location: string;

  links?: {
    label: string;
    url: string;
  }[];

  sponsors?: {
    name: string;
    logo_url?: string;
    website?: string;
  }[];

  reviews?: {
    author_name: string;
    rating: number;
    body?: string;
    source?: string;
    is_featured?: boolean;
    is_verified?: boolean;
    created_at?: string;
  }[];

  offers?: {
    title: string;
    description?: string;
    cta_text?: string;
    cta_url?: string;
    expires_at?: string;
  }[];

  accreditations?: {
    name: string;
    issuer?: string;
    year?: number;
    logo_url?: string;
  }[];

  businessInfo?: {
    business_type?: string;
    founded_year?: number;
    company_size?: string;
    website?: string;
    address?: string;
    tagline?: string;
    description?: string;

    email_primary?: string;
    email_support?: string;
    phone_primary?: string;
    phone_secondary?: string;
    whatsapp?: string;

    country?: string;
    city?: string;
    state_province?: string;
    postal_code?: string;
    map_url?: string;

    facebook_url?: string;
    instagram_url?: string;
    linkedin_url?: string;
    twitter_url?: string;
    tiktok_url?: string;
    youtube_url?: string;

    registration_no?: string;
    vat_number?: string;
  };

  metadata?: {
    key: string;
    value: string;
    category?: string;
  }[];

  review_text?: string;
  review_author?: string;
  offer_title?: string;
  offer_cta?: string;

  // optional flattened helpers for templates
  website?: string;
  address?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;

  city?: string;
  country?: string;
  fullAddress?: string;

  registration_no?: string;
  vat_number?: string;

  facebook_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  tiktok_url?: string;
  youtube_url?: string;
  map_url?: string;

  // template helper fields
  price_label?: string;
  fine_print?: string;
  enroll_note?: string;

  hook_tag?: string;
  hook_pre?: string;
  hook_number?: string;
  hook_label?: string;
  hook_desc?: string;

  badge_icon?: string;
  deco_icon?: string;

  bullet_1?: string;
  bullet_2?: string;
  bullet_3?: string;

  link_1_label?: string;
  link_1_url?: string;
  link_2_label?: string;
  link_2_url?: string;
  link_3_label?: string;
  link_3_url?: string;

  meta_1_key?: string;
  meta_1_value?: string;
  meta_2_key?: string;
  meta_2_value?: string;
  meta_3_key?: string;
  meta_3_value?: string;
}

export type Tone = {
  id: string;
  name: string;
  label: string;
  description?: string;
  emoji?: string;
  is_active: boolean;
  sort_order: number;
};


export type AITemplateDecision = {
  heroAssetId?: string;
  secondaryAssetId?: string;
  showPrice: boolean;
  showSponsors: boolean;
  showReview: boolean;
  proofText?: string;
};
// Template that contains shapes and logo placement
export interface Template {
  id: string;
  name: string;
  description?: string;
  backgroundImage?: string | null;

  canvasWidth: number;
  canvasHeight: number;

  orientation?: "portrait" | "landscape";

  brand_id?: string | null;
  tone_id?: string | null;

  shapes: TemplateShape[];

  logoPlacement?: {
    url: string;
    x: number;
    y: number;
    width: number;
    height: number;
    opacity: number;
  };

  createdAt: string;
  updatedAt: string;
}

// Shape editing state
export interface ShapeEditState {
  selectedShapeId: string | null
  isResizing: boolean
  isDragging: boolean
  dragStart?: { x: number; y: number }
}

  export type TemplateShapeType =
  | "text"
  | "rectangle"
  | "rounded-rect"
  | "circle"
  | "bullet-group"
  | "image"
  | "triangle"
  | "button"
  | "line"; // ✅ NEW

