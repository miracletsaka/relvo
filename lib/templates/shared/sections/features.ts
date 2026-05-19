const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const fields = ["feature_1", "feature_2", "feature_3"];

const layouts = [
  () =>
    fields.map((dataField, index) => ({
      id: `feature-${index + 1}`,
      type: "text",
      x: 90 + index * 300,
      y: 1040,
      width: 260,
      height: 42,
      dataField,
      fontSize: 20,
      fontWeight: 800,
      textColor: "rgba(255,255,255,0.84)",
      textAlign: "left",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1.2,
      letterSpacing: 1,
      borderWidth: 0,
      zIndex: 39,
    })),

  () =>
    fields.map((dataField, index) => ({
      id: `feature-${index + 1}`,
      type: "text",
      x: 760,
      y: 710 + index * 68,
      width: 240,
      height: 48,
      dataField,
      fontSize: 18,
      fontWeight: 800,
      textColor: "rgba(255,255,255,0.84)",
      textAlign: "right",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1.2,
      letterSpacing: 1,
      borderWidth: 0,
      zIndex: 39,
    })),

  () => [
    {
      id: "features-card",
      type: "rounded-rect",
      x: 90,
      y: 1010,
      width: 900,
      height: 110,
      backgroundColor: "rgba(255,255,255,0.055)",
      borderColor: "rgba(255,255,255,0.10)",
      borderWidth: 1,
      borderRadius: 28,
      zIndex: 37,
    },
    ...fields.map((dataField, index) => ({
      id: `feature-${index + 1}`,
      type: "text",
      x: 130 + index * 290,
      y: 1048,
      width: 240,
      height: 42,
      dataField,
      fontSize: 18,
      fontWeight: 900,
      textColor: "rgba(255,255,255,0.84)",
      textAlign: "center",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1.2,
      letterSpacing: 1,
      borderWidth: 0,
      zIndex: 39,
    })),
  ],
];

export const featuresSectionShapes = pick(layouts)();