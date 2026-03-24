import { useState, useEffect, useCallback, useRef } from "react";
import * as d3 from "d3";

// ================================================================
// BIZUSIZO GOVERNANCE DASHBOARD v1.0
// Healthcare-grade ops dashboard for four-pillar monitoring
// ================================================================

const API_BASE = ""; // Set to your Railway URL in production
const REFRESH_INTERVAL = 30000; // 30s auto-refresh

// ================================================================
// DESIGN SYSTEM
// ================================================================
const theme = {
  bg: "#0a0e17",
  bgCard: "#111827",
  bgCardHover: "#1a2235",
  bgInput: "#0d1321",
  border: "#1e293b",
  borderFocus: "#3b82f6",
  text: "#e2e8f0",
  textMuted: "#64748b",
  textDim: "#475569",
  accent: "#3b82f6",
  accentGlow: "rgba(59,130,246,0.15)",

  // Severity palette
  critical: "#ef4444",
  criticalBg: "rgba(239,68,68,0.08)",
  criticalGlow: "rgba(239,68,68,0.3)",
  high: "#f97316",
  highBg: "rgba(249,115,22,0.08)",
  medium: "#eab308",
  mediumBg: "rgba(234,179,8,0.08)",
  info: "#22c55e",
  infoBg: "rgba(34,197,94,0.08)",
  nominal: "#10b981",
  nominalGlow: "rgba(16,185,129,0.25)",

  // Pillar colors
  systemIntegrity: "#06b6d4",
  clinicalPerformance: "#8b5cf6",
  strategicLifecycle: "#f59e0b",
  incidentManagement: "#ef4444",

  radius: "6px",
  radiusLg: "10px",
  font: "'IBM Plex Mono', 'JetBrains Mono', monospace",
  fontSans: "'IBM Plex Sans', -apple-system, sans-serif",
};

const severityColors = {
  CRITICAL: theme.critical,
  HIGH: theme.high,
  MEDIUM: theme.medium,
  LOW: theme.info,
  INFO: theme.info,
};

const pillarColors = {
  system_integrity: theme.systemIntegrity,
  clinical_performance: theme.clinicalPerformance,
  strategic_lifecycle: theme.strategicLifecycle,
  incident_management: theme.incidentManagement,
};

const pillarLabels = {
  system_integrity: "System Integrity",
  clinical_performance: "Clinical Performance",
  strategic_lifecycle: "Strategic Lifecycle",
  incident_management: "Incident Management",
};

// ================================================================
// API HELPER
// ================================================================
async function api(path, opts = {}) {
  const password = window.__GOV_PASSWORD || "";
  const method = opts.method || "GET";
  const headers = { "x-dashboard-password": password, "Content-Type": "application/json" };
  const url = `${API_BASE}${path}`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (e) {
    console.error(`API ${method} ${path}:`, e);
    return null;
  }
}

// ================================================================
// COMPONENTS
// ================================================================

function Pulse({ color, size = 8 }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: size * 3, height: size * 2, verticalAlign: "middle" }}>
      <span style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: size, height: size, borderRadius: "50%", background: color, zIndex: 2,
      }} />
      <span style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: size * 2.5, height: size * 2.5, borderRadius: "50%",
        background: color, opacity: 0.2,
        animation: "pulse-ring 2s ease-out infinite",
      }} />
    </span>
  );
}

function SeverityBadge({ severity, small }) {
  const color = severityColors[severity] || theme.textMuted;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: small ? "1px 6px" : "2px 10px",
      borderRadius: 99, fontSize: small ? 10 : 11, fontWeight: 600,
      fontFamily: theme.font, letterSpacing: "0.05em",
      color, border: `1px solid ${color}33`, background: `${color}10`,
    }}>
      {severity === "CRITICAL" && <Pulse color={color} size={5} />}
      {severity}
    </span>
  );
}

function PillarBadge({ pillar }) {
  const color = pillarColors[pillar] || theme.textMuted;
  const label = pillarLabels[pillar] || pillar;
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      fontSize: 10, fontWeight: 500, fontFamily: theme.font,
      color, background: `${color}15`, letterSpacing: "0.03em",
    }}>
      {label}
    </span>
  );
}

function Card({ children, style, glow }) {
  return (
    <div style={{
      background: theme.bgCard, borderRadius: theme.radiusLg,
      border: `1px solid ${theme.border}`, padding: 20,
      boxShadow: glow ? `0 0 30px ${glow}` : "0 1px 3px rgba(0,0,0,0.3)",
      transition: "box-shadow 0.3s", ...style,
    }}>
      {children}
    </div>
  );
}

