// Campaign data structure - holds all user input
export interface CampaignData {
  hook: string
  subheading: string
  bullets: string[]
  proof: string
  cta: string
  ctaLink?: string // Link for CTA button
  hashtags: string
  companyName: string
  location: string
  links?: { label: string; url: string }[] // Additional custom links
}


// Template that contains shapes and logo placement
export interface Template {
  id: string
  name: string
  description: string | undefined
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
  hook: string
  subheading: string
  bullets: string[]
  proof: string
  cta: string
  ctaLink?: string
  hashtags: string
  companyName: string
  location: string
  links?: { label: string; url: string }[]
}

// Template that contains shapes and logo placement
export interface Template {
  id: string
  name: string
  description: string | undefined
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


export type TemplateShape = {
  id: string;
  lineHeight?: number;      // ✅ NEW
  letterSpacing?: number;   // ✅ NEW
  type: TemplateShapeType;
  rotation?: number;
  customText?:string;
  x: number;
  y: number;
  width: number;
  height: number;

  zIndex?: number;
  opacity?: number;

  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;

  // rounded-rect
  borderRadius?: number;

  // text/bullets/button
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  textAlign?: "left" | "center" | "right";
  padding?: number;
  dataField?: string;

  bulletSpacing?: number;
  bulletIndent?: number;
  bulletMarker?: string;

  shadowBlur?: number;
  shadowX?: number;
  shadowY?: number;
  shadowColor?: string;

  // image
  src?: string;
  fit?: "cover" | "contain";
  radius?: number;

  // triangle
  direction?: "up" | "down" | "left" | "right";

  // ✅ NEW: button/link properties
  buttonText?: string;      // Text to display on button
  buttonLink?: string;      // URL to link to
  hoverColor?: string;      // Color on hover

  lineWidth?: number;          // thickness
  lineDash?: number[];         // e.g. [8,6]
  lineCap?: "butt" | "round" | "square";
};
