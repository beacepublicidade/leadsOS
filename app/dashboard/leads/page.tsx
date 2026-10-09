"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  useDroppable,
  useDraggable,
  closestCenter,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Client {
  id:              string;
  name:            string;
  niche:           string;
  whatsapp_number: string;
}

interface Lead {
  id:                string;
  name:              string;
  email:             string;
  phone:             string;
  campaign_name:     string;
  adset_name:        string;
  ad_name:           string;
  created_at:        string;
  status:            string;
  source:            string;
  first_response_at?:  string;
  scheduled_at?:       string;
  score?:              number;
  status_changed_at?:  string;
  notes?:              string;
  tags?:               string[];
}

const PIPELINE_STATUSES = ["novo", "contato", "proposta", "fechado", "perdido"] as const;
type PipelineStatus = typeof PIPELINE_STATUSES[number];

const STATUS_MAP: Record<string, PipelineStatus> = {
  new:       "novo",
  contact:   "contato",
  proposal:  "proposta",
  closed:    "fechado",
  lost:      "perdido",
};
function normalizeStatus(s: string): PipelineStatus {
  return (STATUS_MAP[s] ?? (PIPELINE_STATUSES.includes(s as PipelineStatus) ? s : "novo")) as PipelineStatus;
}

const COLUMN_META: Record<PipelineStatus, { label: string; color: string; bg: string; icon: string }> = {
  novo:     { label: "Novo",      color: "#60a5fa", bg: "rgba(96,165,250,0.08)",   icon: "●" },
  contato:  { label: "Contato",   color: "#f59e0b", bg: "rgba(245,158,11,0.08)",   icon: "●" },
  proposta: { label: "Proposta",  color: "#a78bfa", bg: "rgba(167,139,250,0.08)",  icon: "●" },
  fechado:  { label: "Fechado",   color: "#34d399", bg: "rgba(52,211,153,0.08)",   icon: "●" },
  perdido:  { label: "Perdido",   color: "#6b7280", bg: "rgba(107,114,128,0.08)",  icon: "●" },
};

function scoreBadge(score?: number): { cls: string; label: string } {
  if (score === undefined || score === null) return { cls: "badge badge-default", label: "—" };
  if (score >= 70) return { cls: "badge badge-success", label: `${score}` };
  if (score >= 40) return { cls: "badge badge-warning", label: `${score}` };
  return { cls: "badge badge-error", label: `${score}` };
}

function slaDisplay(lead: Lead): { label: string; cls: string } {
  if (!lead.first_response_at || !lead.created_at) return { label: "—", cls: "text-muted" };
  const diffMs  = new Date(lead.first_response_at).getTime() - new Date(lead.created_at).getTime();
  const minutes = Math.round(diffMs / 60000);
  return { label: `${minutes}m`, cls: minutes <= 10 ? "text-success" : "text-error" };
}

function timeInStage(lead: Lead): { label: string; cls: string } {
  const ref  = lead.status_changed_at ?? lead.created_at;
  if (!ref) return { label: "", cls: "text-muted" };
  const days = Math.floor((Date.now() - new Date(ref).getTime()) / 86_400_000);
  if (days === 0) return { label: "hoje",       cls: "text-success" };
  if (days <= 3)  return { label: `${days}d`,   cls: "text-success" };
  if (days <= 7)  return { label: `${days}d`,   cls: "text-warning" };
  return               { label: `${days}d`,   cls: "text-error" };
}

function sourceBadge(source: string): { cls: string; label: string } {
  if (source === "meta_ads")     return { cls: "badge badge-info",    label: "Meta" };
  if (source === "google_ads")   return { cls: "badge badge-error",   label: "Google" };
  if (source === "landing_page") return { cls: "badge badge-success", label: "LP" };
  if (source === "manual")       return { cls: "badge badge-default", label: "Manual" };
  if (source === "outbound-leadsOS") return { cls: "badge badge-accent", label: "Prospecção" };
  return { cls: "badge badge-default", label: source || "—" };
}

