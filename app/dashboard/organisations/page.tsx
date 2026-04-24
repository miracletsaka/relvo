"use client";
/**
 * app/dashboard/organisations/page.tsx
 * ──────────────────────────────────────
 * Full org management page:
 *   - View + switch between all orgs
 *   - Create new org
 *   - Edit org name / slug
 *   - Manage members (invite, change role, remove)
 *   - View plan + usage
 *   - Delete org (owner only)
 */
import { useEffect, useRef, useState } from "react";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────
type Plan = "free" | "starter" | "pro" | "agency";

type Org = {
  id:        string;
  name:      string;
  slug:      string;
  plan:      Plan;
  role:      string;
  is_active: boolean;
  created_at: string;
  limits: {
    max_brands:     number;
    max_platforms:  number;
    max_drafts_pm:  number;
    max_renders_pm: number;
  };
  usage?: {
    brands:             number;
    platforms:          number;
    drafts_this_month:  number;
    renders_this_month: number;
    members:            number;
  };
};

type Member = {
  user_id:   string;
  email:     string;
  role:      string;
  joined_at: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const PLAN_META: Record<Plan, { label: string; color: string; bg: string; border: string }> = {
  free:    { label: "Free",    color: "#60a5fa", bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.2)"  },
  starter: { label: "Starter", color: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)"  },
  pro:     { label: "Pro",     color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)" },
  agency:  { label: "Agency",  color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)"  },
};

const ROLE_COLORS: Record<string, string> = {
  owner:  "#fbbf24",
  admin:  "#a78bfa",
  member: "rgba(255,255,255,0.4)",
  viewer: "rgba(255,255,255,0.25)",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: Plan }) {
  const m = PLAN_META[plan] || PLAN_META.free;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      background: m.bg, border: `1px solid ${m.border}`,
      color: m.color, fontSize: 10, fontWeight: 800,
      letterSpacing: "0.1em", textTransform: "uppercase",
      fontFamily: "DM Mono, monospace",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.color }} />
      {m.label}
    </span>
  );
}

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const inf    = max >= 999999;
  const pct    = inf ? 0 : Math.min(100, Math.round((used / max) * 100));
  const color  = pct > 90 ? "#f87171" : pct > 70 ? "#fbbf24" : "#34d399";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "DM Mono, monospace" }}>{label}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>
          {used} / {inf ? "∞" : max}
        </span>
      </div>
      {!inf && (
        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.5s ease" }} />
        </div>
      )}
    </div>
  );
}

function Avatar({ name, size = 36, color = "#7c3aed" }: { name: string; size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${color}, ${color}88)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 800, color: "white",
      fontFamily: "Syne, sans-serif",
    }}>
      {name[0]?.toUpperCase() || "?"}
    </div>
  );
}

