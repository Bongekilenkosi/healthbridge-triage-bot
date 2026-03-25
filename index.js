// ============================================================
// BIZUSIZO — PRODUCTION READY v2.3
// + Hardcoded 11-language messages
// + Smart facility routing with patient confirmation
// + Four-Pillar Governance Framework (Stanford-adapted)
// + Patient identity capture (name, surname, DOB, sex)
// + Pre-arrival file preparation system
// + Clinic queue management API
// + Returning vs new patient detection
// + Bug fixes
// Railway + Meta WhatsApp + Supabase + Anthropic
// March 2026
// ============================================================

require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

// Serve governance dashboard as a static file
app.use('/public', express.static(path.join(__dirname, 'public')));

// ================================================================
// GOVERNANCE DASHBOARD — Inline HTML (no external file dependency)
// Vanilla JS — no React, no Babel, no CDN. Maximum reliability.
// ================================================================
app.get('/dashboard', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BIZUSIZO Governance Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0e17;color:#e2e8f0;font-family:-apple-system,sans-serif;padding:20px}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #1e293b}
.header h1{font-size:20px;color:#e2e8f0}
.header .status{padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600}
.nominal{background:rgba(16,185,129,.15);color:#10b981;border:1px solid rgba(16,185,129,.3)}
.degraded{background:rgba(234,179,8,.15);color:#eab308;border:1px solid rgba(234,179,8,.3)}
.critical{background:rgba(239,68,68,.15);color:#ef4444;border:1px solid rgba(239,68,68,.3)}
.tabs{display:flex;gap:8px;margin-bottom:24px}
.tab{padding:8px 16px;border-radius:6px;border:1px solid #1e293b;background:#111827;color:#64748b;cursor:pointer;font-size:13px}
.tab.active{background:#1e293b;color:#e2e8f0;border-color:#3b82f6}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.card{background:#111827;border:1px solid #1e293b;border-radius:10px;padding:16px}
.card .label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
.card .value{font-size:28px;font-weight:700;margin-top:4px}
.card .sub{font-size:12px;color:#64748b;margin-top:4px}
.pillar-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:24px}
.pillar{background:#111827;border:1px solid #1e293b;border-radius:10px;padding:16px;border-left:3px solid}
.pillar h3{font-size:14px;margin-bottom:8px}
.pillar .detail{font-size:12px;color:#64748b;line-height:1.6}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:8px 12px;background:#111827;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #1e293b}
td{padding:8px 12px;border-bottom:1px solid #1e293b}
.badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}
.badge-critical{color:#ef4444;border:1px solid rgba(239,68,68,.3)}
.badge-high{color:#f97316;border:1px solid rgba(249,115,22,.3)}
.badge-medium{color:#eab308;border:1px solid rgba(234,179,8,.3)}
.badge-low{color:#22c55e;border:1px solid rgba(34,197,94,.3)}
.empty{text-align:center;padding:40px;color:#475569}
.login{position:fixed;inset:0;background:#0a0e17;display:flex;align-items:center;justify-content:center;z-index:99}
.login-box{background:#111827;border:1px solid #1e293b;border-radius:10px;padding:32px;width:320px;text-align:center}
.login-box h2{margin-bottom:16px;font-size:18px}
.login-box input{width:100%;padding:10px;border-radius:6px;border:1px solid #1e293b;background:#0d1321;color:#e2e8f0;margin-bottom:12px;font-size:14px}
.login-box button{width:100%;padding:10px;border-radius:6px;border:none;background:#3b82f6;color:white;font-size:14px;cursor:pointer}
.login-box button:hover{background:#2563eb}
.refresh-info{font-size:11px;color:#475569;text-align:right;margin-bottom:8px}
</style>
</head>
<body>

<div id="login" class="login">
  <div class="login-box">
    <h2>BIZUSIZO Governance</h2>
    <p style="color:#64748b;font-size:13px;margin-bottom:16px">Sign in to access the dashboard</p>
    <input type="text" id="uname" placeholder="Your name (e.g. Bongekile)" style="width:100%;padding:10px;border-radius:6px;border:1px solid #1e293b;background:#0d1321;color:#e2e8f0;margin-bottom:8px;font-size:14px">
    <input type="password" id="pwd" placeholder="Password" onkeyup="if(event.key==='Enter')doLogin()">
    <button onclick="doLogin()">Sign in</button>
    <p id="login-err" style="color:#ef4444;font-size:12px;margin-top:8px"></p>
  </div>
</div>

<div id="app" style="display:none">
  <div class="header">
    <h1>BIZUSIZO Governance Dashboard</h1>
    <div>
      <span id="sys-status" class="status nominal">LOADING...</span>
      <span style="color:#475569;font-size:11px;margin-left:12px" id="logged-in-as"></span>
      <span style="color:#475569;font-size:11px;margin-left:12px" id="last-refresh"></span>
    </div>
  </div>

  <div class="tabs">
    <div class="tab active" onclick="showTab('overview',this)">Overview</div>
    <div class="tab" onclick="showTab('alerts',this)">Alerts</div>
    <div class="tab" onclick="showTab('incidents',this)">Incidents</div>
    <div class="tab" onclick="showTab('metrics',this)">Metrics</div>
  </div>

  <div id="tab-overview">
    <div class="grid" id="stat-cards"></div>
    <h3 style="margin-bottom:12px;font-size:14px;color:#64748b">Four-Pillar Status</h3>
    <div class="pillar-grid" id="pillars"></div>
  </div>

  <div id="tab-alerts" style="display:none">
    <div class="card"><table><thead><tr><th>Time</th><th>Severity</th><th>Pillar</th><th>Message</th></tr></thead><tbody id="alerts-body"></tbody></table></div>
  </div>

  <div id="tab-incidents" style="display:none">
    <div class="card"><table><thead><tr><th>Time</th><th>Level</th><th>Description</th><th>Status</th></tr></thead><tbody id="incidents-body"></tbody></table></div>
  </div>

  <div id="tab-metrics" style="display:none">
    <div class="card"><table><thead><tr><th>Time</th><th>Type</th><th>Requests</th><th>Errors</th><th>Error Rate</th></tr></thead><tbody id="metrics-body"></tbody></table></div>
  </div>

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #1e293b;font-size:10px;color:#475569;display:flex;justify-content:space-between">
    <span>BIZUSIZO Governance Framework v1.0 · Stanford-adapted four-pillar monitoring</span>
    <span>Auto-refresh every 30s</span>
  </div>
</div>

<script>
let PWD='';
let UNAME='';
const API='';

async function api(path){
  try{
    const r=await fetch(API+path,{headers:{'x-dashboard-password':PWD,'x-dashboard-user':UNAME}});
    if(!r.ok)throw new Error(r.status);
    return await r.json();
  }catch(e){console.error(path,e);return null;}
}

function doLogin(){
  UNAME=document.getElementById('uname').value.trim();
  PWD=document.getElementById('pwd').value;
  if(!UNAME){document.getElementById('login-err').textContent='Please enter your name';return;}
  api('/api/governance/status').then(d=>{
    if(d){
      document.getElementById('login').style.display='none';
      document.getElementById('app').style.display='block';
      document.getElementById('logged-in-as').textContent='Signed in as: '+UNAME;
      refresh();
    }
    else{document.getElementById('login-err').textContent='Invalid password or server error';}
  });
}

function showTab(name,el){
  document.querySelectorAll('[id^=tab-]').forEach(t=>t.style.display='none');
  document.getElementById('tab-'+name).style.display='block';
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
}

function badge(sev){
  const s=(sev||'').toUpperCase();
  const cls=s==='CRITICAL'?'badge-critical':s==='HIGH'?'badge-high':s==='MEDIUM'?'badge-medium':'badge-low';
  return '<span class="badge '+cls+'">'+s+'</span>';
}

function timeAgo(d){
  if(!d)return '-';
  const s=Math.floor((Date.now()-new Date(d))/1000);
  if(s<60)return s+'s ago';if(s<3600)return Math.floor(s/60)+'m ago';
  if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';
}

async function refresh(){
  const status=await api('/api/governance/status');
  if(!status)return;

  document.getElementById('last-refresh').textContent='Updated '+new Date().toLocaleTimeString();

  // System status badge
  const el=document.getElementById('sys-status');
  const si=status.system_integrity||{};
  if(si.failsafe_active){el.textContent='FAILSAFE';el.className='status critical';}
  else{el.textContent='NOMINAL';el.className='status nominal';}

  // Stat cards
  const w=si.current_window||{};
  document.getElementById('stat-cards').innerHTML=[
    {label:'Total Requests',value:w.total_requests||0,sub:'Current 15-min window'},
    {label:'AI Triage Calls',value:w.api_calls||0,sub:'Failures: '+(w.api_failures||0)},
    {label:'Error Rate',value:w.api_calls>0?((w.api_failures/w.api_calls)*100).toFixed(1)+'%':'0%',sub:'Threshold: 20%'},
    {label:'WhatsApp Sent',value:w.whatsapp_sent||0,sub:'Failed: '+(w.whatsapp_failed||0)},
    {label:'Failsafe Mode',value:si.failsafe_active?'ACTIVE':'Inactive',sub:'Consecutive failures: '+(si.consecutive_api_failures||0)},
    {label:'Triage Fallbacks',value:w.triage_fallbacks||0,sub:'Deterministic classifier'},
  ].map(c=>'<div class="card"><div class="label">'+c.label+'</div><div class="value">'+c.value+'</div><div class="sub">'+c.sub+'</div></div>').join('');

  // Pillars
  const cp=status.clinical_performance||{};
  const sl=status.strategic_lifecycle||{};
  document.getElementById('pillars').innerHTML=[
    {name:'System Integrity',color:'#06b6d4',details:'API failures: '+(w.api_failures||0)+' · Timeouts: '+(w.api_timeouts||0)+' · Failsafe: '+(si.failsafe_active?'ACTIVE':'Off')},
    {name:'Clinical Performance',color:'#8b5cf6',details:'Buffer size: '+(cp.buffer_size||0)+' · Confidence threshold: '+(cp.confidence_threshold||75)+'%'},
    {name:'Strategic Lifecycle',color:'#f59e0b',details:'Next review: '+(sl.next_90_day_review||'Not scheduled')+' · Annual: '+(sl.next_annual_review||'Not scheduled')},
    {name:'Incident Management',color:'#ef4444',details:'Open incidents tracked via governance_incidents table'},
  ].map(p=>'<div class="pillar" style="border-left-color:'+p.color+'"><h3 style="color:'+p.color+'">'+p.name+'</h3><div class="detail">'+p.details+'</div></div>').join('');

  // Alerts
  const alerts=await api('/api/governance/alerts?limit=50');
  const ab=document.getElementById('alerts-body');
  if(alerts&&alerts.length>0){
    ab.innerHTML=alerts.map(a=>'<tr><td>'+timeAgo(a.created_at)+'</td><td>'+badge(a.severity)+'</td><td>'+(a.pillar||'-')+'</td><td>'+(a.message||'-')+'</td></tr>').join('');
  }else{ab.innerHTML='<tr><td colspan="4" class="empty">No alerts — system operating normally</td></tr>';}

  // Incidents
  const incidents=await api('/api/governance/incidents?limit=50');
  const ib=document.getElementById('incidents-body');
  if(incidents&&incidents.length>0){
    ib.innerHTML=incidents.map(i=>'<tr><td>'+timeAgo(i.created_at)+'</td><td>'+badge('L'+(i.severity_level||'?'))+'</td><td>'+(i.description||'-')+'</td><td>'+(i.status||'-')+'</td></tr>').join('');
  }else{ib.innerHTML='<tr><td colspan="4" class="empty">No incidents reported</td></tr>';}

  // Metrics
  const metrics=await api('/api/governance/metrics?limit=20');
  const mb=document.getElementById('metrics-body');
  if(metrics&&metrics.length>0){
    mb.innerHTML=metrics.map(m=>{
      const d=m.data||{};
      return '<tr><td>'+timeAgo(m.created_at)+'</td><td>'+(m.metric_type||'-')+'</td><td>'+(d.total_requests||d.batch_size||'-')+'</td><td>'+(d.api_failures||d.low_confidence_count||'-')+'</td><td>'+(d.error_rate!==undefined?(d.error_rate*100).toFixed(1)+'%':(d.low_confidence_rate||'-'))+'</td></tr>';
    }).join('');
  }else{mb.innerHTML='<tr><td colspan="5" class="empty">No metrics recorded yet</td></tr>';}
}

setInterval(refresh,30000);
</script>
</body>
</html>`);
});

// ================================================================
// CLINIC QUEUE DASHBOARD — Served from file for reliability
// ================================================================
app.get('/clinic', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'clinic.html'));
});



// ================== CONFIG ==================
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ================== GOVERNANCE FRAMEWORK ==================
const { GovernanceOrchestrator, deterministicRedClassifier } = require('./governance');


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CONFIDENCE_THRESHOLD = 75;

// ================== GOVERNANCE ORCHESTRATOR ==================
// Initialized after helpers section below (needs queueEvent to be defined first)
let governance;

// ================== FEATURE FLAGS ==================
// Set these to true when partnerships/integrations are ready
const FEATURES = {
  CCMDD_ROUTING: false,          // Enable when CCMDD partnership agreements signed
  VIRTUAL_CONSULTS: false,       // Enable when telemedicine provider integrated
  LAB_RESULTS: true,             // Lab results module — manual entry active by default
  NHLS_API_INTEGRATION: false,   // Enable when NHLS API/LabTrack integration available
  CCMDD_API_URL: process.env.CCMDD_API_URL || null,
  VIRTUAL_CONSULT_URL: process.env.VIRTUAL_CONSULT_URL || null,
  VIRTUAL_CONSULT_PHONE: process.env.VIRTUAL_CONSULT_PHONE || null,
  NHLS_API_URL: process.env.NHLS_API_URL || null,        // Future: NHLS LabTrack API endpoint
  NHLS_API_KEY: process.env.NHLS_API_KEY || null,         // Future: NHLS API credentials
};

// ================== HELPERS ==================

// ================================================================
// RESILIENT EVENT LOG
// ================================================================
// During outages (load shedding, Supabase downtime), governance events
// that can't be written to the database are queued in a local JSON file.
// A flush agent runs every 2 minutes and pushes queued events to Supabase
// when connectivity returns. This ensures no governance data is lost
// even during extended outages.
// ================================================================
const EVENT_LOG_PATH = path.join(__dirname, '.bizusizo_event_queue.json');

function readEventQueue() {
  try {
    if (fs.existsSync(EVENT_LOG_PATH)) {
      const data = fs.readFileSync(EVENT_LOG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[EVENT_LOG] Failed to read queue:', e.message);
  }
  return [];
}

function writeEventQueue(events) {
  try {
    fs.writeFileSync(EVENT_LOG_PATH, JSON.stringify(events, null, 2));
  } catch (e) {
    console.error('[EVENT_LOG] Failed to write queue:', e.message);
  }
}

function queueEvent(event) {
  // Append to local file — survives process restarts on Railway
  const queue = readEventQueue();
  queue.push({
    ...event,
    queued_at: new Date().toISOString(),
    flushed: false
  });
  writeEventQueue(queue);
  console.log(`[EVENT_LOG] Event queued locally (${queue.length} in queue): ${event.type}`);
}

async function flushEventQueue() {
  const queue = readEventQueue();
  if (queue.length === 0) return;

  const unflushed = queue.filter(e => !e.flushed);
  if (unflushed.length === 0) {
    // All flushed — clear the file
    writeEventQueue([]);
    return;
  }

  console.log(`[EVENT_LOG] Attempting to flush ${unflushed.length} queued events to Supabase...`);

  let flushedCount = 0;
  for (const event of unflushed) {
    try {
      if (event.table === 'governance_alerts') {
        await supabase.from('governance_alerts').insert({
          alert_type: event.data.alert_type,
          severity: event.data.severity,
          pillar: event.data.pillar,
          message: event.data.message,
          data: event.data.extra || null,
          created_at: event.data.original_timestamp || event.queued_at,
          resolved: false,
          assigned_to: event.data.assigned_to || null,
        });
      } else if (event.table === 'governance_metrics') {
        await supabase.from('governance_metrics').insert({
          metric_type: event.data.metric_type,
          data: event.data.metric_data || {},
          created_at: event.data.original_timestamp || event.queued_at,
        });
      }

      event.flushed = true;
      flushedCount++;
    } catch (e) {
      // Supabase still unreachable — stop trying, will retry next cycle
      console.log(`[EVENT_LOG] Flush failed (DB still unreachable), ${unflushed.length - flushedCount} events remain queued`);
      writeEventQueue(queue);
      return;
    }
  }

  // All flushed successfully — clear the file
  if (flushedCount === unflushed.length) {
    writeEventQueue([]);
    console.log(`[EVENT_LOG] ✅ All ${flushedCount} queued events flushed to Supabase`);
  } else {
    writeEventQueue(queue);
    console.log(`[EVENT_LOG] Partially flushed: ${flushedCount}/${unflushed.length}`);
  }
}

// Flush agent: every 2 minutes, try to push queued events to Supabase
setInterval(flushEventQueue, 2 * 60 * 1000);
// Also flush on startup in case events were queued before a restart
setTimeout(flushEventQueue, 10000);

// ================== GOVERNANCE ORCHESTRATOR INIT ==================
// Now that queueEvent is defined, we can initialize governance with
// the local event queue for load shedding resilience.
governance = new GovernanceOrchestrator(supabase, {
  alertCallback: (alert) => {
    // TODO: Replace with Slack webhook, email, or PagerDuty integration
    console.log(`[GOV ALERT] [${alert.severity}] [${alert.pillar}] ${alert.message}`);
  },
  queueEvent: queueEvent,
});

function hashPhone(phone) {
  return crypto.createHash('sha256').update(phone).digest('hex').slice(0, 16);
}

// ================== IDENTITY HELPERS ==================
// DOB parsing handles common SA input patterns:
// "15-03-1992", "15/03/1992", "15 03 1992", "1992-03-15", "15031992"
function parseDOB(input) {
  const cleaned = (input || '').trim();
  let match = cleaned.match(/^(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return validateDOB(parseInt(d), parseInt(m), parseInt(y));
  }
  match = cleaned.match(/^(\d{4})[\/\-\s](\d{1,2})[\/\-\s](\d{1,2})$/);
  if (match) {
    const [, y, m, d] = match;
    return validateDOB(parseInt(d), parseInt(m), parseInt(y));
  }
  match = cleaned.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return validateDOB(parseInt(d), parseInt(m), parseInt(y));
  }
  return { valid: false };
}

function validateDOB(day, month, year) {
  const now = new Date();
  const currentYear = now.getFullYear();
  if (year < 1900 || year > currentYear) return { valid: false };
  if (month < 1 || month > 12) return { valid: false };
  if (day < 1 || day > 31) return { valid: false };
  const dob = new Date(year, month - 1, day);
  if (dob > now) return { valid: false };
  const age = Math.floor((now - dob) / (365.25 * 24 * 60 * 60 * 1000));
  return {
    valid: true, day, month, year,
    dob_string: `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`,
    dob_iso: dob.toISOString().split('T')[0],
    age,
  };
}

function capitalizeName(name) {
  return (name || '').trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ================== STUDY CODE GENERATOR ==================
// Generates a short, memorable code like "BZ-4827" that links
// the patient's BIZUSIZO session to clinic register data.
// The code is shown to the patient on WhatsApp after onboarding.
// The research assistant records it alongside the nurse triage.
// This bridges digital (hashed patient_id) and paper (clinic register).
async function generateStudyCode(patientId) {
  // Check if patient already has a code
  const { data: existing } = await supabase
    .from('study_codes')
    .select('study_code')
    .eq('patient_id', patientId)
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0].study_code;
  }

  // Generate a unique code: BZ-XXXX (4 digits, checked for uniqueness)
  let code;
  let attempts = 0;
  while (attempts < 10) {
    const num = Math.floor(1000 + Math.random() * 9000); // 1000-9999
    code = `BZ-${num}`;

    const { data: clash } = await supabase
      .from('study_codes')
      .select('id')
      .eq('study_code', code)
      .limit(1);

    if (!clash || clash.length === 0) break;
    attempts++;
  }

  // If 4-digit space exhausted (unlikely with <9000 patients), extend to 5 digits
  if (attempts >= 10) {
    const num = Math.floor(10000 + Math.random() * 90000);
    code = `BZ-${num}`;
  }

  // Store the mapping
  await supabase.from('study_codes').insert({
    patient_id: patientId,
    study_code: code,
    created_at: new Date()
  });

  return code;
}

// Lookup patient by study code (used by research assistants via API)
async function lookupStudyCode(studyCode) {
  const { data } = await supabase
    .from('study_codes')
    .select('*')
    .eq('study_code', studyCode.toUpperCase().trim())
    .limit(1);

  return data && data.length > 0 ? data[0] : null;
}

const WHATSAPP_API_VERSION = 'v21.0'; // Keep updated — Meta deprecates old versions

async function sendWhatsAppMessage(to, text) {
  try {
    const res = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${process.env.PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text }
      })
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => 'no body');
      console.error(`[WA] Send failed: ${res.status} ${res.statusText} — ${errorBody}`);
      // Log to governance if available
      try { governance.systemIntegrity.recordWhatsAppSend(false); } catch (e) {}
      return false;
    }

    try { governance.systemIntegrity.recordWhatsAppSend(true); } catch (e) {}
    return true;
  } catch (e) {
    console.error(`[WA] Send error: ${e.message}`);
    try { governance.systemIntegrity.recordWhatsAppSend(false); } catch (e2) {}
    return false;
  }
}

// ================== DATABASE ==================
async function getSession(patientId) {
  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('patient_id', patientId)
    .single();
  return data?.data || {};
}

async function saveSession(patientId, session) {
  await supabase.from('sessions').upsert({
    patient_id: patientId,
    data: session,
    updated_at: new Date()
  });
}

async function logTriage(entry) {
  await supabase.from('triage_logs').insert(entry);
}

async function scheduleFollowUp(patientId, phone, triageLevel) {
  const followUpTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
  await supabase.from('follow_ups').insert({
    patient_id: patientId,
    phone,
    triage_level: triageLevel,
    scheduled_at: followUpTime,
    status: 'pending'
  });
}

async function getDueFollowUps() {
  const { data } = await supabase
    .from('follow_ups')
    .select('*')
    .lte('scheduled_at', new Date())
    .eq('status', 'pending');
  return data || [];
}

async function markFollowUpDone(id) {
  await supabase
    .from('follow_ups')
    .update({ status: 'completed' })
    .eq('id', id);
}

// ================================================================
// HARDCODED MESSAGES — ALL 11 OFFICIAL SA LANGUAGES
// ================================================================
// NOTE TO TEAM: These should be reviewed by native speakers.
// Flag any unnatural phrasing to hello@healthbridgesa.co.za
// Priority review: isiZulu, isiXhosa, Sesotho, Sepedi, Setswana
// ================================================================

const LANG_CODES = ['en', 'zu', 'xh', 'af', 'nso', 'tn', 'st', 'ts', 'ss', 've', 'nr'];

const MESSAGES = {

  // ==================== LANGUAGE MENU ====================
  language_menu: {
    // This is always shown in all languages at once
    _all: `Welcome to BIZUSIZO 🏥

Choose your language / Khetha ulimi lwakho:

1. English
2. isiZulu
3. isiXhosa
4. Afrikaans
5. Sepedi
6. Setswana
7. Sesotho
8. Xitsonga
9. siSwati
10. Tshivenda
11. isiNdebele

Reply with the number.`
  },

  // ==================== LANGUAGE CONFIRMED ====================
  language_set: {
    en: '✅ Language set to *English*.\nType "language" anytime to change.',
    zu: '✅ Ulimi lusetelwe ku-*isiZulu*.\nBhala "ulimi" noma nini ukushintsha.',
    xh: '✅ Ulwimi lusetelwe kwisi-*Xhosa*.\nBhala "ulwimi" nanini na ukutshintsha.',
    af: '✅ Taal is gestel na *Afrikaans*.\nTik "taal" enige tyd om te verander.',
    nso: '✅ Polelo e beakantšwe go *Sepedi*.\nNgwala "polelo" nako efe go fetola.',
    tn: '✅ Puo e beilwe go *Setswana*.\nKwala "puo" nako nngwe go fetola.',
    st: '✅ Puo e behilwe ho *Sesotho*.\nNgola "puo" nako efe ho fetola.',
    ts: '✅ Ririmi ri vekiwile eka *Xitsonga*.\nTsala "ririmi" nkarhi wun\'wana ku cinca.',
    ss: '✅ Lulwimi lubekwe ku-*siSwati*.\nBhala "lulwimi" nanoma nini kushintja.',
    ve: '✅ Luambo lwo sedzwa kha *Tshivenda*.\nṄwalani "luambo" tshifhinga tshiṅwe u shanduka.',
    nr: '✅ Ilimi libekwe ku-*isiNdebele*.\nTlola "ilimi" nanini ukutjhentjha.'
  },

  // ==================== CONSENT PROMPT ====================
  consent: {
    en: `Welcome to BIZUSIZO.

This service:
• Gives guidance — it does NOT diagnose
• May refer you to a nurse if needed
• Keeps your information safe under POPIA

Do you agree?
1 — Yes, I agree
2 — No, I decline`,

    zu: `Siyakwamukela ku-BIZUSIZO.

Le sevisi:
• Inikezela iseluleko — AYIKUXILONGI
• Ingakudlulisela kunesi uma kudingeka
• Igcina imininingwane yakho iphephile nge-POPIA

Uyavuma?
1 — Yebo, ngiyavuma
2 — Cha, angivumi`,

    xh: `Wamkelekile ku-BIZUSIZO.

Le sevisi:
• Inika iingcebiso — AYIXILONGI
• Inokukudlulisela kumongikazi ukuba kuyafuneka
• Igcina inkcazelo yakho ikhuselekile nge-POPIA

Uyavuma?
1 — Ewe, ndiyavuma
2 — Hayi, andivumi`,

    af: `Welkom by BIZUSIZO.

Hierdie diens:
• Gee leiding — dit diagnoseer NIE
• Kan jou na 'n verpleegster verwys indien nodig
• Hou jou inligting veilig onder POPIA

Stem jy saam?
1 — Ja, ek stem saam
2 — Nee, ek stem nie saam nie`,

    nso: `O amogetšwe go BIZUSIZO.

Tirelo ye:
• E fa maele — GA E NYAKIŠIŠE bolwetši
• E ka go romela go mooki ge go nyakega
• E boloka tshedimošo ya gago e bolokegile ka POPIA

A o dumela?
1 — Ee, ke a dumela
2 — Aowa, ga ke dumele`,

    tn: `O amogelwa go BIZUSIZO.

Tirelo e:
• E fa kgakololo — GA E TLHATLHOBE
• E ka go romela go mooki fa go tlhokega
• E boloka tshedimosetso ya gago e babalesegile ka POPIA

A o dumela?
1 — Ee, ke a dumela
2 — Nnyaa, ga ke dumele`,

    st: `O amohelehile ho BIZUSIZO.

Tshebeletso ena:
• E fana ka tataiso — HA E HLAHLOBE
• E ka o romela ho mooki haeba ho hlokahala
• E boloka tlhahisoleseding ya hao e bolokehile ka POPIA

Na o dumela?
1 — E, ke a dumela
2 — Tjhe, ha ke dumele`,

    ts: `U amukelekile eka BIZUSIZO.

Vukorhokeri lebyi:
• Byi nyika switsundzuxo — A BYI KAMBELI
• Byi nga ku rhumela eka nesi loko swi laveka
• Byi hlayisa vuxokoxoko bya wena byi hlayisekile hi POPIA

Xana wa pfumela?
1 — Ina, ndza pfumela
2 — Ee-ee, a ndzi pfumeli`,

    ss: `Wemukelekile ku-BIZUSIZO.

Lesevisi:
• Inika teluleko — AYIHLONGI
• Ingakutfumela kunesi uma kudzingeka
• Igcina lokutsintana kwakho kuphephile nge-POPIA

Uyavuma?
1 — Yebo, ngiyavuma
2 — Cha, angivumi`,

    ve: `Vho ṱanganedzwa kha BIZUSIZO.

Tshumelo iyi:
• I ṋea vhulivhisi — A I ṰOḒISISI VHULWADZE
• I nga ni rumela kha nese arali zwi tshi ṱoḓea
• I vhulunga mafhungo aṋu o tsireledzeaho nga POPIA

Ni a tenda?
1 — Ee, ndi a tenda
2 — Hai, a thi tendi`,

    nr: `Wamukelekile ku-BIZUSIZO.

Isevisi le:
• Inikela isinqophiso — AYIHLONGI
• Ingakuthumela kunesi uma kutlhogeka
• Igcina imininingwane yakho iphephile nge-POPIA

Uyavuma?
1 — Iye, ngiyavuma
2 — Awa, angivumi`
  },

  // ==================== CONSENT RESPONSES ====================
  consent_yes: {
    en: '✅ Consent received. Please describe your symptoms or choose a category.',
    zu: '✅ Imvume itholakele. Sicela uchaze izimpawu zakho noma ukhethe uhlobo.',
    xh: '✅ Imvume ifunyenwe. Nceda uchaze iimpawu zakho okanye ukhethe udidi.',
    af: '✅ Toestemming ontvang. Beskryf asseblief jou simptome of kies \'n kategorie.',
    nso: '✅ Tumelelo e amogetšwe. Hle hlaloša dika tša gago goba kgetha mohuta.',
    tn: '✅ Tumelelo e amogetšwe. Tswee-tswee tlhalosa matshwao a gago kgotsa tlhopha mofuta.',
    st: '✅ Tumello e amohelehile. Ka kopo hlalosa matshwao a hao kapa khetha mofuta.',
    ts: '✅ Mpfumelelo wu amukelekile. Tlhela u hlamusela swikombiso swa wena kumbe u hlawula muxaka.',
    ss: '✅ Imvumo itfolakele. Sicela uchaze timphawu takho noma ukhetse luhlobo.',
    ve: '✅ Thendelano yo ṱanganedzwa. Ri humbela ni ṱalutshedze zwiga zwaṋu kana ni khethe lushaka.',
    nr: '✅ Imvumo itholakele. Sibawa uchaze iimpawu zakho namkha ukhethe umhlobo.'
  },

  consent_no: {
    en: '❌ You have declined. Your session has ended. If you change your mind, send "Hi" again.',
    zu: '❌ Wenqabile. Isikhathi sakho siphelile. Uma uguqula umqondo, thumela "Hi" futhi.',
    xh: '❌ Walile. Iseshoni yakho iphelile. Ukuba utshintshe ingqondo, thumela "Hi" kwakhona.',
    af: '❌ Jy het geweier. Jou sessie is beëindig. As jy van plan verander, stuur weer "Hi".',
    nso: '❌ O ganne. Sešene ya gago e fedile. Ge o ka fetola mogopolo, romela "Hi" gape.',
    tn: '❌ O ganne. Seshene ya gago e fedile. Fa o fetola mogopolo, romela "Hi" gape.',
    st: '❌ O hanile. Seshene ya hao e fedile. Haeba o fetola monahano, romela "Hi" hape.',
    ts: '❌ U arile. Sesheni ya wena yi herile. Loko u cinca mianakanyo, rhumela "Hi" nakambe.',
    ss: '❌ Walile. Seshini yakho iphelile. Nawugucula umcondvo, tfumela "Hi" futsi.',
    ve: '❌ No hana. Sesheni yaṋu yo fhela. Arali na shanduka muhumbulo, rumelani "Hi" hafhu.',
    nr: '❌ Walile. Iseshini yakho iphelile. Nawutjhentjha umkhumbulo, thumela "Hi" godu.'
  },

  // ==================== SYMPTOM CATEGORY MENU ====================
  category_menu: {
    en: `What is your main problem today?

1. 🫁 Breathing / Chest pain
2. 🤕 Head injury / Headache
3. 🤰 Pregnancy related
4. 🩸 Bleeding / Wound
5. 🤒 Fever / Flu / Cough
6. 🤢 Stomach / Vomiting
7. 👶 Child illness
8. 💊 Medication / Chronic
9. 🦴 Bone / Joint / Back pain
10. 🧠 Mental health
11. 🤧 Allergy / Rash
12. ✏️ Other — type your symptoms
13. 👤 Speak to a human`,

    zu: `Yini inkinga yakho enkulu namuhla?

1. 🫁 Izinkinga zokuphefumula / Ubuhlungu besifuba
2. 🤕 Ukulimala kwekhanda / Ikhanda elibuhlungu
3. 🤰 Okuphathelene nokukhulelwa
4. 🩸 Ukopha / Inxeba
5. 🤒 Imfiva / Umkhuhlane / Ukukhwehlela
6. 🤢 Isisu / Ukuhlanza
7. 👶 Ukugula kwengane
8. 💊 Umuthi / Isifo esingamahlalakhona
9. 🦴 Ithambo / Amalunga / Ubuhlungu bomhlane
10. 🧠 Impilo yengqondo
11. 🤧 I-allergy / Ukuvuvukala kwesikhumba
12. ✏️ Okunye — bhala izimpawu zakho
13. 👤 Khuluma nomuntu`,

    xh: `Yintoni ingxaki yakho enkulu namhlanje?

1. 🫁 Ukuphefumla / Intlungu yesifuba
2. 🤕 Ukonzakala kwentloko / Intloko ebuhlungu
3. 🤰 Okuphathelene nokukhulelwa
4. 🩸 Ukopha / Inxeba
5. 🤒 Ifiva / Umkhuhlane / Ukukhohlela
6. 🤢 Isisu / Ukugabha
7. 👶 Ukugula komntwana
8. 💊 Amayeza / Isifo esinganyangekiyo
9. 🦴 Ithambo / Amalungu / Umqolo obuhlungu
10. 🧠 Impilo yengqondo
11. 🤧 I-aloji / Ukuvuvukala kwesikhumba
12. ✏️ Okunye — bhala iimpawu zakho
13. 👤 Thetha nomntu`,

    af: `Wat is jou hoofprobleem vandag?

1. 🫁 Asemhaling / Borspyn
2. 🤕 Kopbesering / Hoofpyn
3. 🤰 Swangerskap verwant
4. 🩸 Bloeding / Wond
5. 🤒 Koors / Griep / Hoes
6. 🤢 Maag / Braking
7. 👶 Kindergesiekte
8. 💊 Medikasie / Chroniese siekte
9. 🦴 Been / Gewrig / Rugpyn
10. 🧠 Geestesgesondheid
11. 🤧 Allergie / Uitslag
12. ✏️ Ander — tik jou simptome
13. 👤 Praat met 'n mens`,

    nso: `Bothata bja gago bjo bogolo ke eng lehono?

1. 🫁 Go hema / Bohloko bja sehuba
2. 🤕 Kotsi ya hlogo / Hlogo e bohloko
3. 🤰 Tša moimana
4. 🩸 Go tšwa madi / Ntho
5. 🤒 Fifare / Mokgathala / Go gohlola
6. 🤢 Mpa / Go hlatša
7. 👶 Bolwetši bja ngwana
8. 💊 Dihlare / Bolwetši bja go se fole
9. 🦴 Lesapo / Makopano / Bohloko bja mokokotlo
10. 🧠 Maphelo a monagano
11. 🤧 Aletshe / Dišo
12. ✏️ Tše dingwe — ngwala dika tša gago
13. 👤 Bolela le motho`,

    tn: `Bothata jwa gago jo bogolo ke eng gompieno?

1. 🫁 Go hema / Botlhoko jwa sehuba
2. 🤕 Kotsi ya tlhogo / Tlhogo e botlhoko
3. 🤰 Tsa boimana
4. 🩸 Go tswa madi / Ntho
5. 🤒 Letshoroma / Mokgathala / Go gotlhola
6. 🤢 Mpa / Go tlhatsa
7. 👶 Bolwetse jwa ngwana
8. 💊 Melemo / Bolwetse jo bo sa foleng
9. 🦴 Lesapo / Dikopano / Botlhoko jwa mokwatla
10. 🧠 Boitekanelo jwa tlhaloganyo
11. 🤧 Aletshe / Diso
12. ✏️ Tse dingwe — kwala matshwao a gago
13. 👤 Bua le motho`,

    st: `Bothata ba hao bo boholo ke eng kajeno?

1. 🫁 Ho hema / Bohloko ba sefuba
2. 🤕 Kotsi ya hlooho / Hlooho e bohloko
3. 🤰 Tsa boima
4. 🩸 Ho tswa madi / Leqeba
5. 🤒 Feberu / Mokhatlo / Ho hohlola
6. 🤢 Mala / Ho hlatsa
7. 👶 Bokudi ba ngwana
8. 💊 Meriana / Bokudi bo sa foleng
9. 🦴 Lesapo / Masapo / Bohloko ba mokokotlo
10. 🧠 Bophelo ba kelello
11. 🤧 Alereji / Ho ruruha ha letlalo
12. ✏️ Tse ding — ngola matshwao a hao
13. 👤 Bua le motho`,

    ts: `Xiphiqo xa wena lexikulu i yini namuntlha?

1. 🫁 Ku hefemula / Ku vava ka xifuva
2. 🤕 Khombo ra nhloko / Nhloko yo vava
3. 🤰 Swa vukatana
4. 🩸 Ku hangalaka ka ngati / Ndzovo
5. 🤒 Fifera / Mukhuhlwana / Ku khohola
6. 🤢 Xisu / Ku hlanza
7. 👶 Vuvabyi bya n'wana
8. 💊 Murhi / Vuvabyi byo tshama
9. 🦴 Rirambu / Malungu / Ku vava ka nkongo
10. 🧠 Rihanyo ra mianakanyo
11. 🤧 Aletshe / Ku pfimba ka dzovo
12. ✏️ Swin'wana — tsala swikombiso swa wena
13. 👤 Vulavula na munhu`,

    ss: `Yini inkinga yakho lenkhulu lamuhla?

1. 🫁 Kuphefumula / Kuva buhlungu esifubeni
2. 🤕 Kulimala kwenhloko / Inhloko lebuhlungu
3. 🤰 Lokuphatselene nekukhulelwa
4. 🩸 Kopha / Intsandza
5. 🤒 Imfiva / Umkhuhlane / Kukhwehlela
6. 🤢 Sisu / Kuhlanta
7. 👶 Kugula kwemntfwana
8. 💊 Umutsi / Sifo lesingapheli
9. 🦴 Litsambo / Kuva buhlungu kwemhlane
10. 🧠 Imphilo yengcondvo
11. 🤧 I-aletshe / Kudumba kwesikhunba
12. ✏️ Lokunye — bhala timphawu takho
13. 👤 Khuluma nemuntfu`,

    ve: `Thaidzo yaṋu khulwane ndi ifhio ṋamusi?

1. 🫁 U femba / Vhuṱungu ha tshifuva
2. 🤕 Khombo ya ṱhoho / Ṱhoho i a vhavha
3. 🤰 Zwa u ṱhimana
4. 🩸 U bva malofha / Mbonzhe
5. 🤒 Fivhara / Mukhuhlwane / U kosola
6. 🤢 Thumbu / U tanza
7. 👶 Vhulwadze ha ṅwana
8. 💊 Mushonga / Vhulwadze vhu sa folaho
9. 🦴 Thambo / Mahungu / Vhuṱungu ha musana
10. 🧠 Mutakalo wa muhumbulo
11. 🤧 Aletshe / U zwimba ha lukanda
12. ✏️ Zwiṅwe — ṅwalani zwiga zwaṋu
13. 👤 Ambelani na muthu`,

    nr: `Yini ikinga yakho ekulu namhlanje?

1. 🫁 Ukuphefumula / Ubuhlungu besifuba
2. 🤕 Ukulimala kwehloko / Ihloko ebuhlungu
3. 🤰 Okuphathelene nokukhulelwa
4. 🩸 Ukophisa / Inxeba
5. 🤒 Ifiva / Umkhuhlane / Ukukhwehlela
6. 🤢 Isisu / Ukuhlanza
7. 👶 Ukugula komntwana
8. 💊 Umuthi / Isifo esingapheliko
9. 🦴 Ithambo / Amalunga / Ubuhlungu bomhlana
10. 🧠 Ipilo yomkhumbulo
11. 🤧 I-aletshe / Ukuvuvukala kwesikhumba
12. ✏️ Okhunye — tlola iimpawu zakho
13. 👤 Khuluma nomuntu`
  },

  // ==================== TRIAGE RESULTS ====================
  triage_red: {
    en: '🔴 *EMERGENCY*\n\nCall *10177* for an ambulance NOW.\nIf private: ER24 *084 124*.\n\n⚠️ *Do NOT wait for the ambulance* — go to your nearest hospital emergency unit immediately. Ask someone to drive you or take a taxi.',
    zu: '🔴 *ISIMO ESIPHUTHUMAYO*\n\nShaya *10177* ucele i-ambulensi MANJE.\nUma usebenzisa ezimfihlo: ER24 *084 124*.\n\n⚠️ *UNGALINDI i-ambulensi* — yana esibhedlela esiseduze nawe ngokushesha. Cela umuntu akushayele noma uthathe itekisi.',
    xh: '🔴 *INGXAKEKO ENGXAMISEKILEYO*\n\nTsalela *10177* ucele i-ambulensi NGOKU.\nYabucala: ER24 *084 124*.\n\n⚠️ *MUSA UKULINDA i-ambulensi* — yiya esibhedlele esikufutshane nawe ngokukhawuleza. Cela umntu akuqhubele okanye uthathe iteksi.',
    af: '🔴 *NOODGEVAL*\n\nBel *10177* vir \'n ambulans NOU.\nPrivaat: ER24 *084 124*.\n\n⚠️ *MOENIE WAG vir die ambulans nie* — gaan na jou naaste hospitaal noodafdeling dadelik. Vra iemand om jou te ry of neem \'n taxi.',
    nso: '🔴 *TŠHOGANETŠO*\n\nLeletša *10177* go kgopela ambulense BJALE.\nPraebete: ER24 *084 124*.\n\n⚠️ *O SE KE WA EMA ambulense* — yaa sepetleleng sa kgauswi ka pela. Kgopela motho go go išetša goba o tšee thekisi.',
    tn: '🔴 *TSHOGANYETSO*\n\nLeletsa *10177* go kopa ambulense JAANONG.\nPraebete: ER24 *084 124*.\n\n⚠️ *O SE KA WA EMA ambulense* — ya bookelong jo bo gaufi ka bonako. Kopa motho go go isa kgotsa o tseye thekisi.',
    st: '🔴 *TSHOHANYETSO*\n\nLetsetsa *10177* ho kopa ambulense HONA JOALE.\nPraebete: ER24 *084 124*.\n\n⚠️ *O SE KE OA EMA ambulense* — eya sepetlele se haufi kapele. Kopa motho ho o isa kapa o nke thekisi.',
    ts: '🔴 *XIHATLA*\n\nRingela *10177* ku kombela ambulense SWESWI.\nPrayivhete: ER24 *084 124*.\n\n⚠️ *U NGA YIMI ambulense* — famba u ya exibedlhele xa kusuhi hi ku hatlisa. Kombela munhu ku ku yisa kumbe u teka thekisi.',
    ss: '🔴 *LOKUSHESHISAKO*\n\nShayela *10177* ucele i-ambulensi NYALO.\nYangasese: ER24 *084 124*.\n\n⚠️ *UNGALINDZI i-ambulensi* — hamba uye esibhedlela leseduze masinyane. Cela umuntfu akushayele noma utfatse lithekisi.',
    ve: '🔴 *TSHOGANETSO*\n\nFounelani *10177* u humbela ambulense ZWINO.\nPuraivete: ER24 *084 124*.\n\n⚠️ *NI SONGO LINDELA ambulense* — iyani sibadela tshi re tsini nga u ṱavhanya. Humbelani muthu u ni fhira kana ni dzhie thekisi.',
    nr: '🔴 *ISIMO ESIPHUTHUMAKO*\n\nRingela *10177* ubawa i-ambulensi NJE.\nYefihlo: ER24 *084 124*.\n\n⚠️ *UNGALINDELI i-ambulensi* — iya esibhedlela esiseduze ngokurhaba. Bawa umuntu akuse namkha uthathe ithekisi.'
  },

  triage_orange: {
    en: '🟠 *VERY URGENT*\nYou need care quickly.',
    zu: '🟠 *KUPHUTHUMA KAKHULU*\nUdinga usizo ngokushesha.',
    xh: '🟠 *KUNGXAMISEKE KAKHULU*\nUfuna inkathalo ngokukhawuleza.',
    af: '🟠 *BAIE DRINGEND*\nJy het vinnig sorg nodig.',
    nso: '🟠 *GO ŠUTIŠWA KUDU*\nO hloka tlhokomelo ka pela.',
    tn: '🟠 *GO TSHOGANYETSO THATA*\nO tlhoka tlhokomelo ka bonako.',
    st: '🟠 *HO POTLAKILE HAHOLO*\nO hloka tlhokomelo kapele.',
    ts: '🟠 *SWI HATLISA NGOPFU*\nU lava vukorhokeri hi ku hatlisa.',
    ss: '🟠 *KUSHESHISA KAKHULU*\nUdzinga lusito masinyane.',
    ve: '🟠 *ZWO ṰOḒEA VHUKUMA*\nNi ṱoḓa tshumelo nga u ṱavhanya.',
    nr: '🟠 *KUPHUTHUMA KHULU*\nUdinga lusizo ngokurhaba.'
  },

  // Time-aware ORANGE routing messages
  triage_orange_clinic: {
    en: (name, dist) => `🏥 Go to *${name}* (${dist} km) NOW.\n\nTell reception you were triaged as *VERY URGENT* by BIZUSIZO. You will be fast-tracked.\n\nDo not wait at home.`,
    zu: (name, dist) => `🏥 Yana ku-*${name}* (${dist} km) MANJE.\n\nTshela i-reception ukuthi uhloliwe njengo-*KUPHUTHUMA KAKHULU* yi-BIZUSIZO. Uzosheshiswa.\n\nUngalindi ekhaya.`,
    xh: (name, dist) => `🏥 Yiya ku-*${name}* (${dist} km) NGOKU.\n\nXelela i-reception ukuba uhlolwe njenge-*KUNGXAMISEKE KAKHULU* yi-BIZUSIZO. Uza kukhawuleziswa.\n\nMusa ukulinda ekhaya.`,
    af: (name, dist) => `🏥 Gaan na *${name}* (${dist} km) NOU.\n\nS\u00EA vir ontvangs jy is as *BAIE DRINGEND* deur BIZUSIZO getrieer. Jy sal vinnig gehelp word.\n\nMoenie by die huis wag nie.`,
  },

  triage_orange_hospital: {
    en: 'The clinic is closed now. Go to your nearest hospital emergency unit immediately.',
    zu: 'Umtholampilo uvaliwe manje. Yana esibhedlela esiseduze — ewodini yeziphuthumayo.',
    xh: 'Ikliniki ivaliwe ngoku. Yiya esibhedlele esikufutshane — kwicandelo lezongxamiseko.',
    af: 'Die kliniek is nou gesluit. Gaan na jou naaste hospitaal noodafdeling dadelik.',
    nso: 'Kiliniki e tswaletšwe bjale. Ya sepetleleng sa kgauswi — ka karolong ya tšhoganetšo.',
    tn: 'Kliniki e tswaletswe jaanong. Ya bookelong jo bo gaufi — ka karolong ya tshoganyetso.',
    st: 'Kliniki e koetswe joale. Eya sepetlele se haufi — karolong ya tshohanyetso.',
    ts: 'Kliniki yi pfariwile sweswi. Ya exibedlhele xa kusuhi — ka xiyenge xa swihatla.',
    ss: 'Ikliniki ivaliwe nyalo. Ya esibhedlela leseduze — endlini yekusheshisa.',
    ve: 'Kiliniki yo valwa zwino. Iyani sibadela tshi re tsini — kha tshiimiswa tsha tshoganetso.',
    nr: 'Ikliniki ivaliwe nje. Ya esibhedlela esiseduze — esigeni seziphuthumako.'
  },

  // Transport safety question for ORANGE
  ask_transport_safety: {
    en: 'Can you travel to the facility safely?\n\n1 — Yes, I can get there myself or someone can take me\n2 — No, I am too unwell to travel safely\n3 — I have no transport',
    zu: 'Ungaya endaweni yokulapha ngokuphepha?\n\n1 — Yebo, ngingaya ngokwami noma umuntu angihambisa\n2 — Cha, ngigula kakhulu ukuhamba ngokuphepha\n3 — Anginayo indlela yokuhamba',
    xh: 'Ungahamba uye kwindawo yokugula ngokukhuselekileyo?\n\n1 — Ewe, ndingaya ndodwa okanye umntu angandisa\n2 — Hayi, ndigula kakhulu ukuhamba ngokukhuselekileyo\n3 — Andinayo indlela yokuhamba',
    af: 'Kan jy veilig na die fasiliteit reis?\n\n1 — Ja, ek kan self gaan of iemand kan my neem\n2 — Nee, ek is te siek om veilig te reis\n3 — Ek het geen vervoer nie',
    nso: 'O ka ya lefelong la kalafo ka polokego?\n\n1 — Ee, nka ya ka bonna goba motho a ka ntšhiša\n2 — Aowa, ke lwala kudu go sepela ka polokego\n3 — Ga ke na sefata',
    tn: 'O ka ya lefelong la kalafi ka polokesego?\n\n1 — Ee, nka ya ka bonna kgotsa motho a ka ntisa\n2 — Nnyaa, ke lwala thata go tsamaya ka polokesego\n3 — Ga ke na sefata',
    st: 'O ka ya lefelong la bophelo ka polokeho?\n\n1 — E, nka ya ka bonna kapa motho a ka ntisa\n2 — Tjhe, ke kula haholo ho tsamaya ka polokeho\n3 — Ha ke na sefata',
    ts: 'U nga ya endhawini yo kufumela hi ku hlayiseka?\n\n1 — Ina, ndzi nga ya hi ndzi ri ndzexe kumbe munhu a nga ndzi yisa\n2 — Ee-ee, ndzi vabya ngopfu ku famba hi ku hlayiseka\n3 — A ndzi na xifambisi',
    ss: 'Ungaya endzaweni yelatjhwa ngekuphepha?\n\n1 — Yebo, ngingaya ngedvwa noma umuntfu angihambisa\n2 — Cha, ngigula kakhulu kuhamba ngekuphepha\n3 — Anginayo indlela yekuhamba',
    ve: 'Ni nga ya fhethu ha u alafhiwa nga u tsireledza?\n\n1 — Ee, ndi nga ya nga ndoṱhe kana muthu a nga ntshimbila\n2 — Hai, ndi khou lwala vhukuma u tshimbila nga u tsireledza\n3 — A thi na tshifhambisi',
    nr: 'Ungaya endaweni yokulatjhwa ngokuphepha?\n\n1 — Iye, ngingaya ngedwa namkha umuntu angangihambisa\n2 — Awa, ngigula khulu ukukhamba ngokuphepha\n3 — Anginayo indlela yokukhamba',
  },

  transport_safe: {
    en: 'Good. Please leave now — do not delay.',
    zu: 'Kuhle. Sicela uhambe manje — ungalibali.',
    xh: 'Kulungile. Nceda uhambe ngoku — musa ukulibazisa.',
    af: 'Goed. Vertrek asseblief nou — moenie uitstel nie.',
  },

  transport_unsafe: {
    en: '🚑 Call an ambulance NOW:\n*10177* (public) or *084 124* (ER24)\n\nTell them your symptoms and location.\n\nIf the ambulance is slow, ask someone nearby to drive you to the nearest hospital emergency unit. Do not wait at home.',
    zu: '🚑 Shaya i-ambulensi MANJE:\n*10177* (kahulumeni) noma *084 124* (ER24)\n\nBatshele izimpawu zakho nendawo yakho.\n\nUma i-ambulensi iphuza, cela umuntu oseduze akushayele esibhedlela. Ungalindi ekhaya.',
    xh: '🚑 Tsalela i-ambulensi NGOKU:\n*10177* (karhulumente) okanye *084 124* (ER24)\n\nBaxelele iimpawu zakho nendawo yakho.\n\nUkuba i-ambulensi ilibele, cela umntu okufutshane akuqhubele esibhedlele. Musa ukulinda ekhaya.',
    af: '🚑 Bel \'n ambulans NOU:\n*10177* (publiek) of *084 124* (ER24)\n\nVertel hulle jou simptome en ligging.\n\nAs die ambulans stadig is, vra iemand naby om jou na die naaste hospitaal noodafdeling te ry. Moenie by die huis wag nie.',
  },

  transport_none: {
    en: '🚑 Call an ambulance: *10177* or *084 124* (ER24)\n\nAlternatively, ask a neighbour, family member, or community member to take you. If you can reach a taxi rank, take a taxi to the nearest clinic or hospital.\n\nDo not stay at home — you need care today.',
    zu: '🚑 Shaya i-ambulensi: *10177* noma *084 124* (ER24)\n\nNoma ucele umakhelwane, ilungu lomndeni, noma ilungu lomphakathi likuhambise. Uma ungafinyelela erenki yamatekisi, thatha itekisi uye emtholampilo noma esibhedlela.\n\nUngahlali ekhaya — udinga usizo namuhla.',
    xh: '🚑 Tsalela i-ambulensi: *10177* okanye *084 124* (ER24)\n\nOkanye cela ummelwane, ilungu losapho, okanye ilungu lasekuhlaleni likuse. Ukuba ungafikelela kwindawo yamateksi, thatha iteksi uye ekliniki okanye esibhedlele.\n\nMusa ukuhlala ekhaya — ufuna inkathalo namhlanje.',
    af: '🚑 Bel \'n ambulans: *10177* of *084 124* (ER24)\n\nOf vra \'n buurman, familielid, of gemeenskapslid om jou te neem. As jy \'n taxistaanplek kan bereik, neem \'n taxi na die naaste kliniek of hospitaal.\n\nMoenie by die huis bly nie — jy het vandag sorg nodig.',
  },

  triage_yellow: {
    en: '🟡 *URGENT*\nVisit a clinic today. Do not delay.',
    zu: '🟡 *KUPHUTHUMA*\nVakashela umtholampilo namuhla. Ungalibali.',
    xh: '🟡 *KUNGXAMISEKILE*\nTyelela ikliniki namhlanje. Musa ukulibazisa.',
    af: '🟡 *DRINGEND*\nBesoek \'n kliniek vandag. Moenie uitstel nie.',
    nso: '🟡 *GO A ŠUTIŠWA*\nEtela kiliniki lehono. O se lebe.',
    tn: '🟡 *GO A TSHOGANYETSA*\nEtela kliniki gompieno. O se ka wa diega.',
    st: '🟡 *HO A POTLAKISA*\nEtela kliniki kajeno. O se ke oa dieha.',
    ts: '🟡 *SWA HATLISA*\nEndzela kliniki namuntlha. U nga hlweli.',
    ss: '🟡 *KUYASHESHISA*\nVakashela ikliniki lamuhla. Ungalibali.',
    ve: '🟡 *ZWO ṰOḒEA*\nDalani kiliniki ṋamusi. Ni songo lenga.',
    nr: '🟡 *KUPHUTHUMA*\nVakatjhela ikliniki namhlanje. Ungalisi.'
  },

  triage_yellow_after_hours: {
    en: '⏰ Clinics are closed now. Here is what to do:\n\n1. *If your symptoms are manageable* — rest at home and go to the clinic first thing tomorrow morning (before 08:00 for the shortest wait)\n\n2. *If symptoms worsen tonight* — go to your nearest hospital emergency unit or call *10177*\n\nWe will send you a reminder tomorrow morning.',
    zu: '⏰ Imitholampilo ivaliwe manje. Nanti okumele ukwenze:\n\n1. *Uma izimpawu zakho zibekezeleka* — phumula ekhaya bese uya emtholampilo ekuseni kakhulu kusasa (ngaphambi kuka-08:00)\n\n2. *Uma izimpawu ziba zimbi ebusuku* — yana esibhedlela esiseduze noma ushaye *10177*\n\nSizokuthumelela isikhumbuzo kusasa ekuseni.',
    xh: '⏰ Iikliniki zivaliwe ngoku. Nantsi into omawuyenze:\n\n1. *Ukuba iimpawu zakho zinokumelana nazo* — phumla ekhaya uze uye ekliniki kwangethuba ngomso ekuseni (phambi kwe-08:00)\n\n2. *Ukuba iimpawu ziba mbi ebusuku* — yiya esibhedlele esikufutshane okanye utsalele *10177*\n\nSiza kukuthumela isikhumbuzo ngomso ekuseni.',
    af: '⏰ Klinieke is nou gesluit. Hier is wat om te doen:\n\n1. *As jou simptome hanteerbaar is* — rus by die huis en gaan m\u00F4re vroeg na die kliniek (voor 08:00 vir die kortste wag)\n\n2. *As simptome vanaand vererger* — gaan na jou naaste hospitaal noodafdeling of bel *10177*\n\nOns sal jou m\u00F4reoggend \'n herinnering stuur.',
    nso: '⏰ Dikiliniki di tswaletšwe bjale. Se o swanetšego go se dira ke se:\n\n1. *Ge dika tša gago di kgotlelega* — ikhutša ka gae o ye kiliniki gosasa ka pela (pele ga 08:00)\n\n2. *Ge dika di mpefala bošego* — ya sepetleleng sa kgauswi goba o leletše *10177*\n\nRe tla go romela sekhumbuzo gosasa ka mesa.',
    tn: '⏰ Dikliniki di tswaletswe jaanong. Se o tshwanetseng go se dira ke se:\n\n1. *Fa matshwao a gago a kgotlelega* — ikhutsa kwa gae o ye kliniki mo mosong ka bonako (pele ga 08:00)\n\n2. *Fa matshwao a maswe bosigo* — ya bookelong jo bo gaufi kgotsa o leletse *10177*\n\nRe tla go romela sekgopotso kamoso mo mosong.',
    st: '⏰ Dikliniki di koetswe joale. Seo o lokelang ho se etsa ke sena:\n\n1. *Haeba matshwao a hao a ka kgotlelwa* — ikhutse hae o ye kliniki hosane ka pela (pele ho 08:00)\n\n2. *Haeba matshwao a mpefala bosiu* — eya sepetlele se haufi kapa o letsetse *10177*\n\nRe tla o romella sekhumbutso hosane ka mesa.',
    ts: '⏰ Tikliniki ti pfariwile sweswi. Hi leswi u faneleke ku swi endla:\n\n1. *Loko swikombiso swa wena swi koteka* — wisa ekaya u ya ekliniki mundzuku nimixo (pele ka 08:00)\n\n2. *Loko swikombiso swi tika nivusiku* — ya exibedlhele xa kusuhi kumbe u ringela *10177*\n\nHi ta ku rhumela xikhumbutso mundzuku nimixo.',
    ss: '⏰ Tikliniki tivaliwe nyalo. Naku lokufanele ukwente:\n\n1. *Nangabe timphawu takho tiyabeketeleka* — phumula ekhaya uye ekliniki ekuseni kusasa (ngaphambi kwa-08:00)\n\n2. *Nangabe timphawu tiba timbi ebusuku* — ya esibhedlela leseduze noma ushayele *10177*\n\nSitakutfumelela sikhumbuzo kusasa ekuseni.',
    ve: '⏰ Dikiliniki dzo valwa zwino. Ndi izwi zwine na tea u ita:\n\n1. *Arali zwiga zwaṋu zwi kona u konḓelelwa* — awelani hayani ni ye kiliniki matshelo nga u ṱavhanya (phanḓa ha 08:00)\n\n2. *Arali zwiga zwi tshi ṱavhanya vhusiku* — iyani sibadela tshi re tsini kana ni founele *10177*\n\nRi ḓo ni rumela tsivhudzo matshelo nga matsheloni.',
    nr: '⏰ Iinkliniki zivaliwe nje. Naku okufanele ukwenze:\n\n1. *Uma iimpawu zakho zibekezeleka* — phumula ekhaya uye ekliniki kusasa ekuseni (ngaphambi kwe-08:00)\n\n2. *Uma iimpawu ziba zimbi ebusuku* — ya esibhedlela esiseduze namkha uringele *10177*\n\nSizakukuthumela isikhumbuzo kusasa ekuseni.'
  },

  // WhatsApp notification when patient is called from dashboard
  queue_called: {
    en: (assignedTo) => `📢 *You are being called!*\n\n${assignedTo ? 'Please go to *' + assignedTo + '* now.' : 'Please go to reception now.'}\n\nHave your ID and clinic card ready.`,
    zu: (assignedTo) => `📢 *Uyabizwa!*\n\n${assignedTo ? 'Sicela uye ku-*' + assignedTo + '* manje.' : 'Sicela uye e-reception manje.'}\n\nLungisa i-ID nekhadi lakho lasemtholampilo.`,
    xh: (assignedTo) => `📢 *Uyabizwa!*\n\n${assignedTo ? 'Nceda uye ku-*' + assignedTo + '* ngoku.' : 'Nceda uye e-reception ngoku.'}\n\nLungisa i-ID nekhadi lakho lasekliniki.`,
    af: (assignedTo) => `📢 *Jy word geroep!*\n\n${assignedTo ? 'Gaan asseblief na *' + assignedTo + '* nou.' : 'Gaan asseblief na ontvangs nou.'}\n\nHou jou ID en kliniekkaart gereed.`,
  },

  triage_green: {
    en: '🟢 *ROUTINE*\nMonitor your symptoms at home. Visit a pharmacy if needed. If symptoms worsen, contact us again.',
    zu: '🟢 *OKUJWAYELEKILE*\nQaphelisisa izimpawu zakho ekhaya. Vakashela ikhemisi uma kudingeka. Uma izimpawu ziba zimbi, sithinte futhi.',
    xh: '🟢 *OKUQHELEKILEYO*\nJonga iimpawu zakho ekhaya. Tyelela ikhemesti ukuba kuyafuneka. Ukuba iimpawu ziya zisiba mbi, qhagamshelana nathi kwakhona.',
    af: '🟢 *ROETINE*\nMoniteer jou simptome by die huis. Besoek \'n apteek indien nodig. As simptome vererger, kontak ons weer.',
    nso: '🟢 *TSA TLWAELO*\nŠetša dika tša gago ka gae. Etela khemisi ge go nyakega. Ge dika di mpefala, ikgokaganye le rena gape.',
    tn: '🟢 *TSA TLWAELO*\nEla tlhoko matshwao a gago kwa gae. Etela khemisi fa go tlhokega. Fa matshwao a a maswe, ikgolaganye le rona gape.',
    st: '🟢 *TSA KAMEHLA*\nSheba matshwao a hao ka lapeng. Etela khemisi haeba ho hlokahala. Haeba matshwao a mpefala, ikopanye le rona hape.',
    ts: '🟢 *SWA NTOLOVELO*\nVona swikombiso swa wena ekaya. Endzela khemisi loko swi laveka. Loko swikombiso swi tika, hi tshikeleli nakambe.',
    ss: '🟢 *KWEKUVAMILE*\nCaphelisisa timphawu takho ekhaya. Vakashela ikhemisti uma kudzingeka. Uma timphawu tiba timbi, sitsintsane futsi.',
    ve: '🟢 *ZWA ḒUVHA ḼI ṄWE NA ḼI ṄWE*\nSedzani zwiga zwaṋu hayani. Dalani khemisi arali zwi tshi ṱoḓea. Arali zwiga zwi tshi ṱoḓa u ṱavhanya, ri kwameni hafhu.',
    nr: '🟢 *OKUJAYELEKILEKO*\nQalela iimpawu zakho ekhaya. Vakatjhela ikhemisi uma kutlhogeka. Uma iimpawu ziba zimbi, sitjheje godu.'
  },

  // ==================== FACILITY ROUTING ====================
  facility_suggest: {
    en: (name, dist) => `📍 Nearest facility: *${name}* (${dist} km away).\n\nCan you get there easily?\n1 — Yes, take me there\n2 — No, show me other options`,
    zu: (name, dist) => `📍 Indawo eseduze: *${name}* (${dist} km).\n\nUngafika kalula?  \n1 — Yebo\n2 — Cha, ngikhombise ezinye`,
    xh: (name, dist) => `📍 Indawo ekufutshane: *${name}* (${dist} km).\n\nUngafikelela lula?\n1 — Ewe\n2 — Hayi, ndibonise ezinye`,
    af: (name, dist) => `📍 Naaste fasiliteit: *${name}* (${dist} km).\n\nKan jy maklik daar uitkom?\n1 — Ja\n2 — Nee, wys my ander opsies`,
    nso: (name, dist) => `📍 Lefelo la kgauswi: *${name}* (${dist} km).\n\nO ka fihla gabonolo?\n1 — Ee\n2 — Aowa, mpontšhe tše dingwe`,
    tn: (name, dist) => `📍 Lefelo le le gaufi: *${name}* (${dist} km).\n\nO ka fitlha motlhofo?\n1 — Ee\n2 — Nnyaa, mpontshee tse dingwe`,
    st: (name, dist) => `📍 Lefelo le haufi: *${name}* (${dist} km).\n\nO ka fihla habonolo?\n1 — E\n2 — Tjhe, mpontshe tse ding`,
    ts: (name, dist) => `📍 Ndhawu ya kusuhi: *${name}* (${dist} km).\n\nU nga fikela ku olova?\n1 — Ina\n2 — Ee-ee, ndzi kombela tin'wana`,
    ss: (name, dist) => `📍 Indzawo yaseduze: *${name}* (${dist} km).\n\nUngafika kalula?\n1 — Yebo\n2 — Cha, ngikhombise letinye`,
    ve: (name, dist) => `📍 Fhethu hu re tsini: *${name}* (${dist} km).\n\nNi nga swika hu leluwa?\n1 — Ee\n2 — Hai, nsumbedzeni zwiṅwe`,
    nr: (name, dist) => `📍 Indawo eseduze: *${name}* (${dist} km).\n\nUngafika bulula?\n1 — Iye\n2 — Awa, ngikhombise ezinye`
  },

  facility_confirmed: {
    en: (name) => `✅ Go to *${name}*.\n\nSafe travels. We will check in with you in 48 hours.`,
    zu: (name) => `✅ Yana ku-*${name}*.\n\nUhambe kahle. Sizokubuza emva kwamahora angu-48.`,
    xh: (name) => `✅ Yiya ku-*${name}*.\n\nUhambe kakuhle. Siza kukubuza emva kweeyure ezingama-48.`,
    af: (name) => `✅ Gaan na *${name}*.\n\nVeilige reis. Ons sal oor 48 uur by jou inskakel.`,
    nso: (name, dist) => `✅ Yaa go *${name}*.\n\nO sepele gabotse. Re tla go botšiša morago ga diiri tše 48.`,
    tn: (name) => `✅ Ya go *${name}*.\n\nO tsamae sentle. Re tla go botsa morago ga diura di le 48.`,
    st: (name) => `✅ Eya ho *${name}*.\n\nO tsamae hantle. Re tla o botsa kamora hora tse 48.`,
    ts: (name) => `✅ Famba u ya eka *${name}*.\n\nU famba kahle. Hi ta ku vutisa endzhaku ka tiawara ta 48.`,
    ss: (name) => `✅ Hamba uye ku-*${name}*.\n\nUhambe kahle. Sitakubutsa emvakwema-awa langu-48.`,
    ve: (name) => `✅ Iyani kha *${name}*.\n\nNi tshimbile zwavhuḓi. Ri ḓo ni vhudzisa nga murahu ha awara dza 48.`,
    nr: (name) => `✅ Iya ku-*${name}*.\n\nUkhambe kuhle. Sizakubuza ngemva kwama-iri angu-48.`
  },

  facility_alternatives: {
    en: (facilities, firstName) => `Here are other options nearby:\n${facilities}\n\n0 — Go back to the first suggestion${firstName ? ' (*' + firstName + '*)' : ''}\n\nReply with the number of your choice.`,
    zu: (facilities, firstName) => `Nazi ezinye izindawo eziseduze:\n${facilities}\n\n0 — Buyela esiphakamisweni sokuqala${firstName ? ' (*' + firstName + '*)' : ''}\n\nPhendula ngenombolo oyikhethayo.`,
    xh: (facilities, firstName) => `Nazi ezinye iindawo ezikufutshane:\n${facilities}\n\n0 — Buyela kwisiphakamiso sokuqala${firstName ? ' (*' + firstName + '*)' : ''}\n\nPhendula ngenombolo oyikhethayo.`,
    af: (facilities, firstName) => `Hier is ander opsies naby:\n${facilities}\n\n0 — Gaan terug na die eerste voorstel${firstName ? ' (*' + firstName + '*)' : ''}\n\nAntwoord met die nommer van jou keuse.`,
    nso: (facilities, firstName) => `Tše ke mafelo a mangwe a kgauswi:\n${facilities}\n\n0 — Boela go keletšo ya mathomo${firstName ? ' (*' + firstName + '*)' : ''}\n\nAraba ka nomoro ya kgetho ya gago.`,
    tn: (facilities, firstName) => `Ke mafelo a mangwe a gaufi:\n${facilities}\n\n0 — Boela kwa kgakololong ya ntlha${firstName ? ' (*' + firstName + '*)' : ''}\n\nAraba ka nomoro ya kgetho ya gago.`,
    st: (facilities, firstName) => `Mona ke mafelo a mang a haufi:\n${facilities}\n\n0 — Khutlela kgakololong ya pele${firstName ? ' (*' + firstName + '*)' : ''}\n\nAraba ka nomoro ya kgetho ya hao.`,
    ts: (facilities, firstName) => `Leti i tindhawu tin'wana ta kusuhi:\n${facilities}\n\n0 — Tlhelela eka xiringanyeto xo sungula${firstName ? ' (*' + firstName + '*)' : ''}\n\nHlamula hi nomboro ya nhlawulo wa wena.`,
    ss: (facilities, firstName) => `Nati letinye tindzawo letisetfuze:\n${facilities}\n\n0 — Buyela esiphakamisweni sekucala${firstName ? ' (*' + firstName + '*)' : ''}\n\nPhendvula ngenombolo yalokukhetsa kwakho.`,
    ve: (facilities, firstName) => `Hafha ndi huṅwe fhethu hu re tsini:\n${facilities}\n\n0 — Humbelani u vhuyelela kha tshiṅwelo tsha u thoma${firstName ? ' (*' + firstName + '*)' : ''}\n\nFhindulani nga nomboro ya khetho yaṋu.`,
    nr: (facilities, firstName) => `Nazi ezinye iindawo ezisetjhezi:\n${facilities}\n\n0 — Buyela esiphakamisweni sokuthoma${firstName ? ' (*' + firstName + '*)' : ''}\n\nPhendula ngenomboro yalokukhetha kwakho.`
  },

  // ==================== FOLLOW-UP ====================
  follow_up: {
    en: `Hi, you contacted BIZUSIZO 2 days ago. How are your symptoms?
1. Better ✅
2. The same ➡️
3. Worse ⚠️`,
    zu: `Sawubona, usithintile eBIZUSIZO ezinsukwini ezi-2 ezedlule. Zinjani izimpawu zakho?
1. Zingcono ✅
2. Ziyafana ➡️
3. Zimbi kakhulu ⚠️`,
    xh: `Molo, uqhagamshelane neBIZUSIZO kwiintsuku ezi-2 ezidlulileyo. Zinjani iimpawu zakho?
1. Zibhetele ✅
2. Ziyafana ➡️
3. Zimbi ngakumbi ⚠️`,
    af: `Hallo, jy het 2 dae gelede BIZUSIZO gekontak. Hoe is jou simptome?
1. Beter ✅
2. Dieselfde ➡️
3. Erger ⚠️`,
    nso: `Thobela, o ikgokagantše le BIZUSIZO matšatši a 2 a go feta. Dika tša gago di bjang?
1. Di kaone ✅
2. Di swana ➡️
3. Di mpefetše ⚠️`,
    tn: `Dumela, o ikgolagantse le BIZUSIZO malatsi a 2 a a fetileng. Matshwao a gago a ntse jang?
1. A botoka ✅
2. A tshwana ➡️
3. A maswe go feta ⚠️`,
    st: `Lumela, o ikopantse le BIZUSIZO matsatsi a 2 a fetileng. Matshwao a hao a jwang?
1. A betere ✅
2. A tshwana ➡️
3. A mpe ho feta ⚠️`,
    ts: `Xewani, u ti tshikelele na BIZUSIZO masiku ya 2 ya hundzi. Swikombiso swa wena swi njhani?
1. Swi antswa ✅
2. Swi fanana ➡️
3. Swi tika ku tlula ⚠️`,
    ss: `Sawubona, usitsintsile eBIZUSIZO emalangeni la-2 langetulu. Tinjani timphawu takho?
1. Tincono ✅
2. Tiyafana ➡️
3. Timbi kakhulu ⚠️`,
    ve: `Aa, no kwama BIZUSIZO maḓuvha a 2 o fhelaho. Zwiga zwaṋu zwi hani?
1. Zwo khwiṋa ✅
2. Zwi a fana ➡️
3. Zwo ṱoḓa u ṱavhanya ⚠️`,
    nr: `Lotjha, usitjheje ku-BIZUSIZO emalangeni la-2 langaphambili. Iimpawu zakho zinjani?
1. Zincono ✅
2. Ziyafana ➡️
3. Zimbi khulu ⚠️`
  },

  follow_up_better: {
    en: '✅ Glad you are feeling better. No further action needed. Stay well!',
    zu: '✅ Siyajabula ukuthi uzizwa ngcono. Akukho okunye okudingekayo. Hlala kahle!',
    xh: '✅ Siyavuya ukuba uziva ngcono. Akukho nto yimbi efunekayo. Hlala kakuhle!',
    af: '✅ Bly jy voel beter. Geen verdere aksie nodig nie. Bly gesond!',
    nso: '✅ Re thabile ge o ikwa kaone. Ga go nyakega selo gape. Phela gabotse!',
    tn: '✅ Re itumetse fa o ikutlwa botoka. Ga go tlhokege sepe gape. Nna sentle!',
    st: '✅ Re thabile ha o ikutlwa betere. Ha ho hlokahale letho hape. Phela hantle!',
    ts: '✅ Hi tsakile leswaku u titwa u antswa. A ku na swo engetela swi lavekaka. Tshama kahle!',
    ss: '✅ Siyajabula kutsi utiva uncono. Akukho lokunye lokufunekako. Hlala kahle!',
    ve: '✅ Ri takala ngauri ni ḓipfa khwine. A hu na zwiṅwe zwi ṱoḓeaho. Dzulani zwavhuḓi!',
    nr: '✅ Siyathaba kuthi uzizwa ncono. Akukho okhunye okutlhogekako. Hlala kuhle!'
  },

  follow_up_same: {
    en: '🟡 Please continue monitoring your symptoms. Visit a clinic if they do not improve in the next 24 hours.',
    zu: '🟡 Qhubeka uqaphelisisa izimpawu zakho. Vakashela umtholampilo uma zingabi ngcono emahoreni angu-24.',
    xh: '🟡 Qhubeka ujonga iimpawu zakho. Tyelela ikliniki ukuba azibhetele kwiiyure ezingama-24.',
    af: '🟡 Hou asseblief aan om simptome te monitor. Besoek \'n kliniek as dit nie binne 24 uur verbeter nie.',
    nso: '🟡 Tšwela pele o šetša dika tša gago. Etela kiliniki ge di sa kaone ka diiri tše 24.',
    tn: '🟡 Tswelela o ela tlhoko matshwao a gago. Etela kliniki fa a sa tokafale ka diura di le 24.',
    st: '🟡 Tswela pele o sheba matshwao a hao. Etela kliniki haeba a sa tokafale ka hora tse 24.',
    ts: '🟡 Yisa emahlweni u vona swikombiso swa wena. Endzela kliniki loko swi nga antswa hi tiawara ta 24.',
    ss: '🟡 Chubeka ucaphelisise timphawu takho. Vakashela ikliniki uma tingabi ncono ngema-awa langu-24.',
    ve: '🟡 Bveledzani u sedza zwiga zwaṋu. Dalani kiliniki arali zwi sa khwiṋi nga awara dza 24.',
    nr: '🟡 Ragela phambili uqale iimpawu zakho. Vakatjhela ikliniki uma zingabi ncono ngema-iri angu-24.'
  },

  follow_up_worse: {
    en: '⚠️ Your symptoms may be worsening. A nurse has been notified and will review your case. If it is an emergency, call *10177* now.',
    zu: '⚠️ Izimpawu zakho zingase zibe zimbi. Unesi wazisiwe futhi uzobheka udaba lwakho. Uma kuphuthumile, shaya *10177* manje.',
    xh: '⚠️ Iimpawu zakho zisenokuba zimbi. Umongikazi wazisiwe kwaye uza kuhlola udaba lwakho. Ukuba yingxakeko, tsalela *10177* ngoku.',
    af: '⚠️ Jou simptome mag vererger. \'n Verpleegster is in kennis gestel. As dit \'n noodgeval is, bel *10177* nou.',
    nso: '⚠️ Dika tša gago di ka mpefala. Mooki o tsebišitšwe. Ge e le tšhoganetšo, leletša *10177* bjale.',
    tn: '⚠️ Matshwao a gago a ka nna a maswe. Mooki o itsisiwe. Fa e le tshoganyetso, leletsa *10177* jaanong.',
    st: '⚠️ Matshwao a hao a ka mpefala. Mooki o tsebisitswe. Haeba ke tshohanyetso, letsetsa *10177* hona joale.',
    ts: '⚠️ Swikombiso swa wena swi nga tika. Nesi u tivisiwe. Loko ku ri xihatla, ringela *10177* sweswi.',
    ss: '⚠️ Timphawu takho tingaba timbi. Nesi watiwe. Uma kuyinto lesheshisako, shayela *10177* nyalo.',
    ve: '⚠️ Zwiga zwaṋu zwi nga vha zwi khou ṱavhanya. Nese o ḓivhadzwa. Arali i tshoganetso, founelani *10177* zwino.',
    nr: '⚠️ Iimpawu zakho zingaba zimbi. Unesi utjhejisiwe. Uma kuphuthumako, ringela *10177* nje.'
  },

  // ==================== LOCATION REQUEST ====================
  request_location: {
    en: '📍 Please share your location so we can find the nearest facility.\n\nTap the 📎 (attachment) button → Location → Send your current location.',
    zu: '📍 Sicela uthumele indawo yakho ukuze sithole indawo yokulapha eseduze.\n\nCindezela inkinobho ye-📎 → Indawo → Thumela indawo yakho yamanje.',
    xh: '📍 Nceda wabelane ngendawo yakho ukuze sifumane indawo yokugula ekufutshane.\n\nCofa iqhosha le-📎 → Indawo → Thumela indawo yakho yangoku.',
    af: '📍 Deel asseblief jou ligging sodat ons die naaste fasiliteit kan vind.\n\nTik die 📎 knoppie → Ligging → Stuur jou huidige ligging.',
    nso: '📍 Hle abelana lefelo la gago gore re hwetše lefelo la kalafo la kgauswi.\n\nTobetša konopo ya 📎 → Lefelo → Romela lefelo la gago la bjale.',
    tn: '📍 Tswee-tswee abelana lefelo la gago gore re bone lefelo la kalafi le le gaufi.\n\nTobetsa konopo ya 📎 → Lefelo → Romela lefelo la gago la jaanong.',
    st: '📍 Ka kopo arolelana sebaka sa hao hore re fumane lefelo la bophelo bo botle le haufi.\n\nTobetsa konopo ya 📎 → Sebaka → Romela sebaka sa hao sa hajwale.',
    ts: '📍 Hi kombela u avelana ndhawu ya wena leswaku hi kuma ndhawu yo kufumela ya kusuhi.\n\nSindzisa bhatani ya 📎 → Ndhawu → Rhumela ndhawu ya wena ya sweswi.',
    ss: '📍 Sicela wabelane ngendzawo yakho sitewutfola indzawo yelatjhwa lesesedvuze.\n\nCindzetela inkinobho ye-📎 → Indzawo → Tfumela indzawo yakho yamanje.',
    ve: '📍 Ri humbela ni kovhele fhethu haṋu uri ri wane fhethu ha u alafhiwa hu re tsini.\n\nDindani bhatani ya 📎 → Fhethu → Rumelani fhethu haṋu ha zwino.',
    nr: '📍 Sibawa wabelane nendawo yakho bona sithole indawo yokulatjhwa eseduze.\n\nCindezela inkinobho ye-📎 → Indawo → Thumela indawo yakho yanje.'
  },

  // ==================== CHRONIC CONDITION SCREENING ====================
  chronic_screening: {
    en: `Before we continue, do you take medication for any of these conditions? (Reply with the numbers, e.g. "1,3" or "0" for none)

0. None
1. 💊 HIV / ARVs
2. 🩸 High blood pressure
3. 🍬 Diabetes (sugar)
4. ❤️ Heart condition
5. 🫁 Asthma / Lung condition
6. 🧠 Epilepsy
7. 💊 Other chronic medication`,

    zu: `Ngaphambi kokuthi siqhubeke, ingabe uthatha umuthi walezi zifo? (Phendula ngenombolo, isib. "1,3" noma "0" uma kungekho)

0. Lutho
1. 💊 HIV / Ama-ARV
2. 🩸 Igazi eliphakeme
3. 🍬 Ushukela (Diabetes)
4. ❤️ Isifo senhliziyo
5. 🫁 Isifuba / Iphaphu
6. 🧠 Isifo sokuwa (Epilepsy)
7. 💊 Omunye umuthi wamahlalakhona`,

    xh: `Phambi kokuba siqhubeke, ingaba uthatha amayeza ezi zifo? (Phendula ngenombolo, umz. "1,3" okanye "0" ukuba akukho)

0. Akukho
1. 💊 HIV / Ii-ARV
2. 🩸 Uxinzelelo lwegazi
3. 🍬 Iswekile (Diabetes)
4. ❤️ Isifo sentliziyo
5. 🫁 Isifuba / Imiphunga
6. 🧠 Isifo sokuwa (Epilepsy)
7. 💊 Esinye isigulo esinganyangekiyo`,

    af: `Voordat ons voortgaan, neem jy medikasie vir enige van hierdie toestande? (Antwoord met die nommers, bv. "1,3" of "0" vir geen)

0. Geen
1. 💊 MIV / ARV's
2. 🩸 Hoë bloeddruk
3. 🍬 Diabetes (suiker)
4. ❤️ Harttoestand
5. 🫁 Asma / Longtoestand
6. 🧠 Epilepsie
7. 💊 Ander chroniese medikasie`,

    nso: `Pele re tšwela pele, a o nwa dihlare tša malwetši a? (Araba ka dinomoro, mohlala "1,3" goba "0" ge e le gore ga go na)

0. Ga go na
1. 💊 HIV / Dihlare tša ARV
2. 🩸 Madi a go phagama
3. 🍬 Bolwetši bja swikiri
4. ❤️ Bolwetši bja pelo
5. 🫁 Sefuba / Maphephu
6. 🧠 Bolwetši bja go wa
7. 💊 Dihlare tše dingwe tša go se fole`,

    tn: `Pele re tswelela, a o nwa melemo ya malwetse a? (Araba ka dinomoro, sk. "1,3" kgotsa "0" fa go sena)

0. Ga go na
1. 💊 HIV / Melemo ya ARV
2. 🩸 Madi a kwa godimo
3. 🍬 Bolwetse jwa sukiri
4. ❤️ Bolwetse jwa pelo
5. 🫁 Sefuba / Matshwafo
6. 🧠 Bolwetse jwa go wa
7. 💊 Melemo e mengwe ya go sa fole`,

    st: `Pele re tswela pele, na o nwa dihlare tsa malwetse ana? (Araba ka dinomoro, mohlala "1,3" kapa "0" ha ho na)

0. Ha ho na
1. 💊 HIV / Dihlare tsa ARV
2. 🩸 Madi a phahameng
3. 🍬 Lefu la tsoekere
4. ❤️ Lefu la pelo
5. 🫁 Sefuba / Matshwafo
6. 🧠 Lefu la ho wa
7. 💊 Dihlare tse ding tsa malwetse a sa foleng`,

    ts: `Loko hi nga si ya emahlweni, xana u nwa mirhi ya mavabyi lama? (Hlamula hi tinomboro, xik. "1,3" kumbe "0" loko ku ri hava)

0. Ku hava
1. 💊 HIV / Mirhi ya ARV
2. 🩸 Ngati ya le henhla
3. 🍬 Vuvabyi bya xwikiri
4. ❤️ Vuvabyi bya mbilu
5. 🫁 Xifuva / Maphapha
6. 🧠 Vuvabyi bya ku wa
7. 💊 Mirhi yin'wana ya mavabyi ya ku nga heli`,

    ss: `Ngaphambi kwekutsi sichubeke, uyawanata yini emitsi yaletifo? (Phendvula ngetinombolo, sib. "1,3" noma "0" uma kungekho)

0. Kute
1. 💊 HIV / Ema-ARV
2. 🩸 Ingati lephakeme
3. 🍬 Sifo seswikili
4. ❤️ Sifo senhlitiyo
5. 🫁 Sifuba / Timphaphu
6. 🧠 Sifo sekuwa
7. 💊 Leminye imitsi yetifo letingapheli`,

    ve: `Phanḓa ha musi ri sa athu ya phanḓa, naa ni khou nwa mushonga wa malwadze aya? (Fhindulani nga dinomboro, tsumbo "1,3" kana "0" arali hu si na)

0. A hu na
1. 💊 HIV / Mushonga wa ARV
2. 🩸 Malofha a ṱhahani
3. 🍬 Vhulwadze ha swigiri
4. ❤️ Vhulwadze ha mbilu
5. 🫁 Tshifuva / Maṱhaha
6. 🧠 Vhulwadze ha u wa
7. 💊 Muṅwe mushonga wa vhulwadze vhu sa folaho`,

    nr: `Ngaphambi kobana siragele phambili, uyawasela na imitjhi yobulwelibu? (Phendula ngenomboro, isib. "1,3" namkha "0" uma kungekho)

0. Akukho
1. 💊 HIV / Ama-ARV
2. 🩸 Iingazi eziphezulu
3. 🍬 Isifo seswigiri
4. ❤️ Isifo senhliziyo
5. 🫁 Isifuba / Iphaphu
6. 🧠 Isifo sokuwa
7. 💊 Eminye imitjhi yeenzifo ezingapheliko`
  },

  chronic_screening_saved: {
    en: '✅ Thank you. This helps us give you better guidance.',
    zu: '✅ Siyabonga. Lokhu kusisiza sikunikeze iseluleko esingcono.',
    xh: '✅ Enkosi. Oku kusinceda sikunike iingcebiso ezingcono.',
    af: '✅ Dankie. Dit help ons om jou beter leiding te gee.',
    nso: '✅ Re a leboga. Se se re thuša go go fa maele a kaone.',
    tn: '✅ Re a leboga. Se se re thusa go go fa kgakololo e e botoka.',
    st: '✅ Re a leboha. Sena se re thusa ho u fa tataiso e ntle.',
    ts: '✅ Hi khensa. Leswi swi hi pfuna ku ku nyika switsundzuxo swo antswa.',
    ss: '✅ Siyabonga. Loku kusisita sikunikete teluleko lencono.',
    ve: '✅ Ri a livhuwa. Izwi ḽi ri thusa u ni ṋea vhulivhisi ha khwine.',
    nr: '✅ Siyathokoza. Lokhu kusisiza sikunikele isinqophiso esingcono.'
  },

  // ==================== IDENTITY CAPTURE ====================
  ask_first_name: {
    en: 'What is your first name? (As it appears on your ID)\n\nType your name:',
    zu: 'Ubani igama lakho? (Njengoba libhalwe ku-ID yakho)\n\nBhala igama lakho:',
    xh: 'Ngubani igama lakho? (Njengoko libhalwe kwi-ID yakho)\n\nBhala igama lakho:',
    af: 'Wat is jou voornaam? (Soos op jou ID)\n\nTik jou naam:',
    nso: 'Leina la gago ke mang? (Bjalo ka ge le ngwadilwe go ID ya gago)\n\nNgwala leina la gago:',
    tn: 'Leina la gago ke mang? (Jaaka le kwadilwe mo go ID ya gago)\n\nKwala leina la gago:',
    st: 'Lebitso la hao ke mang? (Jwaleka ha le ngotsweng ho ID ya hao)\n\nNgola lebitso la hao:',
    ts: 'Vito ra wena i mani? (Tanihileswi ri ngwaleke eka ID ya wena)\n\nTsala vito ra wena:',
    ss: 'Ngubani libito lakho? (Njengoba libhaliwe ku-ID yakho)\n\nBhala libito lakho:',
    ve: 'Dzina \u1e3daṋu ndi \u1e3difhio? (Sa zwine \u1e3da vha \u1e3do ṅwalwa kha ID yaṋu)\n\nṄwalani dzina \u1e3daṋu:',
    nr: 'Ngubani ibizo lakho? (Njengoba libhaliwe ku-ID yakho)\n\nTlola ibizo lakho:',
  },

  ask_surname: {
    en: (firstName) => `Thank you, *${firstName}*.\n\nWhat is your surname / family name?\n\nType your surname:`,
    zu: (firstName) => `Siyabonga, *${firstName}*.\n\nIsibongo sakho ubani?\n\nBhala isibongo sakho:`,
    xh: (firstName) => `Enkosi, *${firstName}*.\n\nFani yakho ngubani?\n\nBhala ifani yakho:`,
    af: (firstName) => `Dankie, *${firstName}*.\n\nWat is jou van?\n\nTik jou van:`,
    nso: (firstName) => `Re a leboga, *${firstName}*.\n\nSefane sa gago ke mang?\n\nNgwala sefane sa gago:`,
    tn: (firstName) => `Re a leboga, *${firstName}*.\n\nSefane sa gago ke mang?\n\nKwala sefane sa gago:`,
    st: (firstName) => `Re a leboha, *${firstName}*.\n\nFane ya hao ke mang?\n\nNgola fane ya hao:`,
    ts: (firstName) => `Hi khensa, *${firstName}*.\n\nXivongo xa wena i mani?\n\nTsala xivongo xa wena:`,
    ss: (firstName) => `Siyabonga, *${firstName}*.\n\nSibongo sakho ngubani?\n\nBhala sibongo sakho:`,
    ve: (firstName) => `Ri a livhuwa, *${firstName}*.\n\nTshina tsha haṋu ndi tshifhio?\n\nṄwalani tshina tsha haṋu:`,
    nr: (firstName) => `Siyathokoza, *${firstName}*.\n\nIsibongo sakho ngubani?\n\nTlola isibongo sakho:`,
  },

  ask_dob: {
    en: 'What is your date of birth?\n\nType it like this: *DD-MM-YYYY*\nExample: *15-03-1992*',
    zu: 'Usuku lwakho lokuzalwa luyini?\n\nBhala kanje: *DD-MM-YYYY*\nIsibonelo: *15-03-1992*',
    xh: 'Umhla wakho wokuzalwa ngowuphi?\n\nBhala ngolu hlobo: *DD-MM-YYYY*\nUmzekelo: *15-03-1992*',
    af: 'Wat is jou geboortedatum?\n\nTik dit so: *DD-MM-YYYY*\nVoorbeeld: *15-03-1992*',
    nso: 'Letšatšikgwedi la gago la matswalo ke lefe?\n\nNgwala ka tsela ye: *DD-MM-YYYY*\nMohlala: *15-03-1992*',
    tn: 'Letsatsi la gago la matsalo ke lefe?\n\nKwala ka tsela e: *DD-MM-YYYY*\nSekai: *15-03-1992*',
    st: 'Letsatsi la hao la tswalo ke lefe?\n\nNgola ka tsela ena: *DD-MM-YYYY*\nMohlala: *15-03-1992*',
    ts: 'Siku ra wena ro velekiwa hi rini?\n\nTsala hi ndlela leyi: *DD-MM-YYYY*\nXikombiso: *15-03-1992*',
    ss: 'Lusuku lwakho lwekutalwa luyini?\n\nBhala kanje: *DD-MM-YYYY*\nSibonelo: *15-03-1992*',
    ve: 'Ḓuvha \u1e3daṋu \u1e3da mabebo ndi \u1e3difhio?\n\nṄwalani nga nḓila iyi: *DD-MM-YYYY*\nTsumbo: *15-03-1992*',
    nr: 'Ilanga lakho lokubelethwa liyini?\n\nTlola ngalendlela: *DD-MM-YYYY*\nIsibonelo: *15-03-1992*',
  },

  ask_sex: {
    en: 'What is your sex?\n\n1 — Male\n2 — Female',
    zu: 'Ubulili bakho yini?\n\n1 — Owesilisa\n2 — Owesifazane',
    xh: 'Isini sakho siyintoni?\n\n1 — Indoda\n2 — Ibhinqa',
    af: 'Wat is jou geslag?\n\n1 — Manlik\n2 — Vroulik',
    nso: 'Bong ba gago ke eng?\n\n1 — Monna\n2 — Mosadi',
    tn: 'Bong jwa gago ke eng?\n\n1 — Monna\n2 — Mosadi',
    st: 'Boleng ba hao ke eng?\n\n1 — Monna\n2 — Mosadi',
    ts: 'Rimbewu ra wena i yini?\n\n1 — Wanuna\n2 — Wansati',
    ss: 'Bulili bakho buyini?\n\n1 — Lomdvuna\n2 — Lomfati',
    ve: 'Mbeu yaṋu ndi ifhio?\n\n1 — Munna\n2 — Musadzi',
    nr: 'Ubulili bakho buyini?\n\n1 — Indoda\n2 — Umfazi',
  },

  identity_confirmed: {
    en: (name, surname) => `✅ Thank you, *${name} ${surname}*. This helps the clinic prepare your file before you arrive.`,
    zu: (name, surname) => `✅ Siyabonga, *${name} ${surname}*. Lokhu kusiza umtholampilo ulungise ifayela lakho ngaphambi kokuthi ufike.`,
    xh: (name, surname) => `✅ Enkosi, *${name} ${surname}*. Oku kunceda ikliniki ilungise ifayile yakho phambi kokuba ufike.`,
    af: (name, surname) => `✅ Dankie, *${name} ${surname}*. Dit help die kliniek om jou l\u00EAer voor te berei voor jy aankom.`,
    nso: (name, surname) => `✅ Re a leboga, *${name} ${surname}*. Se se thuša kiliniki go lokišetša faele ya gago pele o fihla.`,
    tn: (name, surname) => `✅ Re a leboga, *${name} ${surname}*. Se se thusa kliniki go baakanya faele ya gago pele o goroga.`,
    st: (name, surname) => `✅ Re a leboha, *${name} ${surname}*. Sena se thusa kliniki ho lokisetsa faele ya hao pele o fihla.`,
    ts: (name, surname) => `✅ Hi khensa, *${name} ${surname}*. Leswi swi pfuna kliniki ku lulamisa fayili ya wena u nga si fika.`,
    ss: (name, surname) => `✅ Siyabonga, *${name} ${surname}*. Loku kusita ikliniki ilungise ifayili yakho ungakefiki.`,
    ve: (name, surname) => `✅ Ri a livhuwa, *${name} ${surname}*. Izwi \u1e3di thusa kiliniki u lugisa faela yaṋu ni sa athu u swika.`,
    nr: (name, surname) => `✅ Siyathokoza, *${name} ${surname}*. Lokhu kusiza ikliniki ilungiselele ifayili yakho ungakafiki.`,
  },

  // ==================== RETURNING VS NEW PATIENT ====================
  ask_returning: {
    en: (facilityName) => `Have you been to *${facilityName}* before?\n\n1 — Yes, I have a file there\n2 — No, this is my first visit\n3 — I'm not sure`,
    zu: (facilityName) => `Ingabe uke waya ku-*${facilityName}* ngaphambili?\n\n1 — Yebo, nginefayela khona\n2 — Cha, ngivakashela okokuqala\n3 — Angiqiniseki`,
    xh: (facilityName) => `Ingaba ukhe waya ku-*${facilityName}* ngaphambili?\n\n1 — Ewe, ndinefayile apho\n2 — Hayi, yindwendwelo yam yokuqala\n3 — Andiqinisekanga`,
    af: (facilityName) => `Was jy al voorheen by *${facilityName}*?\n\n1 — Ja, ek het 'n l\u00EAer daar\n2 — Nee, dit is my eerste besoek\n3 — Ek is nie seker nie`,
    nso: (facilityName) => `A o kile wa ya go *${facilityName}* peleng?\n\n1 — Ee, ke na le faele moo\n2 — Aowa, ke ketelo ya ka ya mathomo\n3 — Ga ke na bonnete`,
    tn: (facilityName) => `A o kile wa ya kwa *${facilityName}* pele?\n\n1 — Ee, ke na le faele koo\n2 — Nnyaa, ke ketelo ya me ya ntlha\n3 — Ga ke na bonnete`,
    st: (facilityName) => `Na o kile wa ya ho *${facilityName}* pele?\n\n1 — E, ke na le faele moo\n2 — Tjhe, ke ketelo ya ka ya pele\n3 — Ha ke na bonnete`,
    ts: (facilityName) => `Xana u tshame u ya eka *${facilityName}* khale?\n\n1 — Ina, ndzi na fayili kwalaho\n2 — Ee-ee, ku endzela ka mina ko sungula\n3 — A ndzi tiyiseki`,
    ss: (facilityName) => `Sewuke waya ku-*${facilityName}* ngaphambilini?\n\n1 — Yebo, nginefayili lapho\n2 — Cha, kuvakashela kwami kwekucala\n3 — Angikacini`,
    ve: (facilityName) => `Naa no ṱalela kha *${facilityName}* kale?\n\n1 — Ee, ndi na faela henefho\n2 — Hai, ndi u dalela hanga ha u thoma\n3 — A thi na vhungoho`,
    nr: (facilityName) => `Sewuke waya ku-*${facilityName}* ngaphambilini?\n\n1 — Iye, nginefayili lapho\n2 — Awa, kuvakathela kwami kokuthoma\n3 — Angikaqiniseki`,
  },

  returning_yes: {
    en: '📁 Good — the clinic will look for your file before you arrive.',
    zu: '📁 Kuhle — umtholampilo uzofuna ifayela lakho ngaphambi kokuthi ufike.',
    xh: '📁 Kulungile — ikliniki iza kukhangela ifayile yakho phambi kokuba ufike.',
    af: '📁 Goed — die kliniek sal jou l\u00EAer soek voor jy aankom.',
    nso: '📁 Go botse — kiliniki e tla nyaka faele ya gago pele o fihla.',
    tn: '📁 Go siame — kliniki e tla batla faele ya gago pele o goroga.',
    st: '📁 Ho lokile — kliniki e tla batla faele ya hao pele o fihla.',
    ts: '📁 Swa saseka — kliniki yi ta lava fayili ya wena u nga si fika.',
    ss: '📁 Kuhle — ikliniki itawufuna ifayili yakho ungakefiki.',
    ve: '📁 Ndi zwavhuḓi — kiliniki i ḓo ṱoḓa faela yaṋu ni sa athu u swika.',
    nr: '📁 Kuhle — ikliniki izakufuna ifayili yakho ungakafiki.',
  },

  returning_new: {
    en: '🆕 No problem — the clinic will create a new file for you. This saves time when you arrive.',
    zu: '🆕 Akukho nkinga — umtholampilo uzokwenza ifayela elisha. Lokhu kongela isikhathi uma ufika.',
    xh: '🆕 Akukho ngxaki — ikliniki iza kwenza ifayile entsha. Oku kongela ixesha xa ufika.',
    af: '🆕 Geen probleem — die kliniek sal \'n nuwe l\u00EAer skep. Dit bespaar tyd wanneer jy aankom.',
    nso: '🆕 Ga go bothata — kiliniki e tla dira faele ye mpsha. Se se boloka nako ge o fihla.',
    tn: '🆕 Ga go bothata — kliniki e tla dira faele e ntšhwa. Se se boloka nako fa o goroga.',
    st: '🆕 Ha ho bothata — kliniki e tla etsa faele e ncha. Sena se boloka nako ha o fihla.',
    ts: '🆕 Ku hava xiphiqo — kliniki yi ta endla fayili leyintshwa. Leswi swi hlayisa nkarhi loko u fika.',
    ss: '🆕 Kute inkinga — ikliniki itakwenta ifayili lensha. Loku kongela sikhatsi nawufika.',
    ve: '🆕 A hu na thaidzo — kiliniki i ḓo ita faela ntswa. Izwi \u1e3di vhulungela tshifhinga musi ni tshi swika.',
    nr: '🆕 Akukho ikinga — ikliniki izakwenza ifayili etja. Lokhu kusindisa isikhathi nawufika.',
  },

  returning_unsure: {
    en: '📋 No problem. The clinic will check when you arrive. Your name and date of birth will help them find your file quickly.',
    zu: '📋 Akukho nkinga. Umtholampilo uzohlola uma ufika. Igama lakho nosuku lokuzalwa kuzosiza bakuthole ifayela ngokushesha.',
    xh: '📋 Akukho ngxaki. Ikliniki iza kukhangela xa ufika. Igama lakho nomhla wokuzalwa kuya kunceda bafumane ifayile ngokukhawuleza.',
    af: '📋 Geen probleem. Die kliniek sal kontroleer wanneer jy aankom. Jou naam en geboortedatum sal hulle help om jou l\u00EAer vinnig te vind.',
    nso: '📋 Ga go bothata. Kiliniki e tla lekola ge o fihla. Leina la gago le letšatšikgwedi la matswalo di tla ba thuša go hwetša faele ya gago ka pela.',
    tn: '📋 Ga go bothata. Kliniki e tla tlhola fa o goroga. Leina la gago le letsatsi la matsalo di tla ba thusa go bona faele ya gago ka bonako.',
    st: '📋 Ha ho bothata. Kliniki e tla hlahloba ha o fihla. Lebitso la hao le letsatsi la tswalo di tla ba thusa ho fumana faele ya hao kapele.',
    ts: '📋 Ku hava xiphiqo. Kliniki yi ta kambela loko u fika. Vito ra wena na siku ro velekiwa swi ta va pfuna ku kuma fayili ya wena hi ku hatlisa.',
    ss: '📋 Kute inkinga. Ikliniki itahlola nawufika. Libito lakho nelusuku lwekutalwa kutawubasita batfole ifayili yakho masinyane.',
    ve: '📋 A hu na thaidzo. Kiliniki i ḓo sedza musi ni tshi swika. Dzina \u1e3daṋu na ḓuvha \u1e3da mabebo zwi ḓo vha thusa u wana faela yaṋu nga u ṱavhanya.',
    nr: '📋 Akukho ikinga. Ikliniki izakuhlola nawufika. Ibizo lakho nelanga lokubelethwa kuzabasiza bafumane ifayili yakho msinyana.',
  },

  // ==================== STUDY PARTICIPATION ====================
  study_participation: {
    en: `Are you taking part in the BIZUSIZO research study at a clinic?

1 \u2014 Yes, I am a study participant
2 \u2014 No, I am just using BIZUSIZO for myself`,

    zu: `Ingabe uyahlanganyela ocwaningweni lwe-BIZUSIZO emtholampilo?

1 \u2014 Yebo, ngingumhlanganyeli wocwaningo
2 \u2014 Cha, ngisebenzisa i-BIZUSIZO nje`,

    xh: `Ingaba uthatha inxaxheba kuphando lwe-BIZUSIZO ekliniki?

1 \u2014 Ewe, ndingumthathi-nxaxheba wophando
2 \u2014 Hayi, ndisebenzisa i-BIZUSIZO nje`,

    af: `Neem jy deel aan die BIZUSIZO-navorsingstudie by 'n kliniek?

1 \u2014 Ja, ek is 'n studiedeelnemer
2 \u2014 Nee, ek gebruik BIZUSIZO net vir myself`,

    nso: `A o tšea karolo ka dinyakišišong tša BIZUSIZO kiliniki?

1 \u2014 Ee, ke motšeakarolo wa dinyakišišo
2 \u2014 Aowa, ke šomiša BIZUSIZO fela`,

    tn: `A o tsaya karolo mo patlisisong ya BIZUSIZO kwa kliniki?

1 \u2014 Ee, ke motsayakarolo wa patlisiso
2 \u2014 Nnyaa, ke dirisa BIZUSIZO fela`,

    st: `Na o nka karolo dipatlisisong tsa BIZUSIZO kliniki?

1 \u2014 E, ke monkakarolo wa dipatlisiso
2 \u2014 Tjhe, ke sebedisa BIZUSIZO feela`,

    ts: `Xana u teka xiave eka ndzavisiso wa BIZUSIZO ekliniki?

1 \u2014 Ina, ndzi muteki-xiave wa ndzavisiso
2 \u2014 Ee-ee, ndzi tirhisa BIZUSIZO ntsena`,

    ss: `Uyahlanganyela yini kulucwaningo lwe-BIZUSIZO ekliniki?

1 \u2014 Yebo, ngingumhlanganyeli welucwaningo
2 \u2014 Cha, ngisebentisa i-BIZUSIZO nje`,

    ve: `Naa ni khou shela mulenzhe kha \u1e71hoḓisiso ya BIZUSIZO kiliniki?

1 \u2014 Ee, ndi mushelamulenzhe wa \u1e71hoḓisiso
2 \u2014 Hai, ndi khou shumisa BIZUSIZO fhedzi`,

    nr: `Uyahlanganyela na kurhubhululo lwe-BIZUSIZO ekliniki?

1 \u2014 Iye, ngingumhlanganyeli werhubhululo
2 \u2014 Awa, ngisebenzisa i-BIZUSIZO kwaphela`
  },

  // ==================== STUDY CODE ====================
  study_code: {
    en: (code) => `🔢 Your study code is: *${code}*\n\nPlease show this code to the research assistant when you arrive at the clinic. It helps us link your BIZUSIZO triage to your clinic visit.\n\nYou can also type "code" at any time to see your code again.`,
    zu: (code) => `🔢 Ikhodi yakho yocwaningo ithi: *${code}*\n\nSicela ukhombise le khodi kumcwaningi uma ufika emtholampilo. Isisiza sixhumanise i-triage yakho ye-BIZUSIZO nokuvakatshela kwakho emtholampilo.\n\nUngabhala "code" noma nini ukubona ikhodi yakho futhi.`,
    xh: (code) => `🔢 Ikhowudi yakho yophando ithi: *${code}*\n\nNceda ubonise le khowudi kumphandi xa ufika ekliniki. Isinceda sidibanise i-triage yakho ye-BIZUSIZO notyelelo lwakho ekliniki.\n\nUngabhala "code" nanini na ukubona ikhowudi yakho kwakhona.`,
    af: (code) => `🔢 Jou studiekode is: *${code}*\n\nWys asseblief hierdie kode aan die navorsingsassistent wanneer jy by die kliniek aankom. Dit help ons om jou BIZUSIZO-triage aan jou kliniekbesoek te koppel.\n\nJy kan ook enige tyd "code" tik om jou kode weer te sien.`,
    nso: (code) => `🔢 Khoutu ya gago ya dinyakišišo ke: *${code}*\n\nHle bontšha khoutu ye go monyakišiši ge o fihla kiliniki. E re thuša go hokaganya triage ya gago ya BIZUSIZO le go etela ga gago kiliniki.\n\nO ka ngwala "code" nako efe goba efe go bona khoutu ya gago gape.`,
    tn: (code) => `🔢 Khoutu ya gago ya patlisiso ke: *${code}*\n\nTswee-tswee bontsha khoutu e go mmatlisisi fa o goroga kliniki. E re thusa go golaganya triage ya gago ya BIZUSIZO le go etela ga gago kliniki.\n\nO ka kwala "code" nako nngwe le nngwe go bona khoutu ya gago gape.`,
    st: (code) => `🔢 Khoutu ya hao ya dipatlisiso ke: *${code}*\n\nKa kopo bontsha khoutu ena ho mofuputsi ha o fihla kliniki. E re thusa ho hokahanya triage ya hao ya BIZUSIZO le ketelo ya hao kliniki.\n\nO ka ngola "code" nako efe kapa efe ho bona khoutu ya hao hape.`,
    ts: (code) => `🔢 Khodi ya wena ya ndzavisiso i ri: *${code}*\n\nHi kombela u kombisa khodi leyi eka mulavisisi loko u fika ekliniki. Yi hi pfuna ku hlanganisa triage ya wena ya BIZUSIZO na ku endzela ka wena ekliniki.\n\nU nga tsala "code" nkarhi wun'wana na wun'wana ku vona khodi ya wena nakambe.`,
    ss: (code) => `🔢 Ikhodi yakho yekucwaninga itsi: *${code}*\n\nSicela ukhombise lekhodi kumcwaningi nawufika ekliniki. Isisita sihlanganise i-triage yakho ye-BIZUSIZO nekuvakashela kwakho ekliniki.\n\nUngabhala "code" nanoma nini kubona ikhodi yakho futsi.`,
    ve: (code) => `🔢 Khoudu yaṋu ya ṱhoḓisiso ndi: *${code}*\n\nRi humbela ni sumbedze khoudu iyi kha muṱoḓisisi musi ni tshi swika kiliniki. I ri thusa u ṱanganya triage yaṋu ya BIZUSIZO na u dalela haṋu kiliniki.\n\nNi nga ṅwala "code" tshifhinga tshiṅwe na tshiṅwe u vhona khoudu yaṋu hafhu.`,
    nr: (code) => `🔢 Ikhodi yakho yerhubhululo ithi: *${code}*\n\nSibawa ukhombise lekhodi kumrhubhululi nawufika ekliniki. Isisiza sihlanganise i-triage yakho ye-BIZUSIZO nekuvakatjhela kwakho ekliniki.\n\nUngatlola "code" nanini ukubona ikhodi yakho godu.`
  },

  // ==================== CATEGORY FOLLOW-UP ====================
  category_detail_prompt: {
    en: (category) => `You selected: *${category}*\n\nHow bad is it?\n1 — Mild (I can do my daily activities)\n2 — Moderate (it's affecting my daily activities)\n3 — Severe (I can barely function)\n\nOr type your symptoms in your own words.\nYou can also send a voice note 🎤`,
    zu: (category) => `Ukhethe: *${category}*\n\nKumbi kangakanani?\n1 — Kancane (ngingenza imisebenzi yami yansuku zonke)\n2 — Maphakathi (kuthinta imisebenzi yami)\n3 — Kakhulu (angikwazi nhlobo)\n\nNoma uchaze izimpawu zakho ngamazwi akho.\nUngathuma ivoice note 🎤`,
    xh: (category) => `Ukhethe: *${category}*\n\nKumbi kangakanani?\n1 — Kancinane (ndingenza imisebenzi yam yemihla ngemihla)\n2 — Maphakathi (kuchaphazela imisebenzi yam)\n3 — Kakhulu (andikwazi kwaphela)\n\nOkanye uchaze iimpawu zakho ngamazwi akho.\nUngathuma ivoice note 🎤`,
    af: (category) => `Jy het gekies: *${category}*\n\nHoe erg is dit?\n1 — Lig (ek kan my daaglikse aktiwiteite doen)\n2 — Matig (dit affekteer my daaglikse aktiwiteite)\n3 — Ernstig (ek kan skaars funksioneer)\n\nOf beskryf jou simptome in jou eie woorde.\nJy kan ook \'n stemnota stuur 🎤`,
    nso: (category) => `O kgethile: *${category}*\n\nGo mpe gakaakang?\n1 — Gannyane (nka dira mediro ya ka ya tšatši le lengwe le le lengwe)\n2 — Magareng (go ama mediro ya ka)\n3 — Kudu (nka se kgone ka tsela)\n\nGoba hlaloša dika tša gago ka mantšu a gago.\nO ka romela voice note 🎤`,
    tn: (category) => `O tlhophile: *${category}*\n\nGo maswe go le kana kang?\n1 — Bonnye (nka dira ditiro tsa ka tsa letsatsi le letsatsi)\n2 — Magareng (go ama ditiro tsa ka)\n3 — Thata (nka se kgone gotlhelele)\n\nKgotsa tlhalosa matshwao a gago ka mafoko a gago.\nO ka romela voice note 🎤`,
    st: (category) => `O kgethile: *${category}*\n\nHo mpe hakaakang?\n1 — Hanyane (nka etsa mesebetsi ya ka ya letsatsi le letsatsi)\n2 — Mahareng (ho ama mesebetsi ya ka)\n3 — Haholo (nka se tsebe ho sebetsa)\n\nKapa hlalosa matshwao a hao ka mantswe a hao.\nO ka romela voice note 🎤`,
    ts: (category) => `U hlawule: *${category}*\n\nSwi bihile ku fikela kwihi?\n1 — Swi nyane (ndzi nga endla mintirho ya mina ya siku na siku)\n2 — Swi ringana (swi khumbha mintirho ya mina)\n3 — Swi tika (a ndzi koti na swintsongo)\n\nKumbe u hlamusela swikombiso swa wena hi marito ya wena.\nU nga rhumela voice note 🎤`,
    ss: (category) => `Ukhetse: *${category}*\n\nKumbi kangakanani?\n1 — Kancane (ngingenta imisebenti yami yemalanga onkhe)\n2 — Emkhatsini (iyangiphazamisa)\n3 — Kakhulu (angikwati kutenta lutfo)\n\nNoma uchaze timphawu takho ngamagama akho.\nUngathuma voice note 🎤`,
    ve: (category) => `No nanga: *${category}*\n\nZwi vhavha hani?\n1 — Zwiṱuku (ndi a kona u ita mishumo yanga ya ḓuvha na ḓuvha)\n2 — Vhukati (zwi khou kwama mishumo yanga)\n3 — Vhukuma (a thi koni na luthihi)\n\nKana ni ṱalutshedze zwiga zwaṋu nga maipfi aṋu.\nNi nga rumela voice note 🎤`,
    nr: (category) => `Ukhethe: *${category}*\n\nKumbi kangangani?\n1 — Kancani (ngingenza imisebenzi yami yemalanga)\n2 — Maphakathi (iyangithinta imisebenzi yami)\n3 — Khulu (angikghoni ukwenza litho)\n\nNamkha uchaze iimpawu zakho ngamagama wakho.\nUngathuma voice note 🎤`
  },

  // ==================== VOICE NOTE PROMPT ====================
  voice_note_prompt: {
    en: '🎤 You can send a voice note describing your symptoms. Speak clearly and tell us:\n\n• What is wrong\n• When it started\n• How bad it is\n\nWe will listen to your message and help you.',
    zu: '🎤 Ungathuma ivoice note uchaze izimpawu zakho. Khuluma ngokucacile usitshele:\n\n• Kwenzakalani\n• Kuqale nini\n• Kumbi kangakanani\n\nSizolalela umyalezo wakho sikusize.',
    xh: '🎤 Ungathumela ivoice note uchaze iimpawu zakho. Thetha ngokucacileyo usixelele:\n\n• Kwenzeka ntoni\n• Kuqale nini\n• Kumbi kangakanani\n\nSiya kuwumamela umyalezo wakho sikuncede.',
    af: '🎤 Jy kan \'n stemnota stuur wat jou simptome beskryf. Praat duidelik en vertel ons:\n\n• Wat is fout\n• Wanneer het dit begin\n• Hoe erg is dit\n\nOns sal na jou boodskap luister en jou help.',
    nso: '🎤 O ka romela voice note o hlaloša dika tša gago. Bolela gabotse o re botše:\n\n• Go direga eng\n• Go thomile neng\n• Go mpe gakaakang\n\nRe tla theetša molaetša wa gago re go thuše.',
    tn: '🎤 O ka romela voice note o tlhalosa matshwao a gago. Bua sentle o re bolelele:\n\n• Go diragala eng\n• Go simolotse leng\n• Go maswe go le kana kang\n\nRe tla reetsa molaetsa wa gago re go thuse.',
    st: '🎤 O ka romela voice note o hlalosa matshwao a hao. Bua hantle o re bolelle:\n\n• Ho etsahalang\n• Ho qalile neng\n• Ho mpe hakaakang\n\nRe tla mamela molaetsa wa hao re o thuse.',
    ts: '🎤 U nga rhumela voice note u hlamusela swikombiso swa wena. Vulavula kahle u hi byela:\n\n• Ku humelela yini\n• Ku sungule rini\n• Ku bihile ku fikela kwihi\n\nHi ta yingisela mahungu ya wena hi ku pfuna.',
    ss: '🎤 Ungathuma voice note uchaza timphawu takho. Khuluma kahle usitjele:\n\n• Kwentekani\n• Kuchale nini\n• Kumbi kangakanani\n\nSitalilalela umyalezo wakho sikusite.',
    ve: '🎤 Ni nga rumela voice note ni tshi ṱalutshedza zwiga zwaṋu. Ambelani zwavhuḓi ni ri vhudze:\n\n• Hu khou itea mini\n• Zwo thoma lini\n• Zwi vhavha hani\n\nRi ḓo thetshelesa mulaedza waṋu ri ni thuse.',
    nr: '🎤 Ungathumela voice note uchaza iimpawu zakho. Khuluma kuhle usitjele:\n\n• Kwenzekani\n• Kuthome nini\n• Kumbi kangangani\n\nSizakulalela umlayezo wakho sikusize.'
  },

  // ==================== VOICE NOTE RECEIVED ====================
  voice_note_received: {
    en: '🎤 Voice note received. Let me process your message...',
    zu: '🎤 Ivoice note itholakele. Ake ngicubungule umyalezo wakho...',
    xh: '🎤 Ivoice note ifunyenwe. Mandiqwalasele umyalezo wakho...',
    af: '🎤 Stemnota ontvang. Laat ek jou boodskap verwerk...',
    nso: '🎤 Voice note e amogetšwe. Eka ke šome molaetša wa gago...',
    tn: '🎤 Voice note e amogetšwe. A ke dire molaetsa wa gago...',
    st: '🎤 Voice note e amohelehile. Ha ke sebetse molaetsa wa hao...',
    ts: '🎤 Voice note yi amukelekile. A ndzi tirhe mahungu ya wena...',
    ss: '🎤 Voice note itfolakele. Angisebente umlayezo wakho...',
    ve: '🎤 Voice note yo ṱanganedzwa. Kha ndi shumise mulaedza waṋu...',
    nr: '🎤 Voice note itholakele. Angisebenze umlayezo wakho...'
  },

  // ==================== THINKING INDICATOR ====================
  // Sent immediately when symptoms are received, before the AI processes.
  // Gives the patient feedback that the system is working — prevents
  // the "is this thing on?" feeling during the 2-5 second AI call.
  thinking: {
    en: '🔍 Assessing your symptoms...',
    zu: '🔍 Sihlola izimpawu zakho...',
    xh: '🔍 Sihlola iimpawu zakho...',
    af: '🔍 Ons assesseer jou simptome...',
    nso: '🔍 Re lekola dika tša gago...',
    tn: '🔍 Re sekaseka matshwao a gago...',
    st: '🔍 Re hlahloba matshwao a hao...',
    ts: '🔍 Hi kambela swikombiso swa wena...',
    ss: '🔍 Sihlola timphawu takho...',
    ve: '🔍 Ri khou sedzulusa zwiga zwaṋu...',
    nr: '🔍 Sihlola iimpawu zakho...'
  },

  // ==================== HELPFUL TIPS ====================
  // Sent after triage results so the patient knows how to navigate
  tips: {
    en: '\n💡 *Tips:*\nType *0* — new consultation\nType *language* — change language\nType *code* — show your reference number',
    zu: '\n💡 *Amathiphu:*\nBhala *0* — ukuxoxa okusha\nBhala *ulimi* — shintsha ulimi\nBhala *code* — khombisa inombolo yakho',
    xh: '\n💡 *Amathiphu:*\nBhala *0* — incoko entsha\nBhala *ulwimi* — tshintsha ulwimi\nBhala *code* — bonisa inombolo yakho',
    af: '\n💡 *Wenke:*\nTik *0* — nuwe konsultasie\nTik *taal* — verander taal\nTik *code* — wys jou verwysingsnommer',
    nso: '\n💡 *Maele:*\nNgwala *0* — poledišano ye mpsha\nNgwala *polelo* — fetola polelo\nNgwala *code* — bontšha nomoro ya gago',
    tn: '\n💡 *Maele:*\nKwala *0* — puisano e ntšhwa\nKwala *puo* — fetola puo\nKwala *code* — bontsha nomoro ya gago',
    st: '\n💡 *Maele:*\nNgola *0* — puisano e ncha\nNgola *puo* — fetola puo\nNgola *code* — bontsha nomoro ya hao',
    ts: '\n💡 *Switsundzuxo:*\nTsala *0* — nkani leyintshwa\nTsala *ririmi* — cinca ririmi\nTsala *code* — kombisa nomboro ya wena',
    ss: '\n💡 *Ema-thiphu:*\nBhala *0* — ingcoco lensha\nBhala *lulwimi* — shintja lulwimi\nBhala *code* — khombisa inombolo yakho',
    ve: '\n💡 *Nyeletshedzo:*\nṄwalani *0* — nyambedzano ntswa\nṄwalani *luambo* — shandukani luambo\nṄwalani *code* — sumbedzani nomboro yaṋu',
    nr: '\n💡 *Amathiphu:*\nTlola *0* — ingcoco etja\nTlola *ilimi* — tjhentjha ilimi\nTlola *code* — khombisa inomboro yakho'
  },

  // ==================== SYSTEM TIMEOUT / OUTAGE FALLBACK ====================
  // Sent when the system cannot process a message within 15 seconds
  // (load shedding, Railway outage, Supabase downtime, etc.)
  // Advises BOTH calling 10177 AND going to nearest clinic/hospital
  // because ambulance response in many SA areas is unreliable.
  system_timeout: {
    en: '⚠️ We are experiencing technical difficulties and cannot process your message right now.\n\n🚨 *If this is an emergency:*\n• Call *10177* (ambulance) or *084 124* (ER24)\n• Go to your nearest clinic or hospital immediately — do not wait for an ambulance\n\nWe will try to respond as soon as the system is back. We apologise for the inconvenience.',
    zu: '⚠️ Sinezinkinga zobuchwepheshe futhi asikwazi ukucubungula umyalezo wakho okwamanje.\n\n🚨 *Uma kuphuthumile:*\n• Shaya *10177* (i-ambulensi) noma *084 124* (ER24)\n• Yana emtholampilo noma esibhedlela esiseduze MANJE — ungalindi i-ambulensi\n\nSizozama ukuphendula uma uhlelo selubuyile. Siyaxolisa ngokuphazamiseka.',
    xh: '⚠️ Sinengxaki yobuchwepheshe kwaye asikwazi ukucubungula umyalezo wakho okwangoku.\n\n🚨 *Ukuba yingxakeko:*\n• Tsalela *10177* (i-ambulensi) okanye *084 124* (ER24)\n• Yiya ekliniki okanye esibhedlele esikufutshane NGOKU — musa ukulinda i-ambulensi\n\nSiza kuzama ukuphendula xa inkqubo ibuyile. Siyaxolisa ngokuphazamisa.',
    af: '⚠️ Ons ondervind tegniese probleme en kan nie jou boodskap nou verwerk nie.\n\n🚨 *As dit \'n noodgeval is:*\n• Bel *10177* (ambulans) of *084 124* (ER24)\n• Gaan na jou naaste kliniek of hospitaal DADELIK — moenie wag vir \'n ambulans nie\n\nOns sal probeer antwoord sodra die stelsel terug is. Ons vra om verskoning.',
    nso: '⚠️ Re itemogela mathata a theknolotši gomme re ka se kgone go šoma molaetša wa gago ga bjale.\n\n🚨 *Ge e le tšhoganetšo:*\n• Leletša *10177* (ambulense) goba *084 124* (ER24)\n• Yaa kiliniki goba sepetleleng sa kgauswi BJALE — o se ke wa ema ambulense\n\nRe tla leka go araba ge tshepedišo e bušitšwe. Re kgopela tshwarelo.',
    tn: '⚠️ Re itemogela mathata a thekenoloji mme re ka se kgone go dira molaetsa wa gago jaanong.\n\n🚨 *Fa e le tshoganyetso:*\n• Leletsa *10177* (ambulense) kgotsa *084 124* (ER24)\n• Ya kliniki kgotsa bookelong jo bo gaufi JAANONG — o se ka wa ema ambulense\n\nRe tla leka go araba fa tshedimosetso e boetse. Re kopa maitshwarelo.',
    st: '⚠️ Re itemohela mathata a theknoloji mme re ke ke ra sebetsa molaetsa wa hao hona joale.\n\n🚨 *Haeba ke tshohanyetso:*\n• Letsetsa *10177* (ambulense) kapa *084 124* (ER24)\n• Eya kliniki kapa sepetlele se haufi HONA JOALE — o se ke oa ema ambulense\n\nRe tla leka ho araba ha sistimi e boeile. Re kopa tshwarelo.',
    ts: '⚠️ Hi kumile swiphiqo swa thekinoloji naswona a hi koti ku tirha mahungu ya wena sweswi.\n\n🚨 *Loko ku ri xihatla:*\n• Ringela *10177* (ambulense) kumbe *084 124* (ER24)\n• Famba u ya ekliniki kumbe exibedlhele xa kusuhi SWESWI — u nga yimi ambulense\n\nHi ta ringeta ku hlamula loko sisiteme yi vuyile. Hi kombela ku khomela.',
    ss: '⚠️ Sinenkinga yebuchwepheshe futsi asikwati kusebenta umlayezo wakho nyalo.\n\n🚨 *Uma kusheshisa:*\n• Shayela *10177* (i-ambulensi) noma *084 124* (ER24)\n• Hamba uye ekliniki noma esibhedlela leseduze NYALO — ungalindzi i-ambulensi\n\nSitawutama kuphendvula uma luhlelo selubuyile. Siyacolisa ngekuphazamisa.',
    ve: '⚠️ Ri khou ṱangana na thaidzo dza thekhinolodzhi nahone a ri koni u shumisa mulaedza waṋu zwino.\n\n🚨 *Arali i tshoganetso:*\n• Founelani *10177* (ambulense) kana *084 124* (ER24)\n• Iyani kiliniki kana sibadela tshi re tsini ZWINO — ni songo lindela ambulense\n\nRi ḓo lingedza u fhindula musi sisiteme i tshi vhuya. Ri humbela pfarelo.',
    nr: '⚠️ Sinekinga yebuchwepheshe futhi asikghoni ukusebenza umlayezo wakho nje.\n\n🚨 *Uma kuphuthumako:*\n• Ringela *10177* (i-ambulensi) namkha *084 124* (ER24)\n• Iya ekliniki namkha esibhedlela esiseduze NJE — ungalindeli i-ambulensi\n\nSizakuzama ukuphendula uma uhlelo selubuyile. Siyacolisa ngokuphazamisa.'
  }

};

// ================================================================
// LANGUAGE HELPERS
// ================================================================
const LANG_MAP = { '1':'en','2':'zu','3':'xh','4':'af','5':'nso','6':'tn','7':'st','8':'ts','9':'ss','10':'ve','11':'nr' };

// ================================================================
// CATEGORY DESCRIPTIONS — maps menu numbers to clinical context
// ================================================================
// When a patient picks a category, this context is prepended to their
// symptom detail so the AI has meaningful information to triage.
const CATEGORY_DESCRIPTIONS = {
  '1': 'Breathing problems / Chest pain',
  '2': 'Head injury / Headache',
  '3': 'Pregnancy related complaint',
  '4': 'Bleeding / Wound',
  '5': 'Fever / Flu / Cough',
  '6': 'Stomach problems / Vomiting',
  '7': 'Child illness (paediatric)',
  '8': 'Medication / Chronic condition',
  '9': 'Bone / Joint / Back pain',
  '10': 'Mental health concern',
  '11': 'Allergy / Rash / Skin problem',
  '12': 'Other',
  '13': 'Speak to a human / send voice note',
};

// ================================================================
// VOICE NOTE TRANSCRIPTION
// ================================================================
// WhatsApp voice notes arrive as audio messages with a media ID.
// We download the audio, send it to Claude for transcription,
// and use the transcribed text for triage.
// This is critical for SA context where many patients prefer
// speaking over typing, especially in African languages.
// ================================================================
async function downloadWhatsAppMedia(mediaId) {
  // Step 1: Get media URL from Meta
  const urlRes = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
  });
  const urlData = await urlRes.json();
  if (!urlData.url) return null;

  // Step 2: Download the actual audio file
  const audioRes = await fetch(urlData.url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
  });
  const buffer = await audioRes.buffer();
  return buffer;
}

async function transcribeVoiceNote(audioBuffer, lang) {
  const langNames = {
    en:'English', zu:'isiZulu', xh:'isiXhosa', af:'Afrikaans',
    nso:'Sepedi', tn:'Setswana', st:'Sesotho', ts:'Xitsonga',
    ss:'siSwati', ve:'Tshivenda', nr:'isiNdebele'
  };

  const base64Audio = audioBuffer.toString('base64');

  try {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `You are a medical transcription assistant for South Africa. Transcribe the patient's voice message accurately, preserving their exact words including any code-switching between languages. The patient likely speaks ${langNames[lang] || 'a South African language'}. Output ONLY the transcription — no commentary, no translation, no formatting. If you cannot understand the audio, respond with: TRANSCRIPTION_FAILED`,
      messages: [{
        role: 'user',
        content: [{
          type: 'document',
          source: { type: 'base64', media_type: 'audio/ogg', data: base64Audio }
        }, {
          type: 'text',
          text: 'Transcribe this voice message from a patient describing their health symptoms.'
        }]
      }]
    });

    const transcription = res.content[0].text.trim();
    if (transcription === 'TRANSCRIPTION_FAILED') return null;
    return transcription;
  } catch (e) {
    console.error('[VOICE] Transcription failed:', e.message);
    return null;
  }
}

function msg(key, lang, ...args) {
  const msgSet = MESSAGES[key];
  if (!msgSet) return '';
  // Check for _all (language-agnostic messages)
  if (msgSet._all) return msgSet._all;
  const template = msgSet[lang || 'en'] || msgSet['en'];
  if (typeof template === 'function') return template(...args);
  return template;
}

// ================================================================
// IMPROVED AI TRANSLATION — for dynamic/non-hardcoded content
// ================================================================
async function translateWithClaude(text, targetLang) {
  const langNames = {
    en:'English', zu:'isiZulu', xh:'isiXhosa', af:'Afrikaans',
    nso:'Sepedi', tn:'Setswana', st:'Sesotho', ts:'Xitsonga',
    ss:'siSwati', ve:'Tshivenda', nr:'isiNdebele'
  };

  const res = await anthropic.messages.create({
    model: TRANSLATION_MODEL,
    max_tokens: 400,
    system: `You are a South African language translator specialising in healthcare communication.

RULES:
- Translate into ${langNames[targetLang]} as spoken in everyday South African communities
- Use the way people ACTUALLY talk, not textbook/formal language
- For isiZulu: use Gauteng urban isiZulu, not deep rural KZN
- For isiXhosa: use everyday isiXhosa, not academic isiXhosa
- Medical terms: use the commonly understood term, not the clinical one
  - e.g. "sugar disease" not "diabetes mellitus" in African languages
  - e.g. "high blood" not "hypertension"
- Keep it warm and conversational — this is WhatsApp, not a medical textbook
- If a word has no good translation, keep it in English (e.g. "clinic", "ambulance")
- Return ONLY the translation, nothing else`,
    messages: [{ role: 'user', content: text }]
  });

  return res.content[0].text.trim();
}

// ================== TRIAGE (AI) ==================
// Model choice: claude-haiku-4-5-20251001 balances speed, cost, and
// capability for high-volume triage. Voice transcription uses Sonnet 4
// where accuracy is more critical. If budget permits, upgrade triage
// to Sonnet 4 for better multilingual performance.
const TRIAGE_MODEL = process.env.TRIAGE_MODEL || 'claude-haiku-4-5-20251001';
const TRANSLATION_MODEL = process.env.TRANSLATION_MODEL || 'claude-haiku-4-5-20251001';

async function runTriage(text, lang) {
  const res = await anthropic.messages.create({
    model: TRIAGE_MODEL,
    max_tokens: 300,
    system: `You are a clinical triage classifier for South Africa, aligned with the South African Triage Scale (SATS).

The input may be in any of South Africa's 11 official languages, including code-switching and township medical terminology (e.g. "sugar" = diabetes, "high blood" = hypertension, "ikhanda" = headache).

Classify the symptoms into one of: RED, ORANGE, YELLOW, GREEN.
Assign a confidence score 0-100.

SAFETY: When in doubt, classify UP (more urgent), never down.

Return ONLY valid JSON: {"triage_level":"RED|ORANGE|YELLOW|GREEN","confidence":0-100}`,
    messages: [{ role: 'user', content: text }]
  });

  try {
    return JSON.parse(res.content[0].text);
  } catch (e) {
    // If AI returns invalid JSON, escalate to human
    return { triage_level: 'ORANGE', confidence: 30 };
  }
}

// ================== RULES ENGINE ==================
// ================== SELF-CARE ADVICE (GREEN triage) ==================
// Generates symptom-specific home care advice for GREEN patients.
// Uses the same triage model for cost efficiency.
// Advice is practical, SA-context-aware, and avoids medical jargon.
async function generateSelfCareAdvice(symptomsText, lang) {
  const langNames = {
    en:'English', zu:'isiZulu', xh:'isiXhosa', af:'Afrikaans',
    nso:'Sepedi', tn:'Setswana', st:'Sesotho', ts:'Xitsonga',
    ss:'siSwati', ve:'Tshivenda', nr:'isiNdebele'
  };

  try {
    const res = await anthropic.messages.create({
      model: TRIAGE_MODEL,
      max_tokens: 300,
      system: `You are a South African community health advisor giving practical self-care advice via WhatsApp.

The patient has been triaged as GREEN (routine/non-urgent). Give them specific, actionable home care advice.

RULES:
- Write in ${langNames[lang] || 'English'} (everyday spoken language, not textbook)
- Keep it SHORT — max 5 bullet points, WhatsApp-friendly
- Use practical SA advice (e.g. "drink rooibos tea", "take Panado from the pharmacy")
- Reference affordable, available remedies (not expensive brands)
- Include ONE clear warning sign that means they should come to the clinic
- Do NOT diagnose — give care tips only
- Start with "💊 *Self-care tips:*" 
- End with "⚠️ Come to the clinic if: [one specific warning sign]"
- No greetings, no disclaimers, just the tips`,
      messages: [{ role: 'user', content: `Patient symptoms: ${symptomsText}` }]
    });

    const advice = res.content[0].text.trim();
    // Safety check: don't send if it looks like a diagnosis or is too long
    if (advice.length > 800 || advice.toLowerCase().includes('diagnos')) {
      return null;
    }
    return advice;
  } catch (e) {
    console.error('[SELF-CARE] AI generation failed:', e.message);
    return null;
  }
}

function applyClinicalRules(text, triage) {
  const lower = text.toLowerCase();

  // HARD OVERRIDES — SAFETY FIRST
  // English terms
  if (lower.includes('chest pain') && lower.includes('shortness of breath')) {
    return { triage_level: 'RED', confidence: 100, rule_override: 'cardiac_emergency' };
  }
  if (lower.includes('pregnant') && lower.includes('bleeding')) {
    return { triage_level: 'RED', confidence: 100, rule_override: 'obstetric_emergency' };
  }
  if (lower.includes('not breathing') || lower.includes('unconscious')) {
    return { triage_level: 'RED', confidence: 100, rule_override: 'airway_emergency' };
  }
  if (lower.includes('snake bite') || lower.includes('snakebite')) {
    return { triage_level: 'RED', confidence: 100, rule_override: 'envenomation' };
  }
  if (lower.includes('baby') && lower.includes('not breathing')) {
    return { triage_level: 'RED', confidence: 100, rule_override: 'neonatal_emergency' };
  }

  // isiZulu terms
  if (lower.includes('isifuba') && lower.includes('ukuphefumula')) {
    return { triage_level: 'RED', confidence: 100, rule_override: 'cardiac_emergency_zu' };
  }
  if (lower.includes('khulelwe') && lower.includes('opha')) {
    return { triage_level: 'RED', confidence: 100, rule_override: 'obstetric_emergency_zu' };
  }
  if (lower.includes('akaphefumuli') || lower.includes('uqulekile')) {
    return { triage_level: 'RED', confidence: 100, rule_override: 'airway_emergency_zu' };
  }
  if (lower.includes('inyoka') && lower.includes('luma')) {
    return { triage_level: 'RED', confidence: 100, rule_override: 'envenomation_zu' };
  }

  // isiXhosa terms
  if (lower.includes('isifuba') && lower.includes('ukuphefumla')) {
    return { triage_level: 'RED', confidence: 100, rule_override: 'cardiac_emergency_xh' };
  }
  if (lower.includes('khulelwe') && lower.includes('opha')) {
    return { triage_level: 'RED', confidence: 100, rule_override: 'obstetric_emergency_xh' };
  }

  // Afrikaans terms
  if (lower.includes('borspyn') && lower.includes('asem')) {
    return { triage_level: 'RED', confidence: 100, rule_override: 'cardiac_emergency_af' };
  }
  if (lower.includes('swanger') && lower.includes('bloei')) {
    return { triage_level: 'RED', confidence: 100, rule_override: 'obstetric_emergency_af' };
  }

  return triage;
}

// ================== FACILITY DATA (FROM SUPABASE) ==================
async function getFacilities() {
  const { data } = await supabase
    .from('facilities')
    .select('*');
  return data || [];
}

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function findNearestFacilities(patientLocation, type, limit = 3) {
  if (!patientLocation) return [];

  const facilities = await getFacilities();
  const results = [];

  for (const facility of facilities) {
    if (type && facility.type !== type) continue;

    const dist = getDistance(
      patientLocation.latitude,
      patientLocation.longitude,
      facility.latitude,
      facility.longitude
    );

    results.push({ ...facility, distance: Math.round(dist * 10) / 10 });
  }

  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, limit);
}

// ================== ROUTING ==================
// ================================================================
// AUTO-QUEUE: Add patient to clinic queue after facility confirmation
// ================================================================
// Maps triage level to queue type:
//   RED/ORANGE → fast_track
//   YELLOW → routine
//   GREEN → routine
//   UNKNOWN → walk_in

function triageToQueueType(triageLevel) {
  switch (triageLevel) {
    case 'RED': case 'ORANGE': return 'fast_track';
    case 'YELLOW': case 'GREEN': return 'routine';
    default: return 'walk_in';
  }
}

async function autoAddToQueue(patientId, from, session) {
  const triageLevel = session.lastTriage?.triage_level || 'UNKNOWN';
  const queueType = triageToQueueType(triageLevel);
  const facility = session.confirmedFacility;
  const lang = session.language || 'en';

  try {
    // Check if already in queue today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: existing } = await supabase
      .from('clinic_queue')
      .select('id')
      .eq('patient_id', patientId)
      .gte('checked_in_at', todayStart.toISOString())
      .in('status', ['waiting', 'in_consultation'])
      .limit(1);

    if (existing && existing.length > 0) {
      // Already in queue — don't add again
      return;
    }

    // Get next position in this queue
    const { data: lastInQueue } = await supabase
      .from('clinic_queue')
      .select('position')
      .eq('queue_type', queueType)
      .eq('status', 'waiting')
      .order('position', { ascending: false })
      .limit(1);

    const position = (lastInQueue && lastInQueue.length > 0)
      ? lastInQueue[0].position + 1
      : 1;

    // Build patient name from session
    const patientName = (session.firstName && session.surname)
      ? `${session.firstName} ${session.surname}`
      : null;

    // Add to queue
    await supabase.from('clinic_queue').insert({
      patient_id: patientId,
      patient_phone: from,
      patient_name: patientName,
      triage_level: triageLevel,
      triage_confidence: session.lastTriage?.confidence || null,
      symptoms_summary: session.lastSymptoms ? session.lastSymptoms.slice(0, 200) : null,
      queue_type: queueType,
      status: 'waiting',
      checked_in_at: new Date(),
      position,
      study_code: session.studyCode || null,
      notes: facility ? `Facility: ${facility.name}` : null,
      created_at: new Date(),
    });

    // Calculate estimated wait time
    const patientsAhead = position - 1;
    let estMinutes = null;

    // Get average wait from today's completed patients in same queue type
    const { data: completed } = await supabase
      .from('clinic_queue')
      .select('checked_in_at, called_at')
      .eq('queue_type', queueType)
      .eq('status', 'completed')
      .gte('checked_in_at', todayStart.toISOString())
      .not('called_at', 'is', null);

    if (completed && completed.length >= 2) {
      const waits = completed.map(p => {
        return (new Date(p.called_at) - new Date(p.checked_in_at)) / 60000;
      }).filter(w => w > 0 && w < 480); // Exclude outliers

      if (waits.length > 0) {
        const avgWait = Math.round(waits.reduce((a, b) => a + b, 0) / waits.length);
        estMinutes = patientsAhead * avgWait;
      }
    }

    // Fallback estimates if no data yet
    if (estMinutes === null) {
      const fallbackMinutes = { fast_track: 10, routine: 30, walk_in: 45 };
      estMinutes = patientsAhead * (fallbackMinutes[queueType] || 30);
    }

    // Send WhatsApp queue notification
    const queueNames = {
      fast_track: { en: 'Fast-Track (urgent)', zu: 'Esheshayo (kuphuthuma)', xh: 'Ekhawulezayo (kungxamisekile)', af: 'Spoedlyn (dringend)' },
      routine: { en: 'Routine', zu: 'Ejwayelekile', xh: 'Eqhelekileyo', af: 'Roetine' },
      walk_in: { en: 'Walk-In', zu: 'Ungena nje', xh: 'Ungena nje', af: 'Instap' },
    };

    const queueLabel = queueNames[queueType]?.[lang] || queueNames[queueType]?.['en'] || queueType;

    const waitMsg = {
      en: `📋 You have been added to the clinic queue.\n\n🏥 *${facility?.name || 'Clinic'}*\n📊 Queue: *${queueLabel}*\n👥 Position: *#${position}*${estMinutes > 0 ? `\n⏱️ Estimated wait: *~${estMinutes} minutes*` : ''}\n\nPlease arrive at the clinic. You will be called based on your position.\n\nThe clinic has your name and file information ready.`,
      zu: `📋 Usufakwe emugqeni wasemtholampilo.\n\n🏥 *${facility?.name || 'Umtholampilo'}*\n📊 Umugqa: *${queueLabel}*\n👥 Isikhundla: *#${position}*${estMinutes > 0 ? `\n⏱️ Isikhathi esilindelekile: *~${estMinutes} imizuzu*` : ''}\n\nSicela ufike emtholampilo. Uzobizwa ngokwesikhundla sakho.\n\nUmtholampilo unegama lakho nemininingwane yefayela lakho.`,
      xh: `📋 Ufakiwe kumgca wekliniki.\n\n🏥 *${facility?.name || 'Ikliniki'}*\n📊 Umgca: *${queueLabel}*\n👥 Indawo: *#${position}*${estMinutes > 0 ? `\n⏱️ Ixesha elilindelekileyo: *~${estMinutes} imizuzu*` : ''}\n\nNceda ufike ekliniki. Uya kubizwa ngokwendawo yakho.\n\nIkliniki inegama lakho nolwazi lwefayile yakho.`,
      af: `📋 Jy is by die kliniek se tou gevoeg.\n\n🏥 *${facility?.name || 'Kliniek'}*\n📊 Tou: *${queueLabel}*\n👥 Posisie: *#${position}*${estMinutes > 0 ? `\n⏱️ Geskatte wagtyd: *~${estMinutes} minute*` : ''}\n\nKom asseblief by die kliniek aan. Jy sal geroep word volgens jou posisie.\n\nDie kliniek het jou naam en lêerinligting gereed.`,
    };

    await sendWhatsAppMessage(from, waitMsg[lang] || waitMsg['en']);

    console.log(`[AUTO-QUEUE] Patient ${patientId} added to ${queueType} queue at position ${position} (est. ${estMinutes} min)`);

  } catch (e) {
    console.error('[AUTO-QUEUE] Failed to add patient to queue:', e.message);
    // Don't fail the flow — queue is a nice-to-have, not critical
  }
}

// ================== CLINIC HOURS HELPER ==================
// Most SA PHC clinics operate 07:00–16:00 weekdays
// Some extend to 16:30 or 17:00, but 07–16 is the safe window
function isClinicOpen() {
  const now = new Date();
  // Convert to SAST (UTC+2)
  const sast = new Date(now.getTime() + (2 * 60 * 60 * 1000));
  const hour = sast.getUTCHours();
  const day = sast.getUTCDay(); // 0=Sun, 6=Sat
  // Weekdays 07:00–16:00
  if (day >= 1 && day <= 5 && hour >= 7 && hour < 16) {
    return true;
  }
  return false;
}

function getTriagePathway(triageLevel) {
  switch (triageLevel) {
    case 'RED': return { pathway: 'ambulance', facilityType: 'hospital' };
    case 'ORANGE':
      // Time-aware: during clinic hours → clinic fast-track; after hours → hospital
      if (isClinicOpen()) {
        return { pathway: 'clinic_fast_track', facilityType: 'clinic' };
      }
      return { pathway: 'emergency_unit', facilityType: 'hospital' };
    case 'YELLOW': return { pathway: 'clinic_visit', facilityType: 'clinic' };
    default: return { pathway: 'self_care', facilityType: null };
  }
}

// ================================================================
// CCMDD MODULE — Chronic Medication Distribution & Dispensing
// STATUS: Architecture ready. Activate via FEATURES.CCMDD_ROUTING
// ================================================================
// INFORMED BY: Moeng M. (2025) "Patterns and Factors Associated with
// Deactivation of Adult Patients on CCMDD in North-West Province"
// Wits MPH — Key findings integrated:
//   - 96.6% deactivation rate in NMM District (16,266 patients)
//   - Top modifiable cause: patient defaulting (198/1070 documented)
//   - 67.8% HIV, 43.8% hypertension, 17% angina — multimorbidity common
//   - Rural geography compounds collection barriers
// ================================================================
// When active, this module:
// 1. Detects chronic medication patients (category 8: Medication/Chronic)
// 2. Identifies specific chronic conditions for tailored messaging
// 3. Checks if patient is stable (not acute symptoms on top of chronic)
// 4. Routes to nearest CCMDD pickup point instead of clinic
// 5. Runs escalating reminder chain (24h, 48h, 72h) to prevent defaulting
// 6. Captures reason for missed collection to build evidence base
// 7. Flags at-risk patients (multimorbid, elderly) for priority follow-up
// 8. Re-engages defaulted patients proactively
// ================================================================

// Supabase tables needed:
// ccmdd_pickup_points: id, name, type, latitude, longitude, operating_hours, address, province
// ccmdd_collections: id, patient_id, pickup_point_id, medication_type, scheduled_date,
//                    collected_at, status (scheduled/reminded/collected/missed/defaulted),
//                    missed_reason, reminder_count
// ccmdd_patient_profiles: patient_id, conditions (jsonb), risk_level, last_collection_date,
//                         consecutive_misses, total_collections, total_misses

const CCMDD_MESSAGES = {
  chronic_check: {
    en: `Are you here for a chronic medication refill?
1 — Yes, I need my regular medication
2 — No, I have new or worsening symptoms`,
    zu: `Ingabe ulapha ukuthola umuthi wakho wamahlalakhona?
1 — Yebo, ngidinga umuthi wami wejwayelekile
2 — Cha, nginezimpawu ezintsha noma ezimbi kakhulu`,
    xh: `Ingaba ulapha ukuza kuthatha amayeza akho aqhelekileyo?
1 — Ewe, ndifuna amayeza am aqhelekileyo
2 — Hayi, ndineempawu ezintsha okanye ezimbi ngakumbi`,
    af: `Is jy hier vir 'n chroniese medikasie hervulling?
1 — Ja, ek het my gereelde medikasie nodig
2 — Nee, ek het nuwe of erger simptome`,
  },

  // Condition identification — ask what they're collecting for
  condition_check: {
    en: `What medication do you collect? (Select all that apply)
1 — ARVs (HIV)
2 — Blood pressure / Hypertension
3 — Diabetes (sugar)
4 — Heart / Angina
5 — Asthma / Lung
6 — Epilepsy
7 — Other chronic medication`,
    zu: `Umuthi wani owuthathayo? (Khetha konke okufanele)
1 — Ama-ARV (HIV)
2 — Umuthi wegazi eliphakeme
3 — Ushukela (Diabetes)
4 — Inhliziyo / I-Angina
5 — Isifuba / Iphaphu
6 — Isifo sokuwa (Epilepsy)
7 — Omunye umuthi wamahlalakhona`,
    xh: `Yiyiphi imiyalelo oyithatayo? (Khetha konke okufanelekileyo)
1 — Ii-ARV (HIV)
2 — Uxinzelelo lwegazi
3 — Iswekile (Diabetes)
4 — Intliziyo / I-Angina
5 — Isifuba / Imiphunga
6 — Isifo sokuwa (Epilepsy)
7 — Esinye isigulo esinganyangekiyo`,
    af: `Watter medikasie haal jy af? (Kies alles wat van toepassing is)
1 — ARV's (MIV)
2 — Bloeddruk / Hipertensie
3 — Diabetes (suiker)
4 — Hart / Angina
5 — Asma / Long
6 — Epilepsie
7 — Ander chroniese medikasie`,
  },

  ccmdd_route: {
    en: (name, dist) => `💊 Your nearest medication pickup point is:\n*${name}* (${dist} km)\n\nYou can collect your chronic medication there without queuing at a clinic.\n\nCan you get there?\n1 — Yes\n2 — No, show alternatives`,
    zu: (name, dist) => `💊 Indawo yakho eseduze yokuthola umuthi:\n*${name}* (${dist} km)\n\nUngathola umuthi wakho wamahlalakhona lapho ngaphandle kokulinda emtholampilo.\n\nUngafika?\n1 — Yebo\n2 — Cha, ngikhombise ezinye`,
    xh: (name, dist) => `💊 Indawo yakho ekufutshane yokuthatha amayeza:\n*${name}* (${dist} km)\n\nUngathatha amayeza akho aqhelekileyo apho ngaphandle kokulinda ekliniki.\n\nUngafikelela?\n1 — Ewe\n2 — Hayi, ndibonise ezinye`,
    af: (name, dist) => `💊 Jou naaste medikasie-afhaal punt is:\n*${name}* (${dist} km)\n\nJy kan jou chroniese medikasie daar afhaal sonder om by 'n kliniek tou te staan.\n\nKan jy daar uitkom?\n1 — Ja\n2 — Nee, wys my ander`,
  },

  ccmdd_confirmed: {
    en: (name) => `✅ Go to *${name}* to collect your medication.\n\nRemember to bring your ID and prescription/clinic card.\n\nWe will remind you when your next collection is due.`,
    zu: (name) => `✅ Yana ku-*${name}* ukuthola umuthi wakho.\n\nKhumbula ukuletha i-ID yakho nekhadi lakho lasemtholampilo.\n\nSizokukhumbuza uma isikhathi sokuthatha umuthi olandelayo sesifikile.`,
    xh: (name) => `✅ Yiya ku-*${name}* ukuthatha amayeza akho.\n\nKhumbula ukuzisa i-ID yakho nekhadi lakho lasekliniki.\n\nSiza kukukhumbuza xa ixesha lokuthatha okulandelayo lifikile.`,
    af: (name) => `✅ Gaan na *${name}* om jou medikasie af te haal.\n\nOnthou om jou ID en voorskrif/kliniekkaart saam te bring.\n\nOns sal jou herinner wanneer jou volgende afhaal nodig is.`,
  },

  ccmdd_not_available: {
    en: '💊 CCMDD pickup is not yet available in your area. Please visit your nearest clinic for your medication refill.',
    zu: '💊 Indawo yokuthola umuthi ayikakafinyeleleki endaweni yakho okwamanje. Sicela uvakashele umtholampilo oseduze.',
    xh: '💊 Indawo yokuthatha amayeza ayikafumaneki kwindawo yakho okwangoku. Nceda utyelele ikliniki ekufutshane.',
    af: '💊 CCMDD-afhaal is nog nie in jou area beskikbaar nie. Besoek asseblief jou naaste kliniek.',
  },

  // ============ ESCALATING REMINDER CHAIN ============
  // Based on NMM data: defaulting is the #1 modifiable deactivation cause
  reminder_24h: {
    en: (name) => `💊 Reminder: Your medication is ready for collection at *${name}*.\n\nPlease collect today if possible. Your health depends on taking your medication consistently.`,
    zu: (name) => `💊 Isikhumbuzo: Umuthi wakho ulungele ukuthathwa ku-*${name}*.\n\nSicela uwuthathe namuhla uma kungenzeka. Impilo yakho incike ekuthatheni umuthi ngokuqhubekayo.`,
    xh: (name) => `💊 Isikhumbuzo: Amayeza akho alungile ukuthathwa ku-*${name}*.\n\nNceda uwathathe namhlanje ukuba kunokwenzeka. Impilo yakho ixhomekeke ekuthatheni amayeza rhoqo.`,
    af: (name) => `💊 Herinnering: Jou medikasie is gereed vir afhaal by *${name}*.\n\nHaal dit asseblief vandag af indien moontlik. Jou gesondheid hang af van konsekwente medikasie-gebruik.`,
  },

  reminder_48h: {
    en: (name) => `⚠️ Your medication at *${name}* has not been collected yet.\n\nMissing your medication can cause your condition to worsen. Please collect as soon as possible.\n\nHaving trouble getting there?\n1 — I will collect today\n2 — I cannot get to this location\n3 — I have a problem (tell us)`,
    zu: (name) => `⚠️ Umuthi wakho ku-*${name}* awukathathwa.\n\nUkungathathi umuthi kungabangela isimo sakho sibe sibi. Sicela uwuthathe ngokushesha.\n\nUnenkinga yokufika?\n1 — Ngizowuthatha namuhla\n2 — Angikwazi ukufika kule ndawo\n3 — Nginenkinga (sitshele)`,
    xh: (name) => `⚠️ Amayeza akho ku-*${name}* awakathathwa.\n\nUkungawathathi amayeza kunokubangela imeko yakho ibe mbi. Nceda uwathathe ngokukhawuleza.\n\nUnengxaki yokufika?\n1 — Ndiza kuwathatha namhlanje\n2 — Andikwazi ukufikelela kule ndawo\n3 — Ndinengxaki (sixelele)`,
    af: (name) => `⚠️ Jou medikasie by *${name}* is nog nie afgehaal nie.\n\nAs jy jou medikasie mis kan dit jou toestand vererger. Haal dit asseblief so gou moontlik af.\n\nSukkel jy om daar te kom?\n1 — Ek sal vandag afhaal\n2 — Ek kan nie by hierdie plek uitkom nie\n3 — Ek het 'n probleem (vertel ons)`,
  },

  reminder_72h_escalation: {
    en: `🔴 You have not collected your medication for 3 days.\n\nMissing medication puts your health at serious risk. A healthcare worker has been notified.\n\nPlease tell us what is preventing you from collecting:\n1 — Transport / distance problem\n2 — Cannot take time off work\n3 — Pickup point was closed when I went\n4 — Medication was not available\n5 — Side effects — I stopped taking medication\n6 — Other reason`,
    zu: `🔴 Awukathathi umuthi wakho izinsuku ezi-3.\n\nUkungathathi umuthi kubeka impilo yakho engozini enkulu. Isisebenzi sezempilo sazisiwe.\n\nSicela usitshele okukuvimbelayo:\n1 — Inkinga yezokuhamba / ibanga\n2 — Angikwazi ukuthola isikhathi emsebenzini\n3 — Indawo yokuthatha ivaliwe ngesikhathi ngifika\n4 — Umuthi ubungekho\n5 — Imiphumela emibi — ngiyekile ukuthatha umuthi\n6 — Esinye isizathu`,
    xh: `🔴 Awukawathathi amayeza akho iintsuku ezi-3.\n\nUkungawathathi amayeza kubeka impilo yakho emngciphekweni omkhulu. Umsebenzi wezempilo wazisiwe.\n\nNceda usixelele okukuthintelayo:\n1 — Ingxaki yothutho / umgama\n2 — Andikwazi ukufumana ixesha emsebenzini\n3 — Indawo yokuthatha ibivaliwe xa ndifika\n4 — Amayeza ebengatholakalanga\n5 — Imiphumo emibi — ndiyekile ukuthatha amayeza\n6 — Esinye isizathu`,
    af: `🔴 Jy het nie jou medikasie vir 3 dae afgehaal nie.\n\nOntbrekende medikasie plaas jou gesondheid in ernstige gevaar. 'n Gesondheidswerker is in kennis gestel.\n\nVertel ons asseblief wat jou verhinder:\n1 — Vervoer / afstand probleem\n2 — Kan nie tyd van werk af kry nie\n3 — Afhaal punt was toe toe ek gekom het\n4 — Medikasie was nie beskikbaar nie\n5 — Newe-effekte — ek het opgehou medikasie gebruik\n6 — Ander rede`,
  },

  // Response to missed-collection reasons
  missed_transport: {
    en: 'We understand. Let us find a closer pickup point for your next collection. Please share your location.',
    zu: 'Siyaqonda. Ake sithole indawo eseduze kakhulu yokuthatha umuthi wakho olandelayo. Sicela uthumele indawo yakho.',
    xh: 'Siyaqonda. Masifumane indawo ekufutshane ngakumbi yokuthatha amayeza akho alandelayo. Nceda uthumele indawo yakho.',
    af: 'Ons verstaan. Laat ons \'n nader afhaal punt vind vir jou volgende afhaal. Deel asseblief jou ligging.',
  },

  missed_work: {
    en: 'We understand. We are working on extended collection hours and weekend options. For now, you can ask someone you trust to collect on your behalf with your ID and clinic card.',
    zu: 'Siyaqonda. Sisebenza ngamahora engeziwe okuthatha nangezimpelasonto. Okwamanje, ungacela umuntu omethembayo ukuthi akuthathele ngokusebenzisa i-ID yakho nekhadi lakho.',
    xh: 'Siyaqonda. Sisebenza ngeeyure ezongezelelweyo zokuthatha nangempelaveki. Okwangoku, ungacela umntu omthembayo ukuba akuthathele nge-ID yakho nekhadi lakho.',
    af: 'Ons verstaan. Ons werk aan verlengde afhaal-ure en naweek-opsies. Vir nou kan jy iemand vertrou om namens jou af te haal met jou ID en kliniekkaart.',
  },

  missed_closed: {
    en: 'Thank you for telling us. We have logged this issue and will follow up with the pickup point. Please try again tomorrow, or we can suggest an alternative location.',
    zu: 'Siyabonga ngokusitshela. Siqophe le nkinga futhi sizokulandela nendawo yokuthatha. Sicela uzame futhi kusasa, noma singaphakamisa enye indawo.',
    xh: 'Enkosi ngokusixelela. Sibhale le ngxaki kwaye siza kulandela nendawo yokuthatha. Nceda uzame kwakhona ngomso, okanye sinokuphakamisa enye indawo.',
    af: 'Dankie dat jy ons laat weet. Ons het hierdie probleem aangeteken en sal opvolg. Probeer asseblief weer môre, of ons kan \'n alternatiewe plek voorstel.',
  },

  missed_no_stock: {
    en: 'Thank you for telling us. We have reported this stock issue. We will notify you as soon as your medication is available. We are sorry for the inconvenience.',
    zu: 'Siyabonga ngokusitshela. Sibike le nkinga yesitoko. Sizokwazisa uma umuthi wakho utholakalile. Siyaxolisa ngokuphazamisa.',
    xh: 'Enkosi ngokusixelela. Siyixele le ngxaki yesitoko. Siza kukwazisa xa amayeza akho efumaneka. Siyaxolisa ngokuphazamisa.',
    af: 'Dankie dat jy ons laat weet. Ons het hierdie voorraad probleem gerapporteer. Ons sal jou in kennis stel sodra jou medikasie beskikbaar is. Ons vra om verskoning.',
  },

  missed_side_effects: {
    en: '⚠️ Please do not stop taking your medication without speaking to a healthcare worker first. Stopping suddenly can be dangerous.\n\nA nurse has been notified and will contact you to discuss your side effects and explore alternatives.\n\nIf you feel very unwell, call *10177* or visit your nearest clinic.',
    zu: '⚠️ Sicela ungayeki ukuthatha umuthi wakho ngaphandle kokukhuluma nesisebenzi sezempilo kuqala. Ukuyeka kungazumeki kungaba yingozi.\n\nUnesi wazisiwe futhi uzokuxhumana nawe ukuxoxa ngemiphumela emibi nokuhlola ezinye izindlela.\n\nUma uzizwa ungaphilile kakhulu, shaya *10177* noma uvakashele umtholampilo oseduze.',
    xh: '⚠️ Nceda musa ukuyeka ukuthatha amayeza akho ngaphandle kokuthetha nomsebenzi wezempilo kuqala. Ukuyeka ngequbuliso kunobungozi.\n\nUmongikazi wazisiwe kwaye uya kuqhagamshelana nawe ukuxoxa ngemiphumo emibi nokuphonononga ezinye iindlela.\n\nUkuba uziva ungaphilanga kakhulu, tsalela *10177* okanye utyelele ikliniki ekufutshane.',
    af: '⚠️ Moet asseblief nie ophou met jou medikasie sonder om eers met \'n gesondheidswerker te praat nie. Skielike staking kan gevaarlik wees.\n\n\'n Verpleegster is in kennis gestel en sal jou kontak om newe-effekte te bespreek en alternatiewe te ondersoek.\n\nAs jy baie sleg voel, bel *10177* of besoek jou naaste kliniek.',
  },

  // Re-engagement for previously defaulted patients
  reengagement: {
    en: `Hello from BIZUSIZO 💊\n\nWe noticed you haven't collected your chronic medication recently. We know life gets busy and collecting can be difficult.\n\nWe want to help you get back on track. Your health matters.\n\nWould you like help finding a convenient pickup point?\n1 — Yes, help me collect my medication\n2 — I am collecting elsewhere now\n3 — I need to speak to someone`,
    zu: `Sawubona kusuka ku-BIZUSIZO 💊\n\nSibonile ukuthi awukathathi umuthi wakho wamahlalakhona muva nje. Siyazi ukuthi impilo iba matasa futhi ukuthatha kungaba nzima.\n\nSifuna ukukusiza ubuyele emgudwini. Impilo yakho ibalulekile.\n\nUngathanda usizo lokuthola indawo elula yokuthatha?\n1 — Yebo, ngisize ngithole umuthi\n2 — Sengithatha kwenye indawo\n3 — Ngidinga ukukhuluma nomuntu`,
    xh: `Molo ukusuka ku-BIZUSIZO 💊\n\nSiqaphele ukuba awukawathathanga amayeza akho aqhelekileyo kutshanje. Siyazi ukuba ubomi buxakekile kwaye ukuthatha kunokuba nzima.\n\nSifuna ukukunceda ubuyele endleleni. Impilo yakho ibalulekile.\n\nUngathanda uncedo lokufumana indawo elula yokuthatha?\n1 — Ewe, ndincede ndifumane amayeza\n2 — Ndithatha kwenye indawo ngoku\n3 — Ndifuna ukuthetha nomntu`,
    af: `Hallo van BIZUSIZO 💊\n\nOns het opgemerk dat jy nie onlangs jou chroniese medikasie afgehaal het nie. Ons weet die lewe raak besig en afhaal kan moeilik wees.\n\nOns wil jou help om weer op koers te kom. Jou gesondheid is belangrik.\n\nWil jy hulp hê om 'n gerieflike afhaal punt te vind?\n1 — Ja, help my om my medikasie te kry\n2 — Ek haal nou elders af\n3 — Ek moet met iemand praat`,
  },

  // Multimorbidity warning
  multimorbidity_warning: {
    en: (conditions) => `⚠️ Important: You collect medication for *${conditions}*. Missing your medication affects ALL of these conditions. Please collect as soon as possible.`,
    zu: (conditions) => `⚠️ Okubalulekile: Uthatha umuthi we-*${conditions}*. Ukungathathi umuthi kuthinta ZONKE lezi zifo. Sicela uwuthathe ngokushesha.`,
    xh: (conditions) => `⚠️ Okubalulekileyo: Uthatha amayeza e-*${conditions}*. Ukungawathathi amayeza kuchaphazela ZONKE ezi zifo. Nceda uwathathe ngokukhawuleza.`,
    af: (conditions) => `⚠️ Belangrik: Jy haal medikasie af vir *${conditions}*. Ontbrekende medikasie affekteer AL hierdie toestande. Haal asseblief so gou moontlik af.`,
  },
};

// ============ CONDITION MAPPING ============
const CONDITION_MAP = {
  '1': { key: 'hiv', label_en: 'HIV/ARVs', label_zu: 'HIV/Ama-ARV', db_field: 'adultshivaids' },
  '2': { key: 'hypertension', label_en: 'Hypertension', label_zu: 'Igazi eliphakeme', db_field: 'hypertensioninadults' },
  '3': { key: 'diabetes', label_en: 'Diabetes', label_zu: 'Ushukela', db_field: 'type2diabetesmellitusadult' },
  '4': { key: 'angina', label_en: 'Heart/Angina', label_zu: 'Inhliziyo', db_field: 'anginapectorisstable' },
  '5': { key: 'asthma', label_en: 'Asthma/Lung', label_zu: 'Isifuba', db_field: 'chronicasthma' },
  '6': { key: 'epilepsy', label_en: 'Epilepsy', label_zu: 'Isifo sokuwa', db_field: 'epilepsy' },
  '7': { key: 'other', label_en: 'Other chronic', label_zu: 'Okunye', db_field: 'other_chronic' },
};

// ============ RISK SCORING ============
// Based on NMM data: older adults (65+) and multimorbid patients most at risk
function calculateCCMDDRisk(session) {
  let riskScore = 0;
  const conditions = session.ccmddConditions || [];

  // Multimorbidity: 2+ conditions
  if (conditions.length >= 2) riskScore += 2;
  if (conditions.length >= 3) riskScore += 1;

  // HIV patients — highest volume, highest consequence of defaulting
  if (conditions.some(c => c.key === 'hiv')) riskScore += 1;

  // Age risk (from session if available)
  const age = session.patientAge;
  if (age && age >= 60) riskScore += 1;
  if (age && age >= 75) riskScore += 1;

  // Previous misses
  const consecutiveMisses = session.consecutiveMisses || 0;
  if (consecutiveMisses >= 1) riskScore += 2;
  if (consecutiveMisses >= 3) riskScore += 3;

  // Risk levels: LOW (0-1), MEDIUM (2-3), HIGH (4+)
  if (riskScore >= 4) return 'HIGH';
  if (riskScore >= 2) return 'MEDIUM';
  return 'LOW';
}

// ============ DATABASE FUNCTIONS ============
async function getCCMDDPickupPoints(patientLocation, limit = 3) {
  if (!FEATURES.CCMDD_ROUTING || !patientLocation) return [];

  const { data } = await supabase
    .from('ccmdd_pickup_points')
    .select('*');

  if (!data || data.length === 0) return [];

  const results = data.map(point => ({
    ...point,
    distance: Math.round(getDistance(
      patientLocation.latitude, patientLocation.longitude,
      point.latitude, point.longitude
    ) * 10) / 10
  }));

  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, limit);
}

async function logCCMDDCollection(entry) {
  try {
    await supabase.from('ccmdd_collections').insert(entry);
  } catch (e) {
    console.error('Failed to log CCMDD collection:', e);
  }
}

async function updateCCMDDProfile(patientId, updates) {
  try {
    await supabase.from('ccmdd_patient_profiles').upsert({
      patient_id: patientId,
      ...updates,
      updated_at: new Date()
    });
  } catch (e) {
    console.error('Failed to update CCMDD profile:', e);
  }
}

async function getDefaultedPatients(daysSinceLastCollection = 30) {
  try {
    const cutoff = new Date(Date.now() - daysSinceLastCollection * 24 * 60 * 60 * 1000);
    const { data } = await supabase
      .from('ccmdd_patient_profiles')
      .select('*')
      .lt('last_collection_date', cutoff.toISOString())
      .gt('total_collections', 0); // Only patients who collected at least once
    return data || [];
  } catch (e) {
    return [];
  }
}

// ============ DETECT CHRONIC MED REQUEST ============
function isChronicMedRequest(message, categoryChoice) {
  if (categoryChoice === '8') return true;
  const lower = (message || '').toLowerCase();
  const chronicKeywords = [
    'medication', 'refill', 'chronic', 'pills', 'prescription', 'collect',
    'umuthi', 'amapilisi', 'ipilisi',       // isiZulu/isiXhosa
    'medikasie', 'pille',                     // Afrikaans
    'dihlare', 'dipilisi',                    // Sepedi/Setswana
    'meriana', 'dipilisi',                    // Sesotho
    'murhi', 'tipilisi',                      // Xitsonga
    'umutsi', 'emapilisi',                    // siSwati
    'mushonga',                               // Tshivenda
    'sugar', 'high blood', 'arvs', 'arv', 'hiv pills',
    'bp tablets', 'blood pressure', 'diabetes',
    'dablapmeds', 'dablap',                   // CCMDD brand name
    'collect my meds', 'fetch my pills', 'pickup my medication',
    'thatha umuthi', 'thatha amayeza',        // isiZulu/isiXhosa: "take/fetch medication"
  ];
  return chronicKeywords.some(kw => lower.includes(kw));
}

// ============ HANDLE CCMDD CONVERSATION FLOW ============
async function handleCCMDD(patientId, from, message, session) {
  const lang = session.language || 'en';

  // Step 1: Confirm it's a chronic med request (not acute on chronic)
  if (session.ccmddStep === 'confirm_chronic') {
    if (message === '1') {
      // Ask what conditions they have
      session.ccmddStep = 'identify_conditions';
      await saveSession(patientId, session);
      const condMsg = CCMDD_MESSAGES.condition_check[lang] || CCMDD_MESSAGES.condition_check['en'];
      await sendWhatsAppMessage(from, condMsg);
      return true;
    }
    if (message === '2') {
      session.ccmddStep = null;
      await saveSession(patientId, session);
      return false; // Proceed to normal triage
    }
  }

  // Step 2: Capture conditions
  if (session.ccmddStep === 'identify_conditions') {
    // Parse comma-separated or single number responses: "1", "1,2", "1 2", "1, 3"
    const choices = message.replace(/[, ]+/g, ',').split(',').filter(c => CONDITION_MAP[c.trim()]);
    if (choices.length > 0) {
      session.ccmddConditions = choices.map(c => CONDITION_MAP[c.trim()]);
      const riskLevel = calculateCCMDDRisk(session);
      session.ccmddRiskLevel = riskLevel;

      // Update patient profile
      await updateCCMDDProfile(patientId, {
        conditions: session.ccmddConditions.map(c => c.key),
        risk_level: riskLevel
      });

      // Route to pickup
      if (!session.location) {
        session.ccmddStep = 'awaiting_location';
        await saveSession(patientId, session);
        await sendWhatsAppMessage(from, msg('request_location', lang));
        return true;
      }
      return await routeToCCMDD(patientId, from, session, lang);
    }
  }

  // Step 3: Got location, now route
  if (session.ccmddStep === 'awaiting_location' && session.location) {
    return await routeToCCMDD(patientId, from, session, lang);
  }

  // Step 4: Confirm pickup point
  if (session.ccmddStep === 'confirm_pickup') {
    if (message === '1') {
      const point = session.suggestedPickup;
      session.ccmddStep = null;
      session.confirmedPickup = point;
      await saveSession(patientId, session);
      const confirmMsg = (CCMDD_MESSAGES.ccmdd_confirmed[lang] || CCMDD_MESSAGES.ccmdd_confirmed['en'])(point.name);
      await sendWhatsAppMessage(from, confirmMsg);

      const conditionLabels = (session.ccmddConditions || []).map(c => c.label_en).join(', ');
      await logTriage({
        patient_id: patientId,
        triage_level: 'GREEN',
        confidence: 100,
        escalation: false,
        pathway: 'ccmdd_pickup',
        facility_name: point.name,
        location: session.location,
        symptoms: `chronic_medication_refill: ${conditionLabels}`
      });

      await logCCMDDCollection({
        patient_id: patientId,
        pickup_point_name: point.name,
        medication_type: conditionLabels,
        status: 'scheduled',
        scheduled_date: new Date(),
        risk_level: session.ccmddRiskLevel || 'LOW'
      });

      await updateCCMDDProfile(patientId, {
        last_collection_date: new Date(),
        consecutive_misses: 0
      });

      // Schedule collection reminder (24h)
      await scheduleCollectionReminder(patientId, from, point, 24);
      return true;
    }
    if (message === '2') {
      const alternatives = session.alternativePickups || [];
      if (alternatives.length > 0) {
        const listStr = alternatives.map((f, i) => `${i + 1}. *${f.name}* (${f.distance} km)`).join('\n');
        session.ccmddStep = 'choose_alternative_pickup';
        await saveSession(patientId, session);
        const altMsg = (MESSAGES.facility_alternatives[lang] || MESSAGES.facility_alternatives['en'])(listStr);
        await sendWhatsAppMessage(from, altMsg);
      } else {
        const naMsg = CCMDD_MESSAGES.ccmdd_not_available[lang] || CCMDD_MESSAGES.ccmdd_not_available['en'];
        await sendWhatsAppMessage(from, naMsg);
        session.ccmddStep = null;
        await saveSession(patientId, session);
      }
      return true;
    }
  }

  // Step 5: Choose alternative pickup
  if (session.ccmddStep === 'choose_alternative_pickup') {
    const alternatives = session.alternativePickups || [];
    const choice = parseInt(message) - 1;
    if (choice >= 0 && choice < alternatives.length) {
      const point = alternatives[choice];
      session.ccmddStep = null;
      session.confirmedPickup = point;
      await saveSession(patientId, session);
      const confirmMsg = (CCMDD_MESSAGES.ccmdd_confirmed[lang] || CCMDD_MESSAGES.ccmdd_confirmed['en'])(point.name);
      await sendWhatsAppMessage(from, confirmMsg);

      const conditionLabels = (session.ccmddConditions || []).map(c => c.label_en).join(', ');
      await logTriage({
        patient_id: patientId,
        triage_level: 'GREEN',
        confidence: 100,
        escalation: false,
        pathway: 'ccmdd_pickup',
        facility_name: point.name,
        location: session.location,
        symptoms: `chronic_medication_refill: ${conditionLabels}`
      });

      await logCCMDDCollection({
        patient_id: patientId,
        pickup_point_name: point.name,
        medication_type: conditionLabels,
        status: 'scheduled',
        scheduled_date: new Date(),
        risk_level: session.ccmddRiskLevel || 'LOW'
      });

      await updateCCMDDProfile(patientId, {
        last_collection_date: new Date(),
        consecutive_misses: 0
      });

      await scheduleCollectionReminder(patientId, from, point, 24);
      return true;
    }
  }

  // Step 6: Handle missed-collection reason responses (from 72h escalation)
  if (session.ccmddStep === 'missed_reason') {
    const reasons = {
      '1': { reason: 'transport_distance', response: 'missed_transport' },
      '2': { reason: 'work_schedule', response: 'missed_work' },
      '3': { reason: 'pup_closed', response: 'missed_closed' },
      '4': { reason: 'no_stock', response: 'missed_no_stock' },
      '5': { reason: 'side_effects', response: 'missed_side_effects' },
      '6': { reason: 'other', response: null },
    };

    const selected = reasons[message];
    if (selected) {
      // Log the reason
      await logCCMDDCollection({
        patient_id: patientId,
        status: 'missed',
        missed_reason: selected.reason,
        scheduled_date: new Date()
      });

      // Update consecutive misses
      const currentMisses = (session.consecutiveMisses || 0) + 1;
      session.consecutiveMisses = currentMisses;
      session.ccmddStep = null;
      await saveSession(patientId, session);

      await updateCCMDDProfile(patientId, {
        consecutive_misses: currentMisses,
        last_missed_reason: selected.reason
      });

      // Send appropriate response
      if (selected.response) {
        const responseMsg = CCMDD_MESSAGES[selected.response][lang] || CCMDD_MESSAGES[selected.response]['en'];
        await sendWhatsAppMessage(from, responseMsg);
      } else {
        await sendWhatsAppMessage(from, msg('consent_yes', lang)); // Generic acknowledgement
      }

      // If transport issue, trigger re-routing
      if (selected.reason === 'transport_distance') {
        session.ccmddStep = 'awaiting_location';
        await saveSession(patientId, session);
        await sendWhatsAppMessage(from, msg('request_location', lang));
      }

      // Side effects — critical escalation
      if (selected.reason === 'side_effects') {
        await logTriage({
          patient_id: patientId,
          triage_level: 'YELLOW',
          confidence: 100,
          escalation: true,
          pathway: 'ccmdd_side_effect_escalation',
          symptoms: 'Patient stopped medication due to side effects'
        });
      }

      return true;
    }
  }

  // Step 7: Re-engagement response
  if (session.ccmddStep === 'reengagement') {
    if (message === '1') {
      // Wants help collecting — restart CCMDD flow
      session.ccmddStep = 'identify_conditions';
      await saveSession(patientId, session);
      const condMsg = CCMDD_MESSAGES.condition_check[lang] || CCMDD_MESSAGES.condition_check['en'];
      await sendWhatsAppMessage(from, condMsg);
      return true;
    }
    if (message === '2') {
      // Collecting elsewhere — log and close
      session.ccmddStep = null;
      await saveSession(patientId, session);
      await updateCCMDDProfile(patientId, { status: 'collecting_elsewhere' });
      const ackMsg = lang === 'en'
        ? '✅ Good to hear you are still collecting your medication. Stay well!'
        : '✅ Kuhle ukuzwa ukuthi usathatha umuthi wakho. Hlala kahle!';
      await sendWhatsAppMessage(from, ackMsg);
      return true;
    }
    if (message === '3') {
      // Needs to speak to someone — escalate
      session.ccmddStep = null;
      await saveSession(patientId, session);
      await logTriage({
        patient_id: patientId,
        triage_level: 'YELLOW',
        confidence: 100,
        escalation: true,
        pathway: 'ccmdd_reengagement_escalation',
        symptoms: 'Defaulted patient requesting human contact'
      });
      const escMsg = lang === 'en'
        ? '👤 A healthcare worker will contact you shortly. If urgent, call your nearest clinic or *10177*.'
        : '👤 Isisebenzi sezempilo sizokuxhumana nawe maduze. Uma kuphuthuma, shaya umtholampilo oseduze noma *10177*.';
      await sendWhatsAppMessage(from, escMsg);
      return true;
    }
  }

  return false;
}

async function routeToCCMDD(patientId, from, session, lang) {
  const pickupPoints = await getCCMDDPickupPoints(session.location);

  if (pickupPoints.length === 0) {
    const naMsg = CCMDD_MESSAGES.ccmdd_not_available[lang] || CCMDD_MESSAGES.ccmdd_not_available['en'];
    await sendWhatsAppMessage(from, naMsg);
    session.ccmddStep = null;
    await saveSession(patientId, session);
    return true;
  }

  const nearest = pickupPoints[0];
  session.suggestedPickup = nearest;
  session.alternativePickups = pickupPoints.slice(1);
  session.ccmddStep = 'confirm_pickup';
  await saveSession(patientId, session);

  const routeMsg = (CCMDD_MESSAGES.ccmdd_route[lang] || CCMDD_MESSAGES.ccmdd_route['en'])(nearest.name, nearest.distance);
  await sendWhatsAppMessage(from, routeMsg);
  return true;
}

// ============ COLLECTION REMINDER SCHEDULER ============
async function scheduleCollectionReminder(patientId, phone, pickupPoint, hoursFromNow) {
  const reminderTime = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  try {
    await supabase.from('ccmdd_collections').upsert({
      patient_id: patientId,
      pickup_point_name: pickupPoint.name,
      next_reminder_at: reminderTime,
      reminder_count: 0,
      status: 'scheduled'
    });
  } catch (e) {
    console.error('Failed to schedule reminder:', e);
  }
}

// ============ REMINDER AGENT (runs on interval) ============
async function runCCMDDReminderAgent() {
  if (!FEATURES.CCMDD_ROUTING) return;

  try {
    const now = new Date();
    const { data: dueReminders } = await supabase
      .from('ccmdd_collections')
      .select('*')
      .lte('next_reminder_at', now.toISOString())
      .in('status', ['scheduled', 'reminded']);

    if (!dueReminders || dueReminders.length === 0) return;

    for (const reminder of dueReminders) {
      const patientId = reminder.patient_id;
      const session = await getSession(patientId);
      const lang = session.language || 'en';

      // Find patient phone from follow_ups table (we have it there)
      const { data: followUps } = await supabase
        .from('follow_ups')
        .select('phone')
        .eq('patient_id', patientId)
        .limit(1);

      if (!followUps || followUps.length === 0) continue;
      const phone = followUps[0].phone;

      const count = reminder.reminder_count || 0;
      const pointName = reminder.pickup_point_name || 'your pickup point';

      if (count === 0) {
        // 24h reminder — gentle
        const reminderMsg = (CCMDD_MESSAGES.reminder_24h[lang] || CCMDD_MESSAGES.reminder_24h['en'])(pointName);
        await sendWhatsAppMessage(phone, reminderMsg);

        await supabase.from('ccmdd_collections').update({
          reminder_count: 1,
          status: 'reminded',
          next_reminder_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next in 24h
        }).eq('id', reminder.id);

      } else if (count === 1) {
        // 48h reminder — concerned, ask if there's a problem
        const reminderMsg = (CCMDD_MESSAGES.reminder_48h[lang] || CCMDD_MESSAGES.reminder_48h['en'])(pointName);
        await sendWhatsAppMessage(phone, reminderMsg);

        // Set session to await response
        session.ccmddStep = 'missed_48h_response';
        await saveSession(patientId, session);

        await supabase.from('ccmdd_collections').update({
          reminder_count: 2,
          next_reminder_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next in 24h
        }).eq('id', reminder.id);

      } else if (count >= 2) {
        // 72h+ escalation — send reason capture, notify healthcare worker
        const escMsg = CCMDD_MESSAGES.reminder_72h_escalation[lang] || CCMDD_MESSAGES.reminder_72h_escalation['en'];
        await sendWhatsAppMessage(phone, escMsg);

        // Multimorbidity warning if applicable
        const conditions = session.ccmddConditions || [];
        if (conditions.length >= 2) {
          const condLabels = conditions.map(c => c.label_en).join(', ');
          const multiMsg = (CCMDD_MESSAGES.multimorbidity_warning[lang] || CCMDD_MESSAGES.multimorbidity_warning['en'])(condLabels);
          await sendWhatsAppMessage(phone, multiMsg);
        }

        session.ccmddStep = 'missed_reason';
        await saveSession(patientId, session);

        await supabase.from('ccmdd_collections').update({
          reminder_count: count + 1,
          status: 'missed',
          next_reminder_at: null // Stop automated reminders, human takes over
        }).eq('id', reminder.id);

        // Log escalation
        await logTriage({
          patient_id: patientId,
          triage_level: 'YELLOW',
          confidence: 100,
          escalation: true,
          pathway: 'ccmdd_missed_escalation',
          symptoms: `Missed medication collection x${count + 1} days`
        });
      }
    }
  } catch (e) {
    console.error('CCMDD reminder agent error:', e);
  }
}

// ============ RE-ENGAGEMENT AGENT (runs weekly) ============
async function runReengagementAgent() {
  if (!FEATURES.CCMDD_ROUTING) return;

  try {
    const defaulted = await getDefaultedPatients(30); // Not collected in 30 days

    for (const patient of defaulted) {
      const session = await getSession(patient.patient_id);
      const lang = session.language || 'en';

      // Find phone
      const { data: followUps } = await supabase
        .from('follow_ups')
        .select('phone')
        .eq('patient_id', patient.patient_id)
        .limit(1);

      if (!followUps || followUps.length === 0) continue;
      const phone = followUps[0].phone;

      const reengageMsg = CCMDD_MESSAGES.reengagement[lang] || CCMDD_MESSAGES.reengagement['en'];
      await sendWhatsAppMessage(phone, reengageMsg);

      session.ccmddStep = 'reengagement';
      await saveSession(patient.patient_id, session);
    }
  } catch (e) {
    console.error('Re-engagement agent error:', e);
  }
}

// Schedule agents
// Collection reminders: every 30 minutes
setInterval(runCCMDDReminderAgent, 30 * 60 * 1000);
// Re-engagement: every 7 days
setInterval(runReengagementAgent, 7 * 24 * 60 * 60 * 1000);

// ================================================================
// VIRTUAL CONSULTS MODULE — Telemedicine Scheduling
// STATUS: Architecture ready. Activate via FEATURES.VIRTUAL_CONSULTS
// ================================================================
// When active, this module:
// 1. Offers virtual consult option for YELLOW triage cases
// 2. Presents it as an alternative to physical clinic visit
// 3. Either books via API or connects to a WhatsApp booking number
// 4. Logs the referral for tracking
// ================================================================

const VIRTUAL_CONSULT_MESSAGES = {
  offer: {
    en: `📱 A virtual consultation may be available for your condition.\n\nYou can speak to a healthcare worker by video call instead of travelling to a clinic.\n\nWould you like to:\n1 — Book a virtual consultation\n2 — No thanks, I'll visit a clinic in person`,
    zu: `📱 Ukubonisana nge-video kungaba khona ngesimo sakho.\n\nUngakhuluma nesisebenzi sezempilo nge-video call esikhundleni sokuya emtholampilo.\n\nUngathanda:\n1 — Bhukhela ukubonisana nge-video\n2 — Cha ngiyabonga, ngizoya emtholampilo`,
    xh: `📱 Ukubonisana nge-video kunokufumaneka ngemeko yakho.\n\nUngathetha nesisebenza sezempilo nge-video call endaweni yokuya ekliniki.\n\nUngathanda:\n1 — Bhukisha ukubonisana nge-video\n2 — Hayi enkosi, ndiza kundwendwela ikliniki`,
    af: `📱 \'n Virtuele konsultasie mag beskikbaar wees vir jou toestand.\n\nJy kan per videogesprek met \'n gesondheidswerker praat in plaas daarvan om na \'n kliniek te reis.\n\nWil jy:\n1 — \'n Virtuele konsultasie bespreek\n2 — Nee dankie, ek besoek liewer die kliniek`,
  },

  booking_api: {
    en: '✅ Your virtual consultation has been booked. You will receive a confirmation message with the date, time, and video link.',
    zu: '✅ Ukubonisana kwakho nge-video kubhukiwe. Uzothola umyalezo wokuqinisekisa onosuku, isikhathi, nelinki ye-video.',
    xh: '✅ Ukubonisana kwakho nge-video kubhukishiwe. Uya kufumana umyalezo wokuqinisekisa onosuku, ixesha, nelinki yevidiyo.',
    af: '✅ Jou virtuele konsultasie is bespreek. Jy sal \'n bevestigingsboodskap ontvang met die datum, tyd en videoskakel.',
  },

  booking_whatsapp: {
    en: (phone) => `📱 To book your virtual consultation, please message this number on WhatsApp:\n\n*${phone}*\n\nTell them BIZUSIZO referred you and describe your symptoms.`,
    zu: (phone) => `📱 Ukubhukhela ukubonisana kwakho nge-video, sicela uthumele umyalezo ku:\n\n*${phone}*\n\nBatshele ukuthi uthunywe yi-BIZUSIZO futhi uchaze izimpawu zakho.`,
    xh: (phone) => `📱 Ukubhukisha ukubonisana kwakho nge-video, nceda uthumele umyalezo ku:\n\n*${phone}*\n\nBaxelele ukuba uthunyelwe yi-BIZUSIZO kwaye uchaze iimpawu zakho.`,
    af: (phone) => `📱 Om jou virtuele konsultasie te bespreek, stuur asseblief \'n boodskap na hierdie nommer op WhatsApp:\n\n*${phone}*\n\nSê vir hulle BIZUSIZO het jou verwys en beskryf jou simptome.`,
  },

  not_available: {
    en: '📱 Virtual consultations are not yet available in your area. Please visit your nearest clinic.',
    zu: '📱 Ukubonisana nge-video akukakafinyeleleki endaweni yakho okwamanje. Sicela uvakashele umtholampilo oseduze.',
    xh: '📱 Ukubonisana nge-video akukafumaneki kwindawo yakho okwangoku. Nceda utyelele ikliniki ekufutshane.',
    af: '📱 Virtuele konsultasies is nog nie in jou area beskikbaar nie. Besoek asseblief jou naaste kliniek.',
  }
};

async function handleVirtualConsult(patientId, from, message, session) {
  const lang = session.language || 'en';

  if (!FEATURES.VIRTUAL_CONSULTS) return false;

  // Offer virtual consult
  if (session.virtualConsultStep === 'offered') {
    if (message === '1') {
      // Patient wants virtual consult
      session.virtualConsultStep = null;
      await saveSession(patientId, session);

      // Option A: Book via API
      if (FEATURES.VIRTUAL_CONSULT_URL) {
        try {
          const bookingResult = await fetch(FEATURES.VIRTUAL_CONSULT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              patient_id: patientId,
              language: lang,
              triage_level: session.lastTriage?.triage_level,
              symptoms: session.lastSymptoms,
              timestamp: new Date().toISOString()
            })
          });

          if (bookingResult.ok) {
            const bookMsg = VIRTUAL_CONSULT_MESSAGES.booking_api[lang] || VIRTUAL_CONSULT_MESSAGES.booking_api['en'];
            await sendWhatsAppMessage(from, bookMsg);
          } else {
            throw new Error('Booking API failed');
          }
        } catch (e) {
          // Fallback to WhatsApp booking if API fails
          if (FEATURES.VIRTUAL_CONSULT_PHONE) {
            const wpMsg = (VIRTUAL_CONSULT_MESSAGES.booking_whatsapp[lang] || VIRTUAL_CONSULT_MESSAGES.booking_whatsapp['en'])(FEATURES.VIRTUAL_CONSULT_PHONE);
            await sendWhatsAppMessage(from, wpMsg);
          } else {
            const naMsg = VIRTUAL_CONSULT_MESSAGES.not_available[lang] || VIRTUAL_CONSULT_MESSAGES.not_available['en'];
            await sendWhatsAppMessage(from, naMsg);
          }
        }
      }
      // Option B: WhatsApp-based booking
      else if (FEATURES.VIRTUAL_CONSULT_PHONE) {
        const wpMsg = (VIRTUAL_CONSULT_MESSAGES.booking_whatsapp[lang] || VIRTUAL_CONSULT_MESSAGES.booking_whatsapp['en'])(FEATURES.VIRTUAL_CONSULT_PHONE);
        await sendWhatsAppMessage(from, wpMsg);
      }
      // Option C: Not available yet
      else {
        const naMsg = VIRTUAL_CONSULT_MESSAGES.not_available[lang] || VIRTUAL_CONSULT_MESSAGES.not_available['en'];
        await sendWhatsAppMessage(from, naMsg);
      }

      await logTriage({
        patient_id: patientId,
        triage_level: session.lastTriage?.triage_level || 'YELLOW',
        confidence: session.lastTriage?.confidence || 100,
        escalation: false,
        pathway: 'virtual_consult',
        facility_name: 'virtual',
        location: session.location || null,
        symptoms: session.lastSymptoms
      });

      await scheduleFollowUp(patientId, from, session.lastTriage?.triage_level || 'YELLOW');
      return true;
    }

    if (message === '2') {
      // Patient prefers in-person — proceed to facility routing
      session.virtualConsultStep = null;
      await saveSession(patientId, session);
      return false;
    }
  }

  return false;
}

// Offer virtual consult for eligible cases (YELLOW triage, not emergency)
async function offerVirtualConsult(patientId, from, session) {
  if (!FEATURES.VIRTUAL_CONSULTS) return false;

  // Only offer for YELLOW cases — ORANGE/RED need physical facility
  if (session.lastTriage?.triage_level !== 'YELLOW') return false;

  const lang = session.language || 'en';
  const offerMsg = VIRTUAL_CONSULT_MESSAGES.offer[lang] || VIRTUAL_CONSULT_MESSAGES.offer['en'];
  session.virtualConsultStep = 'offered';
  await saveSession(patientId, session);
  await sendWhatsAppMessage(from, offerMsg);
  return true;
}

// ================================================================
// LAB RESULTS MODULE — Healthcare Worker Dashboard + Patient Notifications
// STATUS: Manual entry ACTIVE. NHLS API integration DORMANT.
// ================================================================
// Informed by NMM District data: "Awaiting blood results" was the 4th
// most common deactivation reason (94 cases out of 1,070 documented).
//
// Current flow:
// 1. Healthcare worker enters lab results via dashboard (POST /api/lab-results)
// 2. System sends WhatsApp notification to patient in their language
// 3. Patient can ask about their lab results via WhatsApp (category 8 or keywords)
//
// Future flow (when NHLS API available):
// 1. System polls NHLS LabTrack/TrakCare for patient results
// 2. When new results detected, notifies healthcare worker on dashboard
// 3. Worker reviews and approves → automated WhatsApp to patient
// ================================================================

// Supabase table: lab_results
// id, patient_id, patient_phone, test_type, test_date, result_status,
// result_summary, result_detail, entered_by, reviewed_by, reviewed_at,
// patient_notified, patient_notified_at, nhls_reference, facility,
// created_at, updated_at

const LAB_MESSAGES = {
  result_ready: {
    en: (testType) => `📋 Your *${testType}* results are ready.\n\nPlease visit your clinic to discuss the results with your healthcare provider.\n\nIf you have been referred back to the clinic, this does NOT mean something is wrong — many results are routine check-ups.\n\nQuestions? Reply "results" or call your clinic.`,
    zu: (testType) => `📋 Imiphumela yakho ye-*${testType}* isilungile.\n\nSicela uvakashele umtholampilo wakho ukuxoxa ngemiphumela nesisebenzi sezempilo.\n\nUma ubuyelwe emtholampilo, lokhu AKUSHO ukuthi kukhona okungalungile — imiphumela eminingi ingeyokuhlolwa okujwayelekile.\n\nImibuzo? Phendula "imiphumela" noma ushayele umtholampilo wakho.`,
    xh: (testType) => `📋 Iziphumo zakho ze-*${testType}* zilungile.\n\nNceda utyelele ikliniki yakho ukuxoxa ngeziphumo nomsebenzi wezempilo.\n\nUkuba ubuyiselwe ekliniki, oku AKUTHETHI ukuba kukho into engalunganga — iziphumo ezininzi zezokuhlolwa okuqhelekileyo.\n\nImibuzo? Phendula "iziphumo" okanye utsalele ikliniki yakho.`,
    af: (testType) => `📋 Jou *${testType}* resultate is gereed.\n\nBesoek asseblief jou kliniek om die resultate met jou gesondheidswerker te bespreek.\n\nAs jy terugverwys is na die kliniek, beteken dit NIE iets is fout nie — baie resultate is roetine-ondersoeke.\n\nVrae? Antwoord "resultate" of bel jou kliniek.`,
  },

  result_action_required: {
    en: (testType) => `📋 Your *${testType}* results are ready and your healthcare provider would like to see you.\n\nPlease visit your clinic within the next 7 days. This is important for your ongoing care.\n\nIf you cannot get to the clinic, reply "help" and we will assist you.`,
    zu: (testType) => `📋 Imiphumela yakho ye-*${testType}* isilungile futhi isisebenzi sakho sezempilo sifuna ukukubona.\n\nSicela uvakashele umtholampilo wakho ezinsukwini ezi-7 ezizayo. Lokhu kubalulekile ekunakekelweni kwakho okuqhubekayo.\n\nUma ungakwazi ukufika emtholampilo, phendula "usizo" futhi sizokusiza.`,
    xh: (testType) => `📋 Iziphumo zakho ze-*${testType}* zilungile kwaye umsebenzi wakho wezempilo ufuna ukukubona.\n\nNceda utyelele ikliniki yakho kwiintsuku ezi-7 ezizayo. Oku kubalulekile kwinkathalelo yakho eqhubekayo.\n\nUkuba awukwazi ukufika ekliniki, phendula "uncedo" kwaye siza kukunceda.`,
    af: (testType) => `📋 Jou *${testType}* resultate is gereed en jou gesondheidswerker wil jou graag sien.\n\nBesoek asseblief jou kliniek binne die volgende 7 dae. Dit is belangrik vir jou voortgesette sorg.\n\nAs jy nie by die kliniek kan uitkom nie, antwoord "hulp" en ons sal jou help.`,
  },

  result_normal: {
    en: (testType) => `✅ Good news! Your *${testType}* results are back and everything looks normal.\n\nKeep taking your medication as prescribed. Your next check-up will be scheduled as usual.\n\nStay well! 💚`,
    zu: (testType) => `✅ Izindaba ezinhle! Imiphumela yakho ye-*${testType}* ibuyile futhi konke kubukeka kujwayelekile.\n\nQhubeka uthatha umuthi wakho njengoba unikeziwe. Ukuhlolwa kwakho okulandelayo kuzohlelelwa njengokujwayelekile.\n\nHlala kahle! 💚`,
    xh: (testType) => `✅ Iindaba ezimnandi! Iziphumo zakho ze-*${testType}* zibuyile kwaye yonke into ibonakala iqhelekile.\n\nQhubeka uthatha amayeza akho njengoko unikeziwe. Ukuhlolwa kwakho okulandelayo kuya kucwangciswa njengokuqhelekileyo.\n\nHlala kakuhle! 💚`,
    af: (testType) => `✅ Goeie nuus! Jou *${testType}* resultate is terug en alles lyk normaal.\n\nHou aan om jou medikasie soos voorgeskryf te neem. Jou volgende ondersoek sal soos gewoonlik geskeduleer word.\n\nBly gesond! 💚`,
  },

  check_status: {
    en: 'Let me check your lab results. One moment please...',
    zu: 'Ake ngibheke imiphumela yakho yasekhemisti. Umzuzwana owodwa...',
    xh: 'Mandibheke iziphumo zakho zasekhemisti. Umzuzwana omnye nceda...',
    af: 'Laat ek jou laboratorium resultate nagaan. Een oomblik asseblief...',
  },

  no_results: {
    en: 'We do not have any lab results on file for you at the moment. If you are expecting results, please check with your clinic.\n\nResults typically take 3-7 working days depending on the test type.',
    zu: 'Asinayo imiphumela yasekhemisi ngawe okwamanje. Uma ulindele imiphumela, sicela ubheke nomtholampilo wakho.\n\nImiphumela ngokuvamile ithatha izinsuku ezi-3 kuya kwezi-7 zomsebenzi kuya ngohlobo lokuhlolwa.',
    xh: 'Asina ziphumo zasekhemisti ngawe okwangoku. Ukuba ulindele iziphumo, nceda uhlole nekliniki yakho.\n\nIziphumo zihlala zithatha iintsuku ezi-3 ukuya kwezi-7 zomsebenzi ngokuxhomekeke kuhlobo lwesivavanyelo.',
    af: 'Ons het tans geen laboratorium resultate vir jou op lêer nie. As jy resultate verwag, gaan asseblief by jou kliniek na.\n\nResultate neem gewoonlik 3-7 werksdae afhangende van die toets tipe.',
  },

  pending_results: {
    en: (testType, testDate) => `Your *${testType}* test from *${testDate}* is still being processed. We will notify you on WhatsApp as soon as results are available.\n\nYou do not need to visit the clinic to check — we will come to you.`,
    zu: (testType, testDate) => `Ukuhlolwa kwakho kwe-*${testType}* kwe-*${testDate}* kusaqhutshwa. Sizokwazisa ku-WhatsApp uma imiphumela itholakalile.\n\nAwudingi ukuvakashela umtholampilo ukuhlola — sizofinyelela kuwe.`,
    xh: (testType, testDate) => `Uvavanyo lwakho lwe-*${testType}* lwe-*${testDate}* lusaqhutyelwa. Siza kukwazisa kuWhatsApp xa iziphumo zifumaneka.\n\nAwudingi ukutyelela ikliniki ukuhlola — siza kuza kuwe.`,
    af: (testType, testDate) => `Jou *${testType}* toets van *${testDate}* word nog verwerk. Ons sal jou op WhatsApp in kennis stel sodra resultate beskikbaar is.\n\nJy hoef nie die kliniek te besoek om na te gaan nie — ons kom na jou toe.`,
  },
};

// Common test types for the dashboard dropdown
const LAB_TEST_TYPES = [
  'CD4 Count', 'Viral Load', 'Full Blood Count', 'HbA1c (Diabetes)',
  'Creatinine/eGFR (Kidney)', 'Liver Function', 'Lipid Panel (Cholesterol)',
  'TB GeneXpert', 'Pap Smear', 'Blood Glucose', 'Urinalysis',
  'Pregnancy Test', 'STI Screening', 'Other'
];

// Result categories that determine notification type
const RESULT_CATEGORIES = {
  normal: 'result_normal',           // All good — positive reinforcement
  ready: 'result_ready',            // Ready for discussion — neutral
  action_required: 'result_action_required'  // Needs clinic visit — urgent but not alarming
};

// ============ LAB RESULTS DATABASE FUNCTIONS ============
async function getPatientLabResults(patientId) {
  try {
    const { data } = await supabase
      .from('lab_results')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(5);
    return data || [];
  } catch (e) {
    return [];
  }
}

async function createLabResult(entry) {
  try {
    const { data } = await supabase
      .from('lab_results')
      .insert(entry)
      .select()
      .single();
    return data;
  } catch (e) {
    console.error('Failed to create lab result:', e);
    return null;
  }
}

async function updateLabResult(id, updates) {
  try {
    await supabase
      .from('lab_results')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', id);
  } catch (e) {
    console.error('Failed to update lab result:', e);
  }
}

// ============ NOTIFY PATIENT OF LAB RESULTS ============
async function notifyPatientOfResults(labResult) {
  if (!labResult.patient_phone) return;

  // Get patient session for language preference
  const patientId = labResult.patient_id;
  const session = await getSession(patientId);
  const lang = session.language || 'en';

  const testType = labResult.test_type || 'lab test';
  const category = labResult.result_category || 'ready';
  const messageKey = RESULT_CATEGORIES[category] || 'result_ready';

  const msgTemplate = LAB_MESSAGES[messageKey][lang] || LAB_MESSAGES[messageKey]['en'];
  const notification = typeof msgTemplate === 'function' ? msgTemplate(testType) : msgTemplate;

  await sendWhatsAppMessage(labResult.patient_phone, notification);

  // Log notification
  await updateLabResult(labResult.id, {
    patient_notified: true,
    patient_notified_at: new Date()
  });
}

// ============ PATIENT WHATSAPP: CHECK LAB RESULTS ============
function isLabResultsQuery(message) {
  const lower = (message || '').toLowerCase();
  const keywords = [
    'results', 'lab', 'blood test', 'test results', 'my results',
    'imiphumela', 'ikhemisi',                    // isiZulu
    'iziphumo', 'ikhemisti',                     // isiXhosa
    'resultate', 'laboratorium',                  // Afrikaans
    'cd4', 'viral load', 'blood count',
    'sugar test', 'kidney test', 'liver test',
  ];
  return keywords.some(kw => lower.includes(kw));
}

async function handleLabResultsQuery(patientId, from, session) {
  const lang = session.language || 'en';

  // Send "checking" message
  const checkMsg = LAB_MESSAGES.check_status[lang] || LAB_MESSAGES.check_status['en'];
  await sendWhatsAppMessage(from, checkMsg);

  const results = await getPatientLabResults(patientId);

  if (results.length === 0) {
    const noMsg = LAB_MESSAGES.no_results[lang] || LAB_MESSAGES.no_results['en'];
    await sendWhatsAppMessage(from, noMsg);
    return;
  }

  // Show most recent result
  const latest = results[0];

  if (latest.result_status === 'pending') {
    const testDate = new Date(latest.test_date).toLocaleDateString('en-ZA');
    const pendingMsg = (LAB_MESSAGES.pending_results[lang] || LAB_MESSAGES.pending_results['en'])(latest.test_type, testDate);
    await sendWhatsAppMessage(from, pendingMsg);
  } else if (latest.result_status === 'ready' && latest.patient_notified) {
    // Already notified — resend the result notification
    await notifyPatientOfResults(latest);
  } else if (latest.result_status === 'ready') {
    await notifyPatientOfResults(latest);
  }
}

// ============ DORMANT: NHLS API INTEGRATION ============
// When NHLS provides an API or we gain LabTrack integration access,
// this function will poll for new results and create entries automatically.
async function pollNHLSResults() {
  if (!FEATURES.NHLS_API_INTEGRATION || !FEATURES.NHLS_API_URL) return;

  try {
    // Future: poll NHLS LabTrack/TrakCare API for new results
    // The expected flow:
    // 1. Query NHLS API with facility codes and date range
    // 2. For each new result, match to patient_id via NHLS reference number
    // 3. Create lab_results entry with status 'pending_review'
    // 4. Notify healthcare worker on dashboard for review
    // 5. Once reviewed and approved, notify patient via WhatsApp
    //
    // Expected NHLS API response structure (speculative):
    // {
    //   nhls_reference: "LAB-2026-XXXXXX",
    //   patient_identifier: "...",
    //   test_type: "CD4 Count",
    //   test_date: "2026-03-20",
    //   result: { value: 450, unit: "cells/uL", reference_range: "500-1500" },
    //   status: "final",
    //   facility: "Benoni Clinic",
    //   ordering_provider: "Dr. ..."
    // }
    //
    // const response = await fetch(FEATURES.NHLS_API_URL + '/results', {
    //   headers: { 'Authorization': `Bearer ${FEATURES.NHLS_API_KEY}` }
    // });
    // const results = await response.json();
    // for (const result of results) { ... }

    console.log('NHLS API polling: not yet implemented — awaiting API access');
  } catch (e) {
    console.error('NHLS API poll error:', e);
  }
}

// Poll NHLS every 15 minutes (when enabled)
setInterval(pollNHLSResults, 15 * 60 * 1000);

// ================================================================
// LAB RESULTS DASHBOARD — API ENDPOINTS
// ================================================================
// These endpoints power the healthcare worker dashboard for lab results.
// Protected by dashboard password (same as existing dashboard auth).
// ================================================================

// Middleware: simple auth check
// ================================================================
// DASHBOARD AUTH WITH ACCESS LOGGING
// ================================================================
// Every dashboard API call is logged with:
// - WHO (user name from x-dashboard-user header)
// - WHAT (API endpoint accessed)
// - WHEN (timestamp)
// This creates a full audit trail for governance accountability.
// ================================================================
function requireDashboardAuth(req, res, next) {
  const password = req.headers['x-dashboard-password'] || req.query.password;
  if (password !== process.env.DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Log the access (async, don't block the request)
  const userName = req.headers['x-dashboard-user'] || 'unknown';
  const endpoint = req.method + ' ' + req.path;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  supabase.from('dashboard_access_logs').insert({
    user_name: userName,
    endpoint: endpoint,
    ip_address: ip,
    accessed_at: new Date(),
  }).then(() => {}).catch(e => {
    // Don't fail the request if logging fails — queue locally
    console.error('[ACCESS_LOG] Failed to log:', e.message);
    if (typeof queueEvent === 'function') {
      queueEvent({
        type: 'dashboard_access',
        table: 'dashboard_access_logs',
        data: {
          user_name: userName,
          endpoint: endpoint,
          ip_address: ip,
          original_timestamp: new Date().toISOString(),
        }
      });
    }
  });

  next();
}

// GET /api/access-logs — View dashboard access history
app.get('/api/access-logs', requireDashboardAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const { data } = await supabase
      .from('dashboard_access_logs')
      .select('*')
      .order('accessed_at', { ascending: false })
      .limit(limit);
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/access-logs/summary — Daily summary of who accessed what
app.get('/api/access-logs/summary', requireDashboardAuth, async (req, res) => {
  try {
    const { data } = await supabase
      .from('dashboard_access_logs')
      .select('user_name, endpoint, accessed_at')
      .order('accessed_at', { ascending: false })
      .limit(500);

    if (!data) return res.json({ users: [], daily: [] });

    // Group by user
    const userSummary = {};
    const dailySummary = {};
    data.forEach(row => {
      const user = row.user_name || 'unknown';
      const day = new Date(row.accessed_at).toISOString().split('T')[0];

      if (!userSummary[user]) userSummary[user] = { total: 0, last_access: row.accessed_at, endpoints: {} };
      userSummary[user].total++;
      userSummary[user].endpoints[row.endpoint] = (userSummary[user].endpoints[row.endpoint] || 0) + 1;

      if (!dailySummary[day]) dailySummary[day] = { total: 0, users: new Set() };
      dailySummary[day].total++;
      dailySummary[day].users.add(user);
    });

    // Convert sets to arrays for JSON
    Object.values(dailySummary).forEach(d => { d.users = [...d.users]; });

    res.json({ users: userSummary, daily: dailySummary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/lab-results — List results (filterable)
app.get('/api/lab-results', requireDashboardAuth, async (req, res) => {
  try {
    let query = supabase
      .from('lab_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(req.query.limit) || 50);

    if (req.query.status) query = query.eq('result_status', req.query.status);
    if (req.query.facility) query = query.eq('facility', req.query.facility);
    if (req.query.test_type) query = query.eq('test_type', req.query.test_type);
    if (req.query.patient_id) query = query.eq('patient_id', req.query.patient_id);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ results: data, test_types: LAB_TEST_TYPES });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lab-results — Create new lab result (manual entry by healthcare worker)
app.post('/api/lab-results', requireDashboardAuth, async (req, res) => {
  try {
    const { patient_id, patient_phone, test_type, test_date, result_status,
            result_summary, result_detail, result_category, entered_by,
            nhls_reference, facility } = req.body;

    if (!patient_id || !test_type) {
      return res.status(400).json({ error: 'patient_id and test_type are required' });
    }

    const entry = {
      patient_id,
      patient_phone: patient_phone || null,
      test_type,
      test_date: test_date || new Date(),
      result_status: result_status || 'pending',
      result_summary: result_summary || null,
      result_detail: result_detail || null,
      result_category: result_category || 'ready',
      entered_by: entered_by || 'dashboard',
      nhls_reference: nhls_reference || null,
      facility: facility || null,
      patient_notified: false,
      created_at: new Date()
    };

    const result = await createLabResult(entry);
    if (!result) throw new Error('Failed to create entry');

    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/lab-results/:id — Update result (mark as ready, add details)
app.put('/api/lab-results/:id', requireDashboardAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    await updateLabResult(id, {
      ...updates,
      reviewed_at: new Date(),
      reviewed_by: updates.reviewed_by || 'dashboard'
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lab-results/:id/notify — Send WhatsApp notification to patient
app.post('/api/lab-results/:id/notify', requireDashboardAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: labResult } = await supabase
      .from('lab_results')
      .select('*')
      .eq('id', id)
      .single();

    if (!labResult) return res.status(404).json({ error: 'Result not found' });
    if (!labResult.patient_phone) return res.status(400).json({ error: 'No patient phone number' });

    await notifyPatientOfResults(labResult);
    res.json({ success: true, message: 'Patient notified via WhatsApp' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lab-results/:id/mark-ready — Mark as ready AND notify patient in one action
app.post('/api/lab-results/:id/mark-ready', requireDashboardAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { result_category, result_summary, reviewed_by } = req.body;

    await updateLabResult(id, {
      result_status: 'ready',
      result_category: result_category || 'ready',
      result_summary: result_summary || null,
      reviewed_by: reviewed_by || 'dashboard',
      reviewed_at: new Date()
    });

    // Fetch updated record and notify
    const { data: labResult } = await supabase
      .from('lab_results')
      .select('*')
      .eq('id', id)
      .single();

    if (labResult && labResult.patient_phone) {
      await notifyPatientOfResults(labResult);
      res.json({ success: true, message: 'Marked as ready and patient notified' });
    } else {
      res.json({ success: true, message: 'Marked as ready. No phone number — patient not notified.' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/lab-results/stats — Dashboard statistics
app.get('/api/lab-results/stats', requireDashboardAuth, async (req, res) => {
  try {
    const { data: all } = await supabase.from('lab_results').select('result_status, patient_notified');

    const stats = {
      total: all ? all.length : 0,
      pending: all ? all.filter(r => r.result_status === 'pending').length : 0,
      ready: all ? all.filter(r => r.result_status === 'ready').length : 0,
      notified: all ? all.filter(r => r.patient_notified === true).length : 0,
      not_notified: all ? all.filter(r => r.result_status === 'ready' && !r.patient_notified).length : 0,
    };

    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================================================================
async function orchestrate(patientId, from, message, session) {
  const lang = session.language || 'en';

  // ==================== STEP 0: LANGUAGE SELECTION ====================
  if (!session.language) {
    if (LANG_MAP[message]) {
      session.language = LANG_MAP[message];
      await saveSession(patientId, session);
      await sendWhatsAppMessage(from, msg('language_set', session.language));
      // Immediately show consent
      await sendWhatsAppMessage(from, msg('consent', session.language));
      return;
    }
    // Show language menu
    await sendWhatsAppMessage(from, MESSAGES.language_menu._all);
    return;
  }

  // ==================== STEP 1: CONSENT ====================
  if (!session.consent) {
    if (message === '1') {
      session.consent = true;
      await saveSession(patientId, session);
      await sendWhatsAppMessage(from, msg('consent_yes', lang));
      // Route to identity capture (Step 1.2) — not chronic screening
      await sendWhatsAppMessage(from, msg('ask_first_name', lang));
      session.identityStep = 'ask_first_name';
      await saveSession(patientId, session);
      return;
    }
    if (message === '2') {
      session.consent = false;
      await saveSession(patientId, session);
      await sendWhatsAppMessage(from, msg('consent_no', lang));
      return;
    }
    // Re-show consent
    await sendWhatsAppMessage(from, msg('consent', lang));
    return;
  }

  // ==================== STEP 1.2: IDENTITY CAPTURE ====================
  // Runs once after consent, before chronic screening.
  // Four sequential steps: name → surname → DOB → sex
  if (session.consent && !session.identityDone) {

    // Step 1.2a: First name
    if (!session.identityStep || session.identityStep === 'ask_first_name') {
      if (session.identityStep === 'ask_first_name' && message.length >= 1) {
        const name = capitalizeName(message);
        if (name.length >= 1 && !/\d/.test(name)) {
          session.firstName = name;
          session.identityStep = 'ask_surname';
          await saveSession(patientId, session);
          await sendWhatsAppMessage(from, msg('ask_surname', lang, name));
          return;
        }
      }
      session.identityStep = 'ask_first_name';
      await saveSession(patientId, session);
      await sendWhatsAppMessage(from, msg('ask_first_name', lang));
      return;
    }

    // Step 1.2b: Surname
    if (session.identityStep === 'ask_surname') {
      const surname = capitalizeName(message);
      if (surname.length >= 1 && !/\d/.test(surname)) {
        session.surname = surname;
        session.identityStep = 'ask_dob';
        await saveSession(patientId, session);
        await sendWhatsAppMessage(from, msg('ask_dob', lang));
        return;
      }
      await sendWhatsAppMessage(from, msg('ask_surname', lang, session.firstName));
      return;
    }

    // Step 1.2c: Date of birth
    if (session.identityStep === 'ask_dob') {
      const dob = parseDOB(message);
      if (dob.valid) {
        session.dob = dob;
        session.patientAge = dob.age;
        session.identityStep = 'ask_sex';
        await saveSession(patientId, session);
        await sendWhatsAppMessage(from, msg('ask_sex', lang));
        return;
      }
      await sendWhatsAppMessage(from, msg('ask_dob', lang));
      return;
    }

    // Step 1.2d: Sex
    if (session.identityStep === 'ask_sex') {
      if (message === '1' || message === '2') {
        session.sex = message === '1' ? 'male' : 'female';
        session.identityDone = true;
        session.identityStep = null;

        // Generate reference number for ALL patients (not just study participants)
        if (!session.studyCode) {
          const refCode = await generateStudyCode(patientId);
          session.studyCode = refCode;
        }

        await saveSession(patientId, session);
        await sendWhatsAppMessage(from, msg('identity_confirmed', lang, session.firstName, session.surname));

        // Send reference number
        const refMsg = {
          en: `🔢 Your reference number is: *${session.studyCode}*\n\nShow this number at reception when you arrive at the clinic.`,
          zu: `🔢 Inombolo yakho yereferensi ithi: *${session.studyCode}*\n\nKhombisa le nombolo e-reception uma ufika emtholampilo.`,
          xh: `🔢 Inombolo yakho yereferensi ithi: *${session.studyCode}*\n\nBonisa le nombolo e-reception xa ufika ekliniki.`,
          af: `🔢 Jou verwysingsnommer is: *${session.studyCode}*\n\nWys hierdie nommer by ontvangs wanneer jy by die kliniek aankom.`,
        };
        await sendWhatsAppMessage(from, refMsg[lang] || refMsg['en']);

        await sendWhatsAppMessage(from, msg('chronic_screening', lang));
        return;
      }
      await sendWhatsAppMessage(from, msg('ask_sex', lang));
      return;
    }
  }

  // ==================== STEP 1.5: CHRONIC CONDITION SCREENING ====================
  // Runs once after consent, before any triage. Captures chronic conditions
  // for ALL patients so the governance risk upgrade (Pillar 2) works universally.
  // This is a CLINICAL feature, not a research feature — benefits all users.
  if (session.consent && !session.chronicScreeningDone) {
    // Parse response: "0" = none, "1,3" = HIV + diabetes, "1 2" = HIV + hypertension
    if (message === '0') {
      session.chronicConditions = [];
      session.chronicScreeningDone = true;
      await saveSession(patientId, session);
      await sendWhatsAppMessage(from, msg('chronic_screening_saved', lang));
      // Ask about study participation (not everyone is a study participant)
      await sendWhatsAppMessage(from, msg('study_participation', lang));
      return;
    }

    const choices = message.replace(/[, ]+/g, ',').split(',').filter(c => CONDITION_MAP[c.trim()]);
    if (choices.length > 0) {
      session.chronicConditions = choices.map(c => CONDITION_MAP[c.trim()]);
      session.ccmddConditions = session.chronicConditions;
      session.chronicScreeningDone = true;
      await saveSession(patientId, session);
      await sendWhatsAppMessage(from, msg('chronic_screening_saved', lang));
      // Ask about study participation
      await sendWhatsAppMessage(from, msg('study_participation', lang));
      return;
    }

    // Invalid input — re-show screening
    await sendWhatsAppMessage(from, msg('chronic_screening', lang));
    return;
  }

  // ==================== STEP 1.6: STUDY PARTICIPATION CHECK ====================
  // Separates research participants from regular BIZUSIZO users.
  // Study participants get a BZ-XXXX code for concordance matching.
  // Regular users skip straight to triage — no study code, no research data.
  if (session.chronicScreeningDone && session.isStudyParticipant === undefined) {
    if (message === '1') {
      // Study participant — generate study code
      session.isStudyParticipant = true;
      const studyCode = await generateStudyCode(patientId);
      session.studyCode = studyCode;
      await saveSession(patientId, session);
      await sendWhatsAppMessage(from, msg('study_code', lang, studyCode));
      await sendWhatsAppMessage(from, msg('category_menu', lang));
      return;
    }
    if (message === '2') {
      // Regular user — skip study code, go straight to triage
      session.isStudyParticipant = false;
      await saveSession(patientId, session);
      await sendWhatsAppMessage(from, msg('category_menu', lang));
      return;
    }
    // Invalid input — re-show
    await sendWhatsAppMessage(from, msg('study_participation', lang));
    return;
  }

  // ==================== STEP: CCMDD FLOW (if active) ====================
  if (session.ccmddStep) {
    const handled = await handleCCMDD(patientId, from, message, session);
    if (handled) return;
  }

  // ==================== STEP: VIRTUAL CONSULT FLOW (if active) ====================
  if (session.virtualConsultStep) {
    const handled = await handleVirtualConsult(patientId, from, message, session);
    if (handled) return;
    // If not handled (patient chose clinic), fall through to facility routing
  }

  // ==================== STEP: FACILITY CONFIRMATION ====================
  if (session.awaitingFacilityConfirm) {
    if (message === '1') {
      // Patient accepts suggested facility
      const facility = session.suggestedFacility;
      session.awaitingFacilityConfirm = false;
      session.confirmedFacility = facility;
      await saveSession(patientId, session);
      await sendWhatsAppMessage(from, msg('facility_confirmed', lang, facility.name));

      // Log with confirmed facility
      await logTriage({
        patient_id: patientId,
        triage_level: session.lastTriage?.triage_level,
        confidence: session.lastTriage?.confidence,
        escalation: false,
        pathway: session.lastPathway,
        facility_name: facility.name,
        location: session.location || null,
        symptoms: session.lastSymptoms
      });

      // Ask returning vs new (only for YELLOW/GREEN — not emergencies)
      if (session.lastTriage?.triage_level === 'YELLOW' || session.lastTriage?.triage_level === 'GREEN') {
        session.awaitingReturningPatient = true;
        await saveSession(patientId, session);
        await sendWhatsAppMessage(from, msg('ask_returning', lang, facility.name));
        return;
      }

      // For RED/ORANGE — skip returning question, every second counts
      // But still auto-add to fast-track queue
      await autoAddToQueue(patientId, from, session);
      await scheduleFollowUp(patientId, from, session.lastTriage?.triage_level);
      await sendWhatsAppMessage(from, msg('tips', lang));
      return;
    }

    if (message === '2') {
      // Patient wants alternatives
      const alternatives = session.alternativeFacilities || [];
      if (alternatives.length === 0) {
        await sendWhatsAppMessage(from, msg('facility_confirmed', lang, session.suggestedFacility.name));
        session.awaitingFacilityConfirm = false;
        await saveSession(patientId, session);
        return;
      }

      const listStr = alternatives.map((f, i) =>
        `${i + 1}. *${f.name}* (${f.distance} km)`
      ).join('\n');

      session.awaitingFacilityConfirm = false;
      session.awaitingAlternativeChoice = true;
      await saveSession(patientId, session);
      const firstFacilityName = session.suggestedFacility?.name || null;
      await sendWhatsAppMessage(from, msg('facility_alternatives', lang, listStr, firstFacilityName));
      return;
    }
  }

  // ==================== STEP: ALTERNATIVE FACILITY CHOICE ====================
  if (session.awaitingAlternativeChoice) {
    const alternatives = session.alternativeFacilities || [];

    // Option 0: go back to first suggestion
    if (message === '0' && session.suggestedFacility) {
      const facility = session.suggestedFacility;
      session.awaitingAlternativeChoice = false;
      session.confirmedFacility = facility;
      await saveSession(patientId, session);
      await sendWhatsAppMessage(from, msg('facility_confirmed', lang, facility.name));

      await logTriage({
        patient_id: patientId,
        triage_level: session.lastTriage?.triage_level,
        confidence: session.lastTriage?.confidence,
        escalation: false,
        pathway: session.lastPathway,
        facility_name: facility.name,
        location: session.location || null,
        symptoms: session.lastSymptoms
      });

      if (session.lastTriage?.triage_level === 'YELLOW' || session.lastTriage?.triage_level === 'GREEN') {
        session.awaitingReturningPatient = true;
        await saveSession(patientId, session);
        await sendWhatsAppMessage(from, msg('ask_returning', lang, facility.name));
        return;
      }

      await autoAddToQueue(patientId, from, session);
      await scheduleFollowUp(patientId, from, session.lastTriage?.triage_level);
      await sendWhatsAppMessage(from, msg('tips', lang));
      return;
    }

    const choice = parseInt(message) - 1;

    if (choice >= 0 && choice < alternatives.length) {
      const facility = alternatives[choice];
      session.awaitingAlternativeChoice = false;
      session.confirmedFacility = facility;
      await saveSession(patientId, session);
      await sendWhatsAppMessage(from, msg('facility_confirmed', lang, facility.name));

      await logTriage({
        patient_id: patientId,
        triage_level: session.lastTriage?.triage_level,
        confidence: session.lastTriage?.confidence,
        escalation: false,
        pathway: session.lastPathway,
        facility_name: facility.name,
        location: session.location || null,
        symptoms: session.lastSymptoms
      });

      // Ask returning vs new (YELLOW/GREEN only)
      if (session.lastTriage?.triage_level === 'YELLOW' || session.lastTriage?.triage_level === 'GREEN') {
        session.awaitingReturningPatient = true;
        await saveSession(patientId, session);
        await sendWhatsAppMessage(from, msg('ask_returning', lang, facility.name));
        return;
      }

      // RED/ORANGE — auto-queue immediately
      await autoAddToQueue(patientId, from, session);
      await scheduleFollowUp(patientId, from, session.lastTriage?.triage_level);
      await sendWhatsAppMessage(from, msg('tips', lang));
      return;
    }
  }

  // ==================== STEP: TRANSPORT SAFETY (ORANGE patients) ====================
  if (session.awaitingTransportSafety) {
    session.awaitingTransportSafety = false;

    if (message === '1') {
      // Can travel safely — route to facility
      await sendWhatsAppMessage(from, msg('transport_safe', lang));
      // Continue to facility routing (same as YELLOW/GREEN flow)
      const { pathway, facilityType } = getTriagePathway(session.lastTriage.triage_level);
      session.lastPathway = pathway;

      if (!session.location) {
        session.pendingTriage = true;
        await saveSession(patientId, session);
        await sendWhatsAppMessage(from, msg('request_location', lang));
        return;
      }

      const nearestFacilities = await findNearestFacilities(session.location, facilityType, 3);
      if (nearestFacilities.length > 0) {
        const nearest = nearestFacilities[0];
        const alternatives = nearestFacilities.slice(1);
        session.suggestedFacility = nearest;
        session.alternativeFacilities = alternatives;

        // During clinic hours: use the specific ORANGE clinic message
        if (isClinicOpen() && facilityType === 'clinic') {
          session.awaitingFacilityConfirm = true;
          await saveSession(patientId, session);
          await sendWhatsAppMessage(from, msg('triage_orange_clinic', lang, nearest.name, nearest.distance));
          return;
        }

        session.awaitingFacilityConfirm = true;
        await saveSession(patientId, session);
        await sendWhatsAppMessage(from, msg('facility_suggest', lang, nearest.name, nearest.distance));
      } else {
        await logTriage({
          patient_id: patientId,
          triage_level: session.lastTriage.triage_level,
          confidence: session.lastTriage.confidence,
          escalation: false,
          pathway,
          facility_name: null,
          location: session.location || null,
          symptoms: session.lastSymptoms
        });
        await scheduleFollowUp(patientId, from, session.lastTriage.triage_level);
        await sendWhatsAppMessage(from, msg('tips', lang));
      }
      await saveSession(patientId, session);
      return;

    } else if (message === '2') {
      // Too unwell to travel — advise ambulance
      await sendWhatsAppMessage(from, msg('transport_unsafe', lang));

      // Also give nearest hospital if we have location
      if (session.location) {
        const nearestHospitals = await findNearestFacilities(session.location, 'hospital', 1);
        if (nearestHospitals.length > 0) {
          const nearest = nearestHospitals[0];
          const hospitalMsg = {
            en: `🏥 If ambulance is delayed, your nearest hospital is:\n*${nearest.name}* (${nearest.distance} km)\n\nAsk someone to drive you there.`,
            zu: `🏥 Uma i-ambulensi iphuza, isibhedlela esiseduze:\n*${nearest.name}* (${nearest.distance} km)\n\nCela umuntu akushayele.`,
            xh: `🏥 Ukuba i-ambulensi ilibele, isibhedlele esikufutshane:\n*${nearest.name}* (${nearest.distance} km)\n\nCela umntu akuqhubele.`,
            af: `🏥 As die ambulans vertraag word, jou naaste hospitaal is:\n*${nearest.name}* (${nearest.distance} km)\n\nVra iemand om jou te ry.`,
          };
          await sendWhatsAppMessage(from, hospitalMsg[lang] || hospitalMsg['en']);
        }
      }

      await logTriage({
        patient_id: patientId,
        triage_level: session.lastTriage?.triage_level || 'ORANGE',
        confidence: session.lastTriage?.confidence,
        escalation: true,
        pathway: 'ambulance_advised',
        facility_name: null,
        location: session.location || null,
        symptoms: session.lastSymptoms
      });
      await scheduleFollowUp(patientId, from, 'ORANGE');
      await sendWhatsAppMessage(from, msg('tips', lang));
      await saveSession(patientId, session);
      return;

    } else {
      // No transport — advise ambulance + alternatives
      await sendWhatsAppMessage(from, msg('transport_none', lang));

      await logTriage({
        patient_id: patientId,
        triage_level: session.lastTriage?.triage_level || 'ORANGE',
        confidence: session.lastTriage?.confidence,
        escalation: true,
        pathway: 'transport_barrier',
        facility_name: null,
        location: session.location || null,
        symptoms: session.lastSymptoms
      });
      await scheduleFollowUp(patientId, from, 'ORANGE');
      await sendWhatsAppMessage(from, msg('tips', lang));
      await saveSession(patientId, session);
      return;
    }
  }

  // ==================== STEP: RETURNING VS NEW PATIENT ====================
  if (session.awaitingReturningPatient) {
    session.awaitingReturningPatient = false;

    if (message === '1') {
      session.isReturningPatient = true;
      session.fileStatus = 'existing';
      await saveSession(patientId, session);
      await sendWhatsAppMessage(from, msg('returning_yes', lang));
    } else if (message === '2') {
      session.isReturningPatient = false;
      session.fileStatus = 'new';
      await saveSession(patientId, session);
      await sendWhatsAppMessage(from, msg('returning_new', lang));
    } else {
      session.isReturningPatient = null;
      session.fileStatus = 'unknown';
      await saveSession(patientId, session);
      await sendWhatsAppMessage(from, msg('returning_unsure', lang));
    }

    // Auto-add to clinic queue and send wait time estimate
    await autoAddToQueue(patientId, from, session);

    await scheduleFollowUp(patientId, from, session.lastTriage?.triage_level);
    await sendWhatsAppMessage(from, msg('tips', lang));
    return;
  }

  // ==================== SMART COMMAND DETECTOR ====================
  // Fuzzy-matches commands (language, code, help) with misspelling tolerance.
  // ONLY triggers when patient is NOT in an active input step — prevents
  // intercepting names, symptoms, or other free-text the patient is typing.
  const isInActiveInput = (
    session.identityStep ||
    session.awaitingSymptomDetail ||
    session.awaitingSymptomFollowUp ||
    session.awaitingFacilityConfirm ||
    session.awaitingAlternativeChoice ||
    session.awaitingTransportSafety ||
    session.awaitingReturningPatient ||
    session.pendingLanguageChange ||
    session.ccmddStep ||
    session.virtualConsultStep
  );

  if (!isInActiveInput) {
    // --- LANGUAGE CHANGE ---
    const LANG_WORDS = [
      'language','lang','langu','langua','languag','languages',
      'ulimi','ulim','ulwimi','ulwim',
      'taal','taa',
      'polelo','polel','puo',
      'ririmi','ririm',
      'lulwimi','lulwim',
      'luambo','luamb',
      'ilimi','ilim',
      'change language','change lang',
      'shintsha ulimi','tshintsha ulwimi',
      'verander taal','fetola puo',
    ];
    if (LANG_WORDS.includes(message) || (message.length <= 10 && (message.startsWith('lang') || message.startsWith('ulim') || message.startsWith('taa')))) {
      session.pendingLanguageChange = true;
      await saveSession(patientId, session);
      await sendWhatsAppMessage(from, MESSAGES.language_menu._all);
      return;
    }

    // --- REFERENCE CODE ---
    const CODE_WORDS = [
      'code','codes','cod','codr','cde','coed','codee',
      'ikhodi','ikodi','ikhod','ikkodi',
      'kode','kodes','koude',
      'khoutu','khoudu','khout','khouto',
      'khodi','khod','kodi',
      'reference','ref','reff',
      'number','my code','my number','my ref',
      'inombolo','nombolo','inomboro','nomboro',
    ];
    if (CODE_WORDS.includes(message) || (message.length <= 12 && (message.startsWith('cod') || message.startsWith('khod') || message.startsWith('kho') || message.startsWith('ref')))) {
      if (session.studyCode) {
        const codeMsg = {
          en: `🔢 Your reference number is: *${session.studyCode}*\n\nShow this number at reception when you arrive at the clinic.\n\nType "code" anytime to see it again.`,
          zu: `🔢 Inombolo yakho yereferensi ithi: *${session.studyCode}*\n\nKhombisa le nombolo e-reception uma ufika emtholampilo.\n\nBhala "code" noma nini ukuyibona futhi.`,
          xh: `🔢 Inombolo yakho yereferensi ithi: *${session.studyCode}*\n\nBonisa le nombolo e-reception xa ufika ekliniki.\n\nBhala "code" nanini na ukuyibona kwakhona.`,
          af: `🔢 Jou verwysingsnommer is: *${session.studyCode}*\n\nWys hierdie nommer by ontvangs wanneer jy by die kliniek aankom.\n\nTik "code" enige tyd om dit weer te sien.`,
        };
        await sendWhatsAppMessage(from, codeMsg[lang] || codeMsg['en']);
      } else {
        const refCode = await generateStudyCode(patientId);
        session.studyCode = refCode;
        await saveSession(patientId, session);
        const codeMsg = {
          en: `🔢 Your reference number is: *${refCode}*\n\nShow this number at reception when you arrive at the clinic.`,
          zu: `🔢 Inombolo yakho yereferensi ithi: *${refCode}*\n\nKhombisa le nombolo e-reception uma ufika emtholampilo.`,
          xh: `🔢 Inombolo yakho yereferensi ithi: *${refCode}*\n\nBonisa le nombolo e-reception xa ufika ekliniki.`,
          af: `🔢 Jou verwysingsnommer is: *${refCode}*\n\nWys hierdie nommer by ontvangs wanneer jy by die kliniek aankom.`,
        };
        await sendWhatsAppMessage(from, codeMsg[lang] || codeMsg['en']);
      }
      return;
    }

    // --- HELP / MENU ---
    const HELP_WORDS = ['help','menu','start','hi','hello','hey','usizo','nceda','hulp','thusa','pfuna'];
    if (HELP_WORDS.includes(message)) {
      if (session.consent && session.identityDone && session.chronicScreeningDone && session.isStudyParticipant !== undefined) {
        await sendWhatsAppMessage(from, msg('category_menu', lang));
      } else {
        await sendWhatsAppMessage(from, MESSAGES.language_menu._all);
      }
      return;
    }
  }

  // Handle language selection after "language" command
  if (session.pendingLanguageChange) {
    if (LANG_MAP[message]) {
      session.language = LANG_MAP[message];
      session.pendingLanguageChange = false;
      await saveSession(patientId, session);
      await sendWhatsAppMessage(from, msg('language_set', session.language));
      if (session.consent && session.identityDone && session.chronicScreeningDone && session.isStudyParticipant !== undefined) {
        await sendWhatsAppMessage(from, msg('category_menu', session.language));
      }
      return;
    }
    await sendWhatsAppMessage(from, MESSAGES.language_menu._all);
    return;
  }

  // ==================== STEP: LAB RESULTS QUERY ====================
  if (FEATURES.LAB_RESULTS && isLabResultsQuery(message)) {
    await handleLabResultsQuery(patientId, from, session);
    return;
  }

  // ==================== STEP: CCMDD CHECK (before triage) ====================
  if (FEATURES.CCMDD_ROUTING && isChronicMedRequest(message, message)) {
    const chronicMsg = CCMDD_MESSAGES.chronic_check[lang] || CCMDD_MESSAGES.chronic_check['en'];
    session.ccmddStep = 'confirm_chronic';
    await saveSession(patientId, session);
    await sendWhatsAppMessage(from, chronicMsg);
    return;
  }

  // ==================== STEP: CATEGORY SELECTION → ASK FOR DETAIL ====================
  // When a patient picks a category (1-13), we DON'T send "1" to the AI.
  // Instead we ask them to describe their symptoms, giving the AI real
  // clinical information to work with.
  if (CATEGORY_DESCRIPTIONS[message] && !session.awaitingSymptomDetail) {
    // Category 13: Voice note / speak to human — offer voice note first
    if (message === '13') {
      await sendWhatsAppMessage(from, msg('voice_note_prompt', lang));
      session.awaitingSymptomDetail = true;
      session.selectedCategory = '13';
      await saveSession(patientId, session);
      return;
    }

    // Category 12: "Other — type your symptoms" — go straight to detail
    if (message === '12') {
      const detailMsg = msg('category_detail_prompt', lang, 'Other');
      await sendWhatsAppMessage(from, detailMsg);
      session.awaitingSymptomDetail = true;
      session.selectedCategory = '12';
      await saveSession(patientId, session);
      return;
    }

    // Categories 1-11: Show what they selected and ask for detail
    const categoryName = CATEGORY_DESCRIPTIONS[message];
    await sendWhatsAppMessage(from, msg('category_detail_prompt', lang, categoryName));
    session.awaitingSymptomDetail = true;
    session.selectedCategory = message;
    await saveSession(patientId, session);
    return;
  }

  // ==================== STEP: SYMPTOM DETAIL RECEIVED → ENRICH & TRIAGE ====================
  if (session.awaitingSymptomDetail) {
    // Category 13 special handling: patient chose "speak to a human"
    // If they send text (not a voice note), treat it as a human escalation request.
    // Voice notes from cat 13 are handled in the audio handler above (they get transcribed + triaged).
    if (session.selectedCategory === '13') {
      session.awaitingSymptomDetail = false;
      session.selectedCategory = null;
      await saveSession(patientId, session);

      // Log the escalation
      await logTriage({
        patient_id: patientId,
        triage_level: 'YELLOW',
        confidence: 100,
        escalation: true,
        pathway: 'human_escalation_requested',
        facility_name: null,
        location: session.location || null,
        symptoms: `Patient requested human contact. Message: ${message}`
      });

      const humanMsg = {
        en: `👤 Thank you for your message. A healthcare worker will review your case.\n\nIf this is an emergency, please call *10177* or go to your nearest clinic or hospital immediately — do not wait.\n\nYou can also visit your nearest clinic during operating hours for in-person assistance.`,
        zu: `👤 Siyabonga ngomyalezo wakho. Isisebenzi sezempilo sizobheka udaba lwakho.\n\nUma kuphuthumile, sicela ushaye *10177* noma uye emtholampilo noma esibhedlela esiseduze MANJE — ungalindi.\n\nUngavakashela umtholampilo oseduze ngamahora okusebenza.`,
        xh: `👤 Enkosi ngomyalezo wakho. Umsebenzi wezempilo uza kuhlola udaba lwakho.\n\nUkuba yingxakeko, nceda utsalele *10177* okanye uye ekliniki okanye esibhedlele esikufutshane NGOKU — musa ukulinda.\n\nUngatyelela ikliniki yakho ekufutshane ngamaxesha okusebenza.`,
        af: `👤 Dankie vir jou boodskap. 'n Gesondheidswerker sal jou saak hersien.\n\nAs dit 'n noodgeval is, bel asseblief *10177* of gaan na jou naaste kliniek of hospitaal DADELIK — moenie wag nie.\n\nJy kan ook jou naaste kliniek besoek tydens werksure.`,
      };
      await sendWhatsAppMessage(from, humanMsg[lang] || humanMsg['en']);
      await scheduleFollowUp(patientId, from, 'YELLOW');
      return;
    }

    // Categories 1-12: Prepend category context and triage
    const categoryContext = CATEGORY_DESCRIPTIONS[session.selectedCategory] || '';

    // Parse severity options (1=mild, 2=moderate, 3=severe) or accept free text
    const SEVERITY_MAP = {
      '1': 'Severity: MILD — patient can do daily activities.',
      '2': 'Severity: MODERATE — affecting daily activities.',
      '3': 'Severity: SEVERE — patient can barely function.',
    };
    const severityText = SEVERITY_MAP[message.trim()];
    let enrichedMessage;
    if (severityText) {
      enrichedMessage = `Category: ${categoryContext}. ${severityText}`;
      // If they just picked a severity number, ask for a brief description too
      session.awaitingSymptomFollowUp = true;
      session.pendingSeverity = enrichedMessage;
      session.awaitingSymptomDetail = false;
      await saveSession(patientId, session);
      const followUpMsg = {
        en: 'Thank you. Can you briefly tell us:\n\n• When did it start?\n• Any other symptoms?\n\nOr type *skip* to proceed with triage.',
        zu: 'Siyabonga. Ungasitshela kafushane:\n\n• Kuqale nini?\n• Ezinye izimpawu?\n\nNoma bhala *skip* ukuqhubeka.',
        xh: 'Enkosi. Ungasixelela kafutshane:\n\n• Kuqale nini?\n• Ezinye iimpawu?\n\nOkanye bhala *skip* ukuqhubeka.',
        af: 'Dankie. Kan jy kortliks sê:\n\n• Wanneer het dit begin?\n• Enige ander simptome?\n\nOf tik *skip* om voort te gaan.',
      };
      await sendWhatsAppMessage(from, followUpMsg[lang] || followUpMsg['en']);
      return;
    }

    enrichedMessage = categoryContext
      ? `Category: ${categoryContext}. Patient says: ${message}`
      : message;

    session.awaitingSymptomDetail = false;
    session.selectedCategory = null;
    await saveSession(patientId, session);

    message = enrichedMessage;
  }

  // ==================== STEP: SEVERITY FOLLOW-UP ====================
  if (session.awaitingSymptomFollowUp) {
    session.awaitingSymptomFollowUp = false;
    let enrichedMessage = session.pendingSeverity || '';

    if (message !== 'skip' && message.length > 1) {
      enrichedMessage += ' Patient adds: ' + message;
    }

    session.pendingSeverity = null;
    session.selectedCategory = null;
    await saveSession(patientId, session);
    message = enrichedMessage;
  }

  // ==================== STEP 2: TRIAGE (GOVERNANCE-INTEGRATED) ====================
  // Pillar 1: Failsafe mode (deterministic RED classifier) if API is down
  // Pillar 2: Risk factor upgrades + confidence threshold enforcement

  // Send thinking indicator so patient knows we're processing
  await sendWhatsAppMessage(from, msg('thinking', lang));

  const govResult = await governance.runTriageWithGovernance(
    message, lang, session, runTriage, applyClinicalRules
  );
  let triage = govResult.triage;
  const govMeta = govResult.governance;

  // Store for later logging
  session.lastTriage = triage;
  session.lastSymptoms = message;
  session.lastGovMeta = govMeta; // Governance audit trail

  // ==================== STEP 3: RED / LOW CONFIDENCE → ESCALATE ====================
  if (triage.triage_level === 'RED' || triage.confidence < CONFIDENCE_THRESHOLD) {
    // Send emergency message immediately — every second counts
    await sendWhatsAppMessage(from, msg('triage_red', lang));

    await logTriage({
      patient_id: patientId,
      triage_level: triage.triage_level,
      confidence: triage.confidence,
      escalation: triage.confidence < CONFIDENCE_THRESHOLD,
      pathway: 'emergency',
      facility_name: null,
      location: session.location || null,
      symptoms: message,
      governance: {
        failsafe: govMeta.failsafe,
        risk_upgrade: triage.risk_upgrade || null,
        rule_override: triage.rule_override || null,
        issues: govMeta.issues.length,
      }
    });

    // ALSO route to nearest hospital emergency unit — ambulances are unreliable in SA.
    // The patient needs to know WHERE to go, not just to call 10177.
    if (session.location) {
      const nearestHospitals = await findNearestFacilities(session.location, 'hospital', 3);
      if (nearestHospitals.length > 0) {
        const nearest = nearestHospitals[0];
        const emergencyRouteMsg = {
          en: `🏥 Your nearest hospital emergency unit:\n*${nearest.name}* (${nearest.distance} km)\n${nearest.address || ''}\n\nGo there NOW if an ambulance is not coming quickly. Do not wait.`,
          zu: `🏥 Isibhedlela esiseduze nawe:\n*${nearest.name}* (${nearest.distance} km)\n${nearest.address || ''}\n\nYana khona MANJE uma i-ambulensi ingezi ngokushesha. Ungalindi.`,
          xh: `🏥 Isibhedlele esikufutshane nawe:\n*${nearest.name}* (${nearest.distance} km)\n${nearest.address || ''}\n\nYiya khona NGOKU ukuba i-ambulensi ayizi ngokukhawuleza. Musa ukulinda.`,
          af: `🏥 Jou naaste hospitaal noodafdeling:\n*${nearest.name}* (${nearest.distance} km)\n${nearest.address || ''}\n\nGaan soontoe NOU as die ambulans nie vinnig kom nie. Moenie wag nie.`,
        };
        await sendWhatsAppMessage(from, emergencyRouteMsg[lang] || emergencyRouteMsg['en']);
      }
    } else {
      // No location — ask for it so we can route them
      const locationAskMsg = {
        en: '📍 Send us your location (tap the + button → Location) so we can tell you which hospital is nearest to you.',
        zu: '📍 Sithumelele indawo yakho (cindezela inkinobho ye-+ → Indawo) ukuze sikutshele ukuthi isiphi isibhedlela esiseduze nawe.',
        xh: '📍 Sithumelele indawo yakho (cofa iqhosha le-+ → Indawo) ukuze sikuxelele esiphi isibhedlele esikufutshane nawe.',
        af: '📍 Stuur ons jou ligging (tik die + knoppie → Ligging) sodat ons jou kan sê watter hospitaal die naaste aan jou is.',
      };
      await sendWhatsAppMessage(from, locationAskMsg[lang] || locationAskMsg['en']);
      session.pendingTriage = true;
      session.lastTriage = triage;
    }

    await scheduleFollowUp(patientId, from, triage.triage_level);
    await sendWhatsAppMessage(from, msg('tips', lang));
    await saveSession(patientId, session);
    return;
  }

  // ==================== STEP 4: SEND TRIAGE RESULT ====================
  if (triage.triage_level === 'ORANGE') {
    await sendWhatsAppMessage(from, msg('triage_orange', lang));

    // Time-aware routing message
    if (!isClinicOpen()) {
      await sendWhatsAppMessage(from, msg('triage_orange_hospital', lang));
    }

    // Ask transport safety question — critical for ORANGE
    session.awaitingTransportSafety = true;
    session.lastTriage = triage;
    session.lastSymptoms = message;
    await saveSession(patientId, session);
    await sendWhatsAppMessage(from, msg('ask_transport_safety', lang));
    return;

  } else if (triage.triage_level === 'YELLOW') {
    await sendWhatsAppMessage(from, msg('triage_yellow', lang));

    // After-hours: tell patient to come tomorrow morning + schedule reminder
    if (!isClinicOpen()) {
      await sendWhatsAppMessage(from, msg('triage_yellow_after_hours', lang));

      // Schedule a morning reminder for 06:30 SAST next day
      const now = new Date();
      const sast = new Date(now.getTime() + (2 * 60 * 60 * 1000));
      const tomorrow = new Date(sast);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(4, 30, 0, 0); // 04:30 UTC = 06:30 SAST

      try {
        await supabase.from('follow_ups').insert({
          patient_id: patientId,
          phone: from,
          triage_level: 'YELLOW',
          scheduled_at: tomorrow,
          status: 'pending',
          type: 'morning_reminder'
        });
      } catch (e) {
        console.error('[YELLOW_AFTER_HOURS] Failed to schedule morning reminder:', e.message);
      }

      await logTriage({
        patient_id: patientId,
        triage_level: 'YELLOW',
        confidence: triage.confidence,
        escalation: false,
        pathway: 'clinic_visit_tomorrow',
        facility_name: null,
        location: session.location || null,
        symptoms: message
      });
      await sendWhatsAppMessage(from, msg('tips', lang));
      await saveSession(patientId, session);
      return;
    }
  } else {
    await sendWhatsAppMessage(from, msg('triage_green', lang));

    // Generate symptom-specific self-care advice using AI
    try {
      const selfCareAdvice = await generateSelfCareAdvice(message, lang);
      if (selfCareAdvice) {
        await sendWhatsAppMessage(from, selfCareAdvice);
      }
    } catch (e) {
      console.error('[SELF-CARE] Advice generation failed:', e.message);
      // Non-critical — patient already has the GREEN triage message
    }

    // GREEN = self-care, no facility routing needed
    await logTriage({
      patient_id: patientId,
      triage_level: 'GREEN',
      confidence: triage.confidence,
      escalation: false,
      pathway: 'self_care',
      facility_name: null,
      location: session.location || null,
      symptoms: message
    });
    await scheduleFollowUp(patientId, from, 'GREEN');
    await sendWhatsAppMessage(from, msg('tips', lang));
    await saveSession(patientId, session);
    return;
  }

  // ==================== STEP 4.5: OFFER VIRTUAL CONSULT (YELLOW only) ====================
  if (FEATURES.VIRTUAL_CONSULTS && triage.triage_level === 'YELLOW') {
    const offered = await offerVirtualConsult(patientId, from, session);
    if (offered) return; // Wait for patient response
  }

  // ==================== STEP 5: FACILITY ROUTING (ORANGE/YELLOW) ====================
  const { pathway, facilityType } = getTriagePathway(triage.triage_level);
  session.lastPathway = pathway;

  if (!session.location) {
    // Ask for location
    session.pendingTriage = true;
    await saveSession(patientId, session);
    await sendWhatsAppMessage(from, msg('request_location', lang));
    return;
  }

  // Find nearest + alternatives
  const nearestFacilities = await findNearestFacilities(session.location, facilityType, 3);

  if (nearestFacilities.length === 0) {
    // No facilities found — generic guidance
    const genericMsg = triage.triage_level === 'ORANGE'
      ? msg('triage_orange', lang)
      : msg('triage_yellow', lang);
    await sendWhatsAppMessage(from, genericMsg);
    await logTriage({
      patient_id: patientId,
      triage_level: triage.triage_level,
      confidence: triage.confidence,
      escalation: false,
      pathway,
      facility_name: null,
      location: session.location,
      symptoms: message
    });
    await scheduleFollowUp(patientId, from, triage.triage_level);
    await saveSession(patientId, session);
    return;
  }

  // Suggest nearest, offer alternatives
  const nearest = nearestFacilities[0];
  const alternatives = nearestFacilities.slice(1);

  session.suggestedFacility = nearest;
  session.alternativeFacilities = alternatives;
  session.awaitingFacilityConfirm = true;
  await saveSession(patientId, session);

  await sendWhatsAppMessage(from, msg('facility_suggest', lang, nearest.name, nearest.distance));

  // ==================== FALLBACK: UNRECOGNIZED INPUT ====================
  // If we reach here, the patient sent text that didn't match any step.
  // This is unreachable in normal flow (facility_suggest is the last action),
  // but the fallback below catches cases where the orchestrate function
  // falls through without hitting any handler.
}

// Wrapper that adds a fallback to orchestrate for unrecognized input
const _originalOrchestrate = orchestrate;
async function orchestrateWithFallback(patientId, from, message, session) {
  const lang = session.language || 'en';

  // Track if orchestrate sent any message by wrapping sendWhatsAppMessage
  let messageSent = false;
  const originalSend = sendWhatsAppMessage;
  const trackingSend = async (to, text) => {
    messageSent = true;
    return originalSend(to, text);
  };

  // We can't easily wrap sendWhatsAppMessage globally, so instead
  // we detect the fallback case: if the patient has completed onboarding
  // and their message doesn't match a category number or known command,
  // show them the category menu.
  
  // Check if message would fall through all handlers
  const isOnboarded = session.consent && session.identityDone && 
    session.chronicScreeningDone && session.isStudyParticipant !== undefined;
  const isActiveStep = session.identityStep || session.awaitingSymptomDetail || 
    session.awaitingSymptomFollowUp || session.awaitingFacilityConfirm || 
    session.awaitingAlternativeChoice || session.awaitingTransportSafety || 
    session.awaitingReturningPatient || session.pendingLanguageChange || 
    session.pendingTriage || session.ccmddStep || session.virtualConsultStep;
  const isCategory = /^([1-9]|1[0-3])$/.test(message);
  const isReset = message === '0';

  // Run normal orchestration
  await _originalOrchestrate(patientId, from, message, session);

  // If the patient is onboarded, not in an active step, and didn't type
  // a category number or reset command, they probably typed something
  // unrecognized. After orchestrate runs, check if we should show help.
  // We detect this by checking if session state changed (crude but effective).
  if (isOnboarded && !isActiveStep && !isCategory && !isReset) {
    const updatedSession = await getSession(patientId);
    // If no step was activated, show the menu
    if (!updatedSession.awaitingSymptomDetail && !updatedSession.awaitingFacilityConfirm &&
        !updatedSession.awaitingAlternativeChoice && !updatedSession.awaitingTransportSafety &&
        !updatedSession.awaitingReturningPatient && !updatedSession.pendingLanguageChange &&
        !updatedSession.awaitingSymptomFollowUp && !updatedSession.pendingTriage) {
      // Check if this was already handled (triage was run, facility was suggested, etc.)
      // by seeing if lastTriage changed
      if (JSON.stringify(updatedSession.lastTriage) === JSON.stringify(session.lastTriage)) {
        const fallbackMsg = {
          en: 'I didn\'t understand that. Here\'s what you can do:\n\nChoose a number from the menu below, or type:\n*0* — new consultation\n*code* — your reference number\n*language* — change language\n*help* — show menu',
          zu: 'Angikuzwanga lokho. Nanti ongakwenza:\n\nKhetha inombolo kumenyu engezansi, noma bhala:\n*0* — ukuxoxa okusha\n*code* — inombolo yakho\n*ulimi* — shintsha ulimi\n*help* — khombisa imenyu',
          xh: 'Andikuqondanga oko. Nantsi into onokuyenza:\n\nKhetha inombolo kwimenyu engezantsi, okanye bhala:\n*0* — incoko entsha\n*code* — inombolo yakho\n*ulwimi* — tshintsha ulwimi\n*help* — bonisa imenyu',
          af: 'Ek het dit nie verstaan nie. Hier is wat jy kan doen:\n\nKies \'n nommer uit die spyskaart hieronder, of tik:\n*0* — nuwe konsultasie\n*code* — jou verwysingsnommer\n*taal* — verander taal\n*help* — wys spyskaart',
        };
        await sendWhatsAppMessage(from, fallbackMsg[lang] || fallbackMsg['en']);
        await sendWhatsAppMessage(from, msg('category_menu', lang));
      }
    }
  }
}

// ================== MESSAGE DEDUP ==================
// WhatsApp sometimes delivers the same message twice (network retries).
// Without dedup, the system would triage twice and send duplicate results.
// We track recent message IDs in memory with a 5-minute TTL.
const recentMessageIds = new Map(); // messageId → timestamp
const DEDUP_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Clean old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [id, timestamp] of recentMessageIds) {
    if (now - timestamp > DEDUP_TTL_MS) recentMessageIds.delete(id);
  }
}, 60 * 1000);

// ================== RATE LIMITING ==================
// Prevents abuse and runaway API costs from message flooding.
// Max 10 messages per phone number per 60-second window.
// Legitimate patients rarely send more than 3-4 messages per minute.
const rateLimitMap = new Map(); // phone → { count, windowStart }
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function isRateLimited(phone) {
  const now = Date.now();
  const entry = rateLimitMap.get(phone);

  if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(phone, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }
  return false;
}

// Clean rate limit map every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [phone, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) rateLimitMap.delete(phone);
  }
}, 5 * 60 * 1000);

// ================== MAIN HANDLER ==================
async function handleMessage(msgObj) {
  // Dedup: skip if we've already processed this message ID
  const messageId = msgObj.id;
  if (messageId) {
    if (recentMessageIds.has(messageId)) {
      console.log(`[DEDUP] Skipping duplicate message: ${messageId}`);
      return;
    }
    recentMessageIds.set(messageId, Date.now());
  }

  const from = msgObj.from;

  // Rate limiting: prevent message flooding
  if (isRateLimited(from)) {
    console.warn(`[RATE_LIMIT] Throttled: ${from} exceeded ${RATE_LIMIT_MAX} msgs/min`);
    return; // Silently drop — don't send a response (would encourage retries)
  }

  const patientId = hashPhone(from);
  let session = await getSession(patientId);

  // RESET COMMAND — soft reset
  // Preserves: language, chronic conditions, study code, study participation
  // Clears: current triage state, facility routing, pending steps
  // This means returning patients don't have to redo onboarding
  if (msgObj.type === 'text' && msgObj.text.body.trim() === '0') {
    const preserved = {
      language: session.language,
      consent: session.consent,
      // Identity fields (never re-ask)
      firstName: session.firstName,
      surname: session.surname,
      dob: session.dob,
      sex: session.sex,
      identityDone: session.identityDone,
      // Existing preserved fields
      chronicConditions: session.chronicConditions,
      ccmddConditions: session.ccmddConditions,
      chronicScreeningDone: session.chronicScreeningDone,
      isStudyParticipant: session.isStudyParticipant,
      studyCode: session.studyCode,
      location: session.location,
      patientAge: session.patientAge,
      // File status
      isReturningPatient: session.isReturningPatient,
      fileStatus: session.fileStatus,
    };
    await saveSession(patientId, preserved);

    const lang = preserved.language || 'en';

    // If they have a full profile, skip straight to category menu
    if (preserved.language && preserved.consent && preserved.identityDone && preserved.chronicScreeningDone && preserved.isStudyParticipant !== undefined) {
      const resetMsg = {
        en: '🔄 Conversation reset. How can we help you today?',
        zu: '🔄 Ingxoxo iqalwe kabusha. Singakusiza ngani namuhla?',
        xh: '🔄 Incoko iqalwe ngokutsha. Singakunceda ngantoni namhlanje?',
        af: '🔄 Gesprek herstel. Hoe kan ons jou vandag help?',
        nso: '🔄 Poledišano e thomilwe gape. Re ka go thuša ka eng lehono?',
        tn: '🔄 Puisano e simolotšwe gape. Re ka go thusa ka eng gompieno?',
        st: '🔄 Puisano e qalilwe bocha. Re ka o thusa ka eng kajeno?',
        ts: '🔄 Nkani yi sungurile nakambe. Hi nga ku pfuna hi yini namuntlha?',
        ss: '🔄 Ingcoco icalwe kabusha. Singakusita ngani lamuhla?',
        ve: '🔄 Nyambedzano yo thoma hafhu. Ri nga ni thusa nga mini ṋamusi?',
        nr: '🔄 Ingcoco iqalwe kabutjha. Singakusiza ngani namhlanje?',
      };
      await sendWhatsAppMessage(from, resetMsg[lang] || resetMsg['en']);
      await sendWhatsAppMessage(from, msg('category_menu', lang));
    } else {
      // Incomplete profile — show language menu to restart onboarding
      await sendWhatsAppMessage(from, MESSAGES.language_menu._all);
    }
    return;
  }

  // LOCATION HANDLING
  if (msgObj.type === 'location') {
    session.location = msgObj.location;
    await saveSession(patientId, session);

    const lang = session.language || 'en';

    // If we were waiting for location to complete routing
    if (session.pendingTriage && session.lastTriage) {
      session.pendingTriage = false;
      const { facilityType } = getTriagePathway(session.lastTriage.triage_level);
      const nearestFacilities = await findNearestFacilities(session.location, facilityType, 3);

      if (nearestFacilities.length > 0) {
        const nearest = nearestFacilities[0];
        const alternatives = nearestFacilities.slice(1);
        session.suggestedFacility = nearest;
        session.alternativeFacilities = alternatives;
        session.awaitingFacilityConfirm = true;
        await saveSession(patientId, session);
        await sendWhatsAppMessage(from, msg('facility_suggest', lang, nearest.name, nearest.distance));
      } else {
        await sendWhatsAppMessage(from, msg('triage_yellow', lang));
        await saveSession(patientId, session);
      }
      return;
    }

    await sendWhatsAppMessage(from, '📍 ' + (lang === 'en' ? 'Location received.' : 'Location received.'));
    return;
  }

  // ==================== VOICE NOTE HANDLING ====================
  // WhatsApp voice notes (audio messages) are transcribed by Claude
  // and treated as symptom descriptions. Critical for SA patients
  // who prefer speaking over typing.
  if (msgObj.type === 'audio') {
    const lang = session.language || 'en';
    const mediaId = msgObj.audio?.id;

    if (!mediaId) return;

    await sendWhatsAppMessage(from, msg('voice_note_received', lang));

    try {
      const audioBuffer = await downloadWhatsAppMedia(mediaId);
      if (!audioBuffer) {
        await sendWhatsAppMessage(from, lang === 'en'
          ? 'Sorry, I could not process your voice note. Please try typing your symptoms instead.'
          : 'Siyaxolisa, asikwazanga ukucubungula ivoice note yakho. Sicela uzame ukubhala izimpawu zakho.');
        return;
      }

      const transcription = await transcribeVoiceNote(audioBuffer, lang);
      if (!transcription) {
        await sendWhatsAppMessage(from, lang === 'en'
          ? 'Sorry, I could not understand your voice note. Please try again or type your symptoms.'
          : 'Siyaxolisa, asizwanga ivoice note yakho. Sicela uzame futhi noma ubhale izimpawu zakho.');
        return;
      }

      // Feed the transcription into the normal orchestration flow
      // If patient was in category detail step, prepend category context
      if (session.awaitingSymptomDetail && session.selectedCategory) {
        const categoryContext = CATEGORY_DESCRIPTIONS[session.selectedCategory] || '';
        const enrichedText = `Category: ${categoryContext}. Patient says: ${transcription}`;
        session.awaitingSymptomDetail = false;
        await saveSession(patientId, session);
        await orchestrateWithFallback(patientId, from, enrichedText, session);
      } else {
        await orchestrateWithFallback(patientId, from, transcription, session);
      }
    } catch (e) {
      console.error('[VOICE] Error handling voice note:', e.message);
      await sendWhatsAppMessage(from, lang === 'en'
        ? 'Sorry, something went wrong processing your voice note. Please type your symptoms instead.'
        : 'Kukhona okungahambanga kahle. Sicela ubhale izimpawu zakho.');
    }
    return;
  }

  // UNSUPPORTED MESSAGE TYPES (stickers, images, videos, contacts, documents)
  if (msgObj.type !== 'text') {
    const lang = session.language || 'en';
    const unsupportedMsg = {
      en: 'Sorry, I can only read text messages and voice notes. Please type your message or send a voice note 🎤\n\nType *0* to start over or *help* for the menu.',
      zu: 'Siyaxolisa, ngifunda imiyalezo yombhalo namavoice note kuphela. Sicela ubhale umyalezo noma uthumele ivoice note 🎤\n\nBhala *0* ukuqala kabusha noma *help* ukubona imenyu.',
      xh: 'Siyaxolisa, ndifunda imiyalezo yombhalo neevoice note kuphela. Nceda ubhale umyalezo okanye uthumele ivoice note 🎤\n\nBhala *0* ukuqala kwakhona okanye *help* ukubona imenyu.',
      af: 'Jammer, ek kan net teksboodskappe en stemnota\'s lees. Tik asseblief jou boodskap of stuur \'n stemnota 🎤\n\nTik *0* om oor te begin of *help* vir die spyskaart.',
    };
    await sendWhatsAppMessage(from, unsupportedMsg[lang] || unsupportedMsg['en']);
    return;
  }
  const text = msgObj.text.body.trim().toLowerCase();

  // ==================== FOLLOW-UP RESPONSE HANDLING ====================
  const { data: pendingFollowUps } = await supabase
    .from('follow_ups')
    .select('*')
    .eq('patient_id', patientId)
    .eq('status', 'sent')
    .limit(1);

  if (pendingFollowUps && pendingFollowUps.length > 0) {
    const followUp = pendingFollowUps[0];
    const lang = session.language || 'en';

    if (['1', '2', '3'].includes(text)) {
      if (text === '1') {
        await sendWhatsAppMessage(from, msg('follow_up_better', lang));
      } else if (text === '2') {
        await sendWhatsAppMessage(from, msg('follow_up_same', lang));
      } else if (text === '3') {
        await sendWhatsAppMessage(from, msg('follow_up_worse', lang));
        await logTriage({
          patient_id: patientId,
          triage_level: 'RECHECK',
          confidence: 100,
          escalation: true,
          pathway: 'follow_up_escalation',
          symptoms: 'follow-up worsening'
        });
      }

      await supabase
        .from('follow_ups')
        .update({ status: 'completed', response: text })
        .eq('id', followUp.id);

      return;
    }
  }

  // NORMAL ORCHESTRATION
  await orchestrateWithFallback(patientId, from, text, session);
}

// ================== FOLLOW-UP AGENT ==================
async function runFollowUpAgent() {
  const due = await getDueFollowUps();

  for (const item of due) {
    // Get patient language
    const patientId = item.patient_id;
    const session = await getSession(patientId);
    const lang = session.language || 'en';

    await sendWhatsAppMessage(item.phone, msg('follow_up', lang));

    // Mark as sent (not completed — wait for response)
    await supabase
      .from('follow_ups')
      .update({ status: 'sent' })
      .eq('id', item.id);
  }
}

setInterval(runFollowUpAgent, 5 * 60 * 1000);

// ================== WEBHOOK ==================
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const msgObj = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msgObj) return;

    const from = msgObj.from;
    const patientId = hashPhone(from);

    // ==================== LOAD SHEDDING / OUTAGE SAFETY NET ====================
    // If the system can't process the message within 15 seconds (due to
    // load shedding, API timeout, DB outage, etc.), send an emergency
    // fallback message so the patient is never left with silence.
    // Advises calling 10177 AND travelling to nearest clinic (ambulances
    // are unreliable in many SA areas).
    const TIMEOUT_MS = 15000;
    let responded = false;

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(async () => {
        if (!responded) {
          try {
            // Try to get patient language from session; fall back to English
            let lang = 'en';
            try {
              const session = await getSession(patientId);
              lang = session.language || 'en';
            } catch (e) { /* DB might be down too — use English */ }

            const timeoutMsg = msg('system_timeout', lang);
            await sendWhatsAppMessage(from, timeoutMsg);

            // Log the timeout for governance monitoring
            try {
              governance.systemIntegrity.recordInferenceError('message_processing_timeout_15s');
            } catch (e) {
              // Governance/Supabase is also down — queue locally for later flush
              queueEvent({
                type: 'message_processing_timeout',
                table: 'governance_alerts',
                data: {
                  alert_type: 'message_processing_timeout_15s',
                  severity: 'HIGH',
                  pillar: 'system_integrity',
                  message: `Patient message timed out after 15s. Fallback emergency message sent (lang: ${lang}). Patient: ${patientId}`,
                  assigned_to: 'devops_engineer',
                  original_timestamp: new Date().toISOString(),
                }
              });
            }
          } catch (e) {
            console.error('[TIMEOUT] Failed to send fallback message:', e.message);
          }
        }
        resolve();
      }, TIMEOUT_MS);
    });

    const messagePromise = handleMessage(msgObj).then(() => {
      responded = true;
    });

    // Race: either message processing completes, or timeout fires
    await Promise.race([messagePromise, timeoutPromise]);

    // Let the message processing finish in the background if timeout fired first
    if (!responded) {
      messagePromise.then(() => { responded = true; }).catch(() => {});
    }
  } catch (err) {
    console.error('Error handling message:', err);
  }
});

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// ================== HEALTH CHECK ==================
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.2',
    service: 'BIZUSIZO',
    governance: governance.systemIntegrity.isFailsafeActive() ? 'FAILSAFE' : 'NOMINAL',
  });
});

// ================================================================
// CLINICAL DASHBOARD — API ENDPOINTS
// ================================================================

// GET /api/clinical/stats — Overview statistics
app.get('/api/clinical/stats', requireDashboardAuth, async (req, res) => {
  try {
    const { data: triages } = await supabase.from('triage_logs').select('triage_level, confidence, created_at, pathway, symptoms');
    const { data: sessions } = await supabase.from('sessions').select('language, chronicConditions, isStudyParticipant, created_at');
    const { data: followUps } = await supabase.from('follow_ups').select('status, triage_level, created_at');
    const { data: studyCodes } = await supabase.from('study_codes').select('id');

    const t = triages || [];
    const s = sessions || [];
    const f = followUps || [];

    // Triage distribution
    const triageCounts = { RED: 0, ORANGE: 0, YELLOW: 0, GREEN: 0 };
    t.forEach(r => { if (triageCounts[r.triage_level] !== undefined) triageCounts[r.triage_level]++; });

    // Language distribution
    const langCounts = {};
    s.forEach(r => { const l = r.language || 'unknown'; langCounts[l] = (langCounts[l] || 0) + 1; });

    // Confidence stats
    const confidences = t.filter(r => r.confidence).map(r => r.confidence);
    const avgConfidence = confidences.length > 0 ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) : 0;
    const lowConfidence = confidences.filter(c => c < 75).length;

    // Follow-up stats
    const followUpSent = f.filter(r => r.status === 'sent').length;
    const followUpResponded = f.filter(r => ['better', 'same', 'worse'].includes(r.status)).length;

    // Pathway distribution
    const pathwayCounts = {};
    t.forEach(r => { const p = r.pathway || 'unknown'; pathwayCounts[p] = (pathwayCounts[p] || 0) + 1; });

    // Daily triage counts (last 30 days)
    const dailyCounts = {};
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    t.forEach(r => {
      if (r.created_at && new Date(r.created_at) > thirtyDaysAgo) {
        const day = new Date(r.created_at).toISOString().split('T')[0];
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      }
    });

    // Chronic conditions distribution
    const conditionCounts = {};
    s.forEach(r => {
      if (r.chronicConditions && Array.isArray(r.chronicConditions)) {
        r.chronicConditions.forEach(c => {
          const name = typeof c === 'object' ? (c.label_en || c.id || 'unknown') : c;
          conditionCounts[name] = (conditionCounts[name] || 0) + 1;
        });
      }
    });

    res.json({
      total_triages: t.length,
      total_sessions: s.length,
      study_participants: (studyCodes || []).length,
      triage_distribution: triageCounts,
      language_distribution: langCounts,
      avg_confidence: avgConfidence,
      low_confidence_count: lowConfidence,
      follow_up_sent: followUpSent,
      follow_up_responded: followUpResponded,
      follow_up_response_rate: followUpSent > 0 ? Math.round(followUpResponded / followUpSent * 100) : 0,
      pathway_distribution: pathwayCounts,
      daily_triages: dailyCounts,
      chronic_conditions: conditionCounts,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/clinical/recent — Recent triage events
app.get('/api/clinical/recent', requireDashboardAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const { data } = await supabase
      .from('triage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================================================================
// CLINICAL DASHBOARD — Inline HTML (vanilla JS, no dependencies)
// ================================================================
app.get('/clinical', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(getClinicalDashboardHTML());
});

function getClinicalDashboardHTML() {
  return [
'<!DOCTYPE html>',
'<html lang="en">',
'<head>',
'<meta charset="UTF-8">',
'<meta name="viewport" content="width=device-width, initial-scale=1.0">',
'<title>BIZUSIZO Clinical Dashboard</title>',
'<style>',
'*{margin:0;padding:0;box-sizing:border-box}',
'body{background:#0a0e17;color:#e2e8f0;font-family:-apple-system,sans-serif;padding:20px}',
'.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #1e293b}',
'.header h1{font-size:20px}',
'.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px}',
'.card{background:#111827;border:1px solid #1e293b;border-radius:10px;padding:16px}',
'.card .label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}',
'.card .value{font-size:28px;font-weight:700;margin-top:4px}',
'.card .sub{font-size:12px;color:#64748b;margin-top:4px}',
'.section{margin-bottom:24px}',
'.section h2{font-size:16px;color:#94a3b8;margin-bottom:12px}',
'.chart-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}',
'.bar-chart{background:#111827;border:1px solid #1e293b;border-radius:10px;padding:16px}',
'.bar{display:flex;align-items:center;gap:8px;margin-bottom:8px}',
'.bar .bar-label{width:80px;font-size:12px;color:#94a3b8;text-align:right;flex-shrink:0}',
'.bar .bar-fill{height:24px;border-radius:4px;transition:width .5s;display:flex;align-items:center;padding-left:8px;font-size:11px;font-weight:600;min-width:30px}',
'.bar-red{background:rgba(239,68,68,.7)}.bar-orange{background:rgba(249,115,22,.7)}.bar-yellow{background:rgba(234,179,8,.7)}.bar-green{background:rgba(34,197,94,.7)}.bar-default{background:rgba(59,130,246,.5)}',
'table{width:100%;border-collapse:collapse;font-size:13px}',
'th{text-align:left;padding:8px 12px;background:#111827;color:#64748b;font-size:11px;text-transform:uppercase;border-bottom:1px solid #1e293b}',
'td{padding:8px 12px;border-bottom:1px solid #1e293b}',
'.badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}',
'.badge-RED{color:#ef4444;border:1px solid rgba(239,68,68,.3)}.badge-ORANGE{color:#f97316;border:1px solid rgba(249,115,22,.3)}.badge-YELLOW{color:#eab308;border:1px solid rgba(234,179,8,.3)}.badge-GREEN{color:#22c55e;border:1px solid rgba(34,197,94,.3)}',
'.empty{text-align:center;padding:40px;color:#475569}',
'.login{position:fixed;inset:0;background:#0a0e17;display:flex;align-items:center;justify-content:center;z-index:99}',
'.login-box{background:#111827;border:1px solid #1e293b;border-radius:10px;padding:32px;width:320px;text-align:center}',
'.login-box h2{margin-bottom:16px;font-size:18px}',
'.login-box input{width:100%;padding:10px;border-radius:6px;border:1px solid #1e293b;background:#0d1321;color:#e2e8f0;margin-bottom:12px;font-size:14px}',
'.login-box button{width:100%;padding:10px;border-radius:6px;border:none;background:#3b82f6;color:white;font-size:14px;cursor:pointer}',
'.nav{display:flex;gap:12px;margin-bottom:24px;font-size:13px}',
'.nav a{color:#64748b;text-decoration:none;padding:6px 12px;border-radius:6px;border:1px solid #1e293b}',
'.nav a:hover,.nav a.active{color:#e2e8f0;border-color:#3b82f6}',
'</style>',
'</head>',
'<body>',
'<div id="login" class="login"><div class="login-box">',
'<h2>BIZUSIZO Clinical Dashboard</h2>',
'<p style="color:#64748b;font-size:13px;margin-bottom:16px">Sign in to access the dashboard</p>',
'<input type="text" id="uname" placeholder="Your name (e.g. Bongekile)" style="width:100%;padding:10px;border-radius:6px;border:1px solid #1e293b;background:#0d1321;color:#e2e8f0;margin-bottom:8px;font-size:14px">',
'<input type="password" id="pwd" placeholder="Password" onkeyup="if(event.key===\'Enter\')doLogin()">',
'<button onclick="doLogin()">Sign in</button>',
'<p id="login-err" style="color:#ef4444;font-size:12px;margin-top:8px"></p>',
'</div></div>',
'<div id="app" style="display:none">',
'<div class="header"><h1>BIZUSIZO Clinical Dashboard</h1><div><span style="color:#475569;font-size:11px" id="logged-in-as"></span><span style="color:#475569;font-size:11px;margin-left:12px" id="last-refresh"></span></div></div>',
'<div class="nav"><a href="/dashboard">Governance Dashboard</a><a href="/clinical" class="active">Clinical Dashboard</a></div>',
'<div class="grid" id="stat-cards"></div>',
'<div class="chart-row">',
'<div class="bar-chart"><h3 style="font-size:14px;color:#94a3b8;margin-bottom:12px">Triage Distribution</h3><div id="triage-bars"></div></div>',
'<div class="bar-chart"><h3 style="font-size:14px;color:#94a3b8;margin-bottom:12px">Languages Used</h3><div id="lang-bars"></div></div>',
'</div>',
'<div class="chart-row">',
'<div class="bar-chart"><h3 style="font-size:14px;color:#94a3b8;margin-bottom:12px">Chronic Conditions</h3><div id="condition-bars"></div></div>',
'<div class="bar-chart"><h3 style="font-size:14px;color:#94a3b8;margin-bottom:12px">Pathways</h3><div id="pathway-bars"></div></div>',
'</div>',
'<div class="section"><h2>Recent Triage Events</h2><div class="card">',
'<table><thead><tr><th>Time</th><th>Level</th><th>Confidence</th><th>Pathway</th><th>Symptoms</th></tr></thead>',
'<tbody id="recent-body"></tbody></table></div></div>',
'<div style="margin-top:32px;padding-top:16px;border-top:1px solid #1e293b;font-size:10px;color:#475569;display:flex;justify-content:space-between">',
'<span>BIZUSIZO Clinical Dashboard v1.0</span><span>Auto-refresh every 60s</span></div>',
'</div>',
'<script>',
'var PWD="";var UNAME="";',
'var langNames={en:"English",zu:"isiZulu",xh:"isiXhosa",af:"Afrikaans",nso:"Sepedi",tn:"Setswana",st:"Sesotho",ts:"Xitsonga",ss:"siSwati",ve:"Tshivenda",nr:"isiNdebele"};',
'async function api(p){try{var r=await fetch(p,{headers:{"x-dashboard-password":PWD,"x-dashboard-user":UNAME}});if(!r.ok)throw new Error(r.status);return await r.json();}catch(e){console.error(p,e);return null;}}',
'function doLogin(){UNAME=document.getElementById("uname").value.trim();PWD=document.getElementById("pwd").value;if(!UNAME){document.getElementById("login-err").textContent="Please enter your name";return;}api("/api/clinical/stats").then(function(d){if(d&&!d.error){document.getElementById("login").style.display="none";document.getElementById("app").style.display="block";document.getElementById("logged-in-as").textContent="Signed in as: "+UNAME;refresh();}else{document.getElementById("login-err").textContent="Invalid password or server error";}});}',
'function timeAgo(d){if(!d)return"-";var s=Math.floor((Date.now()-new Date(d))/1000);if(s<60)return s+"s ago";if(s<3600)return Math.floor(s/60)+"m ago";if(s<86400)return Math.floor(s/3600)+"h ago";return Math.floor(s/86400)+"d ago";}',
'function makeBars(id,data,cm){var el=document.getElementById(id);var e=Object.entries(data).sort(function(a,b){return b[1]-a[1]});var mx=Math.max.apply(null,e.map(function(x){return x[1]}));if(mx<1)mx=1;if(e.length===0){el.innerHTML="<div class=\\"empty\\">No data yet</div>";return;}el.innerHTML=e.map(function(x){var pct=Math.round(x[1]/mx*100);var cls=cm&&cm[x[0]]?cm[x[0]]:"bar-default";var lb=langNames[x[0]]||x[0];return "<div class=\\"bar\\"><span class=\\"bar-label\\">"+lb+"</span><div class=\\"bar-fill "+cls+"\\" style=\\"width:"+pct+"%\\">"+x[1]+"</div></div>";}).join("");}',
'async function refresh(){var stats=await api("/api/clinical/stats");if(!stats)return;document.getElementById("last-refresh").textContent="Updated "+new Date().toLocaleTimeString();var td=stats.triage_distribution||{};var total=stats.total_triages||0;',
'document.getElementById("stat-cards").innerHTML=[{l:"Total Triages",v:total,s:"All time"},{l:"Active Sessions",v:stats.total_sessions||0,s:"Unique patients"},{l:"Study Participants",v:stats.study_participants||0,s:"With BZ-XXXX codes"},{l:"RED",v:td.RED||0,s:total>0?((td.RED||0)/total*100).toFixed(1)+"%":"0%"},{l:"ORANGE",v:td.ORANGE||0,s:total>0?((td.ORANGE||0)/total*100).toFixed(1)+"%":"0%"},{l:"YELLOW",v:td.YELLOW||0,s:total>0?((td.YELLOW||0)/total*100).toFixed(1)+"%":"0%"},{l:"GREEN",v:td.GREEN||0,s:total>0?((td.GREEN||0)/total*100).toFixed(1)+"%":"0%"},{l:"Avg Confidence",v:stats.avg_confidence+"%",s:"Low conf: "+(stats.low_confidence_count||0)},{l:"Follow-up Rate",v:stats.follow_up_response_rate+"%",s:stats.follow_up_responded+"/"+stats.follow_up_sent}].map(function(c){return "<div class=\\"card\\"><div class=\\"label\\">"+c.l+"</div><div class=\\"value\\">"+c.v+"</div><div class=\\"sub\\">"+c.s+"</div></div>";}).join("");',
'makeBars("triage-bars",td,{RED:"bar-red",ORANGE:"bar-orange",YELLOW:"bar-yellow",GREEN:"bar-green"});',
'makeBars("lang-bars",stats.language_distribution||{});',
'makeBars("condition-bars",stats.chronic_conditions||{});',
'makeBars("pathway-bars",stats.pathway_distribution||{});',
'var recent=await api("/api/clinical/recent?limit=15");var rb=document.getElementById("recent-body");',
'if(recent&&recent.length>0){rb.innerHTML=recent.map(function(r){var sym=(r.symptoms||"-").substring(0,60);return "<tr><td>"+timeAgo(r.created_at)+"</td><td><span class=\\"badge badge-"+(r.triage_level||"")+"\\">"+( r.triage_level||"-")+"</span></td><td>"+(r.confidence||"-")+"%</td><td>"+(r.pathway||"-")+"</td><td>"+sym+"</td></tr>";}).join("");}else{rb.innerHTML="<tr><td colspan=\\"5\\" class=\\"empty\\">No triage events yet</td></tr>";}}',
'setInterval(refresh,60000);',
'</script>',
'</body>',
'</html>',
  ].join('\n');
}

// ================================================================
// STUDY CODE — API ENDPOINTS (for research assistants)
// ================================================================

// GET /api/study-codes/lookup/:code — Look up patient by study code
app.get('/api/study-codes/lookup/:code', requireDashboardAuth, async (req, res) => {
  try {
    const result = await lookupStudyCode(req.params.code);
    if (!result) return res.status(404).json({ error: 'Study code not found' });

    // Get the patient's session for additional context
    const session = await getSession(result.patient_id);

    res.json({
      study_code: result.study_code,
      patient_id: result.patient_id,
      created_at: result.created_at,
      language: session.language || 'en',
      chronic_conditions: (session.chronicConditions || []).map(c => c.label_en),
      has_location: !!session.location,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/study-codes — List all study codes (paginated)
app.get('/api/study-codes', requireDashboardAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('study_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(req.query.limit) || 100);

    if (error) throw error;
    res.json({ codes: data, total: data ? data.length : 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/study-codes/patient/:patientId — Get study code for a patient
app.get('/api/study-codes/patient/:patientId', requireDashboardAuth, async (req, res) => {
  try {
    const { data } = await supabase
      .from('study_codes')
      .select('*')
      .eq('patient_id', req.params.patientId)
      .limit(1);

    if (!data || data.length === 0) return res.status(404).json({ error: 'No study code for this patient' });
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================================================================
// GOVERNANCE DASHBOARD — API ENDPOINTS
// ================================================================

// GET /api/governance/status — Full governance status across all pillars
app.get('/api/governance/status', requireDashboardAuth, async (req, res) => {
  try {
    const status = await governance.getGovernanceStatus();
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/governance/alerts — List governance alerts (filterable)
app.get('/api/governance/alerts', requireDashboardAuth, async (req, res) => {
  try {
    let query = supabase
      .from('governance_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(req.query.limit) || 50);

    if (req.query.pillar) query = query.eq('pillar', req.query.pillar);
    if (req.query.severity) query = query.eq('severity', req.query.severity);
    if (req.query.resolved === 'false') query = query.eq('resolved', false);
    if (req.query.resolved === 'true') query = query.eq('resolved', true);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ alerts: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/governance/alerts/:id/resolve — Resolve an alert
app.put('/api/governance/alerts/:id/resolve', requireDashboardAuth, async (req, res) => {
  try {
    await supabase
      .from('governance_alerts')
      .update({ resolved: true, resolved_at: new Date(), resolved_by: req.body.resolved_by || 'dashboard' })
      .eq('id', req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/governance/incidents — Report an incident (L1-L4)
app.post('/api/governance/incidents', requireDashboardAuth, async (req, res) => {
  try {
    const result = await governance.incidentManager.reportIncident(req.body);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/governance/incidents — List incidents
app.get('/api/governance/incidents', requireDashboardAuth, async (req, res) => {
  try {
    let query = supabase
      .from('governance_incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(req.query.limit) || 50);

    if (req.query.severity_level) query = query.eq('severity_level', parseInt(req.query.severity_level));
    if (req.query.status) query = query.eq('status', req.query.status);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ incidents: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/governance/incidents/:id/resolve — Resolve an incident
app.put('/api/governance/incidents/:id/resolve', requireDashboardAuth, async (req, res) => {
  try {
    const result = await governance.incidentManager.resolveIncident(req.params.id, req.body);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/governance/audit/run — Trigger monthly audit manually
app.post('/api/governance/audit/run', requireDashboardAuth, async (req, res) => {
  try {
    const result = await governance.incidentManager.runMonthlyAudit();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/governance/audits — List audits
app.get('/api/governance/audits', requireDashboardAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('governance_audits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(req.query.limit) || 20);

    if (error) throw error;
    res.json({ audits: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/governance/audits/:id — Submit clinical review for an audit
app.put('/api/governance/audits/:id', requireDashboardAuth, async (req, res) => {
  try {
    const { clinician_feedback, computed_metrics, reviewed_by } = req.body;

    await supabase
      .from('governance_audits')
      .update({
        clinician_feedback,
        computed_metrics: computed_metrics || null,
        reviewed_by: reviewed_by || 'clinical_governance_lead',
        reviewed_at: new Date(),
        status: 'reviewed'
      })
      .eq('id', req.params.id);

    // If metrics provided, trigger statistical check
    if (computed_metrics) {
      await governance.clinicalPerformance.runStatisticalCheck();
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/governance/metrics — Performance metrics over time
app.get('/api/governance/metrics', requireDashboardAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('governance_metrics')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ metrics: data, period_days: days });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/governance/baselines — Set/update validation baselines
app.post('/api/governance/baselines', requireDashboardAuth, async (req, res) => {
  try {
    const { ppv, sensitivity, concordance, set_by } = req.body;

    // Deactivate previous baselines
    await supabase
      .from('governance_baselines')
      .update({ active: false })
      .eq('active', true);

    // Insert new baseline
    const { data, error } = await supabase
      .from('governance_baselines')
      .insert({
        values: { ppv, sensitivity, concordance },
        active: true,
        set_by: set_by || 'dashboard',
        created_at: new Date()
      })
      .select()
      .single();

    if (error) throw error;

    // Reload baselines in the clinical monitor
    await governance.clinicalPerformance._loadBaselines();

    res.json({ success: true, baseline: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/governance/reviews — Lifecycle reviews
app.get('/api/governance/reviews', requireDashboardAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('governance_reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ reviews: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/governance/reviews/:id — Complete a lifecycle review
app.put('/api/governance/reviews/:id', requireDashboardAuth, async (req, res) => {
  try {
    const { decision, notes, reviewed_by, actions } = req.body;
    // decision: 'continue' | 'retrain' | 'reprompt' | 'retire_pathway' | 'rollback'

    await supabase
      .from('governance_reviews')
      .update({
        status: 'completed',
        decision,
        notes,
        reviewed_by: reviewed_by || 'governance_forum',
        completed_at: new Date(),
        actions: actions || []
      })
      .eq('id', req.params.id);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================================================================
// CLINIC QUEUE MANAGEMENT SYSTEM
// ================================================================
// Supabase table required: clinic_queue
// See clinic-queue-migration.sql for schema
// ================================================================

// GET /api/clinic/expected — Today's expected patients for file preparation
// Admin opens this at 07:00 to pre-pull files
app.get('/api/clinic/expected', requireDashboardAuth, async (req, res) => {
  try {
    const facility = req.query.facility;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let query = supabase
      .from('triage_logs')
      .select('*')
      .gte('created_at', todayStart.toISOString())
      .not('facility_name', 'is', null)
      .order('created_at', { ascending: true });

    if (facility) {
      query = query.eq('facility_name', facility);
    }

    const { data: triages, error } = await query;
    if (error) throw error;

    const expectedPatients = [];
    const seenPatients = new Set();

    for (const t of (triages || [])) {
      if (seenPatients.has(t.patient_id)) continue;
      seenPatients.add(t.patient_id);

      const { data: sessionData } = await supabase
        .from('sessions')
        .select('data')
        .eq('patient_id', t.patient_id)
        .single();

      const s = sessionData?.data || {};

      const { data: studyCodeData } = await supabase
        .from('study_codes')
        .select('study_code')
        .eq('patient_id', t.patient_id)
        .limit(1);

      // Generate file hints for admin
      const fileHints = [];
      if (s.surname) {
        const initial = s.surname.charAt(0).toUpperCase();
        if (initial <= 'F') fileHints.push('Check A–F shelf');
        else if (initial <= 'M') fileHints.push('Check G–M shelf');
        else fileHints.push('Check N–Z shelf');
      }
      if ((s.chronicConditions || []).length > 0) {
        fileHints.push('Check chronic files section');
      }
      if (s.fileStatus === 'new') {
        fileHints.push('NEW PATIENT — create folder');
      }

      expectedPatients.push({
        patient_id: t.patient_id,
        first_name: s.firstName || null,
        surname: s.surname || null,
        dob: s.dob?.dob_string || null,
        age: s.dob?.age || s.patientAge || null,
        sex: s.sex || null,
        triage_level: t.triage_level,
        triage_confidence: t.confidence,
        symptoms_summary: t.symptoms ? t.symptoms.slice(0, 200) : null,
        facility_name: t.facility_name,
        triage_time: t.created_at,
        study_code: studyCodeData?.[0]?.study_code || s.studyCode || null,
        chronic_conditions: (s.chronicConditions || []).map(c => c.label_en || c.key),
        is_returning: s.isReturningPatient,
        file_status: s.fileStatus || 'unknown',
        file_hints: fileHints,
        language: s.language || 'en',
      });
    }

    res.json({
      date: todayStart.toISOString().split('T')[0],
      facility: facility || 'all',
      count: expectedPatients.length,
      patients: expectedPatients,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/clinic/queue — Get current queue (or filter by status)
app.get('/api/clinic/queue', requireDashboardAuth, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let query = supabase
      .from('clinic_queue')
      .select('*')
      .gte('checked_in_at', todayStart.toISOString());

    // Filter by status (default: waiting + in_consultation)
    if (req.query.status) {
      query = query.eq('status', req.query.status);
    } else {
      query = query.in('status', ['waiting', 'in_consultation']);
    }

    query = query.order('queue_type', { ascending: true })
      .order('position', { ascending: true });

    if (req.query.queue_type) {
      query = query.eq('queue_type', req.query.queue_type);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ queue: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/clinic/queue/stats — Live queue statistics
app.get('/api/clinic/queue/stats', requireDashboardAuth, async (req, res) => {
  try {
    const { data: active, error } = await supabase
      .from('clinic_queue')
      .select('queue_type, status, triage_level, checked_in_at')
      .in('status', ['waiting', 'in_consultation']);

    if (error) throw error;

    const waiting = (active || []).filter(p => p.status === 'waiting');
    const inConsult = (active || []).filter(p => p.status === 'in_consultation');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: completed } = await supabase
      .from('clinic_queue')
      .select('checked_in_at, called_at, queue_type')
      .eq('status', 'completed')
      .gte('checked_in_at', todayStart.toISOString())
      .not('called_at', 'is', null);

    const avgWaitByQueue = {};
    if (completed && completed.length > 0) {
      const grouped = {};
      completed.forEach(p => {
        const qt = p.queue_type || 'walk_in';
        if (!grouped[qt]) grouped[qt] = [];
        const waitMs = new Date(p.called_at) - new Date(p.checked_in_at);
        if (waitMs > 0) grouped[qt].push(waitMs);
      });
      Object.entries(grouped).forEach(([qt, waits]) => {
        avgWaitByQueue[qt] = Math.round(waits.reduce((a, b) => a + b, 0) / waits.length / 60000);
      });
    }

    const stats = {
      fast_track: { waiting: 0, in_consultation: 0 },
      routine: { waiting: 0, in_consultation: 0 },
      walk_in: { waiting: 0, in_consultation: 0 },
      total_waiting: waiting.length,
      total_in_consultation: inConsult.length,
      avg_wait_minutes: avgWaitByQueue,
    };

    waiting.forEach(p => {
      const qt = p.queue_type || 'walk_in';
      if (stats[qt]) stats[qt].waiting++;
    });

    inConsult.forEach(p => {
      const qt = p.queue_type || 'walk_in';
      if (stats[qt]) stats[qt].in_consultation++;
    });

    const { data: todayAll } = await supabase
      .from('clinic_queue')
      .select('status')
      .gte('checked_in_at', todayStart.toISOString());

    stats.today_total = todayAll ? todayAll.length : 0;
    stats.today_completed = todayAll ? todayAll.filter(p => p.status === 'completed').length : 0;
    stats.today_no_show = todayAll ? todayAll.filter(p => p.status === 'no_show').length : 0;

    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/clinic/lookup — Lookup patient by phone number or study code
app.get('/api/clinic/lookup', requireDashboardAuth, async (req, res) => {
  try {
    const { phone, study_code } = req.query;

    if (!phone && !study_code) {
      return res.status(400).json({ error: 'Provide phone or study_code' });
    }

    let patientId;
    let studyCodeData = null;

    if (study_code) {
      const { data } = await supabase
        .from('study_codes')
        .select('*')
        .eq('study_code', study_code.toUpperCase().trim())
        .limit(1);
      if (data && data.length > 0) {
        patientId = data[0].patient_id;
        studyCodeData = data[0];
      }
    } else if (phone) {
      patientId = crypto.createHash('sha256').update(phone).digest('hex').slice(0, 16);
    }

    if (!patientId) {
      return res.json({ found: false });
    }

    const { data: triages } = await supabase
      .from('triage_logs')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: sessionData } = await supabase
      .from('sessions')
      .select('data')
      .eq('patient_id', patientId)
      .single();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: queueEntry } = await supabase
      .from('clinic_queue')
      .select('*')
      .eq('patient_id', patientId)
      .gte('checked_in_at', todayStart.toISOString())
      .in('status', ['waiting', 'in_consultation'])
      .limit(1);

    const session = sessionData?.data || {};

    res.json({
      found: true,
      patient_id: patientId,
      first_name: session.firstName || null,
      surname: session.surname || null,
      dob: session.dob?.dob_string || null,
      age: session.dob?.age || session.patientAge || null,
      sex: session.sex || null,
      study_code: studyCodeData?.study_code || session.studyCode || null,
      language: session.language || 'en',
      triage_history: triages || [],
      latest_triage: triages && triages.length > 0 ? triages[0] : null,
      chronic_conditions: session.ccmddConditions || session.chronicConditions || [],
      is_returning: session.isReturningPatient,
      file_status: session.fileStatus || 'unknown',
      already_in_queue: queueEntry && queueEntry.length > 0 ? queueEntry[0] : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/clinic/queue — Add patient to queue
app.post('/api/clinic/queue', requireDashboardAuth, async (req, res) => {
  try {
    const { patient_id, patient_phone, patient_name, triage_level,
            triage_confidence, symptoms_summary, queue_type, notes,
            study_code, added_by } = req.body;

    if (!patient_id || !queue_type) {
      return res.status(400).json({ error: 'patient_id and queue_type required' });
    }

    const { data: lastInQueue } = await supabase
      .from('clinic_queue')
      .select('position')
      .eq('queue_type', queue_type)
      .eq('status', 'waiting')
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = (lastInQueue && lastInQueue.length > 0)
      ? lastInQueue[0].position + 1
      : 1;

    const entry = {
      patient_id,
      patient_phone: patient_phone || null,
      patient_name: patient_name || null,
      triage_level: triage_level || 'UNKNOWN',
      triage_confidence: triage_confidence || null,
      symptoms_summary: symptoms_summary || null,
      queue_type,
      status: 'waiting',
      checked_in_at: new Date(),
      position: nextPosition,
      notes: notes || null,
      study_code: study_code || null,
      created_at: new Date(),
    };

    const { data, error } = await supabase
      .from('clinic_queue')
      .insert(entry)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, queue_entry: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/clinic/queue/:id/call — Call patient (move to in_consultation)
app.put('/api/clinic/queue/:id/call', requireDashboardAuth, async (req, res) => {
  try {
    const { assigned_to, room } = req.body;

    // Get patient details before updating
    const { data: patient } = await supabase
      .from('clinic_queue')
      .select('patient_phone, patient_id')
      .eq('id', req.params.id)
      .single();

    const { error } = await supabase
      .from('clinic_queue')
      .update({
        status: 'in_consultation',
        called_at: new Date(),
        assigned_to: assigned_to || null,
      })
      .eq('id', req.params.id);

    if (error) throw error;

    // Send WhatsApp notification to patient
    if (patient && patient.patient_phone) {
      try {
        const session = await getSession(patient.patient_id);
        const lang = session.language || 'en';
        const displayName = room || assigned_to || null;
        const calledMsg = typeof MESSAGES.queue_called[lang] === 'function'
          ? MESSAGES.queue_called[lang](displayName)
          : MESSAGES.queue_called['en'](displayName);
        await sendWhatsAppMessage(patient.patient_phone, calledMsg);
      } catch (e) {
        console.error('[QUEUE_CALL] WhatsApp notification failed:', e.message);
        // Don't fail the API call — notification is best-effort
      }
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/clinic/queue/:id/complete — Complete consultation
app.put('/api/clinic/queue/:id/complete', requireDashboardAuth, async (req, res) => {
  try {
    const { notes } = req.body;
    const { error } = await supabase
      .from('clinic_queue')
      .update({
        status: 'completed',
        completed_at: new Date(),
        notes: notes || null,
      })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/clinic/queue/:id/no-show — Mark as no-show
app.put('/api/clinic/queue/:id/no-show', requireDashboardAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('clinic_queue')
      .update({
        status: 'no_show',
        completed_at: new Date(),
      })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/clinic/queue/:id/reassign — Move patient to different queue
app.put('/api/clinic/queue/:id/reassign', requireDashboardAuth, async (req, res) => {
  try {
    const { queue_type } = req.body;
    if (!queue_type) return res.status(400).json({ error: 'queue_type required' });

    const { data: lastInQueue } = await supabase
      .from('clinic_queue')
      .select('position')
      .eq('queue_type', queue_type)
      .eq('status', 'waiting')
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = (lastInQueue && lastInQueue.length > 0)
      ? lastInQueue[0].position + 1
      : 1;

    const { error } = await supabase
      .from('clinic_queue')
      .update({
        queue_type,
        position: nextPosition,
      })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/clinic/nurse-view — Next patients per queue + priority alerts
app.get('/api/clinic/nurse-view', requireDashboardAuth, async (req, res) => {
  try {
    const { data: waiting, error } = await supabase
      .from('clinic_queue')
      .select('*')
      .eq('status', 'waiting')
      .order('position', { ascending: true });

    if (error) throw error;

    const fastTrack = (waiting || []).filter(p => p.queue_type === 'fast_track');
    const routine = (waiting || []).filter(p => p.queue_type === 'routine');
    const walkIn = (waiting || []).filter(p => p.queue_type === 'walk_in');

    const now = Date.now();
    const alerts = (waiting || []).filter(p => {
      const waitMin = (now - new Date(p.checked_in_at).getTime()) / 60000;
      return (
        (p.triage_level === 'RED' && waitMin > 5) ||
        (p.triage_level === 'ORANGE' && waitMin > 15) ||
        (p.triage_level === 'YELLOW' && waitMin > 60)
      );
    }).map(p => ({
      ...p,
      wait_minutes: Math.round((now - new Date(p.checked_in_at).getTime()) / 60000),
      alert_reason: p.triage_level === 'RED' ? 'RED patient waiting > 5 min'
        : p.triage_level === 'ORANGE' ? 'ORANGE patient waiting > 15 min'
        : 'YELLOW patient waiting > 60 min',
    }));

    res.json({
      fast_track: fastTrack.slice(0, 10),
      routine: routine.slice(0, 10),
      walk_in: walkIn.slice(0, 10),
      alerts,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================== START ==================
app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 BIZUSIZO v2.3 Orchestrator LIVE (Governance + Identity + Clinic Queue)');
});