function StatBox({ label, value, color, sub }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontFamily: theme.font, fontSize: 28, fontWeight: 700,
        color: color || theme.text, lineHeight: 1.1,
        textShadow: color ? `0 0 20px ${color}44` : "none",
      }}>
        {value}
      </div>
      <div style={{ fontFamily: theme.fontSans, fontSize: 11, color: theme.textMuted, marginTop: 4, letterSpacing: "0.03em" }}>
        {label}
      </div>
      {sub && <div style={{ fontFamily: theme.font, fontSize: 10, color: theme.textDim, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ icon, title, pillarColor, action }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: 16, paddingBottom: 10,
      borderBottom: `1px solid ${theme.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          fontSize: 16, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 6, background: pillarColor ? `${pillarColor}15` : theme.accentGlow,
        }}>{icon}</span>
        <span style={{
          fontFamily: theme.fontSans, fontSize: 15, fontWeight: 600,
          color: theme.text, letterSpacing: "-0.01em",
        }}>{title}</span>
      </div>
      {action}
    </div>
  );
}

function Btn({ children, onClick, variant = "default", small, disabled, style: sx }) {
  const variants = {
    default: { bg: theme.bgInput, color: theme.text, border: theme.border, hoverBg: theme.bgCardHover },
    primary: { bg: theme.accent, color: "#fff", border: theme.accent, hoverBg: "#2563eb" },
    danger: { bg: "transparent", color: theme.critical, border: `${theme.critical}44`, hoverBg: theme.criticalBg },
    ghost: { bg: "transparent", color: theme.textMuted, border: "transparent", hoverBg: theme.bgCardHover },
  };
  const v = variants[variant];
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: theme.font, fontSize: small ? 11 : 12, fontWeight: 500,
        padding: small ? "4px 10px" : "6px 14px",
        borderRadius: theme.radius, cursor: disabled ? "not-allowed" : "pointer",
        border: `1px solid ${v.border}`,
        background: hov && !disabled ? v.hoverBg : v.bg,
        color: disabled ? theme.textDim : v.color,
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s", letterSpacing: "0.02em", ...sx,
      }}
    >
      {children}
    </button>
  );
}

function TimeAgo({ date }) {
  if (!date) return <span style={{ color: theme.textDim }}>—</span>;
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);
  let text;
  if (diff < 60) text = "just now";
  else if (diff < 3600) text = `${Math.floor(diff / 60)}m ago`;
  else if (diff < 86400) text = `${Math.floor(diff / 3600)}h ago`;
  else text = `${Math.floor(diff / 86400)}d ago`;

  return (
    <span style={{ fontFamily: theme.font, fontSize: 11, color: theme.textDim }} title={new Date(date).toLocaleString()}>
      {text}
    </span>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{
      padding: 32, textAlign: "center", color: theme.textDim,
      fontFamily: theme.fontSans, fontSize: 13, fontStyle: "italic",
    }}>
      {message}
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, background: theme.bgInput, borderRadius: 8, padding: 3, marginBottom: 20 }}>
      {tabs.map(t => (
        <button
          key={t.key} onClick={() => onChange(t.key)}
          style={{
            flex: 1, fontFamily: theme.fontSans, fontSize: 12, fontWeight: active === t.key ? 600 : 400,
            padding: "8px 12px", borderRadius: 6, border: "none", cursor: "pointer",
            background: active === t.key ? theme.bgCard : "transparent",
            color: active === t.key ? theme.text : theme.textMuted,
            boxShadow: active === t.key ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
            transition: "all 0.15s",
          }}
        >
          <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
        </button>
      ))}
    </div>
  );
}

// ================================================================
// LOGIN SCREEN
// ================================================================
function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setErr(false);
    window.__GOV_PASSWORD = pw;
    const test = await api("/api/governance/status");
    setLoading(false);
    if (test) {
      onLogin(pw);
    } else {
      setErr(true);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: theme.bg, fontFamily: theme.fontSans,
    }}>
      <Card style={{ width: 380, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>🏥</div>
        <div style={{ fontFamily: theme.font, fontSize: 18, fontWeight: 700, color: theme.text, letterSpacing: "-0.02em" }}>
          BIZUSIZO
        </div>
        <div style={{ fontFamily: theme.font, fontSize: 11, color: theme.textMuted, marginBottom: 24, letterSpacing: "0.06em" }}>
          GOVERNANCE DASHBOARD
        </div>

        <input
          type="password" placeholder="Dashboard password" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: theme.radius,
            border: `1px solid ${err ? theme.critical : theme.border}`,
            background: theme.bgInput, color: theme.text,
            fontFamily: theme.font, fontSize: 13, boxSizing: "border-box",
            outline: "none", marginBottom: 12,
          }}
        />
        {err && <div style={{ color: theme.critical, fontSize: 12, marginBottom: 8 }}>Authentication failed</div>}

        <Btn variant="primary" onClick={handleLogin} disabled={loading || !pw} style={{ width: "100%" }}>
          {loading ? "Verifying..." : "Authenticate"}
        </Btn>
      </Card>
    </div>
  );
}

// ================================================================
// SYSTEM STATUS HEADER
// ================================================================
function SystemStatusBar({ status, lastRefresh }) {
  if (!status) return null;
  const isFailsafe = status.system_integrity?.failsafe_active;
  const openAlerts = status.open_alerts?.length || 0;
  const openIncidents = status.open_incidents?.length || 0;
  const criticalAlerts = (status.open_alerts || []).filter(a => a.severity === "CRITICAL").length;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 20px", marginBottom: 20,
      background: isFailsafe ? theme.criticalBg : theme.bgCard,
      borderRadius: theme.radiusLg,
      border: `1px solid ${isFailsafe ? `${theme.critical}44` : theme.border}`,
      boxShadow: isFailsafe ? `0 0 40px ${theme.criticalGlow}` : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Pulse color={isFailsafe ? theme.critical : theme.nominal} size={6} />
          <span style={{
            fontFamily: theme.font, fontSize: 13, fontWeight: 700,
            color: isFailsafe ? theme.critical : theme.nominal,
            letterSpacing: "0.06em",
          }}>
            {isFailsafe ? "FAILSAFE ACTIVE" : "NOMINAL"}
          </span>
        </div>

        <div style={{ width: 1, height: 20, background: theme.border }} />

        <div style={{ display: "flex", gap: 20 }}>
          <span style={{ fontFamily: theme.font, fontSize: 11, color: criticalAlerts > 0 ? theme.critical : theme.textMuted }}>
            {criticalAlerts > 0 && "⚠ "}{openAlerts} alert{openAlerts !== 1 ? "s" : ""}
          </span>
          <span style={{ fontFamily: theme.font, fontSize: 11, color: openIncidents > 0 ? theme.high : theme.textMuted }}>
            {openIncidents} incident{openIncidents !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: theme.font, fontSize: 10, color: theme.textDim }}>
          Last refresh: <TimeAgo date={lastRefresh} />
        </span>
        <span style={{
          fontFamily: theme.font, fontSize: 10, padding: "2px 8px",
          borderRadius: 4, background: `${theme.accent}15`, color: theme.accent,
        }}>
          v2.2
        </span>
      </div>
    </div>
  );
}

// ================================================================
// PILLAR 1: SYSTEM INTEGRITY PANEL
// ================================================================
function SystemIntegrityPanel({ status }) {
  const si = status?.system_integrity;
  if (!si) return null;
  const cw = si.current_window;

  return (
    <Card glow={si.failsafe_active ? theme.criticalGlow : null}>
      <SectionHeader icon="⚡" title="System Integrity" pillarColor={theme.systemIntegrity} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 16 }}>
        <StatBox label="API Error Rate" value={cw?.api_error_rate || "—"} color={parseFloat(cw?.api_error_rate) > 10 ? theme.critical : theme.nominal} />
        <StatBox label="WA Fail Rate" value={cw?.whatsapp_fail_rate || "—"} color={parseFloat(cw?.whatsapp_fail_rate) > 10 ? theme.high : theme.nominal} />
        <StatBox label="Inference Errors" value={cw?.inference_errors ?? "—"} color={cw?.inference_errors > 0 ? theme.medium : theme.nominal} />
        <StatBox label="Triage Fallbacks" value={cw?.triage_fallbacks ?? "—"} color={cw?.triage_fallbacks > 0 ? theme.high : theme.nominal} />
        <StatBox label="Total Requests" value={cw?.total_requests ?? "—"} />
      </div>

      <div style={{
        padding: "10px 14px", borderRadius: theme.radius,
        background: si.failsafe_active ? theme.criticalBg : theme.infoBg,
        border: `1px solid ${si.failsafe_active ? `${theme.critical}33` : `${theme.info}22`}`,
        fontFamily: theme.font, fontSize: 11,
        color: si.failsafe_active ? theme.critical : theme.info,
      }}>
        {si.failsafe_active
          ? "🛑 AI API unreachable — deterministic RED classifier active. Non-RED cases showing category menu."
          : "✓ AI triage pipeline operational. Deterministic failsafe on standby."
        }
        <span style={{ float: "right", color: theme.textDim }}>
          {si.consecutive_api_failures} consecutive failures
        </span>
      </div>
    </Card>
  );
}

// ================================================================
// ALERTS TABLE
// ================================================================
function AlertsPanel({ alerts, onResolve }) {
  const [filter, setFilter] = useState("all");
  const filtered = (alerts || []).filter(a => {
    if (filter === "all") return true;
    return a.pillar === filter;
  });

  return (
    <Card>
      <SectionHeader icon="🔔" title="Active Alerts" pillarColor={theme.accent}
        action={<span style={{ fontFamily: theme.font, fontSize: 11, color: theme.textMuted }}>{filtered.length} active</span>}
      />

      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {["all", "system_integrity", "clinical_performance", "strategic_lifecycle", "incident_management"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            fontFamily: theme.font, fontSize: 10, padding: "3px 8px", borderRadius: 4,
            border: "1px solid " + (filter === f ? theme.accent : theme.border),
            background: filter === f ? theme.accentGlow : "transparent",
            color: filter === f ? theme.accent : theme.textMuted,
            cursor: "pointer",
          }}>
            {f === "all" ? "All" : pillarLabels[f]?.split(" ")[0]}
          </button>
        ))}
      </div>

      <div style={{ maxHeight: 340, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <EmptyState message="No active alerts — all systems clear" />
        ) : filtered.map((a, i) => (
          <div key={a.id || i} style={{
            display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0",
            borderBottom: i < filtered.length - 1 ? `1px solid ${theme.border}` : "none",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                <SeverityBadge severity={a.severity} small />
                <PillarBadge pillar={a.pillar} />
                <TimeAgo date={a.created_at} />
              </div>
              <div style={{
                fontFamily: theme.fontSans, fontSize: 12, color: theme.text,
                lineHeight: 1.4, wordBreak: "break-word",
              }}>
                {a.message}
              </div>
              {a.assigned_to && (
                <div style={{ fontFamily: theme.font, fontSize: 10, color: theme.textDim, marginTop: 3 }}>
                  → {a.assigned_to}
                </div>
              )}
            </div>
            <Btn small variant="ghost" onClick={() => onResolve(a.id)}>Resolve</Btn>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ================================================================
// INCIDENTS TABLE
// ================================================================
function IncidentsPanel({ incidents, onReport }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    severity_level: 1, description: "", reporter: "",
    triage_level_given: "", triage_level_correct: "",
  });

  const handleSubmit = async () => {
    await onReport({ ...form, severity_level: parseInt(form.severity_level) });
    setShowForm(false);
    setForm({ severity_level: 1, description: "", reporter: "", triage_level_given: "", triage_level_correct: "" });
  };

  const levelNames = { 1: "Near Miss", 2: "Minor Harm", 3: "Moderate Harm", 4: "Serious Harm / Death" };
  const levelColors = { 1: theme.info, 2: theme.medium, 3: theme.high, 4: theme.critical };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "8px 10px",
    borderRadius: theme.radius, border: `1px solid ${theme.border}`,
    background: theme.bgInput, color: theme.text,
    fontFamily: theme.font, fontSize: 12, outline: "none",
  };

  return (
    <Card>
      <SectionHeader icon="🚨" title="Incident Management" pillarColor={theme.incidentManagement}
        action={<Btn small variant="danger" onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Report Incident"}</Btn>}
      />

      {showForm && (
        <div style={{
          padding: 16, marginBottom: 16, borderRadius: theme.radius,
          background: theme.bgInput, border: `1px solid ${theme.border}`,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontFamily: theme.font, fontSize: 10, color: theme.textMuted, display: "block", marginBottom: 4 }}>
                Severity Level
              </label>
              <select value={form.severity_level} onChange={e => setForm({...form, severity_level: e.target.value})} style={inputStyle}>
                {[1,2,3,4].map(l => <option key={l} value={l}>L{l} — {levelNames[l]}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: theme.font, fontSize: 10, color: theme.textMuted, display: "block", marginBottom: 4 }}>
                Reporter
              </label>
              <input placeholder="Name / role" value={form.reporter} onChange={e => setForm({...form, reporter: e.target.value})} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontFamily: theme.font, fontSize: 10, color: theme.textMuted, display: "block", marginBottom: 4 }}>
              Description
            </label>
            <textarea rows={3} placeholder="What happened?" value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontFamily: theme.font, fontSize: 10, color: theme.textMuted, display: "block", marginBottom: 4 }}>
                Triage Level Given
              </label>
              <select value={form.triage_level_given} onChange={e => setForm({...form, triage_level_given: e.target.value})} style={inputStyle}>
                <option value="">—</option>
                {["RED","ORANGE","YELLOW","GREEN"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: theme.font, fontSize: 10, color: theme.textMuted, display: "block", marginBottom: 4 }}>
                Correct Triage Level
              </label>
              <select value={form.triage_level_correct} onChange={e => setForm({...form, triage_level_correct: e.target.value})} style={inputStyle}>
                <option value="">—</option>
                {["RED","ORANGE","YELLOW","GREEN"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <Btn variant="danger" onClick={handleSubmit} disabled={!form.description}>
            {parseInt(form.severity_level) >= 3 ? "🛑 Submit & Trigger Stop-Work" : "Submit Incident Report"}
          </Btn>
        </div>
      )}

      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {(!incidents || incidents.length === 0) ? (
          <EmptyState message="No open incidents" />
        ) : incidents.map((inc, i) => (
          <div key={inc.id || i} style={{
            display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0",
            borderBottom: i < incidents.length - 1 ? `1px solid ${theme.border}` : "none",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: theme.font, fontSize: 14, fontWeight: 800, flexShrink: 0,
              background: `${levelColors[inc.severity_level]}15`, color: levelColors[inc.severity_level],
              border: `1px solid ${levelColors[inc.severity_level]}33`,
            }}>
              L{inc.severity_level}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: theme.fontSans, fontSize: 12, color: theme.text, marginBottom: 2 }}>
                {inc.description?.slice(0, 120)}{inc.description?.length > 120 ? "…" : ""}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontFamily: theme.font, fontSize: 10, color: theme.textDim }}>{inc.severity_name}</span>
                {inc.status === "stop_work_review" && (
                  <span style={{
                    fontFamily: theme.font, fontSize: 10, padding: "1px 6px", borderRadius: 3,
                    background: theme.criticalBg, color: theme.critical, border: `1px solid ${theme.critical}33`,
                  }}>STOP-WORK</span>
                )}
                <TimeAgo date={inc.created_at} />
                {inc.reporter && <span style={{ fontFamily: theme.font, fontSize: 10, color: theme.textDim }}>by {inc.reporter}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ================================================================
// AUDITS PANEL
// ================================================================
function AuditsPanel({ audits, onRunAudit }) {
  return (
    <Card>
      <SectionHeader icon="📋" title="Monthly Conversation Audits" pillarColor={theme.incidentManagement}
        action={<Btn small onClick={onRunAudit}>Trigger Audit</Btn>}
      />

      {(!audits || audits.length === 0) ? (
        <EmptyState message="No audits yet — trigger one or wait for the 1st of the month" />
      ) : audits.slice(0, 6).map((a, i) => (
        <div key={a.id || i} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 0", borderBottom: i < Math.min(audits.length, 6) - 1 ? `1px solid ${theme.border}` : "none",
        }}>
          <div>
            <div style={{ fontFamily: theme.font, fontSize: 13, color: theme.text }}>
              {a.audit_month || "—"}
            </div>
            <div style={{ fontFamily: theme.font, fontSize: 11, color: theme.textMuted }}>
              {a.sample_size} / {a.total_population} conversations sampled
            </div>
          </div>
          <span style={{
            fontFamily: theme.font, fontSize: 10, padding: "3px 8px", borderRadius: 4,
            background: a.status === "reviewed" ? theme.infoBg : theme.mediumBg,
            color: a.status === "reviewed" ? theme.info : theme.medium,
            border: `1px solid ${a.status === "reviewed" ? `${theme.info}33` : `${theme.medium}33`}`,
          }}>
            {a.status === "reviewed" ? "✓ Reviewed" : "Pending Review"}
          </span>
        </div>
      ))}
    </Card>
  );
}

// ================================================================
// REVIEWS PANEL
// ================================================================
function ReviewsPanel({ reviews }) {
  const decisionColors = {
    continue: theme.info, retrain: theme.medium, reprompt: theme.high,
    retire_pathway: theme.critical, rollback: theme.critical,
  };

  return (
    <Card>
      <SectionHeader icon="📅" title="Lifecycle Reviews" pillarColor={theme.strategicLifecycle} />

      {(!reviews || reviews.length === 0) ? (
        <EmptyState message="No lifecycle reviews scheduled yet — set GOV_DEPLOYMENT_DATE in Railway" />
      ) : reviews.map((r, i) => (
        <div key={r.id || i} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 0", borderBottom: i < reviews.length - 1 ? `1px solid ${theme.border}` : "none",
        }}>
          <div>
            <div style={{ fontFamily: theme.fontSans, fontSize: 13, color: theme.text }}>
              {r.review_type === "90_day" ? "90-Day Review" : `Annual Review #${r.review_number}`}
            </div>
            <div style={{ fontFamily: theme.font, fontSize: 11, color: theme.textMuted }}>
              Day {r.days_since_deployment} · {r.status}
            </div>
          </div>
          {r.decision && (
            <span style={{
              fontFamily: theme.font, fontSize: 11, padding: "3px 10px", borderRadius: 4,
              color: decisionColors[r.decision] || theme.text,
              background: `${decisionColors[r.decision] || theme.text}15`,
              border: `1px solid ${decisionColors[r.decision] || theme.text}33`,
            }}>
              {r.decision}
            </span>
          )}
        </div>
      ))}
    </Card>
  );
}

