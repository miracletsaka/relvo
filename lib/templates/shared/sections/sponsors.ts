const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const sponsors = ["sponsor_logo_1", "sponsor_logo_2", "sponsor_logo_3"];

const layouts = [
  () =>
    sponsors.map((dataField, index) => ({
      id: `sponsor-logo-${index + 1}`,
      type: "image",
      x: 90 + index * 135,
      y: 1125,
      width: 110,
      height: 54,
      dataField,
      fit: "contain",
      borderWidth: 0,
      zIndex: 38,
    })),

  () =>
    sponsors.map((dataField, index) => ({
      id: `sponsor-logo-${index + 1}`,
      type: "image",
      x: 700,
      y: 1070 + index * 68,
      width: 130,
      height: 48,
      dataField,
      fit: "contain",
      borderWidth: 0,
      zIndex: 38,
    })),

  () =>
    sponsors.map((dataField, index) => ({
      id: `sponsor-logo-${index + 1}`,
      type: "image",
      x: 250 + index * 150,
      y: 1210,
      width: 120,
      height: 48,
      dataField,
      fit: "contain",
      borderWidth: 0,
      zIndex: 38,
    })),
];

export const sponsorLogoSectionShapes = pick(layouts)();