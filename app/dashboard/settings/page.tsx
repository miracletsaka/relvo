"use client"

import { useState } from "react"
import { Save, Eye, EyeOff, Copy, Check, Shield, Sliders, Key, Loader2, X, Building } from "lucide-react"
import { changePassword } from "@/lib/api"
import OrgSettingsPage from "./organisation/page"

// ── Constants ─────────────────────────────────────────────────────────────────

const AVAILABILITY_OPTIONS = ["available", "out_of_stock", "limited", "coming_soon", "discontinued"]

// ── Shared input className ────────────────────────────────────────────────────

const inputCls = [
  "w-full text-[13px] font-medium",
  "bg-white/70 border border-black/[0.08] rounded-[13px]",
  "px-3.5 py-2.5 text-[#1a1a2e] outline-none",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,0,0,0.04),0_1px_4px_rgba(0,0,0,0.05)]",
  "placeholder:text-black/25 placeholder:font-normal",
  "focus:border-[rgba(124,85,246,0.45)] focus:shadow-[0_0_0_3px_rgba(124,85,246,0.1),inset_0_1px_0_rgba(255,255,255,0.95)]",
  "transition-all duration-150 font-[Inter,sans-serif]",
].join(" ")

const labelCls = "block text-[9px] font-bold uppercase tracking-[0.15em] text-black/30 mb-1.5"

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/65 border border-black/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_10px_rgba(0,0,0,0.05)] overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-black/[0.06] bg-white/40">
        <p className="text-[13px] font-extrabold text-[#1a1a2e] tracking-[-0.01em]">{title}</p>
        <p className="text-[10.5px] text-black/30 font-medium mt-0.5">{desc}</p>
      </div>
      <div className="p-6 flex flex-col gap-5">
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-black/[0.05] shadow-[0_1px_0_rgba(255,255,255,0.8)]" />
}

function PasswordInput({
  value, onChange, show, onToggle, placeholder, style,
}: {
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  placeholder?: string
  style?: React.CSSProperties
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={style}
        className={`${inputCls} pr-11`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-[#7c55f6] transition-colors duration-150 cursor-pointer"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

// ── ToggleRow ─────────────────────────────────────────────────────────────────

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-black/[0.05] last:border-0">
      <div>
        <p className="text-[13px] font-semibold text-[#1a1a2e]">{label}</p>
        <p className="text-[11px] text-black/35 font-medium mt-0.5">{desc}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={[
          "w-10 h-[22px] rounded-full border transition-all duration-200",
          "bg-black/[0.08] border-black/[0.08]",
          "peer-checked:bg-[rgba(124,85,246,0.18)] peer-checked:border-[rgba(124,85,246,0.38)]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
        ].join(" ")} />
        <div className={[
          "absolute left-[3px] top-[3px] w-4 h-4 rounded-full transition-all duration-200",
          "bg-black/25 shadow-[0_1px_3px_rgba(0,0,0,0.15)]",
          "peer-checked:translate-x-[18px] peer-checked:bg-[#7c55f6] peer-checked:shadow-[0_1px_6px_rgba(124,85,246,0.45)]",
        ].join(" ")} />
      </label>
    </div>
  )
}

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({ active, icon: Icon, label, onClick }: { active: boolean; icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[13px]",
        "text-[12px] font-semibold text-left cursor-pointer transition-all duration-150",
        "border",
        active
          ? "bg-white/90 border-[rgba(124,85,246,0.28)] text-[#4c2db8] shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_10px_rgba(124,85,246,0.1)]"
          : "bg-transparent border-transparent text-black/40 hover:bg-white/60 hover:border-black/[0.07] hover:text-black/65 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
      ].join(" ")}
    >
      <Icon size={14} className={active ? "text-[#7c55f6]" : "text-black/30"} />
      {label}
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7c55f6] shadow-[0_0_5px_rgba(124,85,246,0.6)]" />}
    </button>
  )
}

// ── MsgTag ────────────────────────────────────────────────────────────────────

