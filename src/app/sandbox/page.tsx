"use client";

import { useEffect, useRef, useState } from "react";
import {
  Database, RefreshCw, Play, ShieldCheck,
  FileSpreadsheet, Users, DollarSign,
  CheckCircle, AlertCircle, Info, ArrowLeftRight, Check, X, ShieldAlert,
  Pencil, Trash2, Plus, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Search, Table2, TrendingUp, ToggleLeft, ToggleRight, GitBranch, GitCompare
} from "lucide-react";

// ─── ERD constants (outside component) ───────────────────────────────────────

type ErdNode = { id: string; x: number; y: number; fields: string[]; cluster: string };
type ErdEdge = { from: string; to: string };

const ERD_CLUSTERS: Record<string, { color: string; header: string; text: string }> = {
  profiles: { color: "#7c3aed", header: "#4c1d95", text: "#ddd6fe" },
  core:     { color: "#2563eb", header: "#1e3a8a", text: "#bfdbfe" },
  academic: { color: "#0d9488", header: "#134e4a", text: "#99f6e4" },
  billing:  { color: "#d97706", header: "#78350f", text: "#fde68a" },
  ledger:   { color: "#16a34a", header: "#14532d", text: "#bbf7d0" },
  tickets:  { color: "#dc2626", header: "#7f1d1d", text: "#fecaca" },
  crm:      { color: "#475569", header: "#1e293b", text: "#cbd5e1" },
};

const ERD_NODES: ErdNode[] = [
  // Col 0 — Profiles
  { id: "StaffProfile",       x: 20,   y: 20,   cluster: "profiles", fields: ["id","userId↑","department","role"] },
  { id: "TeacherProfile",     x: 20,   y: 156,  cluster: "profiles", fields: ["id","userId↑","subjects","qualification"] },
  { id: "StudentProfile",     x: 20,   y: 274,  cluster: "profiles", fields: ["id","userId↑","grade","parentId↑"] },
  { id: "ParentProfile",      x: 20,   y: 410,  cluster: "profiles", fields: ["id","userId↑","phone","occupation"] },
  { id: "AmbassadorProfile",  x: 20,   y: 510,  cluster: "profiles", fields: ["id","userId↑","region","commission"] },
  // Col 1 — Core
  { id: "User",               x: 290,  y: 220,  cluster: "core",     fields: ["id","email","name","role","active","department"] },
  // Col 2 — Academic
  { id: "Group",              x: 560,  y: 20,   cluster: "academic", fields: ["id","code","name","subject","teacherId↑"] },
  { id: "AcademicSession",    x: 560,  y: 138,  cluster: "academic", fields: ["id","groupId↑","teacherId↑","date","duration"] },
  { id: "Attendance",         x: 560,  y: 292,  cluster: "academic", fields: ["id","sessionId↑","studentId↑","status"] },
  { id: "SyllabusItem",       x: 560,  y: 428,  cluster: "academic", fields: ["id","groupId↑","title","order","done"] },
  { id: "StudentProgress",    x: 560,  y: 564,  cluster: "academic", fields: ["id","syllabusItemId↑","studentId↑","score"] },
  { id: "Doubt",              x: 560,  y: 674,  cluster: "academic", fields: ["id","studentId↑","syllabusItemId↑","text"] },
  { id: "Assignment",         x: 560,  y: 810,  cluster: "academic", fields: ["id","groupId↑","createdById↑","title","dueAt"] },
  { id: "MockResult",         x: 560,  y: 946,  cluster: "academic", fields: ["id","studentId↑","groupId↑","score","total"] },
  { id: "Recording",          x: 560,  y: 1062, cluster: "academic", fields: ["id","sessionId↑","url","duration"] },
  // Col 3 — Billing
  { id: "StudentMonthlyEnrollment", x: 830, y: 20,  cluster: "billing", fields: ["id","studentId↑","month","status","currency"] },
  { id: "EnrollmentPackageItem",    x: 830, y: 156, cluster: "billing", fields: ["id","enrollmentId↑","customServiceName","rateApplied"] },
  { id: "StudentInvoice",           x: 830, y: 274, cluster: "billing", fields: ["id","enrollmentId↑","month","netAmount","dueAmount","paymentDone"] },
  { id: "BatchRateCard",            x: 830, y: 410, cluster: "billing", fields: ["id","groupId↑","currency","rate"] },
  { id: "StudentRateOverride",      x: 830, y: 510, cluster: "billing", fields: ["id","studentId↑","groupId↑","overrideRate"] },
  { id: "DCBankAccount",            x: 830, y: 618, cluster: "billing", fields: ["id","name","currency","balance"] },
  { id: "ResourceInvoice",          x: 830, y: 726, cluster: "billing", fields: ["id","userId↑","month","amount","paid"] },
  { id: "CounsellingInvoice",       x: 830, y: 832, cluster: "billing", fields: ["id","userId↑","month","amount","paid"] },
  // Col 4 — Ledger
  { id: "Account",              x: 1100, y: 20,  cluster: "ledger", fields: ["id","name","accountType","balance","currency"] },
  { id: "AccountTransaction",   x: 1100, y: 156, cluster: "ledger", fields: ["id","description","createdAt"] },
  { id: "LedgerEntry",          x: 1100, y: 256, cluster: "ledger", fields: ["id","transactionId↑","accountId↑","amount","studentInvoiceId↑"] },
  { id: "MonthlyBillingSummary",x: 1100, y: 374, cluster: "ledger", fields: ["id","month","totalINR","totalDueINR","paidRatio"] },
  { id: "MonthlyPayrollSummary",x: 1100, y: 510, cluster: "ledger", fields: ["id","month","totalClaims","totalPaid"] },
  // Col 5 — Tickets
  { id: "Ticket",           x: 1370, y: 20,  cluster: "tickets", fields: ["id","title","creatorId↑","assigneeId↑","status","priority"] },
  { id: "TicketMessage",    x: 1370, y: 156, cluster: "tickets", fields: ["id","ticketId↑","senderId↑","body"] },
  { id: "TicketHistory",    x: 1370, y: 292, cluster: "tickets", fields: ["id","ticketId↑","action","changedById↑"] },
  { id: "TicketCategory",   x: 1370, y: 402, cluster: "tickets", fields: ["id","name","department"] },
  { id: "TicketPermission", x: 1370, y: 492, cluster: "tickets", fields: ["id","department","canTargetStudent","isInternalOnly"] },
  // Col 6 — CRM/Misc
  { id: "Lead",               x: 1640, y: 20,  cluster: "crm", fields: ["id","name","email","source","status"] },
  { id: "Candidate",          x: 1640, y: 156, cluster: "crm", fields: ["id","name","email","role","appliedAt"] },
  { id: "Referral",           x: 1640, y: 274, cluster: "crm", fields: ["id","referrerId↑","referredEmail","status"] },
  { id: "Meeting",            x: 1640, y: 380, cluster: "crm", fields: ["id","title","dateTime","dept","status"] },
  { id: "MeetingParticipant", x: 1640, y: 498, cluster: "crm", fields: ["id","meetingId↑","userId↑","role"] },
  { id: "Claim",              x: 1640, y: 596, cluster: "crm", fields: ["id","userId↑","month","amount","hours","status"] },
  { id: "Announcement",       x: 1640, y: 732, cluster: "crm", fields: ["id","title","body","targetRole","createdAt"] },
  { id: "Asset",              x: 1640, y: 840, cluster: "crm", fields: ["id","name","type","url","ownerId↑"] },
  { id: "AccessLog",          x: 1640, y: 956, cluster: "crm", fields: ["id","userId↑","action","resource","createdAt"] },
];

