const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const icons = [
  "/icons/instagram.png",
  "/icons/facebook.png",
  "/icons/linkedin.png",
  "/icons/tiktok.png",
];

const layouts = [
  () =>
    icons.map((src, index) => ({
      id: `social-icon-${index + 1}`,
      type: "image",
      x: 760 + index * 50,
      y: 1235,
      width: 34,
      height: 34,
      src,
      fit: "contain",
      borderWidth: 0,
      zIndex: 40,
    })),

  () =>
    icons.map((src, index) => ({
      id: `social-icon-${index + 1}`,
      type: "image",
      x: 860,
      y: 930 + index * 54,
      width: 32,
      height: 32,
      src,
      fit: "contain",
      borderWidth: 0,
      zIndex: 40,
    })),

  () =>
    icons.map((src, index) => ({
      id: `social-icon-${index + 1}`,
      type: "image",
      x: 90 + index * 48,
      y: 1240,
      width: 30,
      height: 30,
      src,
      fit: "contain",
      borderWidth: 0,
      zIndex: 40,
    })),
];

export const socialIconSectionShapes = pick(layouts)();