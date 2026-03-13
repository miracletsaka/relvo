"use client";

import { useEffect, useState } from "react";
import { registerUser, listUsers, type UserRow } from "@/lib/api";
import { RefreshCcw, Plus, Users, Check, AlertTriangle, Mail, ShieldCheck, ShieldOff, X, UserCircle2 } from "lucide-react";

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function UserAvatar({ email, size = 36 }: { email: string; size?: number }) {
  const letter = email.charAt(0).toUpperCase();
  const hue = Array.from(email).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const color = `hsl(${hue},50%,62%)`;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color + "18", border: `1px solid ${color}35`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color, fontSize: size * 0.42, fontWeight: 800,
      fontFamily: "Syne, sans-serif", flexShrink: 0,
    }}>{letter}</div>
  );
}

export default function UsersPage() {
  const [users, setUsers]     = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail]     = useState("");
  const [creating, setCreating] = useState(false);

  const refresh = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setMsg(null);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const onCreate = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setMsg({ type: "err", text: "A valid email address is required." });
      return;
    }
    setCreating(true); setMsg(null);
    try {
      await registerUser({ email: cleanEmail });
      setEmail(""); setShowForm(false);
      await refresh(true);
      setMsg({ type: "ok", text: `Invite sent to ${cleanEmail}. Temporary password + setup links emailed.` });
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setCreating(false);
    }
  };

  const verified   = users.filter(u => u.is_email_verified);
  const unverified = users.filter(u => !u.is_email_verified);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .usr-root { font-family: 'Syne', sans-serif; background: #0c0c0f; min-height: 100vh; color: #e4e4e7; padding: 28px 24px; }
        .usr-root * { box-sizing: border-box; }
        @keyframes usrspin { to { transform: rotate(360deg); } }
        @keyframes usrFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .usr-fade { animation: usrFade 0.22s ease both; }
        .usr-input {
          width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
          border-radius: 11px; padding: 10px 14px 10px 38px; color: #e4e4e7;
          font-family: 'DM Mono', monospace; font-size: 12px; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .usr-input:focus { border-color: rgba(124,58,237,0.5); box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .usr-input::placeholder { color: rgba(255,255,255,0.18); }
        .usr-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 11px; font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s; border: none; }
        .usr-btn-primary { background: linear-gradient(135deg,#7c3aed,#4f46e5); color: white; }
        .usr-btn-primary:hover:not(:disabled) { opacity: 0.85; }
        .usr-btn-outline { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.55); }
        .usr-btn-outline:hover:not(:disabled) { background: rgba(255,255,255,0.09); color: #e4e4e7; }
        .usr-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .usr-section-label { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.22); font-family: 'DM Mono', monospace; margin-bottom: 10px; }
        .usr-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 13px 15px; display: flex; align-items: center; gap: 12px; transition: border-color 0.18s; }
        .usr-card:hover { border-color: rgba(255,255,255,0.12); }
        .usr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px,1fr)); gap: 8px; }
      `}</style>

      <div className="usr-root">

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(124,58,237,0.7)", marginBottom: 4, fontFamily: "DM Mono, monospace" }}>
              NeuroFlow · Config
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#e4e4e7", margin: 0, lineHeight: 1.1 }}>Users</h1>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 5 }}>
              {users.length} user{users.length !== 1 ? "s" : ""} · {verified.length} verified
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="usr-btn usr-btn-outline" onClick={() => refresh()} disabled={loading}>
              <RefreshCcw style={{ width: 12, height: 12, animation: loading ? "usrspin 0.7s linear infinite" : "none" }} />
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button className="usr-btn usr-btn-primary" onClick={() => setShowForm(v => !v)}>
              <Plus style={{ width: 12, height: 12 }} />
              Invite User
            </button>
          </div>
        </div>

        {/* ── Invite form ── */}
        {showForm && (
          <div className="usr-fade" style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 18, padding: "20px 22px", marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", marginBottom: 14 }}>Invite New User</div>
            <div style={{ position: "relative", marginBottom: 14 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", display: "block", marginBottom: 6 }}>Email Address</span>
              <div style={{ position: "relative" }}>
                <Mail style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "rgba(255,255,255,0.2)", pointerEvents: "none" }} />
                <input
                  className="usr-input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && onCreate()}
                  placeholder="user@company.com"
                  autoFocus
                />
              </div>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 5, fontFamily: "DM Mono, monospace" }}>
                A temporary password + setup link will be sent to this address.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="usr-btn usr-btn-primary" onClick={onCreate} disabled={creating}>
                {creating
                  ? <span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "usrspin 0.7s linear infinite" }} />
                  : <Mail style={{ width: 12, height: 12 }} />}
                {creating ? "Sending…" : "Send Invite"}
              </button>
              <button className="usr-btn usr-btn-outline" onClick={() => { setShowForm(false); setEmail(""); setMsg(null); }}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── Global toast ── */}
        {msg && (
          <div className="usr-fade" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, marginBottom: 20, fontSize: 12, fontWeight: 700, background: msg.type === "ok" ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${msg.type === "ok" ? "rgba(52,211,153,0.25)" : "rgba(239,68,68,0.22)"}`, color: msg.type === "ok" ? "#34d399" : "#f87171" }}>
            {msg.type === "ok" ? <Check style={{ width: 13, height: 13, flexShrink: 0 }} /> : <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0 }} />}
            <span style={{ flex: 1 }}>{msg.text}</span>
            <button onClick={() => setMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.5, padding: 2, display: "flex" }}><X style={{ width: 11, height: 11 }} /></button>
          </div>
        )}

        {/* ── User lists ── */}
        {loading && users.length === 0 ? (
          <div className="usr-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 64, borderRadius: 14, background: "rgba(255,255,255,0.04)", animation: "usrFade 1.4s ease infinite alternate", animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Users style={{ width: 40, height: 40, margin: "0 auto 12px", color: "rgba(255,255,255,0.1)" }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.2)" }}>No users yet</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", marginTop: 4 }}>Click "Invite User" to get started</p>
          </div>
        ) : (
          <>
            {verified.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <div className="usr-section-label">Verified · {verified.length}</div>
                <div className="usr-grid">
                  {verified.map((u, i) => <UserCard key={u.id} u={u} idx={i} />)}
                </div>
              </section>
            )}
            {unverified.length > 0 && (
              <section>
                <div className="usr-section-label">Pending Verification · {unverified.length}</div>
                <div className="usr-grid">
                  {unverified.map((u, i) => <UserCard key={u.id} u={u} idx={i} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}

function UserCard({ u, idx }: { u: UserRow; idx: number }) {
  const isVerified = u.is_email_verified;
  const isActive   = u.is_active;

  return (
    <div className="usr-card usr-fade" style={{ animationDelay: `${idx * 0.035}s` }}>
      <UserAvatar email={u.email} size={36} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? "#e4e4e7" : "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {u.email}
        </div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", marginTop: 2 }}>
          joined {fmtDate(u.created_at)}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {/* Verified badge */}
        <span title={isVerified ? "Email verified" : "Not verified"} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 7, fontFamily: "DM Mono, monospace", background: isVerified ? "rgba(52,211,153,0.1)" : "rgba(251,191,36,0.1)", border: `1px solid ${isVerified ? "rgba(52,211,153,0.22)" : "rgba(251,191,36,0.22)"}`, color: isVerified ? "#34d399" : "#fbbf24" }}>
          {isVerified ? <ShieldCheck style={{ width: 9, height: 9 }} /> : <ShieldOff style={{ width: 9, height: 9 }} />}
          {isVerified ? "verified" : "pending"}
        </span>

        {/* Active dot */}
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: isActive ? "#34d399" : "rgba(255,255,255,0.12)", flexShrink: 0, boxShadow: isActive ? "0 0 6px #34d39988" : "none" }} title={isActive ? "Active" : "Inactive"} />
      </div>
    </div>
  );
}