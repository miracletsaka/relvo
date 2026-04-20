const INDUSTRY_QUERY_MAP: Record<string, string[]> = {
  // Relvo core
  ai: ["AI business professional technology", "artificial intelligence business team", "machine learning digital office"],
  neuroflow: ["business automation technology professional", "AI digital transformation team", "smart business solutions office"],
  automation: ["business automation workflow professional", "digital process automation team", "smart technology office people"],
  intelligent: ["intelligent business technology team", "smart AI workspace professionals", "digital innovation business people"],
  transform: ["business transformation digital team", "company growth technology professionals", "digital evolution business"],

  // Customer engagement
  customer: ["customer service technology professional", "business customer engagement team", "client success meeting professional"],
  engage: ["customer engagement business team", "client success professionals meeting", "business communication technology"],
  chatbot: ["customer service technology AI", "business communication digital professional", "automated customer support team"],
  whatsapp: ["business messaging communication professional", "mobile business communication team", "professional messaging technology"],
  support: ["customer support team technology", "business help desk professional", "support professionals working technology"],

  // Business growth
  scale: ["business growth scaling team", "startup scaling success professionals", "expanding business technology team"],
  grow: ["business growth professionals celebrating", "company growth success team", "professionals business growth chart"],
  revenue: ["business revenue growth team", "sales success professionals celebrating", "business results team achievement"],
  cost: ["business efficiency team technology", "smart business savings professionals", "optimized operations team working"],

  // Professional / corporate
  business: ["professional business team meeting", "corporate office modern people", "business professionals working technology"],
  enterprise: ["enterprise business corporate team", "large company professionals working", "corporate team technology meeting"],
  startup: ["startup team modern office working", "entrepreneur innovative workspace people", "tech startup professionals collaborating"],
  organization: ["organization team collaboration office", "professional organization meeting people", "corporate team working technology"],
  entity: ["business entity professional team", "corporate organization people working", "professional business group office"],

  // Technology
  tech: ["technology workspace professionals modern", "digital business tech team", "software professional team working"],
  digital: ["digital transformation business people", "digital workspace modern team", "tech professionals working digital"],
  software: ["software team working office", "tech professionals laptop working", "digital product development team"],
  data: ["data analytics business professionals", "data team working modern office", "analytics technology professionals"],
  saas: ["software team modern office", "tech startup professionals working", "digital product team collaboration"],

  // Results
  efficiency: ["business efficiency productive team", "productive professionals working together", "efficient workplace modern people"],
  productivity: ["productive team workspace professionals", "professional productivity office people", "focused business team working"],
  innovation: ["innovation business team working", "creative technology workspace professionals", "innovative team collaborating office"],
  solution: ["business solution technology team", "professionals problem solving office", "smart business team technology"],

  // Marketing
  marketing: ["digital marketing team working", "creative agency professionals", "brand strategy team meeting"],
  agency: ["creative professionals working together", "marketing team meeting office", "agency workspace professionals"],
  social: ["social media team content creator", "digital marketing professionals working", "content creation team office"],

  // E-commerce
  shop: ["ecommerce business team office", "online business professionals working", "retail business team technology"],
  store: ["business store team professionals", "retail professionals working technology", "ecommerce team modern office"],
  fashion: ["fashion business team professionals", "clothing brand team working", "style business professionals"],
  beauty: ["beauty business professionals team", "skincare brand team working", "cosmetics business professionals"],
  skincare: ["skincare business team professionals", "beauty brand professionals working", "wellness business team"],

  // Food
  food: ["food business team professionals", "restaurant team working together", "food service professionals"],
  coffee: ["coffee business team professionals", "cafe team working together", "barista business professionals"],
  restaurant: ["restaurant team professionals working", "food business team meeting", "hospitality professionals team"],

  // Health
  health: ["healthcare professionals team working", "wellness business team office", "health professionals modern office"],
  fitness: ["fitness business team professionals", "athletic business team working", "sports professionals office"],
  wellness: ["wellness team professionals working", "health business team modern", "mindfulness business professionals"],
  clinic: ["medical professionals team working", "healthcare clinic team office", "doctor team professional modern"],

  // Education
  education: ["education business team professionals", "learning team working together", "academic professionals modern office"],
  coaching: ["business coaching professionals team", "mentor professional working office", "leadership team business coaching"],
  course: ["online education team professionals", "digital learning business team", "education professionals working"],
  training: ["professional training team working", "skill development business team", "workshop professionals learning"],

  // Finance
  finance: ["finance business team professionals", "investment team working office", "financial professionals modern office"],
  consulting: ["consulting team professionals meeting", "business consulting team office", "strategy professionals working"],

  // Default — always Relvo relevant
  default: [
    "AI business automation professionals working",
    "digital transformation business team office",
    "intelligent technology workspace professionals",
    "business professionals modern technology office",
    "smart business digital innovation team",
  ],
};

