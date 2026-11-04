// Absolute backend URL for SERVER-side fetches (layouts, server components, route handlers).
// Browser code keeps using NEXT_PUBLIC_API_BASE ("/backend", via the Vercel proxy).
const PUBLIC = process.env.NEXT_PUBLIC_API_BASE || "";

export const SERVER_API_BASE = (
  process.env.BACKEND_URL ||
  (PUBLIC.startsWith("http") ? PUBLIC : "") ||
  "https://relvo-backend-iker.onrender.com"
).replace(/\/$/, "");