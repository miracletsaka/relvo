export function applyLayoutSafety(shapes: any[]) {
  return shapes.map((shape) => {
    const field = String(shape?.dataField || "").toLowerCase();

    // HEADLINES
    if (field.includes("headline") || field.includes("hook")) {
      return {
        ...shape,
        width: Math.min(shape.width || 700, 520),
        fontSize: Math.min(shape.fontSize || 80, 72),
        lineHeight: 0.92,
        textColor: "#f8f5f0",
        shadowBlur: 12,
        shadowColor: "rgba(0,0,0,0.45)",
      };
    }

    // BODY TEXT
    if (
      field.includes("description") ||
      field.includes("subheading")
    ) {
      return {
        ...shape,
        width: Math.min(shape.width || 500, 420),
        fontSize: Math.min(shape.fontSize || 32, 28),
        lineHeight: 1.18,
        textColor: "rgba(255,255,255,0.82)",
      };
    }

    // CTA TEXT
    if (field.includes("cta")) {
      return {
        ...shape,
        fontSize: Math.min(shape.fontSize || 34, 28),
        letterSpacing: 0.5,
      };
    }

    return shape;
  });
}