function Spinner({ size = 14, color = "white" }: { size?: number; color?: string }) {
  return (
    <span style={{
      width: size, height: size, flexShrink: 0,
      border: `2px solid ${color}30`,
      borderTopColor: color,
      borderRadius: "50%",
      display: "inline-block",
      animation: "spin 0.7s linear infinite",
    }} />
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OrgManagementPage() {
  const [orgs,         setOrgs]         = useState<Org[]>([]);
  const [activeOrg,    setActiveOrg]    = useState<Org | null>(null);
  const [members,      setMembers]      = useState<Member[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [switching,    setSwitching]    = useState<string | null>(null);
  const [tab,          setTab]          = useState<"overview" | "members" | "settings" | "danger">("overview");

  // Create org modal
  const [showCreate,   setShowCreate]   = useState(false);
  const [createName,   setCreateName]   = useState("");
  const [createSlug,   setCreateSlug]   = useState("");
  const [creating,     setCreating]     = useState(false);

  // Edit
  const [editName,     setEditName]     = useState("");
  const [editSlug,     setEditSlug]     = useState("");
  const [saving,       setSaving]       = useState(false);

  // Members
  const [inviteEmail,  setInviteEmail]  = useState("");
  const [inviteRole,   setInviteRole]   = useState("member");
  const [inviting,     setInviting]     = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting,      setDeleting]      = useState(false);

  // Notifications
  const [toast,        setToast]        = useState<{ ok: boolean; msg: string } | null>(null);

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load all orgs ──────────────────────────────────────────────────────────
  const loadOrgs = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/organisations/my-orgs`, { credentials: "include" });
      const data = await res.json();
      const list: Org[] = Array.isArray(data) ? data : [];
      setOrgs(list);
      if (list.length > 0 && !activeOrg) {
        await selectOrg(list[0]);
      }
    } catch {}
    finally { setLoading(false); }
  };

  const selectOrg = async (org: Org) => {
    // Load full org details + members in parallel
    setActiveOrg(org);
    setEditName(org.name);
    setEditSlug(org.slug);
    setTab("overview");
    try {
      const [meRes, membersRes] = await Promise.all([
        fetch(`${API}/organisations/me`, { credentials: "include" }),
        fetch(`${API}/organisations/me/members`, { credentials: "include" }),
      ]);
      const meData      = await meRes.json();
      const membersData = await membersRes.json();
      setActiveOrg(meData);
      setEditName(meData.name);
      setEditSlug(meData.slug);
      setMembers(Array.isArray(membersData) ? membersData : []);
    } catch {}
  };

  useEffect(() => { loadOrgs(); }, []);

  // ── Switch active org ──────────────────────────────────────────────────────
  const switchToOrg = async (org: Org) => {
    if (switching) return;
    setSwitching(org.id);
    try {
      await fetch(`${API}/organisations/switch/${org.id}`, {
        method: "POST", credentials: "include",
      });
      await selectOrg(org);
      showToast(true, `Switched to ${org.name}`);
    } catch {
      showToast(false, "Failed to switch organisation");
    } finally {
      setSwitching(null);
    }
  };

  // ── Create org ─────────────────────────────────────────────────────────────
  const createOrg = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const res  = await fetch(`${API}/organisations`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), slug: createSlug || slugify(createName) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to create");
      setShowCreate(false);
      setCreateName("");
      setCreateSlug("");
      await loadOrgs();
      showToast(true, `"${json.organisation?.name}" created successfully`);
    } catch (e: any) {
      showToast(false, e.message);
    } finally {
      setCreating(false);
    }
  };

  // ── Save org edits ─────────────────────────────────────────────────────────
  const saveOrg = async () => {
    if (!activeOrg) return;
    setSaving(true);
    try {
      const res  = await fetch(`${API}/organisations/me`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), slug: editSlug.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to save");
      setActiveOrg(prev => prev ? { ...prev, name: json.organisation.name, slug: json.organisation.slug } : prev);
      setOrgs(prev => prev.map(o => o.id === activeOrg.id ? { ...o, name: json.organisation.name, slug: json.organisation.slug } : o));
      showToast(true, "Organisation updated");
    } catch (e: any) {
      showToast(false, e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Invite member ──────────────────────────────────────────────────────────
  const invite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res  = await fetch(`${API}/organisations/me/invite`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.detail === "string" ? json.detail : json.detail?.message || "Failed");
      setInviteEmail("");
      const mRes    = await fetch(`${API}/organisations/me/members`, { credentials: "include" });
      setMembers(await mRes.json());
      showToast(true, json.message || "Member added");
    } catch (e: any) {
      showToast(false, e.message);
    } finally {
      setInviting(false);
    }
  };

  // ── Remove member ──────────────────────────────────────────────────────────
  const removeMember = async (userId: string, email: string) => {
    if (!confirm(`Remove ${email} from this organisation?`)) return;
    try {
      await fetch(`${API}/organisations/me/members/${userId}`, {
        method: "DELETE", credentials: "include",
      });
      setMembers(prev => prev.filter(m => m.user_id !== userId));
      showToast(true, `${email} removed`);
    } catch {
      showToast(false, "Failed to remove member");
    }
  };

  // ── Change role ────────────────────────────────────────────────────────────
  const changeRole = async (userId: string, role: string) => {
    try {
      await fetch(`${API}/organisations/me/members/${userId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m));
      showToast(true, "Role updated");
    } catch {
      showToast(false, "Failed to update role");
    }
  };

  const canManage = activeOrg?.role === "owner" || activeOrg?.role === "admin";
  const isOwner   = activeOrg?.role === "owner";

  // ── Input style ────────────────────────────────────────────────────────────
  const inp = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 10, padding: "10px 14px",
    color: "#e4e4e7", fontSize: 13, outline: "none",
    fontFamily: "DM Mono, monospace",
    width: "100%", boxSizing: "border-box" as const,
    transition: "border-color 0.15s",
  };

  const sel = {
    ...inp,
    appearance: "none" as const,
    cursor: "pointer",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: 34,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0c0c0f", color: "#e4e4e7", fontFamily: "Syne, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        .org-card { transition: all 0.15s; cursor: pointer; }
        .org-card:hover { border-color: rgba(255,255,255,0.15) !important; background: rgba(255,255,255,0.04) !important; }
        .tab-btn { transition: all 0.15s; cursor: pointer; border: none; background: none; font-family: Syne, sans-serif; }
        .danger-btn { transition: all 0.15s; }
        .danger-btn:hover { background: rgba(239,68,68,0.18) !important; border-color: rgba(239,68,68,0.5) !important; }
        .member-row { transition: background 0.15s; }
        .member-row:hover { background: rgba(255,255,255,0.025) !important; }
        input:focus, select:focus { border-color: rgba(124,58,237,0.5) !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px #141418 inset !important; -webkit-text-fill-color: #e4e4e7 !important; }
        .modal-overlay { animation: fadeIn 0.15s ease both; }
        .modal-card   { animation: fadeUp 0.2s ease both; }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 18px",
          background: toast.ok ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${toast.ok ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.3)"}`,
          borderRadius: 12, fontSize: 13, fontWeight: 600,
          color: toast.ok ? "#34d399" : "#f87171",
          backdropFilter: "blur(12px)",
          animation: "fadeUp 0.2s ease both",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          {toast.ok
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* ── Create org modal ── */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)} style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div className="modal-card" style={{
            width: "100%", maxWidth: 460,
            background: "#141418", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20, padding: 32,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>New Organisation</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "DM Mono, monospace" }}>
                  Each org is a separate workspace
                </p>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "DM Mono, monospace", marginBottom: 7 }}>
                  Organisation Name
                </label>
                <input
                  autoFocus value={createName}
                  onChange={e => { setCreateName(e.target.value); setCreateSlug(slugify(e.target.value)); }}
                  onKeyDown={e => e.key === "Enter" && createOrg()}
                  placeholder="relvo"
                  style={inp}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "DM Mono, monospace", marginBottom: 7 }}>
                  Workspace URL
                </label>
                <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden" }}>
                  <span style={{ padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", borderRight: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>
                    relvo.neuroflowai.co.uk/business
                  </span>
                  <input
                    value={createSlug}
                    onChange={e => setCreateSlug(slugify(e.target.value))}
                    placeholder="-agency"
                    style={{ ...inp, border: "none", borderRadius: 0, background: "transparent", flex: 1, padding: "10px 12px" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: "11px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}>
                  Cancel
                </button>
                <button
                  onClick={createOrg}
                  disabled={creating || !createName.trim()}
                  style={{ flex: 2, padding: "11px", background: createName.trim() ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 800, cursor: createName.trim() ? "pointer" : "not-allowed", fontFamily: "Syne, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {creating ? <><Spinner size={13} /> Creating…</> : "Create Workspace →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Page layout ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(124,58,237,0.7)", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "DM Mono, monospace", marginBottom: 6 }}>
              Account
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
              Organisations
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0 }}>
              Manage your workspaces, teams, and billing across all organisations.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", borderRadius: 11, color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "Syne, sans-serif", flexShrink: 0 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Organisation
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, gap: 12, color: "rgba(255,255,255,0.25)" }}>
            <Spinner color="rgba(255,255,255,0.3)" size={18} />
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: 13 }}>Loading organisations…</span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>

            {/* ── Left: org list ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "DM Mono, monospace", marginBottom: 4, paddingLeft: 4 }}>
                Your Workspaces ({orgs.length})
              </div>

              {orgs.map(org => {
                const isActive = activeOrg?.id === org.id;
                const isSwitching = switching === org.id;
                return (
                  <div
                    key={org.id}
                    className="org-card"
                    onClick={() => !isSwitching && (isActive ? null : switchToOrg(org))}
                    style={{
                      padding: "14px 16px",
                      background: isActive ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.025)",
                      border: `1px solid ${isActive ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 14,
                      cursor: isActive ? "default" : "pointer",
                      position: "relative",
                      animation: "fadeUp 0.3s ease both",
                    }}
                  >
                    {isActive && (
                      <div style={{ position: "absolute", top: 12, right: 12, width: 7, height: 7, borderRadius: "50%", background: "#34d399", animation: "pulse-dot 2s ease-in-out infinite" }} />
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                        background: isActive ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${isActive ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.08)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 800, color: isActive ? "#c4b5fd" : "rgba(255,255,255,0.4)",
                      }}>
                        {org.name[0]?.toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? "#e4e4e7" : "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {org.name}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace" }}>
                          {org.slug}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <PlanBadge plan={org.plan as Plan} />
                      <span style={{ fontSize: 10, color: ROLE_COLORS[org.role] || "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {org.role}
                      </span>
                      {isSwitching && <Spinner size={11} color="#a78bfa" />}
                    </div>
                  </div>
                );
              })}

              {orgs.length === 0 && (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13, fontFamily: "DM Mono, monospace" }}>
                  No organisations yet
                </div>
              )}
            </div>

            {/* ── Right: org detail ── */}
            {activeOrg ? (
              <div style={{ animation: "slideIn 0.25s ease both" }}>

                {/* Org header */}
                <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 13, background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(79,70,229,0.3))", border: "1px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#c4b5fd", flexShrink: 0 }}>
                    {activeOrg.name[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: "#e4e4e7" }}>{activeOrg.name}</span>
                      <PlanBadge plan={activeOrg.plan as Plan} />
                      <span style={{ fontSize: 10, color: ROLE_COLORS[activeOrg.role] || "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {activeOrg.role}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>
                      relvo.neuroflowai.co.uk/business/{activeOrg.slug} · ID: {activeOrg.id.slice(0, 8)}…
                    </div>
                  </div>
                  {activeOrg.plan !== "agency" && (
                    <a href="/dashboard/billing" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 9, color: "#fbbf24", fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>
                      ↑ Upgrade
                    </a>
                  )}
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 2, marginBottom: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 4 }}>
                  {(["overview", "members", "settings", ...(isOwner ? ["danger"] : [])] as const).map(t => (
                    <button
                      key={t}
                      className="tab-btn"
                      onClick={() => setTab(t as any)}
                      style={{
                        flex: 1, padding: "8px 12px", borderRadius: 9,
                        background: tab === t ? (t === "danger" ? "rgba(239,68,68,0.15)" : "rgba(124,58,237,0.15)") : "transparent",
                        color: tab === t ? (t === "danger" ? "#f87171" : "#c4b5fd") : "rgba(255,255,255,0.35)",
                        fontSize: 12, fontWeight: 700,
                        textTransform: "capitalize" as const,
                        border: tab === t ? `1px solid ${t === "danger" ? "rgba(239,68,68,0.3)" : "rgba(124,58,237,0.3)"}` : "1px solid transparent",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* ── Tab: Overview ── */}
                {tab === "overview" && (
                  <div style={{ animation: "fadeUp 0.2s ease both" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                      {[
                        { label: "Members",     value: activeOrg.usage?.members ?? "—",            icon: "👥" },
                        { label: "Brands",       value: activeOrg.usage?.brands ?? "—",             icon: "🏷️" },
                        { label: "Platforms",    value: activeOrg.usage?.platforms ?? "—",           icon: "📡" },
                        { label: "Drafts/month", value: activeOrg.usage?.drafts_this_month ?? "—",  icon: "✍️" },
                      ].map(s => (
                        <div key={s.label} style={{ padding: "16px 18px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
                          <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: "#e4e4e7", marginBottom: 3 }}>{s.value}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ padding: "20px 22px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "DM Mono, monospace" }}>
                        Plan Usage
                      </div>
                      <UsageBar label="Brands"             used={activeOrg.usage?.brands ?? 0}             max={activeOrg.limits.max_brands} />
                      <UsageBar label="Platforms"          used={activeOrg.usage?.platforms ?? 0}          max={activeOrg.limits.max_platforms} />
                      <UsageBar label="AI Drafts / month"  used={activeOrg.usage?.drafts_this_month ?? 0}  max={activeOrg.limits.max_drafts_pm} />
                      <UsageBar label="Video Renders / mo" used={activeOrg.usage?.renders_this_month ?? 0} max={activeOrg.limits.max_renders_pm} />
                    </div>
                  </div>
                )}

                {/* ── Tab: Members ── */}
                {tab === "members" && (
                  <div style={{ animation: "fadeUp 0.2s ease both" }}>
                    {canManage && (
                      <div style={{ padding: "18px 20px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "DM Mono, monospace" }}>
                          Invite Member
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && invite()}
                            placeholder="colleague@company.com"
                            style={{ ...inp, flex: 1 }}
                          />
                          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ ...sel, width: 110 }}>
                            <option className="text-black" value="admin">Admin</option>
                            <option className="text-black" value="member">Member</option>
                            <option className="text-black" value="viewer">Viewer</option>
                          </select>
                          <button
                            onClick={invite}
                            disabled={inviting || !inviteEmail.trim()}
                            style={{ padding: "10px 16px", background: inviteEmail.trim() ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${inviteEmail.trim() ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, color: inviteEmail.trim() ? "#34d399" : "rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 700, cursor: inviteEmail.trim() ? "pointer" : "default", fontFamily: "Syne, sans-serif", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" as const }}
                          >
                            {inviting ? <Spinner size={12} color="#34d399" /> : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
                            Invite
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
                      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "DM Mono, monospace" }}>
                        {members.length} Member{members.length !== 1 ? "s" : ""}
                      </div>
                      {members.map((m, i) => (
                        <div
                          key={m.user_id}
                          className="member-row"
                          style={{
                            display: "flex", alignItems: "center", gap: 14,
                            padding: "14px 20px",
                            borderBottom: i < members.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                          }}
                        >
                          <Avatar name={m.email} size={36} color={m.role === "owner" ? "#d97706" : m.role === "admin" ? "#7c3aed" : "#374151"} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>
                              Joined {m.joined_at ? new Date(m.joined_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                            </div>
                          </div>

                          {/* Role selector */}
                          {canManage && m.role !== "owner" ? (
                            <select
                              value={m.role}
                              onChange={e => changeRole(m.user_id, e.target.value)}
                              style={{ ...sel, width: 100, fontSize: 11, padding: "6px 28px 6px 10px" }}
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 700, color: ROLE_COLORS[m.role] || "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace", textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(255,255,255,0.04)", padding: "4px 10px", borderRadius: 6 }}>
                              {m.role}
                            </span>
                          )}

                          {/* Remove button */}
                          {isOwner && m.role !== "owner" && (
                            <button
                              onClick={() => removeMember(m.user_id, m.email)}
                              style={{ padding: "6px 8px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", transition: "all 0.15s" }}
                              onMouseEnter={e => { (e.currentTarget.style.background = "rgba(239,68,68,0.18)"); }}
                              onMouseLeave={e => { (e.currentTarget.style.background = "rgba(239,68,68,0.07)"); }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Tab: Settings ── */}
                {tab === "settings" && (
                  <div style={{ animation: "fadeUp 0.2s ease both", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ padding: "22px 24px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 18 }}>General</div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "DM Mono, monospace", marginBottom: 7 }}>Organisation Name</label>
                        <input value={editName} onChange={e => setEditName(e.target.value)} disabled={!canManage} style={{ ...inp, opacity: canManage ? 1 : 0.5 }} />
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "DM Mono, monospace", marginBottom: 7 }}>Workspace Slug</label>
                        <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden" }}>
                          <span style={{ padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", borderRight: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>
                            relvo.neuroflowai.co.uk/business/
                          </span>
                          <input value={editSlug} onChange={e => setEditSlug(slugify(e.target.value))} disabled={!canManage} style={{ ...inp, border: "none", borderRadius: 0, background: "transparent", flex: 1, padding: "10px 12px", opacity: canManage ? 1 : 0.5 }} />
                        </div>
                      </div>

                      {canManage && (
                        <button
                          onClick={saveOrg}
                          disabled={saving || (editName === activeOrg.name && editSlug === activeOrg.slug)}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: (editName !== activeOrg.name || editSlug !== activeOrg.slug) && !saving ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${(editName !== activeOrg.name || editSlug !== activeOrg.slug) ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, color: (editName !== activeOrg.name || editSlug !== activeOrg.slug) ? "#c4b5fd" : "rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}
                        >
                          {saving ? <><Spinner size={12} color="#a78bfa" /> Saving…</> : "Save Changes"}
                        </button>
                      )}
                    </div>

                    {/* Org info */}
                    <div style={{ padding: "18px 22px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "DM Mono, monospace" }}>Info</div>
                      {[
                        { label: "Organisation ID", value: activeOrg.id },
                        { label: "Created",          value: activeOrg.created_at ? new Date(activeOrg.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—" },
                        { label: "Plan",             value: activeOrg.plan.charAt(0).toUpperCase() + activeOrg.plan.slice(1) },
                        { label: "Your role",        value: activeOrg.role.charAt(0).toUpperCase() + activeOrg.role.slice(1) },
                      ].map(row => (
                        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace" }}>{row.label}</span>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "DM Mono, monospace", textAlign: "right", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Tab: Danger ── */}
                {tab === "danger" && isOwner && (
                  <div style={{ animation: "fadeUp 0.2s ease both" }}>
                    <div style={{ padding: "22px 24px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 14 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#f87171", marginBottom: 4 }}>Delete Organisation</div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
                            Permanently deletes <strong style={{ color: "rgba(255,255,255,0.6)" }}>{activeOrg.name}</strong> and all its data —
                            brands, drafts, templates, media assets. This cannot be undone.
                          </div>
                        </div>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "DM Mono, monospace", marginBottom: 8 }}>
                          Type <strong style={{ color: "#f87171" }}>{activeOrg.name}</strong> to confirm
                        </label>
                        <input
                          value={deleteConfirm}
                          onChange={e => setDeleteConfirm(e.target.value)}
                          placeholder={activeOrg.name}
                          style={{ ...inp, borderColor: deleteConfirm === activeOrg.name ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.08)" }}
                        />
                      </div>

                      <button
                        className="danger-btn"
                        disabled={deleteConfirm !== activeOrg.name || deleting}
                        onClick={async () => {
                          if (deleteConfirm !== activeOrg.name) return;
                          if (!confirm(`Delete "${activeOrg.name}" forever? This cannot be undone.`)) return;
                          setDeleting(true);
                          try {
                            const res = await fetch(`${API}/organisations/me`, { method: "DELETE", credentials: "include" });
                            if (!res.ok) throw new Error("Failed");
                            showToast(true, "Organisation deleted");
                            await loadOrgs();
                            setActiveOrg(null);
                          } catch {
                            showToast(false, "Failed to delete organisation");
                          } finally {
                            setDeleting(false);
                            setDeleteConfirm("");
                          }
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "10px 20px",
                          background: deleteConfirm === activeOrg.name ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${deleteConfirm === activeOrg.name ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.07)"}`,
                          borderRadius: 10,
                          color: deleteConfirm === activeOrg.name ? "#f87171" : "rgba(255,255,255,0.2)",
                          fontSize: 12, fontWeight: 700, cursor: deleteConfirm === activeOrg.name ? "pointer" : "not-allowed",
                          fontFamily: "Syne, sans-serif",
                          transition: "all 0.15s",
                        }}
                      >
                        {deleting
                          ? <><Spinner size={12} color="#f87171" /> Deleting…</>
                          : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Delete Organisation</>
                        }
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, color: "rgba(255,255,255,0.15)", gap: 12 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                <span style={{ fontSize: 13, fontFamily: "DM Mono, monospace" }}>Select an organisation</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}