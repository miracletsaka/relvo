"use client";

import { useEffect, useState } from "react";
import {
  Plus, Trash2, Check, X, Loader2, Users,
  Crown, ShieldCheck, User, Eye, RefreshCw, Mail,
} from "lucide-react";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

type Member = {
  user_id:   string;
  email:     string;
  role:      string;
  joined_at: string;
};

type OrgInfo = {
  id:   string;
  name: string;
  role: string;
};

// ── Role helpers ──────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  owner:  { label: "Owner",  color: "#d97706", bg: "rgba(217,119,6,0.1)",  border: "rgba(217,119,6,0.25)",  icon: Crown },
  admin:  { label: "Admin",  color: "#7c55f6", bg: "rgba(124,85,246,0.1)", border: "rgba(124,85,246,0.25)", icon: ShieldCheck },
  member: { label: "Member", color: "#059669", bg: "rgba(5,150,105,0.1)",  border: "rgba(5,150,105,0.22)",  icon: User },
  viewer: { label: "Viewer", color: "#6b7280", bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.2)", icon: Eye },
};
const roleMeta = (r: string) => ROLE_META[r] || ROLE_META.viewer;

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function initials(email: string) {
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

// ── Shared primitives ─────────────────────────────────────────────────────────

const labelCls = "block text-[9px] font-bold uppercase tracking-[0.15em] text-black/30 mb-1.5";

const inputCls = [
  "w-full text-[12px] font-medium font-[Inter,sans-serif]",
  "bg-white/70 border border-black/[0.08] rounded-[11px]",
  "px-3 py-2.5 text-[#1a1a2e] outline-none",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,0,0,0.04)]",
  "placeholder:text-black/25 placeholder:font-normal",
  "focus:border-[rgba(124,85,246,0.45)] focus:shadow-[0_0_0_3px_rgba(124,85,246,0.1),inset_0_1px_0_rgba(255,255,255,0.95)]",
  "transition-all duration-150",
].join(" ");

function Toast({ msg, onClose }: { msg: { type: "ok" | "err"; text: string }; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  const ok = msg.type === "ok";
  return (
    <div className={[
      "fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-[16px] max-w-sm",
      "border font-[Inter,sans-serif] text-[12px] font-bold",
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_32px_rgba(0,0,0,0.1)]",
      ok ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-red-50 border-red-200 text-red-500",
    ].join(" ")}>
      {ok ? <Check size={13} /> : <X size={13} />}
      <span className="flex-1">{msg.text}</span>
      <button onClick={onClose} className="opacity-40 hover:opacity-70 cursor-pointer"><X size={12} /></button>
    </div>
  );
}

// ── Member row ────────────────────────────────────────────────────────────────

