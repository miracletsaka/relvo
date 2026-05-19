"use client"

import {
  LayoutDashboard, Settings,
  ChevronLeft, ChevronRight, Plus,
  User, MessageCircle, Linkedin, Edit,
  ImageIcon, LogOut, CalendarDays, Link as Google, ExternalLink, ChevronDown,
  X, Text, Building, Facebook, Instagram, Youtube, Twitter,
  Globe, Link2,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { logoutUser } from "@/lib/api"
import OrgSwitcher from "./org/OrgSwitcher"

// ── Types ──────────────────────────────────────────────────────────────────────
type NavItem = {
  name: string
  href: string
  icon: React.ElementType
}

type ExternalLink = {
  key: string
  label: string
  href: string
  icon: React.ElementType
}

type CurrentUser = {
  id: string
  email: string
  first_name: string
  last_name: string
  org_id: string | null
  role: string | null
  is_email_verified: boolean
}

type OrgBusinessInfo = {
  facebook_url?: string | null
  instagram_url?: string | null
  linkedin_url?: string | null
  twitter_url?: string | null
  tiktok_url?: string | null
  youtube_url?: string | null
  website?: string | null
}

// ── Constants ──────────────────────────────────────────────────────────────────
const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "")

const ADMIN_EMAILS = new Set([
  "neuroflowaimalawi@gmail.com",
  "tsakamiracle@gmail.com",
])

const CORE_NAV: NavItem[] = [
  // { name: "Create",          href: "/dashboard/create",                       icon: LayoutDashboard },
  // { name: "Design Studio",   href: "/dashboard/design-studio/admin/template", icon: Edit },
  { name: "Chats",           href: "/",                  icon: MessageCircle },
  { name: "Media Assets",    href: "/dashboard/media-assets",                 icon: ImageIcon },
  { name: "Integrations", href: "/dashboard/integrations/google",             icon: Google },
  // { name: "Platforms",       href: "/dashboard/platforms",                    icon: Linkedin },
  { name: "Brand",           href: "/dashboard/brands",                       icon: Plus },
  { name: "Profile",         href: "/dashboard/org-profile",                  icon: Building },
  { name: "Settings",        href: "/dashboard/settings",                     icon: Settings },
]

const ADMIN_NAV: NavItem[] = [
  { name: "Tones", href: "/dashboard/tones", icon: Text },
  { name: "Users", href: "/dashboard/users", icon: User },
]

const STATIC_EXTERNAL: ExternalLink[] = [
  {
    key: "scheduled",
    label: "Buffer Calendar",
    href: "https://publish.buffer.com/all-channels/calendar/week?status=scheduled",
    icon: CalendarDays,
  },
]

const SOCIAL_ICONS: Record<string, React.ElementType> = {
  facebook_url:  Facebook,
  instagram_url: Instagram,
  linkedin_url:  Linkedin,
  twitter_url:   Twitter,
  tiktok_url:    Link2,
  youtube_url:   Youtube,
  website:       Globe,
}

const SOCIAL_LABELS: Record<string, string> = {
  facebook_url:  "Facebook",
  instagram_url: "Instagram",
  linkedin_url:  "LinkedIn",
  twitter_url:   "Twitter / X",
  tiktok_url:    "TikTok",
  youtube_url:   "YouTube",
  website:       "Website",
}

// ── Helpers ────────────────────────────────────────────────────────────────────
async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

