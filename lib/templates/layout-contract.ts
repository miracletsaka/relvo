/**
 * frontend/lib/templates/layout-contract.ts
 *
 * THE SINGLE SOURCE OF TRUTH for where every segment type lives on the canvas.
 *
 * RULE: No segment shape file may define its own absolute Y positions.
 *       All Y values in segment shape files are RELATIVE to their zone's yStart.
 *       The composer (mixed-poster/index.ts) calls rebaseSegment() which adds
 *       the zone's yStart to every shape's Y before they reach the renderer.
 *
 * This means:
 *   - watch header shapes authored at y:0..100  → rendered at y:40..140
 *   - skincare header shapes authored at y:0..100 → ALSO rendered at y:40..140
 *   - Mix any family, header always lands in the header zone. Every time.
 *
 * ZONES are non-overlapping vertical bands.
 * REQUIRED zones are always present. OPTIONAL zones shift the footer down when included.
 */

export interface Zone {
  /** Absolute Y start on the 1080-wide canvas */
  yStart: number;
  /** Maximum height this zone may occupy */
  height: number;
  /** Horizontal padding — shapes should not exceed x: CANVAS_W - hPad */
  hPad: number;
  /** Whether this zone is always rendered */
  required: boolean;
}

export const CANVAS_W = 1080;

/**
 * Zone definitions.
 *
 * Layout logic (portrait 1080-wide):
 *
 *   0    ┌─────────────────────┐
 *        │  BACKGROUND         │  full bleed, always behind everything
 *   0    ├─────────────────────┤
 *  40    │  HEADER             │  brand name / logo / tagline        h:120
 * 160    │  HERO TEXT          │  main display headline              h:240
 * 400    │  HERO IMAGE         │  product / lifestyle photo          h:420
 * 820    │  OFFER              │  price / discount callout           h:130
 * 950    │  CTA                │  button                             h:100
 *        ├── optional ─────────┤
 *1050    │  FEATURES           │  3-column feature icons             h:110
 *1160    │  SPONSORS           │  logo bar  (alt to features)        h: 80
 *1240    │  CONTACT            │  phone / website / email            h: 80
 *1320    │  SOCIAL             │  social icons                       h: 60
 *        ├─────────────────────┤
 *1380    │  FOOTER             │  legal / brand footer               h:100
 *1480    └─────────────────────┘  (base height, no optionals)
 *
 * With all optionals: 1380 + 110 + 80 + 80 + 60 + 100 = 1610 (unlikely all at once)
 */

export const ZONES: Record<string, Zone> = {
  background: { yStart: 0,    height: 9999, hPad: 0,  required: true  }, // full bleed
  header:     { yStart: 40,   height: 120,  hPad: 40, required: true  },
  "hero-text":{ yStart: 160,  height: 240,  hPad: 40, required: true  },
  "hero-image":{ yStart: 400, height: 420,  hPad: 0,  required: true  },
  offer:      { yStart: 820,  height: 130,  hPad: 40, required: true  },
  cta:        { yStart: 950,  height: 100,  hPad: 40, required: true  },
  // Optional — Y calculated dynamically by buildZoneMap()
  features:   { yStart: 1050, height: 110,  hPad: 40, required: false },
  sponsors:   { yStart: 1050, height: 80,   hPad: 40, required: false }, // same yStart as features — mutually exclusive
  contact:    { yStart: 1160, height: 80,   hPad: 40, required: false },
  social:     { yStart: 1240, height: 60,   hPad: 40, required: false },
  footer:     { yStart: 1300, height: 100,  hPad: 40, required: true  },
};

/** Base canvas height when only required zones are shown */
export const BASE_CANVAS_H = 1400;

// ─── Dynamic zone map ─────────────────────────────────────────────────────────
//
// Call this once per composition with the list of optional sections you're
// actually including. It returns a fresh ZONES map with correct yStart values
// for every optional zone and the final canvas height.

export interface ActiveZones {
  zones: Record<string, Zone>;
  canvasHeight: number;
}