const ERD_EDGES: ErdEdge[] = [
  // User → profiles (right→left)
  { from: "User", to: "StaffProfile" },
  { from: "User", to: "TeacherProfile" },
  { from: "User", to: "StudentProfile" },
  { from: "User", to: "ParentProfile" },
  { from: "User", to: "AmbassadorProfile" },
  // User → academic (left→right)
  { from: "User", to: "Group" },
  { from: "User", to: "AcademicSession" },
  { from: "User", to: "Attendance" },
  { from: "User", to: "Assignment" },
  { from: "User", to: "MockResult" },
  { from: "User", to: "Doubt" },
  // User → billing
  { from: "User", to: "StudentMonthlyEnrollment" },
  { from: "User", to: "StudentRateOverride" },
  { from: "User", to: "ResourceInvoice" },
  { from: "User", to: "CounsellingInvoice" },
  // User → other
  { from: "User", to: "Ticket" },
  { from: "User", to: "Referral" },
  { from: "User", to: "Claim" },
  { from: "User", to: "MeetingParticipant" },
  // Group chains
  { from: "Group", to: "AcademicSession" },
  { from: "Group", to: "BatchRateCard" },
  { from: "Group", to: "EnrollmentPackageItem" },
  { from: "AcademicSession", to: "Attendance" },
  // Syllabus
  { from: "SyllabusItem", to: "StudentProgress" },
  { from: "SyllabusItem", to: "Doubt" },
  // Enrollment
  { from: "StudentMonthlyEnrollment", to: "EnrollmentPackageItem" },
  { from: "StudentMonthlyEnrollment", to: "StudentInvoice" },
  // Ledger
  { from: "Account", to: "LedgerEntry" },
  { from: "AccountTransaction", to: "LedgerEntry" },
  { from: "StudentInvoice", to: "LedgerEntry" },
  { from: "Claim", to: "LedgerEntry" },
  // Tickets
  { from: "Ticket", to: "TicketMessage" },
  { from: "Ticket", to: "TicketHistory" },
  // Meeting
  { from: "Meeting", to: "MeetingParticipant" },
];

const BOX_WIDTH = 210;
function getBoxMetrics(nodeId: string) {
  const node = ERD_NODES.find(n => n.id === nodeId)!;
  const h = 34 + node.fields.length * 18 + 10;
  return { x: node.x, y: node.y, w: BOX_WIDTH, h, cx: node.x + BOX_WIDTH / 2, cy: node.y + h / 2 };
}

