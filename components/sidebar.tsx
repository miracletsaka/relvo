"use client"

import {
  LayoutDashboard, CheckSquare, Upload, Library, Settings,
  BarChart3, HelpCircle, ChevronLeft, ChevronRight, Plus,
  Share, Timer, User, MessageCircle, Linkedin, Edit,
  ImageIcon, LogOut, CalendarDays, ExternalLink, ChevronDown,
  Sparkles, X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { logoutUser } from "@/lib/api"

type NavItem =
  | { name: string; href: string; icon: React.ElementType; external?: false }
  | { name: string; href: string; icon: React.ElementType; external: true }

const navigation: NavItem[] = [
  { name: "Create",          href: "/dashboard/create",                       icon: LayoutDashboard },
  { name: "Design Studio",   href: "/dashboard/design-studio/admin/template", icon: Edit },
  { name: "Chats",           href: "/dashboard/topic-chats",                  icon: MessageCircle },
  { name: "Media Assets",    href: "/dashboard/media-assets",                 icon: ImageIcon },
  { name: "Content Library", href: "/dashboard/library",                      icon: Library },
  { name: "Platforms",       href: "/dashboard/platforms",                    icon: Linkedin },
  { name: "Brand",           href: "/dashboard/brands",                       icon: Plus },
  { name: "Users",           href: "/dashboard/users",                        icon: User },
  { name: "Settings",        href: "/dashboard/settings",                     icon: Settings },
]

const externalLinks = [
  {
    key: "scheduled",
    label: "Scheduled",
    href: "https://publish.buffer.com/all-channels/calendar/week?status=scheduled",
    icon: CalendarDays,
    color: "#3b82f6",
  },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isOpen) onToggle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');

        .sb-root {
          font-family: 'Syne', sans-serif;
          background: #0e0e12;
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column;
          height: 100vh;
          position: relative; overflow: hidden;
        }
        .sb-root::before {
          content: ''; position: absolute; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none; z-index: 0;
        }
        .sb-inner { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%; }

        .sb-logo {
          display: flex; align-items: center; justify-content: space-between;
          height: 64px; padding: 0 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;
        }
        .sb-logo-mark { display: flex; align-items: center; gap: 10px; overflow: hidden; transition: opacity 0.2s, width 0.25s; }
        .sb-logo-text { font-size: 13px; font-weight: 800; color: #e4e4e7; letter-spacing: -0.01em; white-space: nowrap; transition: opacity 0.15s; }
        .sb-logo-text span { color: #a78bfa; }
        .sb-toggle {
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.4); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s; flex-shrink: 0;
        }
        .sb-toggle:hover { background: rgba(255,255,255,0.1); color: #e4e4e7; }

        /* On mobile, replace toggle with X close button */
        .sb-close-mobile {
          display: none;
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5); cursor: pointer;
          align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        @media (max-width: 1023px) {
          .sb-close-mobile { display: flex; }
          .sb-toggle { display: none; }
        }

        .sb-nav { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 2px; }
        .sb-nav::-webkit-scrollbar { width: 3px; }
        .sb-nav::-webkit-scrollbar-track { background: transparent; }
        .sb-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

        .sb-section-label {
          font-size: 9px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: rgba(255,255,255,0.18);
          padding: 10px 12px 4px; font-family: 'DM Mono', monospace;
        }

        .sb-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 11px;
          text-decoration: none; transition: all 0.15s;
          position: relative; overflow: hidden;
          border: 1px solid transparent;
        }
        .sb-item:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.06); }
        .sb-item.active { background: rgba(124,58,237,0.18); border-color: rgba(124,58,237,0.3); }
        .sb-item.active::before {
          content: ''; position: absolute; left: 0; top: 20%; bottom: 20%;
          width: 2px; border-radius: 2px;
          background: linear-gradient(180deg, #7c3aed, #a78bfa);
        }
        .sb-item-icon { width: 17px; height: 17px; flex-shrink: 0; transition: color 0.15s; }
        .sb-item .sb-item-icon { color: rgba(255,255,255,0.3); }
        .sb-item:hover .sb-item-icon { color: rgba(255,255,255,0.7); }
        .sb-item.active .sb-item-icon { color: #a78bfa; }
        .sb-item-label { font-size: 11px; font-weight: 700; white-space: nowrap; color: rgba(255,255,255,0.45); transition: color 0.15s; letter-spacing: 0.01em; }
        .sb-item:hover .sb-item-label { color: rgba(255,255,255,0.85); }
        .sb-item.active .sb-item-label { color: #e4e4e7; }
        .sb-active-dot { width: 4px; height: 4px; border-radius: 50%; background: #a78bfa; margin-left: auto; flex-shrink: 0; animation: sbpulse 2s ease-in-out infinite; }
        @keyframes sbpulse { 0%,100%{opacity:1;} 50%{opacity:0.35;} }

        .sb-item.collapsed { justify-content: center; padding: 10px; }
        .sb-item.collapsed .sb-item-label { display: none; }
        .sb-item.collapsed .sb-active-dot { display: none; }

        .sb-external {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 11px;
          text-decoration: none; transition: all 0.15s;
          border: 1px solid rgba(59,130,246,0.15);
          background: rgba(59,130,246,0.06); cursor: pointer;
        }
        .sb-external:hover { background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.3); }
        .sb-external.collapsed { justify-content: center; padding: 10px; }
        .sb-external.collapsed .sb-ext-label,
        .sb-external.collapsed .sb-ext-badge { display: none; }
        .sb-ext-icon { width: 16px; height: 16px; color: #60a5fa; flex-shrink: 0; }
        .sb-ext-label { font-size: 11px; font-weight: 700; color: #60a5fa; flex: 1; white-space: nowrap; }
        .sb-ext-badge { display: flex; align-items: center; gap: 3px; font-size: 8px; font-weight: 700; color: rgba(96,165,250,0.6); font-family: 'DM Mono', monospace; letter-spacing: 0.06em; }

        .sb-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 6px 12px; }

        .sb-profile-wrap { flex-shrink: 0; border-top: 1px solid rgba(255,255,255,0.05); padding: 10px; position: relative; }
        .sb-profile-btn {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 11px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          cursor: pointer; transition: background 0.15s;
        }
        .sb-profile-btn:hover { background: rgba(255,255,255,0.07); }
        .sb-avatar {
          width: 28px; height: 28px; border-radius: 9px;
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-size: 11px; font-weight: 800; color: white;
        }
        .sb-profile-info { flex: 1; min-width: 0; text-align: left; }
        .sb-profile-name { font-size: 11px; font-weight: 700; color: #e4e4e7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sb-profile-role { font-size: 9px; color: rgba(255,255,255,0.3); font-family: 'DM Mono', monospace; letter-spacing: 0.06em; }
        .sb-chevron { width: 13px; height: 13px; color: rgba(255,255,255,0.3); flex-shrink: 0; transition: transform 0.2s; }
        .sb-chevron.open { transform: rotate(180deg); }

        .sb-dropdown {
          position: absolute; bottom: calc(100% + 6px); left: 10px; right: 10px;
          background: #1a1a22; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px; overflow: hidden;
          box-shadow: 0 -16px 40px rgba(0,0,0,0.5);
          animation: sbdropup 0.15s ease; z-index: 100;
        }
        @keyframes sbdropup { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .sb-dropdown-item {
          width: 100%; display: flex; align-items: center; gap: 9px;
          padding: 10px 14px; background: none; border: none;
          cursor: pointer; transition: background 0.12s; text-align: left; text-decoration: none;
        }
        .sb-dropdown-item:hover { background: rgba(255,255,255,0.05); }
        .sb-dropdown-item-icon { width: 14px; height: 14px; color: rgba(255,255,255,0.4); flex-shrink: 0; }
        .sb-dropdown-item-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.65); font-family: 'Syne', sans-serif; }
        .sb-dropdown-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 3px 0; }
        .sb-logout .sb-dropdown-item-icon { color: #f87171; }
        .sb-logout .sb-dropdown-item-label { color: #f87171; }
        .sb-logout:hover { background: rgba(239,68,68,0.1) !important; }
      `}</style>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          style={{ backdropFilter: "blur(2px)" }}
          onClick={onToggle}
        />
      )}

      <aside
        className={`
          sb-root
          fixed lg:relative z-50
          transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isOpen ? "w-[240px]" : "lg:w-[60px] w-[240px]"}
        `}
      >
        <div className="sb-inner">

          {/* ── Logo ── */}
          <div className="sb-logo">
            <div
              className="sb-logo-mark"
              style={{ opacity: isOpen ? 1 : 0, width: isOpen ? "auto" : 0, overflow: "hidden" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
                  <img src="/NeuroFlow_AI_Logo.png" alt="NeuroFlow Logo" className="h-4 w-auto" />
                </div>
              </div>
              <span className="sb-logo-text">Neuro<span>Flow</span></span>
            </div>

            {/* Desktop: collapse toggle */}
            <button className="sb-toggle z-50" onClick={onToggle}>
              {isOpen
                ? <ChevronLeft style={{ width: 14, height: 14 }} />
                : <ChevronRight style={{ width: 14, height: 14 }} />
              }
            </button>

            {/* Mobile: X close button */}
            <button className="sb-close-mobile" onClick={onToggle}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* ── Nav ── */}
          <nav className="sb-nav">
            {isOpen && <div className="sb-section-label">Navigation</div>}

            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`sb-item ${isActive ? "active" : ""} ${!isOpen ? "collapsed" : ""}`}
                  title={!isOpen ? item.name : undefined}
                >
                  <item.icon className="sb-item-icon" />
                  <span className="sb-item-label">{item.name}</span>
                  {isActive && isOpen && <span className="sb-active-dot" />}
                </Link>
              )
            })}

            <div className="sb-divider" style={{ margin: "8px 4px" }} />

            {isOpen && <div className="sb-section-label">External</div>}

            {externalLinks.map((link) => (
              <a
                key={link.key}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`sb-external ${!isOpen ? "collapsed" : ""}`}
                title={!isOpen ? link.label : undefined}
              >
                <link.icon className="sb-ext-icon" />
                <span className="sb-ext-label">{link.label}</span>
                <span className="sb-ext-badge">
                  <ExternalLink style={{ width: 8, height: 8 }} />
                  Buffer
                </span>
              </a>
            ))}
          </nav>

          {/* ── Profile / Logout ── */}
          <div className="sb-profile-wrap" ref={profileRef}>
            {profileOpen && isOpen && (
              <div className="sb-dropdown">
                <Link href="/dashboard/settings" className="sb-dropdown-item" onClick={() => setProfileOpen(false)}>
                  <Settings className="sb-dropdown-item-icon" />
                  <span className="sb-dropdown-item-label">Settings</span>
                </Link>
                <Link href="/dashboard/users" className="sb-dropdown-item" onClick={() => setProfileOpen(false)}>
                  <User className="sb-dropdown-item-icon" />
                  <span className="sb-dropdown-item-label">Profile</span>
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
                <div className="sb-avatar">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
                      <img src="/NeuroFlow_AI_Logo.png" alt="NeuroFlow Logo" className="h-4 w-auto" />
                    </div>
                  </div>
                </div>
                <div className="sb-profile-info">
                  <div className="sb-profile-name">NeuroFlow</div>
                  <div className="sb-profile-role">Admin</div>
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
                <div className="sb-avatar">
                   <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
                      <img src="/NeuroFlow_AI_Logo.png" alt="NeuroFlow Logo" className="h-4 w-auto" />
                    </div>
                  </div>
                </div>
              </button>
            )}
          </div>

        </div>
      </aside>
    </>
  )
}