export function buildZoneMap(options: {
  includeFeatures?: boolean;
  includeSponsors?: boolean;  // mutually exclusive with features
  includeContact?: boolean;
  includeSocial?: boolean;
}): ActiveZones {
  const zones: Record<string, Zone> = {};

  // Copy all required zones verbatim
  for (const [key, zone] of Object.entries(ZONES)) {
    if (zone.required) zones[key] = { ...zone };
  }

  // Cursor starts where required zones end (before footer)
  let cursor = ZONES.cta.yStart + ZONES.cta.height; // 1050

  if (options.includeFeatures) {
    zones.features = { ...ZONES.features, yStart: cursor };
    cursor += ZONES.features.height;
  } else if (options.includeSponsors) {
    zones.sponsors = { ...ZONES.sponsors, yStart: cursor };
    cursor += ZONES.sponsors.height;
  }

  if (options.includeContact) {
    zones.contact = { ...ZONES.contact, yStart: cursor };
    cursor += ZONES.contact.height;
  }

  if (options.includeSocial) {
    zones.social = { ...ZONES.social, yStart: cursor };
    cursor += ZONES.social.height;
  }

  // Footer always last
  zones.footer = { ...ZONES.footer, yStart: cursor };
  const canvasHeight = cursor + ZONES.footer.height;

  return { zones, canvasHeight };
}

// ─── Shape rebasing ───────────────────────────────────────────────────────────
//
// This is the core mechanism that makes mixing work.
//
// Each segment's shapes are authored with Y values relative to their zone.
// rebaseSegment() adds the zone's yStart to every shape Y so they land
// in exactly the right place on the final canvas regardless of which
// family authored them.
//
// It also:
//  - Clamps X so shapes don't bleed past hPad margins
//  - Clamps height so shapes don't overflow into the next zone
//  - Stamps _zone metadata on every shape for the intelligence layer

export function rebaseSegment(
  shapes: any[],
  zoneKey: string,
  zone: Zone,
): any[] {
  if (!shapes?.length) return [];

  // Find the bounding box of all shapes to understand the authored coordinate space
  const ys = shapes.map((s) => Number(s.y ?? s.top ?? 0)).filter(Number.isFinite);
  const authoredMinY = ys.length ? Math.min(...ys) : 0;

  return shapes.map((shape) => {
    const rawY  = Number(shape.y ?? shape.top ?? 0);
    const rawX  = Number(shape.x ?? shape.left ?? 0);
    const rawW  = Number(shape.width  ?? 0);
    const rawH  = Number(shape.height ?? 0);

    // Shift Y: subtract authored origin, add zone start
    // This normalises shapes authored at y:80 and shapes authored at y:0 equally
    const rebasedY = zone.yStart + (rawY - authoredMinY);

    // Clamp: shape must not overflow the bottom of its zone
    const maxBottom = zone.yStart + zone.height;
    const clampedH  = rawH > 0 ? Math.min(rawH, maxBottom - rebasedY) : rawH;

    // Clamp X to horizontal padding (background/image zones exempt)
    const xMin = zone.hPad;
    const xMax = CANVAS_W - zone.hPad - rawW;
    const clampedX = zoneKey === "background" || zoneKey === "hero-image"
      ? rawX
      : Math.max(xMin, Math.min(xMax > xMin ? xMax : xMin, rawX));

    return {
      ...shape,
      y:      rebasedY,
      x:      clampedX,
      height: clampedH,
      // Metadata for intelligence layer and renderer
      _zone:       zoneKey,
      _zoneBounds: zone,
      _layoutBand: { yStart: zone.yStart, height: zone.height },
    };
  });
}

// ─── Segment type → zone key mapping ─────────────────────────────────────────
//
// Maps the requested_type field on a section to the zone key.
// Add entries here when adding new segment types.

export const SEGMENT_TYPE_TO_ZONE: Record<string, string> = {
  background:   "background",
  scene:        "hero-image",   // scene shapes share the image zone
  "hero-image": "hero-image",
  header:       "header",
  "hero-text":  "hero-text",
  offer:        "offer",
  cta:          "cta",
  features:     "features",
  sponsors:     "sponsors",
  contact:      "contact",
  social:       "social",
  footer:       "footer",
};