// ─── Draggable card ──────────────────────────────────────────────────────────
function DraggableCard({
  lead,
  updatingId,
  deletingId,
  onDelete,
  onMove,
}: {
  lead: Lead;
  updatingId: string | null;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onMove: (id: string, status: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  const currentIdx = PIPELINE_STATUSES.indexOf(lead.status as PipelineStatus);
  const prevStatus = currentIdx > 0 ? PIPELINE_STATUSES[currentIdx - 1] : null;
  const nextStatus = currentIdx < PIPELINE_STATUSES.length - 1 ? PIPELINE_STATUSES[currentIdx + 1] : null;
  const isBusy     = updatingId === lead.id;
  const timeInfo   = timeInStage(lead);
  const src        = sourceBadge(lead.source);
  const sc         = scoreBadge(lead.score);
  const colColor   = COLUMN_META[lead.status as PipelineStatus]?.color ?? "#60a5fa";

  const [note,        setNote]        = useState(lead.notes ?? "");
  const [editingNote, setEditingNote] = useState(false);
  const [savingNote,  setSavingNote]  = useState(false);

  async function saveNote() {
    if (note === (lead.notes ?? "")) { setEditingNote(false); return; }
    setSavingNote(true);
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: note }),
      });
      lead.notes = note;
    } catch { /* silently ignore */ }
    setSavingNote(false);
    setEditingNote(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: "var(--bg-elevated)",
        borderRadius: 10,
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${colColor}`,
        padding: "12px 14px",
        marginBottom: 8,
        transition: "box-shadow 0.15s, opacity 0.15s",
        boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.4)" : "0 1px 3px rgba(0,0,0,0.15)",
        userSelect: "none",
      }}
      {...attributes}
      {...listeners}
    >
      {/* Row 1: name + score */}
      <div className="flex items-center justify-between" style={{ marginBottom: 6, gap: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.3, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lead.name}
        </div>
        {lead.score !== undefined && (
          <span className={sc.cls} style={{ flexShrink: 0, fontSize: 10 }}>
            {sc.label}
          </span>
        )}
      </div>

      {/* Row 2: phone */}
      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>
        {lead.phone || "—"}
      </div>

      {/* Row 3: badges */}
      <div className="flex" style={{ gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        <span className={src.cls} style={{ fontSize: 10 }}>{src.label}</span>
        {lead.campaign_name && (
          <span className="badge badge-default" style={{ fontSize: 10, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lead.campaign_name}
          </span>
        )}
      </div>

      {/* Row 4: date + time in stage */}
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
          {lead.created_at ? new Date(lead.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—"}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {timeInfo.label && (
            <span className={`text-xs ${timeInfo.cls}`} style={{ fontSize: 10 }}>
              {timeInfo.label}
            </span>
          )}
        </div>
      </div>

      {/* Nota rápida */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{ marginBottom: 8 }}
      >
        {editingNote ? (
          <textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNote(); }
              if (e.key === "Escape") { setNote(lead.notes ?? ""); setEditingNote(false); }
            }}
            placeholder="Anotação rápida..."
            maxLength={300}
            rows={2}
            className="textarea"
            style={{ minHeight: "unset", resize: "none", fontSize: 11 }}
          />
        ) : (
          <div
            onClick={(e) => { e.stopPropagation(); setEditingNote(true); }}
            style={{
              fontSize: 11,
              color: note ? "var(--text-secondary)" : "var(--text-muted)",
              cursor: "text",
              minHeight: 20,
              padding: "3px 6px",
              borderRadius: 4,
              border: "1px dashed transparent",
              transition: "border-color 0.15s",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
          >
            {savingNote ? "Salvando..." : note || "＋ nota"}
          </div>
        )}
      </div>

      {/* Actions row */}
      <div
        className="flex items-center justify-between"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex gap-1">
          {prevStatus && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove(lead.id, prevStatus); }}
              disabled={isBusy}
              title={`← ${COLUMN_META[prevStatus].label}`}
              className="btn btn-ghost btn-sm"
              style={{ padding: "2px 6px", fontSize: 11 }}
            >
              ◀
            </button>
          )}
          {nextStatus && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove(lead.id, nextStatus); }}
              disabled={isBusy}
              title={`→ ${COLUMN_META[nextStatus].label}`}
              className="btn btn-primary btn-sm"
              style={{ padding: "2px 6px", fontSize: 11 }}
            >
              ▶
            </button>
          )}
        </div>
        <div className="flex gap-1 items-center">
          <a
            href={`/dashboard/leads/${lead.id}`}
            className="btn btn-ghost btn-sm"
            style={{ padding: "2px 8px", fontSize: 11, color: "var(--accent)" }}
            onClick={(e) => e.stopPropagation()}
          >
            Ver
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }}
            disabled={deletingId === lead.id}
            className="btn btn-danger btn-sm"
            style={{ padding: "2px 6px", fontSize: 11 }}
          >
            ✕
          </button>
        </div>
      </div>

      {isBusy && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 10, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div className="spinner" style={{ width: 16, height: 16 }} />
        </div>
      )}
    </div>
  );
}

// ─── Droppable column ────────────────────────────────────────────────────────
function DroppableColumn({
  status,
  leads,
  updatingId,
  deletingId,
  onDelete,
  onMove,
  isDragActive,
}: {
  status: PipelineStatus;
  leads: Lead[];
  updatingId: string | null;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onMove: (id: string, status: string) => void;
  isDragActive: boolean;
}) {
  const meta = COLUMN_META[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const totalValue = leads.reduce((sum, l) => sum + (l.score ?? 0), 0);

  return (
    <div
      style={{
        flex: "0 0 220px",
        minWidth: 220,
        maxWidth: 240,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Column header */}
      <div
        style={{
          background: isOver ? meta.bg : "var(--bg-overlay)",
          borderRadius: "10px 10px 0 0",
          padding: "10px 14px",
          borderBottom: `2px solid ${meta.color}`,
          transition: "background 0.15s",
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
          <div className="flex items-center gap-2">
            <span style={{ color: meta.color, fontSize: 10 }}>{meta.icon}</span>
            <span style={{ fontWeight: 700, fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {meta.label}
            </span>
          </div>
          <span
            style={{
              background: meta.color,
              color: "#0d0d0d",
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 99,
              padding: "1px 8px",
              minWidth: 22,
              textAlign: "center",
            }}
          >
            {leads.length}
          </span>
        </div>
        {leads.length > 0 && (
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
            Score total: <span style={{ color: meta.color, fontWeight: 600 }}>{totalValue}</span>
          </div>
        )}
      </div>

      {/* Cards drop zone */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          background: isOver
            ? meta.bg
            : isDragActive
            ? "rgba(255,255,255,0.02)"
            : "var(--bg-surface)",
          borderRadius: "0 0 10px 10px",
          border: `1px solid ${isOver ? meta.color : "var(--border)"}`,
          borderTop: "none",
          padding: 8,
          minHeight: 120,
          transition: "background 0.15s, border-color 0.15s",
          overflowY: "auto",
          maxHeight: "calc(100vh - 320px)",
        }}
      >
        {leads.length === 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 80,
              color: "var(--text-muted)",
              fontSize: 11,
              border: "1px dashed var(--border)",
              borderRadius: 8,
              margin: 4,
            }}
          >
            {isDragActive ? "Soltar aqui" : "Vazio"}
          </div>
        )}
        {leads.map((lead) => (
          <DraggableCard
            key={lead.id}
            lead={lead}
            updatingId={updatingId}
            deletingId={deletingId}
            onDelete={onDelete}
            onMove={onMove}
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [clients,      setClients]      = useState<Client[]>([]);
  const [clientId,     setClientId]     = useState("");
  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [start,        setStart]        = useState("");
  const [end,          setEnd]          = useState("");
  const [updatingId,   setUpdatingId]   = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [realtimeOn,   setRealtimeOn]   = useState(false);
  const startRef    = useRef(start);
  const endRef      = useRef(end);
  const clientIdRef = useRef(clientId);
  useEffect(() => { startRef.current    = start; },    [start]);
  useEffect(() => { endRef.current      = end; },      [end]);
  useEffect(() => { clientIdRef.current = clientId; }, [clientId]);
  const [search,         setSearch]         = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterSource,   setFilterSource]   = useState("");
  const [filterCampaign, setFilterCampaign] = useState("");
  const [filterTag,      setFilterTag]      = useState("");
  const [viewMode,       setViewMode]       = useState<"table" | "kanban">("kanban");
  const [deletingId,       setDeletingId]       = useState<string | null>(null);
  const [confirmDeleteId,  setConfirmDeleteId]  = useState<string | null>(null);
  const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting,     setBulkDeleting]     = useState(false);
  const [isAdmin,          setIsAdmin]          = useState(false);
  const [userProfile,    setUserProfile]    = useState("");
  const [userName,       setUserName]       = useState("");
  const [activeDragId,   setActiveDragId]   = useState<string | null>(null);

  // New lead modal
  const [showNewLead,  setShowNewLead]  = useState(false);
  const [newName,      setNewName]      = useState("");
  const [newPhone,     setNewPhone]     = useState("");
  const [newEmail,     setNewEmail]     = useState("");
  const [newCampaign,  setNewCampaign]  = useState("");
  const [newSaving,    setNewSaving]    = useState(false);
  const [newMsg,       setNewMsg]       = useState<{ type: "ok"|"error"; text: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function handleScheduleChange(id: string, scheduled_at: string) {
    setSchedulingId(id);
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, scheduled_at } : l));
    try {
      const res  = await fetch(`/api/leads/${id}/schedule`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: scheduled_at || null }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    } catch (err) {
      console.error(err);
      await fetchLeads(start, end, clientId);
    } finally {
      setSchedulingId(null);
    }
  }

  const handleStatusChange = useCallback(async (id: string, status: string) => {
    setUpdatingId(id);
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    try {
      const res  = await fetch(`/api/leads/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    } catch (err) {
      console.error(err);
      await fetchLeads(start, end, clientId);
    } finally {
      setUpdatingId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, clientId]);

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const leadId   = active.id as string;
    const targetStatus = over.id as string;

    // over.id can be a column id (PipelineStatus) or another lead.id
    // We only handle drops on columns
    if (!PIPELINE_STATUSES.includes(targetStatus as PipelineStatus)) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === targetStatus) return;

    await handleStatusChange(leadId, targetStatus);
  }

  async function fetchClients() {
    try {
      const res  = await fetch("/api/clients");
      const json = await res.json();
      setClients(json.data ?? []);
    } catch { console.error("Erro ao carregar clientes."); }
  }

  async function fetchLeads(startDate = start, endDate = end, cid = clientId) {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("start",     startDate);
      if (endDate)   params.set("end",       endDate);
      if (cid)       params.set("client_id", cid);
      const url  = `/api/leads${params.size ? `?${params}` : ""}`;
      const res  = await fetch(url);
      const json = await res.json();
      setLeads((json.leads ?? []).map((l: Lead) => ({ ...l, status: normalizeStatus(l.status) })));
    } catch {
      setError("Erro ao carregar leads.");
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    async function init() {
      try {
        const res  = await fetch("/api/auth/me");
        const json = await res.json();
        if (json.success) {
          const user = json.user;
          const admin = !user?.client_id || user?.profile === "admin";
          setIsAdmin(admin);
          setUserProfile(user?.profile ?? "vendedor");
          setUserName(user?.email?.split("@")[0] ?? "");
          if (user?.client_id) {
            setClientId(user.client_id);
            await fetchClients();
            fetchLeads("", "", user.client_id);
            return;
          }
        }
      } catch { /* continue */ }
      setIsAdmin(true);
      await fetchClients();
      fetchLeads();
    }
    init();
  }, []);

  // ── Realtime via Supabase + polling de fallback ──────────────────────────
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const sb = createClient(supabaseUrl, supabaseKey);

    const channel = sb
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        fetchLeads(startRef.current, endRef.current, clientIdRef.current);
        setRealtimeOn(true);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeOn(true);
        if (status === "CLOSED" || status === "CHANNEL_ERROR") setRealtimeOn(false);
      });

    // Polling de fallback a cada 30s (garante atualização mesmo sem websocket)
    const poll = setInterval(() => {
      fetchLeads(startRef.current, endRef.current, clientIdRef.current);
    }, 30_000);

    return () => {
      sb.removeChannel(channel);
      clearInterval(poll);
    };
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  const CSV_FIELDS = ["name", "email", "phone", "source", "campaign_name", "status", "created_at"] as const;

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    const rows = visibleLeads.map((l) =>
      CSV_FIELDS.map((f) => `"${String(l[f] ?? "").replace(/"/g, '""')}"`).join(",")
    );
    downloadFile([CSV_FIELDS.join(","), ...rows].join("\n"), `leads_${new Date().toISOString().slice(0,10)}.csv`, "text/csv;charset=utf-8;");
  }

  function exportJSON() {
    downloadFile(
      JSON.stringify(visibleLeads.map((l) => Object.fromEntries(CSV_FIELDS.map((f) => [f, l[f] ?? ""]))), null, 2),
      `leads_${new Date().toISOString().slice(0,10)}.json`, "application/json"
    );
  }

  const uniqueSources   = Array.from(new Set(leads.map((l) => l.source).filter(Boolean))).sort();
  const uniqueCampaigns = Array.from(new Set(leads.map((l) => l.campaign_name).filter(Boolean))).sort();
  const uniqueTags      = Array.from(new Set(leads.flatMap((l) => l.tags ?? []).filter(Boolean))).sort();

  const searchTerm   = search.toLowerCase().trim();
  const visibleLeads = leads.filter((l) => {
    if (searchTerm && ![l.name, l.email, l.phone].some((f) => f?.toLowerCase().includes(searchTerm))) return false;
    if (filterStatus   && l.status        !== filterStatus)   return false;
    if (filterSource   && l.source        !== filterSource)   return false;
    if (filterCampaign && l.campaign_name !== filterCampaign) return false;
    if (filterTag      && !(l.tags ?? []).includes(filterTag)) return false;
    return true;
  });

  const hasActiveFilters = search || filterStatus || filterSource || filterCampaign || filterTag;

  function handleDelete(id: string) {
    setConfirmDeleteId(id);
  }

  async function doDeleteLead(id: string) {
    setConfirmDeleteId(null);
    setDeletingId(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
    try {
      await fetch(`/api/leads/${id}`, { method: "DELETE" });
    } catch {
      await fetchLeads(start, end, clientId);
    } finally {
      setDeletingId(null);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === visibleLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleLeads.map((l) => l.id)));
    }
  }

  async function doBulkDelete() {
    setConfirmBulkDelete(false);
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    setLeads((prev) => prev.filter((l) => !selectedIds.has(l.id)));
    setSelectedIds(new Set());
    try {
      await Promise.all(ids.map((id) => fetch(`/api/leads/${id}`, { method: "DELETE" })));
    } catch {
      await fetchLeads(start, end, clientId);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    setNewSaving(true); setNewMsg(null);
    try {
      const res  = await fetch("/api/leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, phone: newPhone, email: newEmail, source: "manual", campaign: newCampaign || "manual", client_id: clientId || null }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setNewMsg({ type: "ok", text: "Lead criado!" });
      setNewName(""); setNewPhone(""); setNewEmail(""); setNewCampaign("");
      await fetchLeads(start, end, clientId);
      setTimeout(() => { setShowNewLead(false); setNewMsg(null); }, 800);
    } catch (err: unknown) {
      setNewMsg({ type: "error", text: err instanceof Error ? err.message : "Erro ao criar lead." });
    } finally {
      setNewSaving(false);
    }
  }

  function handleClientChange(id: string) {
    setClientId(id); setStart(""); setEnd("");
    fetchLeads("", "", id);
  }

  if (loading) {
    return (
      <div className="page-container flex items-center gap-3" style={{ paddingTop: 48 }}>
        <div className="spinner" />
        <span className="text-secondary">Carregando leads...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-title">Erro ao carregar</div>
          <div className="empty-state-text">{error}</div>
        </div>
      </div>
    );
  }

  const countByStatus = (s: string) => leads.filter((l) => l.status === s).length;
  const today = new Date().toDateString();
  const newToday = leads.filter((l) => l.created_at && new Date(l.created_at).toDateString() === today).length;
  const activeLead = activeDragId ? leads.find((l) => l.id === activeDragId) : null;

  const statsCards = [
    { label: "Total",       value: leads.length,              color: "var(--text-primary)" },
    { label: "Novos Hoje",  value: newToday,                  color: "#60a5fa" },
    { label: "Em Proposta", value: countByStatus("proposta"),  color: "#a78bfa" },
    { label: "Fechados",    value: countByStatus("fechado"),   color: "#34d399" },
    { label: "Perdidos",    value: countByStatus("perdido"),   color: "#6b7280" },
  ];

  return (
    <main className="page-container">

      {/* ─── PAGE HEADER ─── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Pipeline de Leads</h1>
          {userName && (
            <p className="page-subtitle">Olá, <strong style={{ color: "var(--text-primary)" }}>{userName}</strong> · {leads.length} leads ativos</p>
          )}
        </div>

        <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
          {isAdmin && <a href="/dashboard/relatorios" className="btn btn-ghost btn-sm">Relatórios</a>}
          {isAdmin && <a href="/dashboard/propostas" className="btn btn-ghost btn-sm">Propostas</a>}
          {isAdmin && <a href="/dashboard/prospecao" className="btn btn-primary btn-sm">🎯 Prospecção</a>}
          <button
            onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}
            className="btn btn-secondary btn-sm"
          >
            Sair
          </button>
        </div>
      </div>

      {/* ─── STATS BAR ─── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {statsCards.map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "10px 18px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 80,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{label}</div>
          </div>
        ))}

        {/* Pipeline progress bar */}
        <div
          style={{
            flex: 1,
            minWidth: 200,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pipeline</div>
          <div style={{ display: "flex", gap: 2, height: 8, borderRadius: 4, overflow: "hidden" }}>
            {leads.length > 0 && PIPELINE_STATUSES.map((s) => {
              const count = countByStatus(s);
              const pct = (count / leads.length) * 100;
              return pct > 0 ? (
                <div
                  key={s}
                  title={`${COLUMN_META[s].label}: ${count}`}
                  style={{ width: `${pct}%`, background: COLUMN_META[s].color, transition: "width 0.3s" }}
                />
              ) : null;
            })}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {PIPELINE_STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-1">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLUMN_META[s].color }} />
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{COLUMN_META[s].label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── CLIENT SELECTOR (admin) ─── */}
      {isAdmin && (
        <div className="flex items-center gap-3" style={{ marginBottom: 16, flexWrap: "wrap" }}>
          <label className="text-sm font-semibold text-secondary" style={{ whiteSpace: "nowrap" }}>Cliente:</label>
          <select
            className="select"
            value={clientId}
            onChange={(e) => handleClientChange(e.target.value)}
            style={{ maxWidth: 280 }}
          >
            <option value="">Todos os clientes</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.niche}</option>)}
          </select>
          {clientId && (
            <button onClick={() => handleClientChange("")} className="btn btn-ghost btn-sm">
              Limpar
            </button>
          )}
        </div>
      )}

      {/* ─── TOOLBAR ─── */}
      <div className="flex items-center gap-3" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        <span className="text-sm text-muted">
          {visibleLeads.length}/{leads.length} leads
        </span>
        {/* Indicador realtime */}
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: realtimeOn ? "#34d399" : "#6b7280",
            boxShadow: realtimeOn ? "0 0 6px #34d399" : "none",
            display: "inline-block",
          }} />
          <span className="text-muted">{realtimeOn ? "Ao vivo" : "Offline"}</span>
        </span>
        </span>

        <button onClick={() => setShowNewLead(true)} className="btn btn-primary btn-sm">
          + Lead
        </button>

        {(isAdmin || userProfile === "gestor") && (
          <>
            <button onClick={exportCSV}  disabled={visibleLeads.length === 0} className="btn btn-secondary btn-sm">
              CSV
            </button>
            <button onClick={exportJSON} disabled={visibleLeads.length === 0} className="btn btn-secondary btn-sm">
              JSON
            </button>
          </>
        )}

        {selectedIds.size > 0 && (
          <button
            onClick={() => setConfirmBulkDelete(true)}
            disabled={bulkDeleting}
            className="btn btn-danger btn-sm"
          >
            ✕ Excluir {selectedIds.size}
          </button>
        )}

        <button onClick={() => fetchLeads(start, end, clientId)} className="btn btn-ghost btn-sm" title="Recarregar">
          ↺
        </button>

        {/* View toggle */}
        <div className="flex" style={{ marginLeft: "auto", gap: 4 }}>
          <button
            onClick={() => setViewMode("kanban")}
            className={`btn btn-sm ${viewMode === "kanban" ? "btn-primary" : "btn-secondary"}`}
          >
            ⬛ Pipeline
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`btn btn-sm ${viewMode === "table" ? "btn-primary" : "btn-secondary"}`}
          >
            ☰ Lista
          </button>
        </div>
      </div>

      {/* ─── SEARCH + FILTERS ─── */}
      <div className="flex gap-3 items-center" style={{ marginBottom: 10, flexWrap: "wrap" }}>
        <div className="flex items-center" style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
          <span style={{ position: "absolute", left: 10, color: "var(--text-muted)", pointerEvents: "none", fontSize: 12 }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar nome, email, telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: 32 }}
          />
        </div>

        <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: "0 1 150px", minWidth: 120 }}>
          <option value="">Status</option>
          {PIPELINE_STATUSES.map((s) => <option key={s} value={s}>{COLUMN_META[s].label}</option>)}
        </select>

        <select className="select" value={filterSource} onChange={(e) => setFilterSource(e.target.value)} style={{ flex: "0 1 140px", minWidth: 110 }}>
          <option value="">Origem</option>
          {uniqueSources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className="select" value={filterCampaign} onChange={(e) => setFilterCampaign(e.target.value)} style={{ flex: "0 1 180px", minWidth: 140 }}>
          <option value="">Campanha</option>
          {uniqueCampaigns.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {uniqueTags.length > 0 && (
          <select className="select" value={filterTag} onChange={(e) => setFilterTag(e.target.value)} style={{ flex: "0 1 140px", minWidth: 110 }}>
            <option value="">Tag</option>
            {uniqueTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        <div className="flex gap-2 items-center">
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="input" style={{ width: "auto" }} />
          <span className="text-muted text-xs">→</span>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="input" style={{ width: "auto" }} />
          <button onClick={() => fetchLeads(start, end, clientId)} className="btn btn-secondary btn-sm">Filtrar</button>
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(""); setFilterStatus(""); setFilterSource(""); setFilterCampaign(""); setFilterTag(""); setStart(""); setEnd(""); fetchLeads("", "", clientId); }}
            className="btn btn-ghost btn-sm"
          >
            Limpar
          </button>
        )}
      </div>

      {/* ─── KANBAN VIEW ─── */}
      {viewMode === "kanban" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              paddingBottom: 16,
              alignItems: "flex-start",
            }}
          >
            {PIPELINE_STATUSES.map((status) => (
              <DroppableColumn
                key={status}
                status={status}
                leads={visibleLeads.filter((l) => l.status === status)}
                updatingId={updatingId}
                deletingId={deletingId}
                onDelete={handleDelete}
                onMove={handleStatusChange}
                isDragActive={!!activeDragId}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead ? (
              <div
                style={{
                  background: "var(--bg-elevated)",
                  borderRadius: 10,
                  border: `1px solid ${COLUMN_META[activeLead.status as PipelineStatus]?.color ?? "var(--accent)"}`,
                  padding: "12px 14px",
                  width: 220,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  cursor: "grabbing",
                  opacity: 0.95,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", marginBottom: 4 }}>{activeLead.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{activeLead.phone || "—"}</div>
                <div style={{ marginTop: 6 }}>
                  <span className={sourceBadge(activeLead.source).cls} style={{ fontSize: 10 }}>
                    {sourceBadge(activeLead.source).label}
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ─── TABLE VIEW ─── */}
      {viewMode === "table" && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={visibleLeads.length > 0 && selectedIds.size === visibleLeads.length}
                    onChange={toggleSelectAll}
                    style={{ accentColor: "var(--accent)", cursor: "pointer" }}
                    title="Selecionar todos"
                  />
                </th>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Origem</th>
                <th>Campanha</th>
                <th>Data</th>
                <th>Score</th>
                <th>SLA</th>
                <th>Agendamento</th>
                <th>Status</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleLeads.length === 0 && (
                <tr>
                  <td colSpan={12}>
                    <div className="empty-state" style={{ padding: "32px 24px" }}>
                      <div className="empty-state-icon">📭</div>
                      <div className="empty-state-title">Nenhum lead encontrado</div>
                      <div className="empty-state-text">Ajuste os filtros ou adicione um novo lead.</div>
                    </div>
                  </td>
                </tr>
              )}
              {visibleLeads.map((lead) => {
                const sla   = slaDisplay(lead);
                const sc    = scoreBadge(lead.score);
                const colMeta = COLUMN_META[lead.status as PipelineStatus];
                return (
                  <tr key={lead.id} style={{ background: selectedIds.has(lead.id) ? "var(--bg-surface)" : undefined }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        style={{ accentColor: "var(--accent)", cursor: "pointer" }}
                      />
                    </td>
                    <td className="font-medium text-primary">{lead.name}</td>
                    <td className="text-secondary">{lead.phone}</td>
                    <td>
                      <span className={sourceBadge(lead.source).cls} style={{ fontSize: 10 }}>
                        {sourceBadge(lead.source).label}
                      </span>
                    </td>
                    <td className="text-secondary text-xs">{lead.campaign_name}</td>
                    <td className="text-secondary text-xs">
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={sc.cls} style={{ fontSize: 10 }}>{sc.label}</span>
                    </td>
                    <td>
                      <span className={`font-semibold text-xs ${sla.cls}`}>{sla.label}</span>
                    </td>
                    <td>
                      <input
                        type="datetime-local"
                        value={lead.scheduled_at ? lead.scheduled_at.slice(0, 16) : ""}
                        disabled={schedulingId === lead.id}
                        onChange={(e) => handleScheduleChange(lead.id, e.target.value)}
                        className="input"
                        style={{ opacity: schedulingId === lead.id ? 0.5 : 1, fontSize: 11, padding: "4px 6px", width: "auto" }}
                      />
                    </td>
                    <td>
                      <select
                        className="select"
                        value={lead.status}
                        disabled={updatingId === lead.id}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        style={{ opacity: updatingId === lead.id ? 0.5 : 1, width: "auto", minWidth: 100, borderColor: colMeta?.color, fontSize: 11 }}
                      >
                        {PIPELINE_STATUSES.map((s) => (
                          <option key={s} value={s}>{COLUMN_META[s].label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <a href={`/dashboard/leads/${lead.id}`} className="btn btn-ghost btn-sm text-accent" style={{ fontSize: 11 }}>
                        Ver
                      </a>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        disabled={deletingId === lead.id}
                        className="btn btn-danger btn-sm"
                        style={{ fontSize: 11 }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── MODAL NOVO LEAD ─── */}
      {showNewLead && (
        <div className="overlay">
          <div className="modal">
            <h2 className="modal-title">Novo Lead</h2>
            <form onSubmit={handleCreateLead} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Nome *</label>
                <input required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome completo" className="input" />
              </div>
              <div className="input-group">
                <label className="input-label">Telefone *</label>
                <input required value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="11999999999" className="input" />
              </div>
              <div className="input-group">
                <label className="input-label">Email <span className="text-muted font-normal">(opcional)</span></label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" className="input" />
              </div>
              <div className="input-group">
                <label className="input-label">Campanha (opcional)</label>
                <input value={newCampaign} onChange={(e) => setNewCampaign(e.target.value)} placeholder="Ex: Teste interno" className="input" />
              </div>

              {newMsg && (
                <p className={`text-sm font-medium ${newMsg.type === "ok" ? "text-success" : "text-error"}`} style={{ margin: 0 }}>
                  {newMsg.text}
                </p>
              )}

              <div className="flex gap-3 justify-between" style={{ marginTop: 4 }}>
                <button type="button" onClick={() => { setShowNewLead(false); setNewMsg(null); }} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={newSaving} className="btn btn-primary" style={{ flex: 1 }}>
                  {newSaving ? "Salvando..." : "Criar Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmBulkDelete && (
        <ConfirmDialog
          title="Excluir leads selecionados"
          message={`Os ${selectedIds.size} leads selecionados serão apagados permanentemente.`}
          confirmLabel={`Excluir ${selectedIds.size}`}
          onConfirm={doBulkDelete}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Excluir lead"
          message="Excluir este lead permanentemente?"
          confirmLabel="Excluir"
          onConfirm={() => doDeleteLead(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </main>
  );
}