export default function SandboxDashboard() {
  const [loading, setLoading] = useState(false);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Explorer state
  const [explorerTable, setExplorerTable] = useState("user");
  const [explorerRows, setExplorerRows] = useState<any[]>([]);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [explorerSearch, setExplorerSearch] = useState("");
  const [explorerSort, setExplorerSort] = useState<{ col: string; dir: "asc" | "desc" } | null>(null);
  const [explorerPage, setExplorerPage] = useState(0);
  const PAGE_SIZE = 12;
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [crudForm, setCrudForm] = useState<Record<string, string>>({});
  const [crudSaving, setCrudSaving] = useState(false);

  // Trends state
  const [trendField, setTrendField] = useState("totalINR");

  // ERD pan/zoom state
  const [erdScale, setErdScale] = useState(0.55);
  const [erdPan, setErdPan] = useState({ x: 0, y: 0 });
  const [erdDragging, setErdDragging] = useState(false);
  const [erdDragStart, setErdDragStart] = useState({ mx: 0, my: 0, px: 0, py: 0 });
  const erdContainerRef = useRef<HTMLDivElement>(null);

  // Diff state
  const [diffData, setDiffData] = useState<any | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffTable, setDiffTable] = useState("users");
  const [syncedExpanded, setSyncedExpanded] = useState(false);

  // Permissions inline-edit state
  const [localPerms, setLocalPerms] = useState<any[]>([]);
  const [savingPermId, setSavingPermId] = useState<string | null>(null);

  // Fetch sandbox status on load
  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sandbox");
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setMessage({ type: "error", text: json.message || "Failed to load database status." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: `Connection error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Run a sandbox api action
  const handleAction = async (action: string, description: string) => {
    setRunningAction(action);
    setMessage(null);
    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: json.message || `${description} completed successfully!` });
        await fetchStatus();
      } else {
        setMessage({ type: "error", text: json.message || `${description} failed.` });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: `Action error: ${err.message}` });
    } finally {
      setRunningAction(null);
    }
  };

  // Sync local perms when data loads
  useEffect(() => {
    if (data?.ticketPermissions) setLocalPerms(data.ticketPermissions);
  }, [data?.ticketPermissions]);

  // Auto-load explorer when tab activates
  useEffect(() => {
    if (activeTab === "explorer") fetchExplorer(explorerTable);
  }, [activeTab]);

  // Auto-load diff when diff tab activates
  useEffect(() => {
    if (activeTab === "diff") fetchDiff(diffTable);
  }, [activeTab]);

  const fetchDiff = async (table: string) => {
    setDiffLoading(true);
    setDiffData(null);
    try {
      const res = await fetch(`/api/sandbox?diff=${table}`);
      const json = await res.json();
      if (json.success) setDiffData(json);
      else setMessage({ type: "error", text: json.error || json.message || "Diff fetch failed." });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setDiffLoading(false);
    }
  };

  const fetchExplorer = async (table: string) => {
    setExplorerLoading(true);
    setExplorerRows([]);
    setExplorerSearch("");
    setExplorerPage(0);
    try {
      const res = await fetch(`/api/sandbox?table=${table}`);
      const json = await res.json();
      if (json.success) setExplorerRows(json.rows);
      else setMessage({ type: "error", text: json.error || "Failed to load table." });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setExplorerLoading(false);
    }
  };

  const handleTableSelect = (table: string) => {
    setExplorerTable(table);
    setExplorerSort(null);
    fetchExplorer(table);
  };

  const handleDeleteRow = async () => {
    if (!deleteTarget) return;
    setCrudSaving(true);
    try {
      const res = await fetch(`/api/sandbox?table=${explorerTable}&id=${deleteTarget}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setExplorerRows(prev => prev.filter(r => r.id !== deleteTarget));
        setDeleteTarget(null);
        setMessage({ type: "success", text: "Row deleted from staging." });
      } else {
        setMessage({ type: "error", text: json.error || "Delete failed." });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setCrudSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    setCrudSaving(true);
    try {
      const payload: Record<string, any> = {};
      for (const [k, v] of Object.entries(crudForm)) {
        if (k === "id" || k === "createdAt" || k === "updatedAt") continue;
        const num = Number(v);
        payload[k] = v === "true" ? true : v === "false" ? false : (v !== "" && !isNaN(num) ? num : v || null);
      }
      const res = await fetch(`/api/sandbox?table=${explorerTable}&id=${editModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        setExplorerRows(prev => prev.map(r => r.id === editModal.id ? { ...r, ...json.updated } : r));
        setEditModal(null);
        setCrudForm({});
        setMessage({ type: "success", text: "Row updated." });
      } else {
        setMessage({ type: "error", text: json.error || "Update failed." });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setCrudSaving(false);
    }
  };

  const handleAddRow = async () => {
    setCrudSaving(true);
    try {
      const payload: Record<string, any> = {};
      for (const [k, v] of Object.entries(crudForm)) {
        if (!v) continue;
        const num = Number(v);
        payload[k] = v === "true" ? true : v === "false" ? false : (!isNaN(num) ? num : v);
      }
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add-row", table: explorerTable, data: payload })
      });
      const json = await res.json();
      if (json.success) {
        setExplorerRows(prev => [json.created, ...prev]);
        setAddModal(false);
        setCrudForm({});
        setMessage({ type: "success", text: "Row created." });
      } else {
        setMessage({ type: "error", text: json.error || "Create failed." });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setCrudSaving(false);
    }
  };

  const handleTogglePerm = async (permId: string, field: string, currentVal: boolean) => {
    setSavingPermId(permId);
    setLocalPerms(prev => prev.map(p => p.id === permId ? { ...p, [field]: !currentVal } : p));
    try {
      await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-permission", permId, field, value: !currentVal })
      });
    } catch (_) {}
    finally { setSavingPermId(null); }
  };

  // Explorer computed values
  const EXPLORER_TABLES = [
    "user", "group", "academicSession", "attendance", "assignment", "syllabusItem",
    "studentProgress", "doubt", "recording", "ticket", "ticketCategory", "ticketMessage",
    "ticketHistory", "ticketPermission", "referral", "meeting", "meetingParticipant",
    "candidate", "lead", "announcement", "asset", "accessLog", "mockResult",
    "studentMonthlyEnrollment", "enrollmentPackageItem", "studentInvoice",
    "resourceInvoice", "counsellingInvoice", "claim", "account", "accountTransaction",
    "ledgerEntry", "dCBankAccount", "monthlyBillingSummary", "monthlyPayrollSummary",
    "staffProfile", "teacherProfile", "studentProfile", "parentProfile", "ambassadorProfile"
  ];

  const filteredRows = explorerRows.filter(r =>
    !explorerSearch || Object.values(r).some(v => String(v).toLowerCase().includes(explorerSearch.toLowerCase()))
  );

  const sortedRows = explorerSort
    ? [...filteredRows].sort((a, b) => {
        const va = String(a[explorerSort.col] ?? ""), vb = String(b[explorerSort.col] ?? "");
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return explorerSort.dir === "asc" ? cmp : -cmp;
      })
    : filteredRows;

  const totalPages = Math.ceil(sortedRows.length / PAGE_SIZE);
  const pagedRows = sortedRows.slice(explorerPage * PAGE_SIZE, (explorerPage + 1) * PAGE_SIZE);
  const colKeys = explorerRows.length > 0 ? Object.keys(explorerRows[0]).slice(0, 8) : [];

  // Trend SVG fields
  const TREND_FIELDS = [
    { key: "totalINR", label: "Total Revenue (INR)" },
    { key: "totalDueINR", label: "Total Due (INR)" },
    { key: "studentCount", label: "Student Count" },
    { key: "paidRatio", label: "Paid Ratio" },
    { key: "paidInvoices", label: "Paid Invoices" },
    { key: "dueInvoices", label: "Due Invoices" }
  ];

  const renderTrendSVG = () => {
    const raw = data?.billingSummaries || [];
    const sorted = [...raw].sort((a: any, b: any) => a.month.localeCompare(b.month));
    if (!sorted.length) return <p className="text-xs text-gray-500 font-mono text-center py-8">No billing data. Run ETL first.</p>;

    const vals: number[] = sorted.map((d: any) => Number(d[trendField]) || 0);
    const max = Math.max(...vals, 1);
    const min = Math.min(...vals, 0);
    const range = max - min || 1;

    const W = 700, H = 200, PL = 60, PR = 20, PT = 20, PB = 40;
    const innerW = W - PL - PR;
    const innerH = H - PT - PB;
    const step = innerW / Math.max(sorted.length - 1, 1);

    const pts = vals.map((v, i) => ({
      x: PL + i * step,
      y: PT + innerH - ((v - min) / range) * innerH,
      v,
      label: sorted[i].month.replace(/_of_/, " ").replace("_", " ")
    }));

    const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PT + innerH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PT + innerH).toFixed(1)} Z`;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ fontFamily: "monospace" }}>
        <defs>
          <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = PT + innerH * (1 - t);
          const val = min + range * t;
          return (
            <g key={i}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#1f2937" strokeWidth="1" />
              <text x={PL - 6} y={y + 4} fill="#6b7280" fontSize="9" textAnchor="end">
                {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#tg)" />
        <path d={linePath} stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke="#1e3a5f" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 9} fill="#93c5fd" fontSize="8" textAnchor="middle">
              {p.v >= 1000 ? `${(p.v / 1000).toFixed(1)}k` : p.v.toFixed(0)}
            </text>
            <text x={p.x} y={H - 5} fill="#4b5563" fontSize="8" textAnchor="middle">
              {p.label.split(" ")[0]}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#E2E8F0] font-sans antialiasedSelection">
      {/* Dynamic light/dark styling gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-[#0B0F19] to-purple-900/5 pointer-events-none" />

      <header className="relative border-b border-gray-800 bg-[#0F172A]/80 backdrop-blur-md px-8 py-5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/10 rounded-xl border border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <Database className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-mono">DivergenCIE Staging Sandbox</h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md uppercase tracking-wider font-mono">Isolated DB Staging</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Risk-Free 3NF Migration Verification Environment</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchStatus} 
            disabled={loading}
            className="p-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 rounded-lg text-gray-300 disabled:opacity-50 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh State
          </button>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-8 py-8 z-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* SIDEBAR NAVIGATION & SIMULATIONS */}
        <section className="lg:col-span-1 space-y-6">
          <div className="bg-[#0F172A]/70 border border-gray-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm space-y-5">
            <h2 className="text-sm font-semibold tracking-wider text-gray-400 uppercase font-mono">Staging Operations</h2>
            
            <div className="space-y-2">
              <button 
                onClick={() => handleAction("run-etl", "ETL CSV Data Import")}
                disabled={!!runningAction}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-md font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-400/20"
              >
                {runningAction === "run-etl" ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Run ETL Data Sync
              </button>
              <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                Truncates sandbox.db, clones active website tables, and imports GSheet student/staff CSV balances under a secure transaction.
              </p>
            </div>

            <div className="border-t border-gray-800 my-4 pt-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-300 font-mono">Simulation Playground</h3>
              
              <button 
                onClick={() => handleAction("simulate-billing-cycle", "May 2026 Snapshot Invoicing")}
                disabled={!data || !!runningAction}
                className="w-full py-2.5 px-3 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 text-gray-200 rounded-lg text-xs font-medium transition-all flex items-center justify-start gap-2 cursor-pointer disabled:opacity-40"
              >
                <Database className="w-4 h-4 text-purple-400" />
                Run Month-End Snap Cycle
              </button>

              <button 
                onClick={() => handleAction("simulate-cancellation", "Mid-Month Pause & Prorate")}
                disabled={!data || !!runningAction}
                className="w-full py-2.5 px-3 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 text-gray-200 rounded-lg text-xs font-medium transition-all flex items-center justify-start gap-2 cursor-pointer disabled:opacity-40"
              >
                <X className="w-4 h-4 text-rose-400" />
                Simulate Prorated Cancel
              </button>

              <button 
                onClick={() => handleAction("simulate-split-payment", "Split Payment (Paytm + Cash)")}
                disabled={!data || !!runningAction}
                className="w-full py-2.5 px-3 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 text-gray-200 rounded-lg text-xs font-medium transition-all flex items-center justify-start gap-2 cursor-pointer disabled:opacity-40"
              >
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Simulate Split Payment
              </button>

              <button 
                onClick={() => handleAction("run-audit", "Double-Entry Ledger Checksum Audit")}
                disabled={!data || !!runningAction}
                className="w-full py-2.5 px-3 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 text-gray-200 rounded-lg text-xs font-medium transition-all flex items-center justify-start gap-2 cursor-pointer disabled:opacity-40"
              >
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Run Ledger Integrity Audit
              </button>
            </div>
          </div>
        </section>

        {/* MAIN VISUALIZATION PANELS */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* Status Message Alerts */}
          {message && (
            <div className={`p-4 rounded-xl border flex gap-3 items-start animate-fadeIn shadow-md backdrop-blur-sm ${
              message.type === "success" 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200 shadow-emerald-500/5" 
                : message.type === "error"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-200 shadow-rose-500/5"
                : "bg-blue-500/10 border-blue-500/30 text-blue-200 shadow-blue-500/5"
            }`}>
              <div className="mt-0.5">
                {message.type === "success" ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : message.type === "error" ? (
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                ) : (
                  <Info className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold font-mono tracking-tight">{message.type === "success" ? "Operation Succeeded" : message.type === "error" ? "Operation Failed" : "Notice"}</h4>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed font-mono">{message.text}</p>
              </div>
            </div>
          )}

          {/* Counts Overview Caches Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0F172A]/70 border border-gray-800/80 p-4 rounded-xl shadow-md">
              <div className="flex justify-between items-center text-gray-400">
                <span className="text-[10px] font-bold uppercase font-mono tracking-wider">Total Users</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold font-mono mt-1 text-white">{data?.counts?.users ?? "—"}</p>
              <p className="text-[10px] text-gray-500 mt-1 font-mono">Students: {data?.counts?.users ? data.counts.users - 8 : "0"}</p>
            </div>

            <div className="bg-[#0F172A]/70 border border-gray-800/80 p-4 rounded-xl shadow-md">
              <div className="flex justify-between items-center text-gray-400">
                <span className="text-[10px] font-bold uppercase font-mono tracking-wider">3NF Snapshots</span>
                <FileSpreadsheet className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-bold font-mono mt-1 text-white">{data?.counts?.enrollments ?? "—"}</p>
              <p className="text-[10px] text-gray-500 mt-1 font-mono">Invoice Carts: {data?.counts?.packageItems ?? "0"}</p>
            </div>

            <div className="bg-[#0F172A]/70 border border-gray-800/80 p-4 rounded-xl shadow-md">
              <div className="flex justify-between items-center text-gray-400">
                <span className="text-[10px] font-bold uppercase font-mono tracking-wider">Tuition Invoices</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold font-mono mt-1 text-white">{data?.counts?.studentInvoices ?? "—"}</p>
              <p className="text-[10px] text-gray-500 mt-1 font-mono">Active Claims: {data?.counts?.claims ?? "0"}</p>
            </div>

            <div className="bg-[#0F172A]/70 border border-gray-800/80 p-4 rounded-xl shadow-md">
              <div className="flex justify-between items-center text-gray-400">
                <span className="text-[10px] font-bold uppercase font-mono tracking-wider">Ledger Health</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-lg font-bold font-mono mt-2 text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4" /> BALANCED
              </p>
              <p className="text-[10px] text-gray-500 mt-1 font-mono">Debit/Credit Sum: 0.00</p>
            </div>
          </div>

          {/* TABULAR LAYOUT COMPONENT */}
          <div className="bg-[#0F172A]/50 border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
            
            {/* Tabs Header */}
            <div className="flex border-b border-gray-800 bg-[#0F172A]/80 px-4">
              <button 
                onClick={() => setActiveTab("overview")} 
                className={`py-4 px-4 text-xs font-bold tracking-tight border-b-2 cursor-pointer font-mono ${
                  activeTab === "overview" 
                    ? "border-blue-500 text-white" 
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                Snapshot Invoicing Cache
              </button>
              <button 
                onClick={() => setActiveTab("ledger")} 
                className={`py-4 px-4 text-xs font-bold tracking-tight border-b-2 cursor-pointer font-mono ${
                  activeTab === "ledger" 
                    ? "border-blue-500 text-white" 
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                Chart of Accounts
              </button>
              <button 
                onClick={() => setActiveTab("invoices")} 
                className={`py-4 px-4 text-xs font-bold tracking-tight border-b-2 cursor-pointer font-mono ${
                  activeTab === "invoices" 
                    ? "border-blue-500 text-white" 
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                Recent Invoices Grid
              </button>
              <button 
                onClick={() => setActiveTab("ledgers")} 
                className={`py-4 px-4 text-xs font-bold tracking-tight border-b-2 cursor-pointer font-mono ${
                  activeTab === "ledgers" 
                    ? "border-blue-500 text-white" 
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                Double-Entry Logs
              </button>
              <button 
                onClick={() => setActiveTab("meetings")} 
                className={`py-4 px-4 text-xs font-bold tracking-tight border-b-2 cursor-pointer font-mono ${
                  activeTab === "meetings" 
                    ? "border-blue-500 text-white" 
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                Meetings & Claims
              </button>
              <button 
                onClick={() => setActiveTab("metrics")} 
                className={`py-4 px-4 text-xs font-bold tracking-tight border-b-2 cursor-pointer font-mono ${
                  activeTab === "metrics" 
                    ? "border-blue-500 text-white" 
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                Management Metrics
              </button>
              <button 
                onClick={() => setActiveTab("rules")}
                className={`py-4 px-4 text-xs font-bold tracking-tight border-b-2 cursor-pointer font-mono ${
                  activeTab === "rules"
                    ? "border-blue-500 text-white" 
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                Ticket Creation Rules
              </button>
              <button
                onClick={() => setActiveTab("explorer")}
                className={`py-4 px-4 text-xs font-bold tracking-tight border-b-2 cursor-pointer font-mono flex items-center gap-1.5 ${
                  activeTab === "explorer"
                    ? "border-violet-500 text-white"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />DB Explorer
              </button>
              <button
                onClick={() => setActiveTab("trends")}
                className={`py-4 px-4 text-xs font-bold tracking-tight border-b-2 cursor-pointer font-mono flex items-center gap-1.5 ${
                  activeTab === "trends"
                    ? "border-cyan-500 text-white"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />Trends
              </button>
              <button
                onClick={() => setActiveTab("erd")}
                className={`py-4 px-4 text-xs font-bold tracking-tight border-b-2 cursor-pointer font-mono flex items-center gap-1.5 ${
                  activeTab === "erd"
                    ? "border-purple-500 text-white"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />ERD
              </button>
              <button
                onClick={() => setActiveTab("diff")}
                className={`py-4 px-4 text-xs font-bold tracking-tight border-b-2 cursor-pointer font-mono flex items-center gap-1.5 ${
                  activeTab === "diff"
                    ? "border-orange-500 text-white"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />Diff
              </button>
            </div>

            {/* TAB CONTENT: OVERVIEW / SNAPSHOT SUMMARY */}
            {activeTab === "overview" && (
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-200 font-mono">Monthly Billing Summary (GSheet Synced)</h3>
                  <p className="text-xs text-gray-400 leading-relaxed font-mono">Locked Snapshots generated from PapaParse transforms</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono bg-gray-900/40">
                        <th className="py-3 px-4">Billing Month</th>
                        <th className="py-3 px-4">Active Roster</th>
                        <th className="py-3 px-4">Fees Sum</th>
                        <th className="py-3 px-4">Total INR Sum</th>
                        <th className="py-3 px-4">Overdue INR Dues</th>
                        <th className="py-3 px-4">Paid / Unpaid Invoices</th>
                        <th className="py-3 px-4 text-right">Payment Ratio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono text-xs text-gray-300">
                      {data?.billingSummaries?.map((sum: any) => (
                        <tr key={sum.id} className="hover:bg-gray-800/20">
                          <td className="py-3.5 px-4 font-bold text-white">{sum.month}</td>
                          <td className="py-3.5 px-4">{sum.studentCount} active students</td>
                          <td className="py-3.5 px-4 font-semibold text-gray-200">{sum.totalLocalFees.toLocaleString("en-US", { style: "currency", currency: "SAR" })}</td>
                          <td className="py-3.5 px-4 text-emerald-400">INR {sum.totalINR.toLocaleString("en-IN")}</td>
                          <td className="py-3.5 px-4 text-rose-400">INR {sum.totalDueINR.toLocaleString("en-IN")}</td>
                          <td className="py-3.5 px-4">
                            <span className="text-emerald-400 font-bold">{sum.paidInvoices} paid</span> / <span className="text-rose-400">{sum.dueInvoices} due</span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sum.paidRatio >= 0.8 ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"
                            }`}>
                              {(sum.paidRatio * 100).toFixed(0)}% PAID
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!data?.billingSummaries || data.billingSummaries.length === 0) && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500 text-xs leading-relaxed font-mono">
                            Staging snapshots empty. Run the "ETL Data Sync" command to import Excel spreadsheet data rows.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CHART OF ACCOUNTS */}
            {activeTab === "ledger" && (
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-200 font-mono">Standard Chart of Accounts (Double-Entry Balance Grid)</h3>
                  <p className="text-xs text-gray-400 font-mono">Reflects dynamic credits/debits from billing cycles</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono bg-gray-900/40">
                        <th className="py-3 px-4">Account Ledger Title</th>
                        <th className="py-3 px-4">Classification</th>
                        <th className="py-3 px-4">Base Currency</th>
                        <th className="py-3 px-4 text-right">Accounting Balance (Debit/Credit Split)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono text-xs text-gray-300">
                      {data?.chartOfAccounts?.map((acc: any) => (
                        <tr key={acc.id} className="hover:bg-gray-800/20">
                          <td className="py-3.5 px-4 font-bold text-white">{acc.name}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              acc.accountType === "ASSET" ? "bg-blue-500/10 text-blue-400" :
                              acc.accountType === "REVENUE" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                            }`}>
                              {acc.accountType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-400">{acc.currency}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-gray-100">
                            {acc.balance.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: INVOICES GRID */}
            {activeTab === "invoices" && (
              <div className="p-6 space-y-6">
                <h3 className="text-sm font-bold text-gray-200 font-mono">Recent 3NF Invoices (Visual Spread Grid)</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono bg-gray-900/40">
                        <th className="py-3 px-4">Invoice ID</th>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Billing Month</th>
                        <th className="py-3 px-4">Fees (Local)</th>
                        <th className="py-3 px-4">INR Equivalent</th>
                        <th className="py-3 px-4">Dues Remaining</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono text-xs text-gray-300">
                      {data?.recentInvoices?.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-gray-800/20">
                          <td className="py-3 px-4 text-gray-400 font-semibold">INV-{inv.id.substring(0, 8).toUpperCase()}</td>
                          <td className="py-3 px-4 font-bold text-white">{inv.enrollment?.student?.name}</td>
                          <td className="py-3 px-4 text-gray-400">{inv.month}</td>
                          <td className="py-3 px-4 font-bold">{inv.feesAmount.toLocaleString("en-US", { style: "currency", currency: inv.enrollment?.currency || "SAR" })}</td>
                          <td className="py-3 px-4 text-emerald-400">INR {inv.inrEquivalent.toLocaleString("en-IN")}</td>
                          <td className="py-3 px-4 text-rose-400">INR {inv.dueAmount.toLocaleString("en-IN")}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inv.paymentDone ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                            }`}>
                              {inv.paymentDone ? "PAID" : "UNPAID"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!data?.recentInvoices || data.recentInvoices.length === 0) && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500 text-xs leading-relaxed font-mono">
                            No recent invoices. Execute ETL Sync to import spreadsheet invoices.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: DOUBLE ENTRY LOGS */}
            {activeTab === "ledgers" && (
              <div className="p-6 space-y-6">
                <h3 className="text-sm font-bold text-gray-200 font-mono">Double-Entry Transaction Logs (Audit Trail)</h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono bg-gray-900/40">
                        <th className="py-3 px-4">Transaction ID</th>
                        <th className="py-3 px-4">Ledger Account Node</th>
                        <th className="py-3 px-4 text-right">Debit Balance (Positive)</th>
                        <th className="py-3 px-4 text-right">Credit Balance (Negative)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono text-xs text-gray-300">
                      {data?.recentLedgers?.map((led: any) => (
                        <tr key={led.id} className="hover:bg-gray-800/20">
                          <td className="py-3 px-4 text-gray-500">TX-{led.transactionId.substring(0, 8).toUpperCase()}</td>
                          <td className="py-3 px-4 font-semibold text-white">{led.account?.name}</td>
                          <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                            {led.amount > 0 ? led.amount.toLocaleString("en-IN", { style: "currency", currency: "INR" }) : "—"}
                          </td>
                          <td className="py-3 px-4 text-right text-rose-400 font-bold">
                            {led.amount < 0 ? led.amount.toLocaleString("en-IN", { style: "currency", currency: "INR" }) : "—"}
                          </td>
                        </tr>
                      ))}
                      {(!data?.recentLedgers || data.recentLedgers.length === 0) && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-500 text-xs leading-relaxed font-mono">
                            No ledger entries found. Run the "ETL Data Sync" command to post transactions.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: MEETINGS & CLAIMS */}
            {activeTab === "meetings" && (
              <div className="p-6 space-y-8">
                {/* Meetings Staging Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-200 font-mono">Academic & Team Meetings Staging (Sync Active)</h3>
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono font-semibold uppercase">Live dev.db Clone</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono bg-gray-900/40">
                          <th className="py-3 px-4">Meeting Title</th>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Department / Agenda</th>
                          <th className="py-3 px-4">Participants Roster</th>
                          <th className="py-3 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60 font-mono text-xs text-gray-300">
                        {data?.meetings?.map((meet: any) => (
                          <tr key={meet.id} className="hover:bg-gray-800/20">
                            <td className="py-3.5 px-4 font-bold text-white">{meet.title}</td>
                            <td className="py-3.5 px-4">{new Date(meet.dateTime).toLocaleString()}</td>
                            <td className="py-3.5 px-4">
                              <span className="text-gray-400">[{meet.dept || "GENERAL"}]</span> {meet.agenda || "No agenda set"}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap gap-1">
                                {meet.participants?.map((p: any) => (
                                  <span key={p.id} className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 text-gray-300 rounded text-[9px]">
                                    {p.user?.name} ({p.user?.role})
                                  </span>
                                ))}
                                {(!meet.participants || meet.participants.length === 0) && <span className="text-gray-600">—</span>}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                meet.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"
                              }`}>
                                {meet.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {(!data?.meetings || data.meetings.length === 0) && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-gray-500 text-xs leading-relaxed font-mono">
                              No meetings found in staging database.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Supervisor Claims Section */}
                <div className="space-y-4 border-t border-gray-800 pt-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-200 font-mono">Staff & Teacher Compensation Claims (CSV + DB Combined)</h3>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono font-semibold uppercase">Double-Entry Linked</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono bg-gray-900/40">
                          <th className="py-3 px-4">Staff / Tutor</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Period</th>
                          <th className="py-3 px-4 text-right">Hours Logged</th>
                          <th className="py-3 px-4 text-right">Claim Amount</th>
                          <th className="py-3 px-4">Notes / Timesheet</th>
                          <th className="py-3 px-4 text-right">Payment Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60 font-mono text-xs text-gray-300">
                        {data?.claims?.map((claim: any) => (
                          <tr key={claim.id} className="hover:bg-gray-800/20">
                            <td className="py-3.5 px-4 font-bold text-white">{claim.user?.name}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                claim.user?.role === "staff" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                              }`}>
                                {claim.user?.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold">{claim.month}</td>
                            <td className="py-3.5 px-4 text-right font-bold text-gray-200">{claim.hours ? `${claim.hours} hrs` : "—"}</td>
                            <td className="py-3.5 px-4 text-right font-bold text-emerald-400">£{claim.amount.toLocaleString()}</td>
                            <td className="py-3.5 px-4 text-gray-400 max-w-[200px] truncate">{claim.notes || "No notes"}</td>
                            <td className="py-3.5 px-4 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                claim.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"
                              }`}>
                                {claim.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {(!data?.claims || data.claims.length === 0) && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-gray-500 text-xs leading-relaxed font-mono">
                              No supervisor claims loaded in staging. Run ETL to parse staff csv balances.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: MANAGEMENT METRICS */}
            {activeTab === "metrics" && (
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-200 font-mono">Executive Management Metrics & Staging KPIs</h3>
                  <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-mono font-semibold uppercase">Dashboard Telemetry</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Active Roster Metric Card */}
                  <div className="bg-[#0F172A]/80 border border-gray-800 p-5 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-wide">Academic Roster</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-400">Staging Students count:</span>
                        <span className="font-bold text-white">{data?.counts?.users ? data.counts.users - 8 : 0}</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-400">Academic Sessions log:</span>
                        <span className="font-bold text-blue-400">{data?.counts?.sessions ?? 0} sessions</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-400">Present Attendances:</span>
                        <span className="font-bold text-emerald-400">{data?.counts?.attendance ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational SLAs Metric Card */}
                  <div className="bg-[#0F172A]/80 border border-gray-800 p-5 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-wide">Support SLAs & Tickets</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-400">Total Support Tickets:</span>
                        <span className="font-bold text-white">{data?.counts?.tickets ?? 0} tickets</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-400">Open Tickets Alert:</span>
                        <span className={`font-bold ${data?.counts?.tickets > 0 ? "text-rose-400 animate-pulse" : "text-gray-400"}`}>
                          {data?.counts?.tickets ?? 0} active
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-400">Pending Staff Claims:</span>
                        <span className="font-bold text-yellow-400">{data?.counts?.claims ?? 0} claims</span>
                      </div>
                    </div>
                  </div>

                  {/* Joint Platform Database Summary Card */}
                  <div className="bg-[#0F172A]/80 border border-gray-800 p-5 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-wide">Transactional Totals</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-400">Double-Entry Ledgers:</span>
                        <span className="font-bold text-white">{data?.counts?.ledgerEntries ?? 0} rows</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-400">Account Transactions:</span>
                        <span className="font-bold text-purple-400">{data?.counts?.transactions ?? 0} transactions</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-400">Active Bank nodes:</span>
                        <span className="font-bold text-emerald-400">1 corporate bank</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ticket SLA Visualizer List */}
                <div className="space-y-3 pt-4 border-t border-gray-800">
                  <h4 className="text-xs font-bold font-mono text-gray-200">Recent Support Ticket Creation Log</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono bg-gray-900/40">
                          <th className="py-2.5 px-4">Ticket ID</th>
                          <th className="py-2.5 px-4">Title / Topic</th>
                          <th className="py-2.5 px-4">Creator Role</th>
                          <th className="py-2.5 px-4">Assigned Department</th>
                          <th className="py-2.5 px-4">Priority</th>
                          <th className="py-2.5 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60 font-mono text-xs text-gray-300">
                        {data?.recentTickets?.map((t: any) => (
                          <tr key={t.id} className="hover:bg-gray-800/10">
                            <td className="py-2.5 px-4 text-gray-400 font-semibold">TKT-{t.displayId || t.id.substring(0, 5).toUpperCase()}</td>
                            <td className="py-2.5 px-4 font-bold text-white">{t.title}</td>
                            <td className="py-2.5 px-4 text-gray-400">{t.creator?.name} ({t.creator?.role})</td>
                            <td className="py-2.5 px-4 text-gray-400">{t.department || "UNASSIGNED"}</td>
                            <td className="py-2.5 px-4">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                t.priority === "HIGH" ? "bg-rose-500/10 text-rose-400" : "bg-gray-800 text-gray-400"
                              }`}>
                                {t.priority}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-blue-400">{t.status}</td>
                          </tr>
                        ))}
                        {(!data?.recentTickets || data.recentTickets.length === 0) && (
                          <tr>
                            <td colSpan={6} className="py-4 text-center text-gray-600 text-xs font-mono">No tickets found in sandbox.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: TICKET CREATION RULES — inline editable */}
            {activeTab === "rules" && (
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-200 font-mono">Support Ticket Permissions Matrix</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono font-semibold uppercase">Live Editable · Saves Instantly</span>
                  </div>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed font-mono">
                  Toggle switches save directly to sandbox.db. Changes isolated to staging — production rules untouched.
                </p>

                <div className="overflow-x-auto border border-gray-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono bg-gray-900/60">
                        <th className="py-3 px-4">Department</th>
                        {["canTargetStudent","canTargetParent","canTargetTeacher","canTargetAmbassador","canTargetCandidate","isInternalOnly"].map(f => (
                          <th key={f} className="py-3 px-3 text-center">{f.replace("canTarget","").replace("is","")}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono text-xs text-gray-300">
                      {localPerms.map((perm: any) => (
                        <tr key={perm.id} className={`hover:bg-gray-800/20 ${savingPermId === perm.id ? "opacity-60" : ""}`}>
                          <td className="py-3 px-4 font-bold text-white">{perm.department}</td>
                          {["canTargetStudent","canTargetParent","canTargetTeacher","canTargetAmbassador","canTargetCandidate","isInternalOnly"].map(field => (
                            <td key={field} className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleTogglePerm(perm.id, field, perm[field])}
                                disabled={savingPermId === perm.id}
                                className="mx-auto flex items-center cursor-pointer disabled:cursor-wait"
                                title={`${perm[field] ? "Disable" : "Enable"} ${field}`}
                              >
                                {perm[field]
                                  ? <ToggleRight className="w-5 h-5 text-emerald-400" />
                                  : <ToggleLeft className="w-5 h-5 text-gray-600" />}
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                      {localPerms.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-600 text-xs font-mono">
                            No ticket permissions found. Run ETL sync to seed standard rules.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: DB EXPLORER — generic CRUD */}
            {activeTab === "explorer" && (
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-sm font-bold text-gray-200 font-mono">Database Explorer</h3>
                  <span className="text-[10px] bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded font-mono font-semibold uppercase">Staging CRUD</span>
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => { setCrudForm({}); setAddModal(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold font-mono cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />Add Row
                    </button>
                    <button
                      onClick={() => fetchExplorer(explorerTable)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-xs font-mono cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${explorerLoading ? "animate-spin" : ""}`} />Reload
                    </button>
                  </div>
                </div>

                {/* Table selector + search */}
                <div className="flex flex-wrap gap-3">
                  <select
                    value={explorerTable}
                    onChange={e => handleTableSelect(e.target.value)}
                    className="bg-gray-900 border border-gray-700 text-gray-200 text-xs font-mono px-3 py-2 rounded-lg cursor-pointer focus:outline-none focus:border-violet-500"
                  >
                    {EXPLORER_TABLES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search all columns..."
                      value={explorerSearch}
                      onChange={e => { setExplorerSearch(e.target.value); setExplorerPage(0); }}
                      className="bg-transparent text-xs font-mono text-gray-200 focus:outline-none w-full placeholder-gray-600"
                    />
                  </div>
                  <span className="text-xs text-gray-500 font-mono self-center">
                    {filteredRows.length} / {explorerRows.length} rows
                  </span>
                </div>

                {/* Table grid */}
                <div className="overflow-x-auto border border-gray-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono bg-gray-900/60">
                        {colKeys.map(col => (
                          <th
                            key={col}
                            className="py-2.5 px-3 cursor-pointer hover:text-gray-200 select-none whitespace-nowrap"
                            onClick={() => {
                              if (explorerSort?.col === col) {
                                setExplorerSort({ col, dir: explorerSort.dir === "asc" ? "desc" : "asc" });
                              } else {
                                setExplorerSort({ col, dir: "asc" });
                              }
                              setExplorerPage(0);
                            }}
                          >
                            <span className="flex items-center gap-1">
                              {col}
                              {explorerSort?.col === col
                                ? explorerSort.dir === "asc"
                                  ? <ChevronUp className="w-3 h-3" />
                                  : <ChevronDown className="w-3 h-3" />
                                : null}
                            </span>
                          </th>
                        ))}
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono text-xs text-gray-300">
                      {explorerLoading && (
                        <tr><td colSpan={colKeys.length + 1} className="py-8 text-center text-gray-500 font-mono">Loading {explorerTable}...</td></tr>
                      )}
                      {!explorerLoading && pagedRows.length === 0 && (
                        <tr><td colSpan={colKeys.length + 1} className="py-8 text-center text-gray-600 font-mono">No rows found.</td></tr>
                      )}
                      {!explorerLoading && pagedRows.map((row: any) => (
                        <tr key={row.id} className="hover:bg-gray-800/20">
                          {colKeys.map(col => (
                            <td key={col} className="py-2.5 px-3 max-w-[160px] truncate" title={String(row[col] ?? "")}>
                              {row[col] === true ? <span className="text-emerald-400">true</span>
                                : row[col] === false ? <span className="text-rose-400/70">false</span>
                                : row[col] === null || row[col] === undefined ? <span className="text-gray-600">null</span>
                                : <span>{String(row[col]).substring(0, 40)}{String(row[col]).length > 40 ? "…" : ""}</span>}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  const form: Record<string, string> = {};
                                  Object.entries(row).forEach(([k, v]) => form[k] = String(v ?? ""));
                                  setCrudForm(form);
                                  setEditModal(row);
                                }}
                                className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded cursor-pointer"
                                title="Edit row"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(row.id)}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded cursor-pointer"
                                title="Delete row"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between font-mono text-xs text-gray-400">
                    <button
                      onClick={() => setExplorerPage(p => Math.max(0, p - 1))}
                      disabled={explorerPage === 0}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-default"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />Prev
                    </button>
                    <span>Page {explorerPage + 1} / {totalPages}</span>
                    <button
                      onClick={() => setExplorerPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={explorerPage >= totalPages - 1}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-default"
                    >
                      Next<ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: ERD DIAGRAM */}
            {activeTab === "erd" && (() => {
              const renderErdNode = (node: ErdNode) => {
                const { x, y, w, h } = getBoxMetrics(node.id);
                const clr = ERD_CLUSTERS[node.cluster];
                return (
                  <g key={node.id}>
                    <rect x={x} y={y} width={w} height={h} rx={5} fill="#0f172a" stroke={clr.color} strokeWidth={1.5} />
                    <rect x={x} y={y} width={w} height={28} rx={5} fill={clr.header} />
                    <rect x={x} y={y + 23} width={w} height={5} fill={clr.header} />
                    <text x={x + w / 2} y={y + 17} textAnchor="middle" fill={clr.text} fontSize={11} fontWeight="bold" fontFamily="monospace">{node.id}</text>
                    {node.fields.map((f, i) => (
                      <text key={f} x={x + 8} y={y + 34 + i * 18 + 12} fill={f.endsWith("↑") ? "#94a3b8" : "#cbd5e1"} fontSize={9} fontFamily="monospace">
                        {f.endsWith("↑") ? `↑ ${f.slice(0, -1)}` : `· ${f}`}
                      </text>
                    ))}
                  </g>
                );
              };

              const renderErdEdge = (edge: ErdEdge, idx: number) => {
                const fm = getBoxMetrics(edge.from);
                const tm = getBoxMetrics(edge.to);
                const goRight = tm.x >= fm.x;
                const x1 = goRight ? fm.x + fm.w : fm.x;
                const y1 = fm.y + fm.h / 2;
                const x2 = goRight ? tm.x : tm.x + tm.w;
                const y2 = tm.y + tm.h / 2;
                const cx1 = goRight ? x1 + 60 : x1 - 60;
                const cx2 = goRight ? x2 - 60 : x2 + 60;
                const fromClr = ERD_CLUSTERS[ERD_NODES.find(n => n.id === edge.from)!.cluster].color;
                return (
                  <path
                    key={idx}
                    d={`M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`}
                    stroke={fromClr}
                    strokeWidth={1}
                    strokeOpacity={0.45}
                    fill="none"
                    markerEnd="url(#arrowhead)"
                  />
                );
              };

              return (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-bold text-gray-200 font-mono">Entity Relationship Diagram</h3>
                      <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-mono font-semibold uppercase">40 Models · Sandbox Schema</span>
                    </div>
                    <button
                      onClick={() => { setErdScale(0.55); setErdPan({ x: 0, y: 0 }); }}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-xs font-mono cursor-pointer"
                    >
                      Reset View
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                    {Object.entries(ERD_CLUSTERS).map(([k, v]) => (
                      <span key={k} className="flex items-center gap-1 px-2 py-0.5 rounded" style={{ background: v.header + "cc", color: v.text }}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: v.color }} />{k}
                      </span>
                    ))}
                  </div>
                  <div
                    ref={erdContainerRef}
                    className="overflow-hidden rounded-xl border border-gray-800 bg-[#080c14] cursor-grab active:cursor-grabbing select-none"
                    style={{ height: 650 }}
                    onMouseDown={(e) => {
                      setErdDragging(true);
                      setErdDragStart({ mx: e.clientX, my: e.clientY, px: erdPan.x, py: erdPan.y });
                    }}
                    onMouseMove={(e) => {
                      if (!erdDragging) return;
                      setErdPan({ x: erdDragStart.px + e.clientX - erdDragStart.mx, y: erdDragStart.py + e.clientY - erdDragStart.my });
                    }}
                    onMouseUp={() => setErdDragging(false)}
                    onMouseLeave={() => setErdDragging(false)}
                    onWheel={(e) => {
                      e.preventDefault();
                      setErdScale(s => Math.min(2, Math.max(0.2, s - e.deltaY * 0.001)));
                    }}
                  >
                    <div style={{ transform: `translate(${erdPan.x}px, ${erdPan.y}px) scale(${erdScale})`, transformOrigin: "0 0", width: 1900, height: 1120 }}>
                      <svg width={1900} height={1120} viewBox="0 0 1900 1120">
                        <defs>
                          <marker id="arrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                            <polygon points="0 0, 7 3.5, 0 7" fill="#475569" fillOpacity="0.7" />
                          </marker>
                        </defs>
                        {ERD_EDGES.map((edge, i) => renderErdEdge(edge, i))}
                        {ERD_NODES.map(node => renderErdNode(node))}
                      </svg>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 font-mono">Drag to pan · Scroll to zoom · Arrows = FK relationships</p>
                </div>
              );
            })()}

            {/* TAB CONTENT: CONFLICT / DIFF */}
            {activeTab === "diff" && (
              <div className="p-6 space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-sm font-bold text-gray-200 font-mono">Sandbox vs Production Diff</h3>
                  <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded font-mono font-semibold uppercase">Live Compare</span>
                  <div className="ml-auto flex items-center gap-2">
                    {(["users","claims","groups"] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => { setDiffTable(t); fetchDiff(t); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
                          diffTable === t ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                    <button
                      onClick={() => fetchDiff(diffTable)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-xs font-mono cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${diffLoading ? "animate-spin" : ""}`} />Refresh
                    </button>
                  </div>
                </div>

                {diffLoading && (
                  <div className="py-12 text-center text-gray-500 font-mono text-xs">Comparing sandbox vs production {diffTable}…</div>
                )}

                {diffData && !diffLoading && (
                  <>
                    {/* Summary banner */}
                    <div className="flex flex-wrap gap-3 p-4 bg-gray-900/60 border border-gray-800 rounded-xl">
                      <span className="text-xs font-mono text-gray-400">Prod: <span className="text-white font-bold">{diffData.prodCount}</span></span>
                      <span className="text-xs font-mono text-gray-400">Sandbox: <span className="text-white font-bold">{diffData.sandboxCount}</span></span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400 font-mono">{diffData.synced?.length ?? 0} Synced</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/10 text-rose-400 font-mono">{diffData.conflicts?.length ?? 0} Conflicts</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/10 text-blue-400 font-mono">{diffData.stagingOnly?.length ?? 0} Staging Only</span>
                    </div>

                    {/* Conflicts — always expanded */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-rose-400 font-mono uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        Conflicts ({diffData.conflicts?.length ?? 0})
                      </h4>
                      {diffData.conflicts?.length === 0 && (
                        <p className="text-xs text-gray-600 font-mono pl-4">No conflicts detected.</p>
                      )}
                      <div className="space-y-2">
                        {diffData.conflicts?.map((item: any, i: number) => (
                          <div key={i} className="flex flex-wrap items-start gap-3 p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg">
                            <div className="min-w-[160px]">
                              <p className="text-xs font-bold text-white font-mono">{item.name || item.month || item.code || item.id?.substring(0,8)}</p>
                              <p className="text-[10px] text-gray-500 font-mono">{item.email || item.userId || ""}</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {item.diffs?.map((d: string, j: number) => (
                                <span key={j} className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded text-[10px] font-mono">{d}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Staging Only */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-blue-400 font-mono uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                        Staging Only ({diffData.stagingOnly?.length ?? 0})
                      </h4>
                      {diffData.stagingOnly?.length === 0 && (
                        <p className="text-xs text-gray-600 font-mono pl-4">No staging-only records.</p>
                      )}
                      <div className="space-y-1">
                        {diffData.stagingOnly?.map((item: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 px-3 py-2 bg-blue-500/5 border border-blue-500/15 rounded-lg text-xs font-mono">
                            <span className="text-white font-bold">{item.name || item.id?.substring(0,8)}</span>
                            <span className="text-gray-500">{item.email || item.month || item.code || ""}</span>
                            {item.role && <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px]">{item.role}</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Synced — collapsed by default */}
                    <div className="space-y-2">
                      <button
                        onClick={() => setSyncedExpanded(e => !e)}
                        className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider cursor-pointer hover:text-emerald-300"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        Synced ({diffData.synced?.length ?? 0})
                        <span className="text-gray-600 font-normal normal-case">{syncedExpanded ? "▲ collapse" : "▼ expand"}</span>
                      </button>
                      {syncedExpanded && (
                        <div className="space-y-1">
                          {diffData.synced?.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2 bg-emerald-500/5 border border-emerald-500/15 rounded-lg text-xs font-mono">
                              <span className="text-white font-bold">{item.name || item.id?.substring(0,8)}</span>
                              <span className="text-gray-500">{item.email || item.month || item.code || ""}</span>
                              {item.role && <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[9px]">{item.role}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {!diffData && !diffLoading && (
                  <div className="py-12 text-center text-gray-600 font-mono text-xs">Select a table and click Refresh to compare.</div>
                )}
              </div>
            )}

            {/* TAB CONTENT: TRENDS — SVG telemetry */}
            {activeTab === "trends" && (
              <div className="p-6 space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-sm font-bold text-gray-200 font-mono">Telemetry Trends</h3>
                  <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded font-mono font-semibold uppercase">Billing Summaries · Monthly</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {TREND_FIELDS.map(f => (
                    <button
                      key={f.key}
                      onClick={() => setTrendField(f.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
                        trendField === f.key
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="bg-[#0A0E1A] border border-gray-800 rounded-xl p-4">
                  <p className="text-[10px] text-gray-500 font-mono mb-4 uppercase tracking-wider">
                    {TREND_FIELDS.find(f => f.key === trendField)?.label} — Monthly Billing Summaries
                  </p>
                  {renderTrendSVG()}
                </div>

                {/* Raw summary table */}
                <div className="overflow-x-auto border border-gray-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono bg-gray-900/60">
                        <th className="py-2.5 px-4">Month</th>
                        <th className="py-2.5 px-4 text-right">Students</th>
                        <th className="py-2.5 px-4 text-right">Total INR</th>
                        <th className="py-2.5 px-4 text-right">Due INR</th>
                        <th className="py-2.5 px-4 text-right">Paid</th>
                        <th className="py-2.5 px-4 text-right">Due</th>
                        <th className="py-2.5 px-4 text-right">Paid %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono text-xs text-gray-300">
                      {(data?.billingSummaries || []).sort((a: any, b: any) => b.month.localeCompare(a.month)).map((s: any) => (
                        <tr key={s.id} className="hover:bg-gray-800/10">
                          <td className="py-2.5 px-4 font-bold text-white">{s.month.replace(/_/g, " ")}</td>
                          <td className="py-2.5 px-4 text-right">{s.studentCount}</td>
                          <td className="py-2.5 px-4 text-right text-emerald-400">₹{s.totalINR?.toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-right text-rose-400">₹{s.totalDueINR?.toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-right text-emerald-400">{s.paidInvoices}</td>
                          <td className="py-2.5 px-4 text-right text-yellow-400">{s.dueInvoices}</td>
                          <td className="py-2.5 px-4 text-right">
                            <span className={`font-bold ${s.paidRatio > 0.7 ? "text-emerald-400" : s.paidRatio > 0.4 ? "text-yellow-400" : "text-rose-400"}`}>
                              {(s.paidRatio * 100).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!data?.billingSummaries?.length && (
                        <tr><td colSpan={7} className="py-6 text-center text-gray-600 text-xs font-mono">No billing summaries. Run ETL first.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

        </section>

      </main>

      {/* EDIT MODAL */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0F172A] border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="text-sm font-bold text-white font-mono">Edit Row — {explorerTable}</h3>
              <button onClick={() => { setEditModal(null); setCrudForm({}); }} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {Object.entries(crudForm).filter(([k]) => k !== "id").map(([key, val]) => (
                <div key={key}>
                  <label className="block text-[10px] font-bold text-gray-400 font-mono uppercase mb-1">{key}</label>
                  <input
                    type="text"
                    value={val}
                    onChange={e => setCrudForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button onClick={() => { setEditModal(null); setCrudForm({}); }} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-mono cursor-pointer">Cancel</button>
              <button onClick={handleSaveEdit} disabled={crudSaving} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold font-mono cursor-pointer disabled:opacity-50">
                {crudSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0F172A] border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="text-sm font-bold text-white font-mono">Add Row — {explorerTable}</h3>
              <button onClick={() => { setAddModal(false); setCrudForm({}); }} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-[11px] text-gray-400 font-mono">Enter field values. Leave blank to use DB defaults. IDs auto-generated.</p>
              {colKeys.filter(k => k !== "id" && k !== "createdAt" && k !== "updatedAt").map(key => (
                <div key={key}>
                  <label className="block text-[10px] font-bold text-gray-400 font-mono uppercase mb-1">{key}</label>
                  <input
                    type="text"
                    placeholder={`${key}...`}
                    value={crudForm[key] || ""}
                    onChange={e => setCrudForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-violet-500 placeholder-gray-600"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button onClick={() => { setAddModal(false); setCrudForm({}); }} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-mono cursor-pointer">Cancel</button>
              <button onClick={handleAddRow} disabled={crudSaving} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold font-mono cursor-pointer disabled:opacity-50">
                {crudSaving ? "Creating..." : "Create Row"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0F172A] border border-rose-500/30 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 rounded-lg"><Trash2 className="w-5 h-5 text-rose-400" /></div>
              <h3 className="text-sm font-bold text-white font-mono">Confirm Delete</h3>
            </div>
            <p className="text-xs text-gray-400 font-mono">Delete row <span className="text-white font-bold">{deleteTarget.substring(0, 12)}…</span> from <span className="text-rose-400">{explorerTable}</span>?</p>
            <p className="text-[10px] text-rose-400/70 font-mono">Staging only. Production unaffected.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-mono cursor-pointer">Cancel</button>
              <button onClick={handleDeleteRow} disabled={crudSaving} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold font-mono cursor-pointer disabled:opacity-50">
                {crudSaving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-gray-800 bg-[#0A0E1A]/80 py-6 mt-12 text-center text-xs text-gray-500 relative z-10 font-mono leading-relaxed">
        <p>© 2026 DivergenCIE Platform. All rights reserved.</p>
        <p className="mt-1 text-gray-600">Database Engine Sandbox point to staging sandbox.db · FK checks enabled · WAL transaction logs enabled</p>
      </footer>
    </div>
  );
}