// ================================================================
// METRICS CHART (D3)
// ================================================================
function MetricsChart({ metrics }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!metrics || metrics.length === 0 || !svgRef.current) return;

    const integrityMetrics = metrics.filter(m => m.metric_type === "system_integrity_window" && m.data);
    if (integrityMetrics.length < 2) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 600, height = 180, margin = { top: 16, right: 16, bottom: 28, left: 40 };
    const inner = { w: width - margin.left - margin.right, h: height - margin.top - margin.bottom };

    const data = integrityMetrics.map(m => ({
      time: new Date(m.created_at),
      errorRate: m.data.api_calls > 0 ? (m.data.api_failures / m.data.api_calls * 100) : 0,
      requests: m.data.total_requests || 0,
    }));

    const x = d3.scaleTime().domain(d3.extent(data, d => d.time)).range([0, inner.w]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.errorRate) || 5]).range([inner.h, 0]);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Grid
    g.append("g").call(d3.axisLeft(y).ticks(4).tickSize(-inner.w))
      .call(g => g.selectAll(".tick line").attr("stroke", theme.border).attr("stroke-dasharray", "2,3"))
      .call(g => g.selectAll(".tick text").attr("fill", theme.textDim).attr("font-size", 9).attr("font-family", theme.font))
      .call(g => g.select(".domain").remove());

    g.append("g").attr("transform", `translate(0,${inner.h})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat("%H:%M")))
      .call(g => g.selectAll(".tick text").attr("fill", theme.textDim).attr("font-size", 9).attr("font-family", theme.font))
      .call(g => g.select(".domain").attr("stroke", theme.border));

    // Area
    const area = d3.area().x(d => x(d.time)).y0(inner.h).y1(d => y(d.errorRate)).curve(d3.curveMonotoneX);
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient").attr("id", "area-grad").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 1);
    gradient.append("stop").attr("offset", "0%").attr("stop-color", theme.systemIntegrity).attr("stop-opacity", 0.3);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", theme.systemIntegrity).attr("stop-opacity", 0);

    g.append("path").datum(data).attr("d", area).attr("fill", "url(#area-grad)");

    // Line
    const line = d3.line().x(d => x(d.time)).y(d => y(d.errorRate)).curve(d3.curveMonotoneX);
    g.append("path").datum(data).attr("d", line).attr("fill", "none").attr("stroke", theme.systemIntegrity).attr("stroke-width", 1.5);

    // Label
    g.append("text").attr("x", 4).attr("y", -4).attr("fill", theme.textMuted)
      .attr("font-size", 10).attr("font-family", theme.font).text("API Error Rate (%)");

  }, [metrics]);

  return (
    <Card>
      <SectionHeader icon="📈" title="System Metrics (Last 30 Days)" pillarColor={theme.systemIntegrity} />
      {(!metrics || metrics.length < 2) ? (
        <EmptyState message="Not enough data points yet — metrics populate as the system runs" />
      ) : (
        <svg ref={svgRef} viewBox="0 0 600 180" style={{ width: "100%", height: "auto" }} />
      )}
    </Card>
  );
}

// ================================================================
// BASELINES PANEL
// ================================================================
function BaselinesPanel() {
  const [form, setForm] = useState({
    ppv_red: "", ppv_orange: "", ppv_yellow: "", ppv_green: "",
    sens_red: "", sens_orange: "", sens_yellow: "", sens_green: "",
    concordance: "", set_by: "",
  });
  const [saved, setSaved] = useState(false);

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "6px 8px",
    borderRadius: theme.radius, border: `1px solid ${theme.border}`,
    background: theme.bgInput, color: theme.text,
    fontFamily: theme.font, fontSize: 12, outline: "none", textAlign: "center",
  };

  const handleSave = async () => {
    const body = {
      ppv: { RED: parseFloat(form.ppv_red) || null, ORANGE: parseFloat(form.ppv_orange) || null, YELLOW: parseFloat(form.ppv_yellow) || null, GREEN: parseFloat(form.ppv_green) || null },
      sensitivity: { RED: parseFloat(form.sens_red) || null, ORANGE: parseFloat(form.sens_orange) || null, YELLOW: parseFloat(form.sens_yellow) || null, GREEN: parseFloat(form.sens_green) || null },
      concordance: parseFloat(form.concordance) || null,
      set_by: form.set_by || "dashboard",
    };
    const result = await api("/api/governance/baselines", { method: "POST", body });
    if (result?.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const LevelCell = ({ label, color, ppvKey, sensKey }) => (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontFamily: theme.font, fontSize: 11, fontWeight: 700, color,
        marginBottom: 6, letterSpacing: "0.04em",
      }}>{label}</div>
      <input placeholder="PPV" value={form[ppvKey]} onChange={e => setForm({ ...form, [ppvKey]: e.target.value })} style={{ ...inputStyle, marginBottom: 4 }} />
      <input placeholder="Sens." value={form[sensKey]} onChange={e => setForm({ ...form, [sensKey]: e.target.value })} style={inputStyle} />
    </div>
  );

  return (
    <Card>
      <SectionHeader icon="🎯" title="Set Validation Baselines" pillarColor={theme.clinicalPerformance} />

      <div style={{ fontFamily: theme.fontSans, fontSize: 12, color: theme.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
        Enter your pre-deployment validation values (0–1). Statistical monitoring will flag deviations outside the 75–125% acceptance band.
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <div style={{ width: 60, paddingTop: 20 }}>
          <div style={{ fontFamily: theme.font, fontSize: 10, color: theme.textMuted, height: 28, display: "flex", alignItems: "flex-end" }}>PPV</div>
          <div style={{ fontFamily: theme.font, fontSize: 10, color: theme.textMuted, height: 32, display: "flex", alignItems: "flex-end" }}>Sensitivity</div>
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          <LevelCell label="RED" color={theme.critical} ppvKey="ppv_red" sensKey="sens_red" />
          <LevelCell label="ORANGE" color={theme.high} ppvKey="ppv_orange" sensKey="sens_orange" />
          <LevelCell label="YELLOW" color={theme.medium} ppvKey="ppv_yellow" sensKey="sens_yellow" />
          <LevelCell label="GREEN" color={theme.info} ppvKey="ppv_green" sensKey="sens_green" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12, marginBottom: 14 }}>
        <div>
          <label style={{ fontFamily: theme.font, fontSize: 10, color: theme.textMuted, display: "block", marginBottom: 4 }}>
            Overall Concordance
          </label>
          <input placeholder="e.g. 0.87" value={form.concordance} onChange={e => setForm({ ...form, concordance: e.target.value })} style={{ ...inputStyle, textAlign: "left" }} />
        </div>
        <div>
          <label style={{ fontFamily: theme.font, fontSize: 10, color: theme.textMuted, display: "block", marginBottom: 4 }}>
            Set by
          </label>
          <input placeholder="e.g. initial_validation" value={form.set_by} onChange={e => setForm({ ...form, set_by: e.target.value })} style={{ ...inputStyle, textAlign: "left" }} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Btn variant="primary" onClick={handleSave}>Save Baselines</Btn>
        {saved && <span style={{ fontFamily: theme.font, fontSize: 11, color: theme.info }}>✓ Baselines saved and loaded</span>}
      </div>
    </Card>
  );
}

// ================================================================
// MAIN APP
// ================================================================
export default function GovernanceDashboard() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState("overview");
  const [status, setStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [audits, setAudits] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(async () => {
    const [s, a, inc, aud, rev, met] = await Promise.all([
      api("/api/governance/status"),
      api("/api/governance/alerts?resolved=false&limit=30"),
      api("/api/governance/incidents?status=open&limit=20"),
      api("/api/governance/audits?limit=10"),
      api("/api/governance/reviews"),
      api("/api/governance/metrics?days=30"),
    ]);

    if (s) { setStatus(s); setAlerts(s.open_alerts || []); setIncidents(s.open_incidents || []); }
    if (a?.alerts) setAlerts(a.alerts);
    if (inc?.incidents) setIncidents(inc.incidents);
    if (aud?.audits) setAudits(aud.audits);
    if (rev?.reviews) setReviews(rev.reviews);
    if (met?.metrics) setMetrics(met.metrics);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [authed, fetchAll]);

  const handleResolveAlert = async (id) => {
    await api(`/api/governance/alerts/${id}/resolve`, { method: "PUT", body: { resolved_by: "dashboard" } });
    fetchAll();
  };

  const handleReportIncident = async (data) => {
    await api("/api/governance/incidents", { method: "POST", body: data });
    fetchAll();
  };

  const handleRunAudit = async () => {
    await api("/api/governance/audit/run", { method: "POST" });
    fetchAll();
  };

  if (!authed) {
    return <LoginScreen onLogin={(pw) => { window.__GOV_PASSWORD = pw; setAuthed(true); }} />;
  }

  const tabs = [
    { key: "overview", icon: "◉", label: "Overview" },
    { key: "alerts", icon: "🔔", label: "Alerts" },
    { key: "incidents", icon: "🚨", label: "Incidents" },
    { key: "audits", icon: "📋", label: "Audits & Reviews" },
    { key: "settings", icon: "⚙", label: "Settings" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: theme.bg, color: theme.text,
      fontFamily: theme.fontSans, padding: 24,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${theme.bgInput}; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${theme.textDim}; }
        @keyframes pulse-ring {
          0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0.4; }
          100% { transform: translate(-50%,-50%) scale(1.2); opacity: 0; }
        }
        select option { background: ${theme.bgCard}; color: ${theme.text}; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🏥</span>
            <div>
              <div style={{ fontFamily: theme.font, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>BIZUSIZO</div>
              <div style={{ fontFamily: theme.font, fontSize: 10, color: theme.textMuted, letterSpacing: "0.08em" }}>GOVERNANCE FRAMEWORK</div>
            </div>
          </div>
          <Btn variant="ghost" small onClick={() => { window.__GOV_PASSWORD = ""; setAuthed(false); }}>Logout</Btn>
        </div>

        <SystemStatusBar status={status} lastRefresh={lastRefresh} />
        <TabBar tabs={tabs} active={tab} onChange={setTab} />

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SystemIntegrityPanel status={status} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <AlertsPanel alerts={alerts} onResolve={handleResolveAlert} />
              <IncidentsPanel incidents={incidents} onReport={handleReportIncident} />
            </div>
            <MetricsChart metrics={metrics} />
          </div>
        )}

        {/* ALERTS */}
        {tab === "alerts" && (
          <AlertsPanel alerts={alerts} onResolve={handleResolveAlert} />
        )}

        {/* INCIDENTS */}
        {tab === "incidents" && (
          <IncidentsPanel incidents={incidents} onReport={handleReportIncident} />
        )}

        {/* AUDITS & REVIEWS */}
        {tab === "audits" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <AuditsPanel audits={audits} onRunAudit={handleRunAudit} />
            <ReviewsPanel reviews={reviews} />
          </div>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <BaselinesPanel />
        )}

        {/* Footer */}
        <div style={{
          marginTop: 32, paddingTop: 16, borderTop: `1px solid ${theme.border}`,
          fontFamily: theme.font, fontSize: 10, color: theme.textDim,
          display: "flex", justifyContent: "space-between",
        }}>
          <span>BIZUSIZO Governance Framework v1.0 · Stanford-adapted four-pillar monitoring</span>
          <span>Auto-refresh every {REFRESH_INTERVAL / 1000}s</span>
        </div>
      </div>
    </div>
  );
}
