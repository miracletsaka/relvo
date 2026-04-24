"use client";
/**
 * app/dashboard/settings/organisation/page.tsx
 * ──────────────────────────────────────────────
 * Org settings: name, members, plan/usage.
 */
import { useEffect, useState } from "react";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

type Member = { user_id: string; email: string; role: string; joined_at: string };
type OrgData = {
  id: string; name: string; slug: string; plan: string;
  role: string;
  limits: { max_brands: number; max_platforms: number; max_drafts_pm: number; max_renders_pm: number };
  usage:  { drafts_this_month: number; renders_this_month: number; brands: number; platforms: number; members: number };
};

const PLAN_COLORS: Record<string, string> = {
  free: "#60a5fa", starter: "#34d399", pro: "#a78bfa", agency: "#fbbf24",
};

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const color = pct > 90 ? "#f87171" : pct > 70 ? "#fbbf24" : "#34d399";
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: "DM Mono, monospace", color: "rgba(255,255,255,0.35)" }}>
          {max >= 999999 ? `${used} / ∞` : `${used} / ${max}`}
        </span>
      </div>
      {max < 999999 && (
        <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
        </div>
      )}
    </div>
  );
}

export default function OrgSettingsPage() {
  const [org,     setOrg]     = useState<OrgData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invite,  setInvite]  = useState("");
  const [invRole, setInvRole] = useState("member");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState<{ ok: boolean; text: string } | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/organisations/me`, { credentials: "include" }).then(r => r.json()),
      fetch(`${API}/organisations/me/members`, { credentials: "include" }).then(r => r.json()),
    ]).then(([orgData, membersData]) => {
      setOrg(orgData);
      setEditName(orgData.name);
      setMembers(Array.isArray(membersData) ? membersData : []);
    }).finally(() => setLoading(false));
  }, []);

  const saveName = async () => {
    if (!editName.trim() || editName === org?.name) return;
    setSaving(true);
    try {
      const res  = await fetch(`${API}/organisations/me`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName.trim() }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed");
      setOrg(prev => prev ? { ...prev, name: json.organisation.name } : prev);
      setMsg({ ok: true, text: "Name updated" });
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
    finally { setSaving(false); }
  };

  const sendInvite = async () => {
    if (!invite.trim()) return;
    setSaving(true);
    try {
      const res  = await fetch(`${API}/organisations/me/invite`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: invite.trim(), role: invRole }) });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.detail === "string" ? json.detail : json.detail?.message || "Failed");
      setMsg({ ok: true, text: json.message });
      setInvite("");
      // Refresh members
      fetch(`${API}/organisations/me/members`, { credentials: "include" }).then(r => r.json()).then(setMembers);
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
    finally { setSaving(false); }
  };

  const removeMember = async (userId: string) => {
    if (!confirm("Remove this member?")) return;
    try {
      await fetch(`${API}/organisations/me/members/${userId}`, { method: "DELETE", credentials: "include" });
      setMembers(prev => prev.filter(m => m.user_id !== userId));
    } catch {}
  };

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontFamily: "Syne, sans-serif" }}>
      Loading…
    </div>
  );
  if (!org) return null;

  const planColor = PLAN_COLORS[org.plan] || "#60a5fa";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px", fontFamily: "Syne, sans-serif", color: "#e4e4e7" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');`}</style>

      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Organisation Settings</h1>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 32 }}>Manage your workspace, team, and billing.</p>

      {msg && (
        <div style={{ marginBottom: 20, padding: "10px 16px", background: msg.ok ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${msg.ok ? "rgba(52,211,153,0.25)" : "rgba(239,68,68,0.25)"}`, borderRadius: 10, fontSize: 12, color: msg.ok ? "#34d399" : "#f87171", display: "flex", justifyContent: "space-between" }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", opacity: 0.5 }}>✕</button>
        </div>
      )}

      {/* Plan badge + usage */}
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Current Plan</div>
            <span style={{ display: "inline-block", background: planColor + "20", color: planColor, border: `1px solid ${planColor}40`, padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {org.plan}
            </span>
          </div>
          {org.plan !== "agency" && (
            <a href="/dashboard/billing" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", borderRadius: 10, color: "white", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              ↑ Upgrade Plan
            </a>
          )}
        </div>

        <UsageBar label="Brands"             used={org.usage.brands}             max={org.limits.max_brands} />
        <UsageBar label="Platforms"          used={org.usage.platforms}          max={org.limits.max_platforms} />
        <UsageBar label="Drafts this month"  used={org.usage.drafts_this_month}  max={org.limits.max_drafts_pm} />
        <UsageBar label="Renders this month" used={org.usage.renders_this_month} max={org.limits.max_renders_pm} />
      </div>

      {/* Org name */}
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Workspace Details</div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Organisation Name</label>
          <div style={{ display: "flex", gap: 10 }}>
            <input value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#e4e4e7", fontSize: 13, outline: "none", fontFamily: "Syne, sans-serif" }} />
            <button onClick={saveName} disabled={saving || editName === org.name} style={{ padding: "10px 18px", background: editName !== org.name ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${editName !== org.name ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, color: editName !== org.name ? "#c4b5fd" : "rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 700, cursor: editName !== org.name ? "pointer" : "default", fontFamily: "Syne, sans-serif" }}>
              Save
            </button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace" }}>
          Workspace ID: {org.id}
        </div>
      </div>

      {/* Team members */}
      {(org.role === "owner" || org.role === "admin") && (
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Team Members ({members.length})</div>

          {/* Member list */}
          <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {members.map(m => (
              <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#a78bfa", flexShrink: 0 }}>
                  {m.email[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace" }}>
                    Joined {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : "—"}
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: m.role === "owner" ? "#fbbf24" : m.role === "admin" ? "#a78bfa" : "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.05)", padding: "3px 8px", borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {m.role}
                </span>
                {m.role !== "owner" && org.role === "owner" && (
                  <button onClick={() => removeMember(m.user_id)} style={{ padding: "5px 8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#f87171", fontSize: 10, cursor: "pointer", fontFamily: "Syne, sans-serif" }}>
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Invite */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>Invite a team member</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={invite} onChange={e => setInvite(e.target.value)} placeholder="colleague@company.com" onKeyDown={e => e.key === "Enter" && sendInvite()} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#e4e4e7", fontSize: 12, outline: "none", fontFamily: "DM Mono, monospace" }} />
              <select value={invRole} onChange={e => setInvRole(e.target.value)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 12px", color: "#e4e4e7", fontSize: 12, outline: "none", fontFamily: "Syne, sans-serif" }}>
                <option className="text-black" value="admin">Admin</option>
                <option className="text-black" value="member">Member</option>
                <option className="text-black" value="viewer">Viewer</option>
              </select>
              <button onClick={sendInvite} disabled={saving || !invite.trim()} style={{ padding: "10px 18px", background: invite.trim() ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${invite.trim() ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, color: invite.trim() ? "#34d399" : "rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 700, cursor: invite.trim() ? "pointer" : "default", fontFamily: "Syne, sans-serif" }}>
                Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}