function buildSocialLinks(biz: OrgBusinessInfo): ExternalLink[] {
  const out: ExternalLink[] = []
  const fields = [
    "facebook_url", "instagram_url", "linkedin_url",
    "twitter_url", "tiktok_url", "youtube_url", "website",
  ] as const
  for (const field of fields) {
    const url = biz[field]
    if (!url || !url.trim()) continue
    out.push({
      key:   field,
      label: SOCIAL_LABELS[field] ?? field,
      href:  url.startsWith("http") ? url : `https://${url}`,
      icon:  SOCIAL_ICONS[field] ?? Globe,
    })
  }
  return out
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

// ── Component ──────────────────────────────────────────────────────────────────
export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()

  const [profileOpen, setProfileOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [socialLinks, setSocialLinks] = useState<ExternalLink[]>([])
  const [userLoading, setUserLoading] = useState(true)

  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) onToggle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const user = await apiFetch<CurrentUser>("/auth/me")
        if (cancelled) return
        setCurrentUser(user)
        if (user.org_id) {
          try {
            await apiFetch<{ business_info?: OrgBusinessInfo }>("/organisations/me")
            if (cancelled) return
            const biz = await apiFetch<OrgBusinessInfo>("/organisations/me/business-info").catch(() => null)
            if (cancelled) return
            if (biz) setSocialLinks(buildSocialLinks(biz))
          } catch { /* social links optional */ }
        }
      } catch { /* not authenticated */ } finally {
        if (!cancelled) setUserLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const isAdmin = currentUser ? ADMIN_EMAILS.has(currentUser.email) : false
  const navItems: NavItem[] = isAdmin ? [...CORE_NAV, ...ADMIN_NAV] : CORE_NAV
  const externalLinks: ExternalLink[] = [
    ...(isAdmin ? STATIC_EXTERNAL : []),
    ...socialLinks,
  ]

  const userInitial =
    currentUser?.first_name?.charAt(0).toUpperCase() ||
    currentUser?.email?.charAt(0).toUpperCase() ||
    "?"

  const displayName = currentUser
    ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ") || currentUser.email
    : "Loading…"

  const displayRole = currentUser?.role
    ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
    : "Member"

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        /* ── Root ── */
        .sb-root {
          font-family: 'Inter', sans-serif;
          background: #f4f4f6;
          backdrop-filter: blur(40px) saturate(200%) brightness(1.05);
          -webkit-backdrop-filter: blur(40px) saturate(200%) brightness(1.05);
          border-right: 1px solid #e4e4e8;
          box-shadow: 4px 0 24px rgba(0,0,0,0.06), inset -1px 0 0 rgba(255,255,255,0.7);
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: relative;
          overflow: visible;
        }

        /* Specular top line */
        .sb-root::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.9) 50%, transparent 95%);
          pointer-events: none;
          z-index: 10;
        }

        .sb-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: visible;
        }

        /* ── Logo / Org Switcher row ── */
        .sb-logo {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          height: 64px;
          padding: 0 12px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          flex-shrink: 0;
          position: relative;
          overflow: visible;
        }
        .sb-logo-switcher { min-width: 0; overflow: visible; }
        .sb-logo-actions  { display: flex; align-items: center; justify-content: flex-end; flex-shrink: 0; }

        /* Toggle button */
        .sb-toggle {
          width: 28px; height: 28px; border-radius: 9px;
          background: rgba(255,255,255,0.65);
          border: 1px solid rgba(0,0,0,0.08);
          color: rgba(0,0,0,0.35);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.05);
          transition: background 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        .sb-toggle:hover {
          background: rgba(255,255,255,0.9);
          color: rgba(0,0,0,0.65);
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), 0 2px 6px rgba(0,0,0,0.08);
        }

        .sb-close-mobile {
          display: none; width: 28px; height: 28px; border-radius: 9px;
          background: rgba(255,255,255,0.65); border: 1px solid rgba(0,0,0,0.08);
          color: rgba(0,0,0,0.4); cursor: pointer;
          align-items: center; justify-content: center; flex-shrink: 0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
        }
        @media (max-width: 1023px) {
          .sb-close-mobile { display: flex; }
          .sb-toggle { display: none; }
        }

        /* ── Nav ── */
        .sb-nav {
          flex: 1; overflow-y: auto; padding: 10px;
          display: flex; flex-direction: column; gap: 2px;
        }
        .sb-nav::-webkit-scrollbar { width: 2px; }
        .sb-nav::-webkit-scrollbar-track { background: transparent; }
        .sb-nav::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }

        .sb-section-label {
          font-size: 9px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: rgba(0,0,0,0.28);
          padding: 10px 12px 4px;
        }

        /* ── Nav items ── */
        .sb-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 12px; text-decoration: none;
          transition: all 0.15s; position: relative;
          border: 1px solid transparent;
        }
        .sb-item:hover {
          background: rgba(255,255,255,0.72);
          border-color: rgba(0,0,0,0.06);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 4px rgba(0,0,0,0.05);
        }
        .sb-item.active {
          background: rgba(255,255,255,0.88);
          border-color: rgba(124,85,246,0.25);
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), 0 2px 10px rgba(124,85,246,0.1);
        }
        .sb-item.active::before {
          content: ''; position: absolute; left: 0; top: 20%; bottom: 20%;
          width: 2px; border-radius: 2px;
          background: linear-gradient(180deg, #7c3aed, #a78bfa);
        }

        /* Admin badge */
        .sb-item.admin-only { border-color: rgba(239,68,68,0.08); }
        .sb-item.admin-only:hover { border-color: rgba(239,68,68,0.18); }
        .sb-item.admin-only .sb-item-label::after {
          content: ' · ADMIN';
          font-size: 8px; letter-spacing: 0.10em;
          color: rgba(239,68,68,0.45);
        }

        .sb-item-icon { width: 16px; height: 16px; flex-shrink: 0; transition: color 0.15s; color: rgba(0,0,0,0.28); }
        .sb-item:hover .sb-item-icon  { color: rgba(0,0,0,0.6); }
        .sb-item.active .sb-item-icon { color: #7c55f6; }

        .sb-item-label {
          font-size: 12px; font-weight: 600; white-space: nowrap;
          color: rgba(0,0,0,0.45); transition: color 0.15s;
        }
        .sb-item:hover .sb-item-label  { color: rgba(0,0,0,0.75); }
        .sb-item.active .sb-item-label { color: #1a1a2e; font-weight: 700; }

        .sb-active-dot {
          width: 5px; height: 5px; border-radius: 50%; background: #7c55f6;
          margin-left: auto; flex-shrink: 0;
          box-shadow: 0 0 5px rgba(124,85,246,0.6);
          animation: sbpulse 2s ease-in-out infinite;
        }
        @keyframes sbpulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

        .sb-item.collapsed { justify-content: center; padding: 10px; }
        .sb-item.collapsed .sb-item-label,
        .sb-item.collapsed .sb-active-dot { display: none; }

        /* ── External / social links ── */
        .sb-external {
          display: flex; align-items: center; gap: 10px; padding: 9px 12px;
          border-radius: 12px; text-decoration: none; transition: all 0.15s;
          border: 1px solid rgba(59,130,246,0.14);
          background: rgba(59,130,246,0.05);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
          cursor: pointer;
        }
        .sb-external:hover {
          background: rgba(59,130,246,0.1);
          border-color: rgba(59,130,246,0.25);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 6px rgba(59,130,246,0.08);
        }

        .sb-external.social {
          border-color: rgba(0,0,0,0.05);
          background: rgba(255,255,255,0.45);
        }
        .sb-external.social:hover {
          background: rgba(255,255,255,0.78);
          border-color: rgba(0,0,0,0.08);
        }
        .sb-external.social .sb-ext-icon  { color: rgba(0,0,0,0.35); }
        .sb-external.social .sb-ext-label { color: rgba(0,0,0,0.5); }

        .sb-external.collapsed { justify-content: center; padding: 10px; }
        .sb-external.collapsed .sb-ext-label,
        .sb-external.collapsed .sb-ext-badge { display: none; }

        .sb-ext-icon  { width: 15px; height: 15px; color: #3b82f6; flex-shrink: 0; }
        .sb-ext-label { font-size: 11px; font-weight: 600; color: #3b82f6; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sb-ext-badge {
          display: flex; align-items: center; gap: 3px;
          font-size: 8px; font-weight: 700;
          color: rgba(59,130,246,0.5);
          letter-spacing: 0.06em;
        }

        .sb-divider { height: 1px; background: rgba(0,0,0,0.05); margin: 6px 4px; }

        /* ── Profile footer ── */
        .sb-profile-wrap {
          flex-shrink: 0;
          border-top: 1px solid rgba(0,0,0,0.06);
          padding: 10px;
          position: relative;
        }

        .sb-profile-btn {
          width: 100%; display: flex; align-items: center; gap: 9px;
          padding: 8px 10px; border-radius: 13px;
          background: rgba(255,255,255,0.65);
          border: 1px solid rgba(0,0,0,0.07);
          cursor: pointer;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 4px rgba(0,0,0,0.05);
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .sb-profile-btn:hover {
          background: rgba(255,255,255,0.88);
          border-color: rgba(0,0,0,0.1);
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), 0 3px 10px rgba(0,0,0,0.07);
        }

        .sb-avatar {
          width: 28px; height: 28px; border-radius: 9px;
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-size: 11px; font-weight: 800; color: white;
          box-shadow: 0 2px 8px rgba(99,102,241,0.4);
        }

        .sb-profile-info  { flex: 1; min-width: 0; text-align: left; }
        .sb-profile-name  { font-size: 12px; font-weight: 700; color: #1a1a2e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sb-profile-role  { font-size: 9px; color: rgba(0,0,0,0.32); letter-spacing: 0.05em; margin-top: 1px; }
        .sb-chevron       { width: 13px; height: 13px; color: rgba(0,0,0,0.25); flex-shrink: 0; transition: transform 0.2s; }
        .sb-chevron.open  { transform: rotate(180deg); }

        /* Profile dropdown */
        .sb-dropdown {
          position: absolute; bottom: calc(100% + 6px); left: 10px; right: 10px;
          background: rgba(248,248,250,0.94);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.95);
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 -12px 40px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,1);
          animation: sbdropup 0.16s ease;
          z-index: 100;
        }
        @keyframes sbdropup {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .sb-dropdown-item {
          width: 100%; display: flex; align-items: center; gap: 9px;
          padding: 10px 14px; background: none; border: none; cursor: pointer;
          transition: background 0.12s; text-align: left; text-decoration: none;
          font-family: 'Inter', sans-serif;
        }
        .sb-dropdown-item:hover { background: rgba(0,0,0,0.04); }
        .sb-dropdown-item-icon  { width: 14px; height: 14px; color: rgba(0,0,0,0.4); flex-shrink: 0; }
        .sb-dropdown-item-label { font-size: 12px; font-weight: 600; color: rgba(0,0,0,0.6); }
        .sb-dropdown-divider    { height: 1px; background: rgba(0,0,0,0.06); margin: 3px 0; }

        .sb-logout .sb-dropdown-item-icon,
        .sb-logout .sb-dropdown-item-label { color: #d94040; }
        .sb-logout:hover { background: rgba(239,68,68,0.07) !important; }

        /* Admin pill */
        .sb-admin-pill {
          margin: 4px 14px 6px;
          padding: 3px 8px;
          background: rgba(239,68,68,0.07);
          border: 1px solid rgba(239,68,68,0.18);
          border-radius: 6px;
          font-size: 9px; font-weight: 700;
          color: rgba(185,28,28,0.7);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          display: inline-block;
        }
      `}</style>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          style={{ backdropFilter: "blur(2px)" }}
          onClick={onToggle}
        />
      )}

      <aside className={`
        sb-root fixed lg:relative z-50
        transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${isOpen ? "w-[240px]" : "lg:w-[60px] w-[240px]"}
      `}>
        <div className="sb-inner">

          {/* ── Logo / Org Switcher ── */}
          <div className="sb-logo">
            {isOpen && (
              <div className="sb-logo-switcher">
                <OrgSwitcher
                  apiBase={process.env.NEXT_PUBLIC_API_BASE!}
                  collapsed={false}
                  onCreateNew={() => { window.location.href = "/dashboard/organisations" }}
                />
              </div>
            )}
            <div className="sb-logo-actions">
              <button className="sb-toggle z-50" onClick={onToggle}>
                {isOpen
                  ? <ChevronLeft style={{ width: 13, height: 13 }} />
                  : <ChevronRight style={{ width: 13, height: 13 }} />}
              </button>
              <button className="sb-close-mobile" onClick={onToggle}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>
          </div>

          {/* ── Nav ── */}
          <nav className="sb-nav">
            {isOpen && <div className="sb-section-label">Navigation</div>}

            {navItems.map((item) => {
              const isActive    = pathname === item.href || pathname.startsWith(item.href + "/")
              const isAdminItem = ADMIN_NAV.some(a => a.href === item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={[
                    "sb-item",
                    isActive    ? "active"     : "",
                    !isOpen     ? "collapsed"  : "",
                    isAdminItem ? "admin-only" : "",
                  ].filter(Boolean).join(" ")}
                  title={!isOpen ? item.name : undefined}
                >
                  <item.icon className="sb-item-icon" />
                  <span className="sb-item-label">{item.name}</span>
                  {isActive && isOpen && <span className="sb-active-dot" />}
                </Link>
              )
            })}

            {/* ── External links ── */}
            {externalLinks.length > 0 && (
              <>
                <div className="sb-divider" style={{ margin: "8px 4px" }} />
                {isOpen && <div className="sb-section-label">Quick Links</div>}

                {externalLinks.map((link) => {
                  const isStatic = STATIC_EXTERNAL.some(s => s.key === link.key)
                  return (
                    <a
                      key={link.key}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={[
                        "sb-external",
                        !isOpen   ? "collapsed" : "",
                        !isStatic ? "social"    : "",
                      ].filter(Boolean).join(" ")}
                      title={!isOpen ? link.label : undefined}
                    >
                      <link.icon className="sb-ext-icon" />
                      <span className="sb-ext-label">{link.label}</span>
                      {isOpen && isStatic && (
                        <span className="sb-ext-badge">
                          <ExternalLink style={{ width: 8, height: 8 }} />
                          Buffer
                        </span>
                      )}
                      {isOpen && !isStatic && (
                        <ExternalLink style={{ width: 9, height: 9, color: "rgba(0,0,0,0.2)", flexShrink: 0 }} />
                      )}
                    </a>
                  )
                })}
              </>
            )}
          </nav>

          {/* ── Profile footer ── */}
          <div className="sb-profile-wrap" ref={profileRef}>
            {profileOpen && isOpen && (
              <div className="sb-dropdown">
                {isAdmin && <span className="sb-admin-pill">System Admin</span>}
                <Link
                  href="/dashboard/settings"
                  className="sb-dropdown-item"
                  onClick={() => setProfileOpen(false)}
                >
                  <Settings className="sb-dropdown-item-icon" />
                  <span className="sb-dropdown-item-label">Settings</span>
                </Link>
                <div className="sb-dropdown-divider" />
                <button
                  className="sb-dropdown-item sb-logout"
                  onClick={async () => {
                    setProfileOpen(false)
                    try { await logoutUser() } finally { window.location.href = "/auth/login" }
                  }}
                >
                  <LogOut className="sb-dropdown-item-icon" />
                  <span className="sb-dropdown-item-label">Logout</span>
                </button>
              </div>
            )}

            {isOpen ? (
              <button className="sb-profile-btn" onClick={() => setProfileOpen(v => !v)}>
                <div className="sb-avatar">{userInitial}</div>
                <div className="sb-profile-info">
                  <div className="sb-profile-name">{displayName}</div>
                  <div className="sb-profile-role">{displayRole}</div>
                </div>
                <ChevronDown className={`sb-chevron ${profileOpen ? "open" : ""}`} />
              </button>
            ) : (
              <button
                className="sb-profile-btn"
                style={{ justifyContent: "center", padding: "8px" }}
                onClick={onToggle}
                title="Open menu"
              >
                <img src="/logo.png" alt="Logo" style={{ width: 26, height: "auto" }} />
              </button>
            )}
          </div>

        </div>
      </aside>
    </>
  )
}