function MsgTag({ type, text }: { type: "success" | "error"; text: string }) {
  return (
    <span className={[
      "inline-flex items-center gap-1.5 px-3 py-2 rounded-[999px] text-[11px] font-bold border",
      type === "success"
        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
        : "bg-red-50 text-red-500 border-red-200",
    ].join(" ")}>
      {type === "success" ? <Check size={11} /> : <X size={11} />}
      {text}
    </span>
  )
}

// ── PrimaryBtn ────────────────────────────────────────────────────────────────

function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center gap-2 px-5 py-2.5 rounded-[16px]",
        "text-[12px] font-bold cursor-pointer",
        "border border-[rgba(168,85,247,0.45)] bg-[rgba(168,85,247,0.18)]",
        "text-[#5b21b6]",
        "shadow-[0_2px_14px_rgba(168,85,247,0.2),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.08)]",
        "hover:bg-[rgba(168,85,247,0.28)] hover:border-[rgba(168,85,247,0.65)] hover:shadow-[0_4px_22px_rgba(168,85,247,0.35),inset_0_1px_0_rgba(255,255,255,0.55)] hover:-translate-y-px",
        "active:translate-y-0",
        "disabled:opacity-35 disabled:cursor-not-allowed disabled:transform-none",
        "transition-all duration-150 font-[Inter,sans-serif]",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 px-5 py-2.5 rounded-[16px]",
        "text-[12px] font-bold cursor-pointer",
        "border border-black/[0.08] bg-white/70",
        "text-black/40",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]",
        "hover:bg-white/95 hover:text-black/60 hover:border-black/[0.12] hover:-translate-y-px",
        "active:translate-y-0 transition-all duration-150 font-[Inter,sans-serif]",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [apiKey] = useState("sk-relvo-abc123def456ghi789jkl")
  const [showApiKey, setShowApiKey] = useState(false)
  const [copiedApiKey, setCopiedApiKey] = useState(false)
  const [activeSection, setActiveSection] = useState("security")

  const [settings, setSettings] = useState({
    autoApprove: false,
    enableNotifications: true,
    maxContentLength: 2000,
    defaultLanguage: "English",
  })

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" })
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [pwLoading, setPwLoading] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey)
    setCopiedApiKey(true)
    setTimeout(() => setCopiedApiKey(false), 2000)
  }

  const handleSaveSettings = () => {
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  const passwordStrength = (p: string) => {
    if (!p) return null
    if (p.length < 6)  return { label: "Weak",   color: "#ef4444", width: "25%" }
    if (p.length < 10) return { label: "Fair",   color: "#f59e0b", width: "55%" }
    if (p.length < 14) return { label: "Good",   color: "#22c55e", width: "78%" }
    return               { label: "Strong", color: "#10b981", width: "100%" }
  }

  const strength = passwordStrength(pw.next)

  const nav = [
    { id: "security",    icon: Shield,  label: "Security" },
    { id: "organisation", icon: Building, label: "Organisation" },
    // { id: "preferences", icon: Sliders, label: "Preferences" },
    // { id: "api",         icon: Key,     label: "API Access" },
  ]

  return (
    <div
      className="min-h-screen font-[Inter,sans-serif]"
      style={{ background: "#f4f4f6" }}
    >
      {/* Subtle dot-grid texture matching chat area */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(124,85,246,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(124,85,246,0.025) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative max-w-3xl mx-auto px-6 py-10">

        {/* ── Page header ── */}
        <div className="mb-8">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/30 mb-2">
            Configuration
          </p>
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-[#1a1a2e] leading-none">
            Settings
          </h1>
          <p className="text-[12px] text-black/35 font-medium mt-1.5">
            Manage your account preferences and security
          </p>
        </div>

        {/* ── Layout ── */}
        <div className="flex gap-5 items-start">

          {/* ── Sidebar nav ── */}
          <nav className="w-44 flex-shrink-0 flex flex-col gap-1 sticky top-6">
            {/* Nav header label */}
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/25 mb-1 px-1">
              Menu
            </p>
            {nav.map(({ id, icon, label }) => (
              <NavItem
                key={id}
                active={activeSection === id}
                icon={icon}
                label={label}
                onClick={() => setActiveSection(id)}
              />
            ))}
          </nav>

          {/* ── Content ── */}
          <div className="flex-1 min-w-0">

            {/* ── SECURITY ── */}
            {activeSection === "security" && (
              <SectionCard
                title="Security"
                desc="Update your password to keep your account safe."
              >
                {/* Current password */}
                <Field label="Current Password">
                  <PasswordInput
                    value={pw.current}
                    onChange={(v) => setPw((p) => ({ ...p, current: v }))}
                    show={showPw.current}
                    onToggle={() => setShowPw((s) => ({ ...s, current: !s.current }))}
                    placeholder="Enter your current password"
                  />
                </Field>

                {/* New password */}
                <Field label="New Password">
                  <PasswordInput
                    value={pw.next}
                    onChange={(v) => setPw((p) => ({ ...p, next: v }))}
                    show={showPw.next}
                    onToggle={() => setShowPw((s) => ({ ...s, next: !s.next }))}
                    placeholder="Minimum 8 characters"
                  />
                  {pw.next && strength ? (
                    <div className="mt-2 flex items-center gap-2.5">
                      <div className="flex-1 h-[3px] bg-black/[0.07] rounded-full overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: strength.width, background: strength.color }}
                        />
                      </div>
                      <span className="text-[10px] font-bold min-w-[38px] text-right" style={{ color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-black/30 font-medium">
                      Use 8+ characters for a stronger password.
                    </p>
                  )}
                </Field>

                {/* Confirm password */}
                <Field label="Confirm New Password">
                  <PasswordInput
                    value={pw.confirm}
                    onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
                    show={showPw.confirm}
                    onToggle={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}
                    placeholder="Re-type new password"
                    style={
                      pw.confirm && pw.confirm !== pw.next
                        ? { borderColor: "rgba(239,68,68,0.45)" }
                        : pw.confirm && pw.confirm === pw.next
                        ? { borderColor: "rgba(16,185,129,0.45)" }
                        : undefined
                    }
                  />
                  {pw.confirm && pw.confirm !== pw.next && (
                    <p className="mt-1.5 text-[11px] font-medium text-red-400">
                      Passwords don't match.
                    </p>
                  )}
                </Field>

                <Divider />

                <div className="flex items-center gap-3 flex-wrap">
                  <PrimaryBtn
                    disabled={pwLoading}
                    onClick={async () => {
                      setPwMsg(null)
                      const { current, next, confirm } = pw
                      if (!current || !next || !confirm) return setPwMsg({ type: "error", text: "Please fill all fields." })
                      if (next.length < 8) return setPwMsg({ type: "error", text: "Password must be 8+ characters." })
                      if (next !== confirm) return setPwMsg({ type: "error", text: "Passwords do not match." })
                      try {
                        setPwLoading(true)
                        await changePassword({ current_password: current, new_password: next })
                        setPw({ current: "", next: "", confirm: "" })
                        setPwMsg({ type: "success", text: "Password updated." })
                      } catch (e: any) {
                        setPwMsg({ type: "error", text: e.message })
                      } finally {
                        setPwLoading(false)
                      }
                    }}
                  >
                    {pwLoading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Update Password
                  </PrimaryBtn>
                  {pwMsg && <MsgTag type={pwMsg.type} text={pwMsg.text} />}
                </div>
              </SectionCard>
            )}

            {/* ── PREFERENCES ── */}
            {activeSection === "preferences" && (
              <SectionCard
                title="Preferences"
                desc="Customize how the app works for you."
              >
                <div>
                  <ToggleRow
                    label="Auto-Approve Content"
                    desc="Automatically publish generated posts without review"
                    checked={settings.autoApprove}
                    onChange={(v) => setSettings((s) => ({ ...s, autoApprove: v }))}
                  />
                  <ToggleRow
                    label="Enable Notifications"
                    desc="Get notified when content is scheduled or published"
                    checked={settings.enableNotifications}
                    onChange={(v) => setSettings((s) => ({ ...s, enableNotifications: v }))}
                  />
                </div>

                <Field label="Default Language">
                  <select
                    className={`${inputCls} appearance-none`}
                    value={settings.defaultLanguage}
                    onChange={(e) => setSettings((s) => ({ ...s, defaultLanguage: e.target.value }))}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(0,0,0,0.3)'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                      paddingRight: "32px",
                    }}
                  >
                    {["English", "French", "Spanish", "German", "Portuguese", "Arabic"].map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Max Content Length">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-[11px] text-black/35 font-medium">Characters per post</span>
                    <span className="text-[18px] font-extrabold text-[#7c55f6] tracking-[-0.02em]">
                      {settings.maxContentLength.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={5000}
                    step={100}
                    value={settings.maxContentLength}
                    onChange={(e) => setSettings((s) => ({ ...s, maxContentLength: Number(e.target.value) }))}
                    className="w-full h-[3px] rounded-full outline-none cursor-pointer appearance-none"
                    style={{
                      background: `linear-gradient(to right, rgba(124,85,246,0.6) 0%, rgba(124,85,246,0.6) ${((settings.maxContentLength - 500) / 4500) * 100}%, rgba(0,0,0,0.08) ${((settings.maxContentLength - 500) / 4500) * 100}%, rgba(0,0,0,0.08) 100%)`,
                    }}
                  />
                  <div className="flex justify-between mt-1.5 text-[9px] font-mono text-black/25">
                    <span>500</span><span>5,000</span>
                  </div>
                </Field>

                <Divider />

                <div className="flex items-center gap-3">
                  <PrimaryBtn onClick={handleSaveSettings}>
                    {settingsSaved ? <Check size={13} /> : <Save size={13} />}
                    {settingsSaved ? "Saved!" : "Save Preferences"}
                  </PrimaryBtn>
                  <GhostBtn
                    onClick={() => setSettings({ autoApprove: false, enableNotifications: true, maxContentLength: 2000, defaultLanguage: "English" })}
                  >
                    Reset to Default
                  </GhostBtn>
                </div>
              </SectionCard>
            )}

            {/* ── API ── */}
            {activeSection === "api" && (
              <SectionCard
                title="API Access"
                desc="Use your API key to integrate the platform into your own tools."
              >
                <Field label="Your API Key">
                  {/* Key display row */}
                  <div className="flex overflow-hidden rounded-[13px] border border-black/[0.08] bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_1px_4px_rgba(0,0,0,0.05)]">
                    <input
                      readOnly
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      className="flex-1 px-3.5 py-2.5 bg-transparent text-[12px] font-mono text-black/45 tracking-wide outline-none min-w-0"
                    />
                    <button
                      onClick={() => setShowApiKey((v) => !v)}
                      className="px-3.5 border-l border-black/[0.06] text-black/30 hover:text-[#7c55f6] hover:bg-[rgba(124,85,246,0.05)] transition-all duration-150 cursor-pointer flex items-center gap-1.5 text-[11px] font-bold flex-shrink-0"
                    >
                      {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                      {showApiKey ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={handleCopyApiKey}
                      className="px-3.5 border-l border-black/[0.06] text-black/30 hover:text-[#7c55f6] hover:bg-[rgba(124,85,246,0.05)] transition-all duration-150 cursor-pointer flex items-center gap-1.5 text-[11px] font-bold flex-shrink-0"
                    >
                      {copiedApiKey ? <Check size={13} /> : <Copy size={13} />}
                      {copiedApiKey ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-black/30 font-medium mt-2">
                    Keep your API key private. Never expose it in client-side code.
                  </p>
                </Field>

                <Divider />

                {/* Endpoint info block — matches sidebar section style */}
                <div className="px-4 py-3.5 rounded-[13px] bg-[rgba(124,85,246,0.06)] border border-[rgba(124,85,246,0.18)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[rgba(124,85,246,0.6)] mb-1">
                    API Endpoint
                  </p>
                  <p className="font-mono text-[12px] text-black/55 font-medium">
                    https://api.relvo.ai/v1
                  </p>
                </div>
              </SectionCard>
            )}

            {activeSection === "organisation" && (
              <OrgSettingsPage />
            )}

          </div>
        </div>
      </div>

      {/* Range thumb style */}
      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #7c55f6);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 6px rgba(124,85,246,0.45);
        }
        input[type='range']::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #7c55f6);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 6px rgba(124,85,246,0.45);
        }
      `}</style>
    </div>
  )
}