"use client"

import { useState } from "react"
import { Save, Eye, EyeOff, Copy, Check, Shield, Sliders, Key, ChevronRight } from "lucide-react"
import { Loader2 } from "lucide-react"

// Mock changePassword for standalone demo
async function changePassword(data: { current_password: string; new_password: string }) {
  await new Promise((r) => setTimeout(r, 1200))
  if (data.current_password === "wrong") throw new Error("Current password is incorrect.")
}

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

  const nav = [
    { id: "security", icon: Shield, label: "Security" },
    // { id: "preferences", icon: Sliders, label: "Preferences" },
    // { id: "api", icon: Key, label: "API Access" },
  ]

  const passwordStrength = (p: string) => {
    if (!p) return null
    if (p.length < 6) return { label: "Weak", color: "#ef4444", width: "25%" }
    if (p.length < 10) return { label: "Fair", color: "#f59e0b", width: "55%" }
    if (p.length < 14) return { label: "Good", color: "#22c55e", width: "78%" }
    return { label: "Strong", color: "#10b981", width: "100%" }
  }

  const strength = passwordStrength(pw.next)

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0e1a 100%)",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      color: "#e2e8f0",
      padding: "0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .settings-wrap {
          max-width: 900px;
          margin: 0 auto;
          padding: 48px 32px;
        }

        .page-header {
          margin-bottom: 40px;
        }

        .page-label {
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #a78bfa;
          margin-bottom: 8px;
        }

        .page-title {
          font-family: 'Syne', sans-serif;
          font-size: 36px;
          font-weight: 800;
          background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
        }

        .page-sub {
          margin-top: 8px;
          font-size: 14px;
          color: #64748b;
          font-weight: 300;
        }

        .settings-layout {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 24px;
          align-items: start;
        }

        @media (max-width: 640px) {
          .settings-layout { grid-template-columns: 1fr; }
          .settings-nav { display: flex; flex-direction: row; overflow-x: auto; }
        }

        .settings-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          position: sticky;
          top: 24px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          background: transparent;
          border: none;
          text-align: left;
          transition: all 0.2s;
          position: relative;
        }

        .nav-item:hover {
          color: #cbd5e1;
          background: rgba(255,255,255,0.04);
        }

        .nav-item.active {
          color: #a78bfa;
          background: rgba(167,139,250,0.1);
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 18px;
          background: #a78bfa;
          border-radius: 0 3px 3px 0;
        }

        .settings-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 32px;
          backdrop-filter: blur(12px);
        }

        .section-title {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }

        .section-desc {
          font-size: 13px;
          color: #475569;
          margin-bottom: 28px;
        }

        .divider {
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin: 28px 0;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
          color: #94a3b8;
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .input-wrap {
          position: relative;
        }

        .input-field {
          width: 100%;
          padding: 12px 44px 12px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          color: #e2e8f0;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }

        .input-field::placeholder { color: #334155; }

        .input-field:focus {
          border-color: rgba(167,139,250,0.4);
          background: rgba(167,139,250,0.05);
        }

        .input-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #475569;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }

        .input-toggle:hover { color: #a78bfa; }

        .strength-bar-wrap {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .strength-bar-bg {
          flex: 1;
          height: 3px;
          background: rgba(255,255,255,0.06);
          border-radius: 99px;
          overflow: hidden;
        }

        .strength-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.4s ease, background 0.4s ease;
        }

        .strength-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
          min-width: 40px;
          text-align: right;
        }

        .hint-text {
          font-size: 12px;
          color: #334155;
          margin-top: 6px;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 22px;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.3px;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(124,58,237,0.35);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 22px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-ghost:hover {
          background: rgba(255,255,255,0.08);
          color: #e2e8f0;
        }

        .msg-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 600;
        }

        .msg-success {
          background: rgba(16,185,129,0.1);
          color: #10b981;
          border: 1px solid rgba(16,185,129,0.2);
        }

        .msg-error {
          background: rgba(239,68,68,0.1);
          color: #f87171;
          border: 1px solid rgba(239,68,68,0.2);
        }

        .api-key-wrap {
          display: flex;
          align-items: center;
          gap: 0;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          overflow: hidden;
        }

        .api-key-display {
          flex: 1;
          padding: 12px 16px;
          font-family: 'DM Mono', 'Fira Code', monospace;
          font-size: 13px;
          color: #64748b;
          letter-spacing: 1px;
          background: none;
          border: none;
          outline: none;
        }

        .api-key-btn {
          padding: 0 16px;
          height: 100%;
          background: rgba(255,255,255,0.04);
          border: none;
          border-left: 1px solid rgba(255,255,255,0.06);
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          transition: all 0.2s;
          min-height: 46px;
        }

        .api-key-btn:hover {
          color: #a78bfa;
          background: rgba(167,139,250,0.08);
        }

        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }

        .toggle-row:last-child { border-bottom: none; }

        .toggle-info {}
        .toggle-name {
          font-size: 14px;
          font-weight: 500;
          color: #cbd5e1;
          margin-bottom: 3px;
        }
        .toggle-desc {
          font-size: 12px;
          color: #475569;
        }

        .toggle-switch {
          position: relative;
          width: 40px;
          height: 22px;
          flex-shrink: 0;
        }

        .toggle-input {
          opacity: 0;
          width: 0;
          height: 0;
          position: absolute;
        }

        .toggle-slider {
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.08);
          border-radius: 99px;
          cursor: pointer;
          transition: background 0.3s;
        }

        .toggle-slider::before {
          content: '';
          position: absolute;
          width: 16px;
          height: 16px;
          left: 3px;
          top: 3px;
          background: #64748b;
          border-radius: 50%;
          transition: transform 0.3s, background 0.3s;
        }

        .toggle-input:checked + .toggle-slider {
          background: rgba(124,58,237,0.3);
          border: 1px solid rgba(124,58,237,0.4);
        }

        .toggle-input:checked + .toggle-slider::before {
          transform: translateX(18px);
          background: #a78bfa;
        }

        .select-field {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          color: #e2e8f0;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          appearance: none;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .select-field:focus {
          border-color: rgba(167,139,250,0.4);
        }

        .select-field option {
          background: #0f0f1a;
        }

        .range-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .range-display {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .range-value {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #a78bfa;
        }

        input[type='range'] {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 99px;
          outline: none;
        }

        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          cursor: pointer;
          box-shadow: 0 0 10px rgba(124,58,237,0.5);
        }

        .btn-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 8px;
        }
      `}</style>

      <div className="settings-wrap">
        {/* Header */}
        <div className="page-header">
          <div className="page-label">Configuration</div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Manage your account preferences and security</p>
        </div>

        <div className="settings-layout">
          {/* Nav */}
          <nav className="settings-nav">
            {nav.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                className={`nav-item ${activeSection === id ? "active" : ""}`}
                onClick={() => setActiveSection(id)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div>
            {/* SECURITY */}
            {activeSection === "security" && (
              <div className="settings-card">
                <div className="section-title">Security</div>
                <div className="section-desc">Update your password to keep your account safe.</div>

                <div className="field-group">
                  {/* Current */}
                  <div>
                    <label className="field-label">Current Password</label>
                    <div className="input-wrap">
                      <input
                        type={showPw.current ? "text" : "password"}
                        value={pw.current}
                        onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                        className="input-field"
                        placeholder="Enter your current password"
                      />
                      <button className="input-toggle" onClick={() => setShowPw((s) => ({ ...s, current: !s.current }))}>
                        {showPw.current ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* New */}
                  <div>
                    <label className="field-label">New Password</label>
                    <div className="input-wrap">
                      <input
                        type={showPw.next ? "text" : "password"}
                        value={pw.next}
                        onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                        className="input-field"
                        placeholder="Minimum 8 characters"
                      />
                      <button className="input-toggle" onClick={() => setShowPw((s) => ({ ...s, next: !s.next }))}>
                        {showPw.next ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {pw.next && strength && (
                      <div className="strength-bar-wrap">
                        <div className="strength-bar-bg">
                          <div className="strength-bar-fill" style={{ width: strength.width, background: strength.color }} />
                        </div>
                        <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
                      </div>
                    )}
                    {!pw.next && <p className="hint-text">Use 8+ characters for a stronger password.</p>}
                  </div>

                  {/* Confirm */}
                  <div>
                    <label className="field-label">Confirm New Password</label>
                    <div className="input-wrap">
                      <input
                        type={showPw.confirm ? "text" : "password"}
                        value={pw.confirm}
                        onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                        className="input-field"
                        placeholder="Re-type new password"
                        style={{
                          borderColor: pw.confirm && pw.confirm !== pw.next
                            ? "rgba(239,68,68,0.4)"
                            : pw.confirm && pw.confirm === pw.next
                            ? "rgba(16,185,129,0.4)"
                            : undefined
                        }}
                      />
                      <button className="input-toggle" onClick={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}>
                        {showPw.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {pw.confirm && pw.confirm !== pw.next && (
                      <p className="hint-text" style={{ color: "#f87171" }}>Passwords don't match.</p>
                    )}
                  </div>
                </div>

                <div className="divider" />

                <div className="btn-row">
                  <button
                    className="btn-primary"
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
                    {pwLoading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    Update Password
                  </button>

                  {pwMsg && (
                    <span className={`msg-tag ${pwMsg.type === "success" ? "msg-success" : "msg-error"}`}>
                      {pwMsg.text}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* PREFERENCES */}
            {activeSection === "preferences" && (
              <div className="settings-card">
                <div className="section-title">Preferences</div>
                <div className="section-desc">Customize how Relvō works for you.</div>

                <div style={{ marginBottom: 24 }}>
                  <div className="toggle-row">
                    <div className="toggle-info">
                      <div className="toggle-name">Auto-Approve Content</div>
                      <div className="toggle-desc">Automatically publish generated posts without review</div>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" className="toggle-input" checked={settings.autoApprove}
                        onChange={(e) => setSettings(s => ({ ...s, autoApprove: e.target.checked }))} />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <div className="toggle-row">
                    <div className="toggle-info">
                      <div className="toggle-name">Enable Notifications</div>
                      <div className="toggle-desc">Get notified when content is scheduled or published</div>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" className="toggle-input" checked={settings.enableNotifications}
                        onChange={(e) => setSettings(s => ({ ...s, enableNotifications: e.target.checked }))} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>

                <div className="field-group">
                  <div>
                    <label className="field-label">Default Language</label>
                    <select className="select-field" value={settings.defaultLanguage}
                      onChange={(e) => setSettings(s => ({ ...s, defaultLanguage: e.target.value }))}>
                      {["English", "French", "Spanish", "German", "Portuguese", "Arabic"].map(l => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  <div className="range-wrap">
                    <label className="field-label">Max Content Length</label>
                    <div className="range-display">
                      <span style={{ fontSize: 13, color: "#475569" }}>Characters per post</span>
                      <span className="range-value">{settings.maxContentLength}</span>
                    </div>
                    <input type="range" min={500} max={5000} step={100}
                      value={settings.maxContentLength}
                      onChange={(e) => setSettings(s => ({ ...s, maxContentLength: Number(e.target.value) }))} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#334155" }}>
                      <span>500</span><span>5,000</span>
                    </div>
                  </div>
                </div>

                <div className="divider" />

                <div className="btn-row">
                  <button className="btn-primary" onClick={handleSaveSettings}>
                    {settingsSaved ? <Check size={15} /> : <Save size={15} />}
                    {settingsSaved ? "Saved!" : "Save Preferences"}
                  </button>
                  <button className="btn-ghost" onClick={() => setSettings({ autoApprove: false, enableNotifications: true, maxContentLength: 2000, defaultLanguage: "English" })}>
                    Reset to Default
                  </button>
                </div>
              </div>
            )}

            {/* API */}
            {activeSection === "api" && (
              <div className="settings-card">
                <div className="section-title">API Access</div>
                <div className="section-desc">Use your API key to integrate Relvō into your own tools.</div>

                <div>
                  <label className="field-label">Your API Key</label>
                  <div className="api-key-wrap">
                    <input
                      readOnly
                      className="api-key-display"
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                    />
                    <button className="api-key-btn" onClick={() => setShowApiKey(v => !v)}>
                      {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      {showApiKey ? "Hide" : "Show"}
                    </button>
                    <button className="api-key-btn" onClick={handleCopyApiKey}>
                      {copiedApiKey ? <Check size={14} /> : <Copy size={14} />}
                      {copiedApiKey ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="hint-text" style={{ marginTop: 10 }}>
                    Keep your API key private. Never expose it in client-side code.
                  </p>
                </div>

                <div className="divider" />

                <div style={{ padding: "16px", background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.12)", borderRadius: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#a78bfa", marginBottom: 4 }}>API Endpoint</div>
                  <div style={{ fontFamily: "monospace", fontSize: 13, color: "#64748b" }}>https://api.relvo.ai/v1</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}