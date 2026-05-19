import { generateMixedBackground } from "@/lib/templates/shared/backgrounds";
import {
  SKINCARE_CANVAS,
  SKINCARE_BRAND_THEME,
  SKINCARE_POSTER_DIRECTION,
} from "./layout";

export const skincareBackgroundShapes = generateMixedBackground({
  width: SKINCARE_CANVAS.width,
  height: SKINCARE_CANVAS.height,
  safe: SKINCARE_CANVAS.safe,
  theme: SKINCARE_BRAND_THEME,
  direction: SKINCARE_POSTER_DIRECTION,
});