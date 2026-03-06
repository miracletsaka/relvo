/**
 * Patch guidance:
 *
 * In your `resolveAnimVariant(segment, styleDNA)` function, add:
 *
 * 1) if segment.animVariant exists, return it
 * 2) else if segment.motionPreset is "dramatic", prefer "slideUp"
 *    if "energetic", prefer "pop" or "kinetic"
 *
 * This makes motion drive text animations deterministically.
 */
