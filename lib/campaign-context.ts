import { createContext } from 'react'
import { CampaignData } from './types'

export const DEFAULT_CAMPAIGN_DATA: CampaignData = {
  hook: "Earn Your AI Business Growth Advantage",
  subheading:
    "Professional AI systems that answer leads, automate follow-up, and book appointments faster.",
  bullets: [
    "Automate lead capture and follow-up",
    "Book appointments without manual back-and-forth",
    "Turn more enquiries into paying customers",
  ],
  proof: "Trusted by modern service businesses",
  cta: "Book Your Free Demo",

  logo:
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
  heroImage:
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",

  location: "London, UK",
  companyName: "Relvo AI",
  ctaLink: "https://neuroflowai.co.uk",
  hashtags: "#AI #Automation #LeadGeneration #BusinessGrowth",

  imageSlots: {
    hero_person: {
      url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    },
    dashboard_image: {
      url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    },
    sponsor_1: {
      url: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    },
    sponsor_2: {
      url: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
    },
  },

  reviews: [
    {
      author_name: "James R.",
      rating: 5,
      body: "We started converting more enquiries almost immediately after switching to AI automation.",
      source: "Google",
    },
  ],

  sponsors: [
    {
      name: "Amazon",
      logo_url: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
      website: "https://amazon.com",
    },
    {
      name: "Microsoft",
      logo_url: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
      website: "https://microsoft.com",
    },
  ],

  offers: [
    {
      title: "Free AI Growth Consultation",
      description:
        "Book a free strategy session and discover how automation can improve your lead flow.",
      cta_text: "Claim Offer",
      cta_url: "https://neuroflowai.co.uk/contact",
    },
  ],

  accreditations: [
    {
      name: "Certified AI Solutions Partner",
      issuer: "Relvo Academy",
      year: 2025,
    },
  ],

  businessInfo: {
    business_type: "AI Automation",
    founded_year: 2024,
    company_size: "11-50",
    website: "https://neuroflowai.co.uk",
    address: "Canary Wharf Business Centre",
    tagline: "Automate conversations. Scale with confidence.",
    description: "AI voice, chat, and booking systems for modern businesses.",

    email_primary: "hello@neuroflowai.co.uk",
    email_support: "support@neuroflowai.co.uk",
    phone_primary: "+44 7000 000000",
    phone_secondary: "+44 7000 000001",
    whatsapp: "+44 7000 000000",

    country: "United Kingdom",
    city: "London",
    state_province: "England",
    postal_code: "E14",
    map_url: "https://maps.google.com/?q=Canary+Wharf+London",

    facebook_url: "https://facebook.com/neuroflowai",
    instagram_url: "https://instagram.com/neuroflowai",
    linkedin_url: "https://linkedin.com/company/neuroflowai",
    twitter_url: "https://x.com/neuroflowai",
    tiktok_url: "https://tiktok.com/@neuroflowai",
    youtube_url: "https://youtube.com/@neuroflowai",

    registration_no: "NF-2024-001",
    vat_number: "GB123456789",
  },

  metadata: [
    { key: "industry", value: "AI Automation", category: "business" },
    { key: "service_1", value: "AI Voice Receptionist", category: "services" },
    { key: "service_2", value: "AI Chatbot", category: "services" },
  ],

  review_text:
    "We started converting more enquiries almost immediately after switching to AI automation.",
  review_author: "James R.",
  offer_title: "Free AI Growth Consultation",
  offer_cta: "Claim Offer",

  website: "https://neuroflowai.co.uk",
  address: "Canary Wharf Business Centre",
  phone: "+44 7000 000000",
  email: "hello@neuroflowai.co.uk",
  whatsapp: "+44 7000 000000",

  city: "London",
  country: "United Kingdom",
  fullAddress: "Canary Wharf Business Centre, London, England, E14, United Kingdom",

  registration_no: "NF-2024-001",
  vat_number: "GB123456789",

  facebook_url: "https://facebook.com/neuroflowai",
  instagram_url: "https://instagram.com/neuroflowai",
  linkedin_url: "https://linkedin.com/company/neuroflowai",
  twitter_url: "https://x.com/neuroflowai",
  tiktok_url: "https://tiktok.com/@neuroflowai",
  youtube_url: "https://youtube.com/@neuroflowai",
  map_url: "https://maps.google.com/?q=Canary+Wharf+London",

  price_label: "From £99",
  fine_print: "Terms and conditions apply.",
  enroll_note: "Limited spaces available",

  hook_tag: "Limited Offer",
  hook_pre: "Save",
  hook_number: "30%",
  hook_label: "This Month",
  hook_desc: "On selected services",

  badge_icon: "★",
  deco_icon: "●",

  bullet_1: "Automate lead capture and follow-up",
  bullet_2: "Book appointments without manual back-and-forth",
  bullet_3: "Turn more enquiries into paying customers",

  link_1_label: "Website",
  link_1_url: "https://neuroflowai.co.uk",
  link_2_label: "Book a Demo",
  link_2_url: "https://neuroflowai.co.uk/contact",

  meta_1_key: "industry",
  meta_1_value: "AI Automation",
  meta_2_key: "service_1",
  meta_2_value: "AI Voice Receptionist",
};

export interface CampaignContextType {
  campaignData: CampaignData
  setCampaignData: (data: CampaignData) => void
  updateCampaignField: (field: keyof CampaignData, value: string | string[]) => void
  logoUrl: string | null
  setLogoUrl: (url: string | null) => void
}

export const CampaignContext = createContext<CampaignContextType | undefined>(undefined)
