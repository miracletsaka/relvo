const jitter = (base: number, amount: number) => {
  return Math.round(base + (Math.random() * amount * 2 - amount));
};

const pick = <T,>(items: T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const palettes = [
  {
    accent: "#ef4444",
    accentSoft: "rgba(239,68,68,0.13)",
    text: "#ffffff",
    muted: "rgba(255,255,255,0.58)",
    border: "rgba(239,68,68,0.36)",
  },
  {
    accent: "#facc15",
    accentSoft: "rgba(250,204,21,0.12)",
    text: "#ffffff",
    muted: "rgba(255,255,255,0.58)",
    border: "rgba(250,204,21,0.36)",
  },
  {
    accent: "#ffffff",
    accentSoft: "rgba(255,255,255,0.08)",
    text: "#ffffff",
    muted: "rgba(255,255,255,0.48)",
    border: "rgba(255,255,255,0.22)",
  },
];

const palette = pick(palettes);

const logoVariants = [
  {
    x: 1585,
    y: 55,
    width: 160,
    height: 70,
  },
  {
    x: 1545,
    y: 54,
    width: 190,
    height: 78,
  },
  {
    x: 1510,
    y: 62,
    width: 170,
    height: 70,
  },
];

const logo = pick(logoVariants);

const headerLayouts = [
  // CLEAN LOGO ONLY
  () => [
    {
      id: "watch-logo",
      type: "image",
      x: jitter(logo.x, 12),
      y: jitter(logo.y, 8),
      width: logo.width,
      height: logo.height,
      dataField: "logo",
      fit: "contain",
      radius: 0,
      borderWidth: 0,
      zIndex: 30,
    },
  ],

  // LOGO WITH SMALL LABEL
  () => [
    {
      id: "header-label",
      type: "text",
      x: 1220,
      y: 68,
      width: 290,
      height: 28,
      dataField: "campaign_label",
      fontSize: 20,
      fontWeight: 800,
      textColor: palette.muted,
      textAlign: "right",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 3,
      borderWidth: 0,
      zIndex: 30,
    },
    {
      id: "watch-logo",
      type: "image",
      x: jitter(logo.x, 10),
      y: jitter(logo.y, 8),
      width: logo.width,
      height: logo.height,
      dataField: "logo",
      fit: "contain",
      radius: 0,
      borderWidth: 0,
      zIndex: 31,
    },
  ],

  // TOP RIGHT GLASS LOGO CARD
  () => [
    {
      id: "header-logo-card",
      type: "rounded-rect",
      x: 1480,
      y: 36,
      width: 310,
      height: 118,
      backgroundColor: "rgba(255,255,255,0.045)",
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: 28,
      zIndex: 28,
    },
    {
      id: "watch-logo",
      type: "image",
      x: 1548,
      y: 60,
      width: 175,
      height: 70,
      dataField: "logo",
      fit: "contain",
      radius: 0,
      borderWidth: 0,
      zIndex: 31,
    },
  ],

  // EDITORIAL TOP BAR
  () => [
    {
      id: "header-top-line",
      type: "rounded-rect",
      x: 100,
      y: 60,
      width: 420,
      height: 3,
      backgroundColor: palette.accent,
      borderWidth: 0,
      borderRadius: 999,
      opacity: 0.75,
      zIndex: 28,
    },
    {
      id: "header-edition",
      type: "text",
      x: 100,
      y: 80,
      width: 360,
      height: 28,
      dataField: "collection_label",
      fontSize: 20,
      fontWeight: 800,
      textColor: palette.muted,
      textAlign: "left",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 3,
      borderWidth: 0,
      zIndex: 29,
    },
    {
      id: "watch-logo",
      type: "image",
      x: jitter(logo.x, 10),
      y: jitter(logo.y, 8),
      width: logo.width,
      height: logo.height,
      dataField: "logo",
      fit: "contain",
      radius: 0,
      borderWidth: 0,
      zIndex: 31,
    },
  ],

  // MINIMAL CORNER MARK
  () => [
    {
      id: "header-corner-line-a",
      type: "rounded-rect",
      x: 1520,
      y: 58,
      width: 90,
      height: 3,
      backgroundColor: palette.accent,
      borderWidth: 0,
      borderRadius: 999,
      zIndex: 28,
    },
    {
      id: "header-corner-line-b",
      type: "rounded-rect",
      x: 1520,
      y: 58,
      width: 3,
      height: 90,
      backgroundColor: palette.accent,
      borderWidth: 0,
      borderRadius: 999,
      zIndex: 28,
    },
    {
      id: "watch-logo",
      type: "image",
      x: 1600,
      y: 60,
      width: 145,
      height: 62,
      dataField: "logo",
      fit: "contain",
      radius: 0,
      borderWidth: 0,
      zIndex: 31,
    },
  ],
];

export const watchPosterHeaderShapes = pick(headerLayouts)();