function MemberRow({ member, canManage, isOwner, currentRole, onRoleChange, onRemove }: {
  member: Member; canManage: boolean; isOwner: boolean; currentRole: string;
  onRoleChange: (userId: string, role: string) => Promise<void>;
  onRemove: (userId: string, email: string) => Promise<void>;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing,      setRemoving]      = useState(false);
  const [changingRole,  setChangingRole]  = useState(false);
  const meta = roleMeta(member.role);
  const RoleIcon = meta.icon;

  const handleRemove = async () => {
    setRemoving(true);
    await onRemove(member.user_id, member.email);
    setRemoving(false);
    setConfirmRemove(false);
  };

  const handleRoleChange = async (role: string) => {
    setChangingRole(true);
    await onRoleChange(member.user_id, role);
    setChangingRole(false);
  };

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-black/[0.05] last:border-0 hover:bg-white/40 transition-colors group">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-[11px] flex items-center justify-center text-[11px] font-extrabold flex-shrink-0 font-[Inter,sans-serif]"
        style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
        {initials(member.email)}
      </div>

      {/* Email + joined */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#1a1a2e] truncate">{member.email}</p>
        <p className="text-[10px] text-black/30 font-medium mt-0.5 font-[Inter,sans-serif]">
          Joined {fmtDate(member.joined_at)}
        </p>
      </div>

      {/* Role badge / selector */}
      {canManage && member.role !== "owner" ? (
        <div className="relative flex-shrink-0">
          {changingRole ? (
            <Loader2 size={14} className="animate-spin text-[#7c55f6]" />
          ) : (
            <select
              value={member.role}
              onChange={e => handleRoleChange(e.target.value)}
              className="text-[11px] font-bold pr-6 pl-2.5 py-1.5 rounded-[8px] border appearance-none cursor-pointer outline-none transition-all font-[Inter,sans-serif]"
              style={{ background: meta.bg, color: meta.color, borderColor: meta.border, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='${encodeURIComponent(meta.color)}'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          )}
        </div>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[10px] font-bold border flex-shrink-0"
          style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>
          <RoleIcon size={10} />{meta.label}
        </span>
      )}

      {/* Remove */}
      {isOwner && member.role !== "owner" && (
        <div className="flex-shrink-0">
          {!confirmRemove ? (
            <button
              onClick={() => setConfirmRemove(true)}
              className="w-7 h-7 flex items-center justify-center rounded-[8px] bg-white/60 border border-black/[0.07] text-black/25 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:border-red-200 hover:text-red-400 cursor-pointer transition-all"
            >
              <Trash2 size={12} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button onClick={handleRemove} disabled={removing} className="px-2.5 py-1.5 rounded-[8px] bg-red-50 border border-red-200 text-red-500 text-[11px] font-bold hover:bg-red-100 cursor-pointer transition-all flex items-center gap-1 font-[Inter,sans-serif]">
                {removing ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Yes
              </button>
              <button onClick={() => setConfirmRemove(false)} className="px-2.5 py-1.5 rounded-[8px] bg-white/70 border border-black/[0.08] text-black/40 text-[11px] font-bold cursor-pointer transition-all font-[Inter,sans-serif]">
                No
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const [org,          setOrg]          = useState<OrgInfo | null>(null);
  const [members,      setMembers]      = useState<Member[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [inviteEmail,  setInviteEmail]  = useState("");
  const [inviteRole,   setInviteRole]   = useState("member");
  const [inviting,     setInviting]     = useState(false);
  const [toast,        setToast]        = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [search,       setSearch]       = useState("");

  const showToast = (type: "ok" | "err", text: string) => setToast({ type, text });

  const load = async () => {
    setLoading(true);
    try {
      const [orgRes, memRes] = await Promise.all([
        fetch(`${API}/organisations/me`, { credentials: "include" }),
        fetch(`${API}/organisations/me/members`, { credentials: "include" }),
      ]);
      setOrg(await orgRes.json());
      const memData = await memRes.json();
      setMembers(Array.isArray(memData) ? memData : []);
    } catch (e: any) { showToast("err", "Failed to load members"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const invite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res  = await fetch(`${API}/organisations/me/invite`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }) });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.detail === "string" ? json.detail : json.detail?.message || "Failed");
      setInviteEmail("");
      await load();
      showToast("ok", json.message || "Member invited.");
    } catch (e: any) { showToast("err", e.message); }
    finally { setInviting(false); }
  };

  const changeRole = async (userId: string, role: string) => {
    try {
      await fetch(`${API}/organisations/me/members/${userId}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m));
      showToast("ok", "Role updated.");
    } catch { showToast("err", "Failed to update role"); }
  };

  const removeMember = async (userId: string, email: string) => {
    try {
      await fetch(`${API}/organisations/me/members/${userId}`, { method: "DELETE", credentials: "include" });
      setMembers(prev => prev.filter(m => m.user_id !== userId));
      showToast("ok", `${email} removed.`);
    } catch { showToast("err", "Failed to remove member"); }
  };

  const canManage = org?.role === "owner" || org?.role === "admin";
  const isOwner   = org?.role === "owner";

  const filtered = members.filter(m => !search || m.email.toLowerCase().includes(search.toLowerCase()) || m.role.includes(search.toLowerCase()));

  const grouped = {
    owner:  filtered.filter(m => m.role === "owner"),
    admin:  filtered.filter(m => m.role === "admin"),
    member: filtered.filter(m => m.role === "member"),
    viewer: filtered.filter(m => m.role === "viewer"),
  };

  return (
    <div className="min-h-screen font-[Inter,sans-serif]" style={{ background: "#f4f4f6" }}>
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(124,85,246,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(124,85,246,0.025) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />

      <div className="relative max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/28 mb-2">Team</p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-[#1a1a2e] leading-none">Members</h1>
              {org && <p className="text-[12px] text-black/35 font-medium mt-1.5">{org.name} · {members.length} member{members.length !== 1 ? "s" : ""}</p>}
            </div>
            <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[13px] text-[11px] font-bold bg-white/60 border border-black/[0.08] text-black/40 hover:bg-white/90 cursor-pointer transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] disabled:opacity-40 font-[Inter,sans-serif]">
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Invite card */}
        {canManage && (
          <div className="rounded-2xl bg-white/65 border border-black/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_10px_rgba(0,0,0,0.05)] overflow-hidden mb-5">
            <div className="px-6 py-4 border-b border-black/[0.06] bg-white/40">
              <p className="text-[13px] font-extrabold text-[#1a1a2e] tracking-[-0.01em]">Invite Member</p>
              <p className="text-[10.5px] text-black/30 font-medium mt-0.5">Send an invite to add someone to this organisation.</p>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <div className="flex gap-2.5">
                {/* Email input */}
                <div className="flex-1 relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/25 pointer-events-none" />
                  <input
                    className={`${inputCls} pl-8`}
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && invite()}
                    placeholder="colleague@company.com"
                  />
                </div>
                {/* Role select */}
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="text-[12px] font-bold px-3 py-2.5 rounded-[11px] border border-black/[0.08] bg-white/70 text-[#1a1a2e] outline-none cursor-pointer font-[Inter,sans-serif] appearance-none shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] focus:border-[rgba(124,85,246,0.45)]"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(0,0,0,0.3)'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: 28 }}
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                {/* Invite button */}
                <button
                  onClick={invite}
                  disabled={inviting || !inviteEmail.trim()}
                  className={[
                    "inline-flex items-center gap-2 px-4 py-2.5 rounded-[11px] text-[12px] font-bold cursor-pointer transition-all font-[Inter,sans-serif]",
                    "border border-[rgba(168,85,247,0.45)] bg-[rgba(168,85,247,0.18)] text-[#5b21b6]",
                    "shadow-[0_2px_14px_rgba(168,85,247,0.18),inset_0_1px_0_rgba(255,255,255,0.5)]",
                    "hover:bg-[rgba(168,85,247,0.28)] hover:border-[rgba(168,85,247,0.65)] hover:-translate-y-px",
                    "disabled:opacity-35 disabled:cursor-not-allowed disabled:transform-none",
                  ].join(" ")}
                >
                  {inviting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Invite
                </button>
              </div>

              {/* Role descriptions */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { role: "admin",  desc: "Full access, can manage members" },
                  { role: "member", desc: "Can create and edit content" },
                  { role: "viewer", desc: "Read-only access" },
                ].map(({ role, desc }) => {
                  const m = roleMeta(role);
                  const Icon = m.icon;
                  return (
                    <div key={role} className="p-2.5 rounded-[10px] border" style={{ background: m.bg, borderColor: m.border }}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon size={10} style={{ color: m.color }} />
                        <span className="text-[10px] font-bold" style={{ color: m.color }}>{m.label}</span>
                      </div>
                      <p className="text-[9.5px] font-medium text-black/40 leading-snug font-[Inter,sans-serif]">{desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Member list */}
        <div className="rounded-2xl bg-white/65 border border-black/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_10px_rgba(0,0,0,0.05)] overflow-hidden">
          {/* List header */}
          <div className="px-5 py-4 border-b border-black/[0.06] bg-white/40 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[13px] font-extrabold text-[#1a1a2e] tracking-[-0.01em]">All Members</p>
              <p className="text-[10.5px] text-black/30 font-medium mt-0.5">{filtered.length} of {members.length} shown</p>
            </div>
            {/* Search */}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="text-[11px] font-medium px-3 py-1.5 rounded-[9px] border border-black/[0.08] bg-white/70 text-[#1a1a2e] outline-none w-40 font-[Inter,sans-serif] placeholder:text-black/25 focus:border-[rgba(124,85,246,0.4)] transition-all"
            />
          </div>

          {loading ? (
            <div className="flex items-center gap-2.5 text-[13px] text-black/35 font-medium p-6 font-[Inter,sans-serif]">
              <Loader2 size={14} className="animate-spin text-[#7c55f6]" /> Loading members…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users size={32} className="text-black/15 mb-3" />
              <p className="text-[12px] font-bold text-black/30 font-[Inter,sans-serif]">{search ? "No members match your search" : "No members yet"}</p>
            </div>
          ) : (
            <div>
              {Object.entries(grouped).map(([role, group]) =>
                group.length === 0 ? null : (
                  <div key={role}>
                    {/* Group label */}
                    <div className="px-5 py-2 bg-white/30 border-b border-black/[0.04]">
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: roleMeta(role).color }}>
                        {roleMeta(role).label}s · {group.length}
                      </span>
                    </div>
                    {group.map(m => (
                      <MemberRow
                        key={m.user_id} member={m}
                        canManage={canManage} isOwner={!!isOwner}
                        currentRole={org?.role || ""}
                        onRoleChange={changeRole}
                        onRemove={removeMember}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