// Always fires regardless of keyword match
const NEUROFLOW_BASE_QUERIES = [
  "AI business professionals modern office",
  "digital transformation team working technology",
  "business automation professionals collaborating",
  "smart technology business team office",
];

export function buildUnsplashQueries(
  companyName: string,
  hook: string,
  subheading: string,
  location?: string,
  slot?: string
): string[] {

  // ── SLOT OVERRIDES ──
  if (slot === "product-cutout" || slot === "product-float" || slot === "object-cutout") {
    return [
      "AI dashboard laptop screen isolated white background",
      "business software interface device white background",
      "modern smartphone business app white background",
      "tech device isolated studio white minimal clean",
      "laptop computer business white background studio",
    ];
  }

  if (slot === "person-cutout" || slot === "hero-cutout") {
    return [
      "confident business professional plain background studio",
      "entrepreneur smiling business simple background",
      "professional business woman plain studio background",
      "business executive portrait clean background",
      "young professional tech worker simple background",
    ];
  }

  if (slot === "lifestyle-scene" || slot === "photo-scene") {
    return [
      "business team using AI technology modern office",
      "professionals collaborating digital workspace",
      "business automation team working together office",
      "diverse team technology startup modern office",
    ];
  }

  if (slot === "photo-left" || slot === "photo-bottom") {
    return [
      "business professional smiling technology office",
      "confident entrepreneur working laptop modern office",
      "business woman AI technology workspace smiling",
      "professional man digital workspace confident",
      "customer success manager smiling office technology",
    ];
  }

  if (slot === "photo-right" || slot === "photo-br") {
    return [
      "business team meeting technology collaboration",
      "diverse professionals working together modern office",
      "team celebrating business success technology",
      "business meeting digital strategy team",
    ];
  }

  if (slot === "photo-top" || slot === "photo") {
    return [
      "modern tech office AI business environment wide",
      "digital business workspace panoramic modern people",
      "business automation office wide shot professional",
      "corporate technology team open office wide shot",
    ];
  }

  if (slot === "photo-bl") {
    return [
      "professional business person working laptop office",
      "entrepreneur digital tools modern workspace focused",
      "business professional using smartphone office",
      "tech worker focused laptop modern office",
    ];
  }

  if (slot === "hero-photo" || slot === "main-photo") {
    return [
      "business professional AI technology cinematic office",
      "entrepreneur success modern digital workspace wide",
      "confident business team technology office cinematic",
      "digital transformation business people wide shot",
    ];
  }

  // ── KEYWORD MATCHING ──
  const combined = `${companyName} ${hook} ${subheading} ${location || ""}`.toLowerCase();
  const matchedQueries: string[] = [];

  for (const [keyword, terms] of Object.entries(INDUSTRY_QUERY_MAP)) {
    if (keyword !== "default" && combined.includes(keyword)) {
      matchedQueries.push(...terms);
    }
  }

  // Direct hook query — top 4 words
  const hookQuery = hook
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 4)
    .join(" ");

  // Final priority order:
  // hook → matched keywords → Relvo base → default
  const allQueries = [
    ...(hookQuery ? [`${hookQuery} business professionals`] : []),
    ...matchedQueries,
    ...NEUROFLOW_BASE_QUERIES,
    ...INDUSTRY_QUERY_MAP.default,
  ];

  return [...new Set(allQueries)].slice(0, 6);
}