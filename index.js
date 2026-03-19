// ============================================================
// HealthBridgeSA v2.0 — Production Multi-Agent Triage System
// Merged codebase: Document 2 UX + Document 1 persistence
// Stack: Railway + Meta WhatsApp + Supabase + Anthropic
// ============================================================

require('dotenv').config();
const express = require('express');
const crypto  = require('crypto');
const fetch   = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const path = require('path');

const app = express();
app.use(express.json());

// ================================================================
// DASHBOARD AUTHENTICATION
// ================================================================

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'healthbridge2026';
const AUTH_COOKIE_NAME = 'hb_auth';
const AUTH_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Active auth tokens (in-memory, survives for session lifetime)
const authTokens = new Map();

function generateAuthToken() {
  return crypto.randomBytes(32).toString('hex');
}

function isAuthenticated(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const token = match[1];
  const session = authTokens.get(token);
  if (!session) return false;
  if (Date.now() > session.expires) {
    authTokens.delete(token);
    return false;
  }
  return true;
}

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) return next();
  // For API calls, return 401
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  // For dashboard, redirect to login
  res.redirect('/login');
}

// Login page
app.get('/login', (req, res) => {
  const error = req.query.error ? '<p style="color:var(--red);margin-bottom:16px">Incorrect password. Try again.</p>' : '';
  res.send(LOGIN_PAGE_HTML.replace('{{ERROR}}', error));
});

// Login handler
app.post('/login', express.urlencoded({ extended: false }), (req, res) => {
  const { password } = req.body;
  if (password === DASHBOARD_PASSWORD) {
    const token = generateAuthToken();
    authTokens.set(token, { expires: Date.now() + AUTH_TOKEN_EXPIRY });
    res.setHeader('Set-Cookie', `${AUTH_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${AUTH_TOKEN_EXPIRY / 1000}; SameSite=Strict`);
    res.redirect('/dashboard');
  } else {
    res.redirect('/login?error=1');
  }
});

// Logout
app.get('/logout', (req, res) => {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
  if (match) authTokens.delete(match[1]);
  res.setHeader('Set-Cookie', `${AUTH_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`);
  res.redirect('/login');
});

// Serve dashboard (protected)
app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Login page HTML
const LOGIN_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HealthBridgeSA — Login</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  :root { --bg:#0c0f14; --surface:#161a22; --border:#2a2f3c; --text:#e4e7ec; --text-muted:#8b92a5; --accent:#3b82f6; --red:#ef4444; --radius:10px; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'DM Sans',sans-serif; background:var(--bg); color:var(--text); min-height:100vh; display:flex; align-items:center; justify-content:center; }
  .login-card {
    background:var(--surface); border:1px solid var(--border); border-radius:var(--radius);
    padding:40px; width:100%; max-width:380px; text-align:center;
  }
  .login-card h1 { font-size:22px; font-weight:700; margin-bottom:6px; }
  .login-card .subtitle { font-size:13px; color:var(--text-muted); margin-bottom:28px; }
  .login-card .icon { font-size:40px; margin-bottom:16px; }
  .field { margin-bottom:16px; text-align:left; }
  .field label { display:block; font-size:12px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px; }
  .field input {
    width:100%; padding:10px 14px; background:var(--bg); border:1px solid var(--border);
    border-radius:8px; color:var(--text); font-size:14px; font-family:'DM Sans',sans-serif;
    outline:none; transition:border-color 0.15s;
  }
  .field input:focus { border-color:var(--accent); }
  .btn {
    width:100%; padding:12px; background:var(--accent); border:none; border-radius:8px;
    color:white; font-size:14px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif;
    transition:background 0.15s;
  }
  .btn:hover { background:#2563eb; }
</style>
</head>
<body>
<div class="login-card">
  <div class="icon">🏥</div>
  <h1>HealthBridgeSA</h1>
  <p class="subtitle">Clinical Dashboard — Staff Login</p>
  {{ERROR}}
  <form method="POST" action="/login">
    <div class="field">
      <label>Password</label>
      <input type="password" name="password" placeholder="Enter dashboard password" autofocus required>
    </div>
    <button type="submit" class="btn">Sign In</button>
  </form>
</div>
</body>
</html>`;

// ================================================================
// CONFIG & CLIENTS
// ================================================================

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WHATSAPP_API_URL = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

// ================================================================
// UTILITY
// ================================================================

function hashPhone(phone) {
  return crypto.createHash('sha256').update(phone).digest('hex').slice(0, 16);
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ================================================================
// AGENT 1: LANGUAGE
// ================================================================

const LANG_CODES = {
  '1': 'en', '2': 'zu', '3': 'xh', '4': 'af',
  '5': 'nso', '6': 'tn', '7': 'st', '8': 'ts',
  '9': 'ss', '10': 've', '11': 'nr',
};

const LANG_NAMES = {
  en: 'English', zu: 'isiZulu', xh: 'isiXhosa', af: 'Afrikaans',
  nso: 'Sepedi', tn: 'Setswana', st: 'Sesotho', ts: 'Xitsonga',
  ss: 'siSwati', ve: 'Tshivenda', nr: 'isiNdebele',
};

const WELCOME_MENU =
  'Welcome to HealthBridgeSA 🏥\n' +
  'Please choose your language / Khetha ulimi lwakho:\n\n' +
  '1. English\n2. isiZulu\n3. isiXhosa\n4. Afrikaans\n' +
  '5. Sepedi\n6. Setswana\n7. Sesotho\n8. Xitsonga\n' +
  '9. siSwati\n10. Tshivenda\n11. isiNdebele';

const LANG_CONFIRMED = {
  en:  '✅ Language set to *English*.\nType *0* or *menu* anytime to change language.',
  zu:  '✅ Ulimi lusetelwe ku *isiZulu*.\nBhala *0* noma *menu* ukushintsha ulimi.',
  xh:  '✅ Ulwimi lusethwe kwi *isiXhosa*.\nTayipha *0* okanye *menu* ukuguqula ulwimi.',
  af:  '✅ Taal ingestel op *Afrikaans*.\nTik *0* of *menu* om taal te verander.',
  nso: '✅ Polelo e beelwe go *Sepedi*.\nŽwala *0* goba *menu* go fetola polelo.',
  tn:  '✅ Puo e beelwe go *Setswana*.\nKwala *0* kgotsa *menu* go fetola puo.',
  st:  '✅ Puo e behilwe ho *Sesotho*.\nKwala *0* kapa *menu* ho fetola puo.',
  ts:  '✅ Ririmi ri sethiwa eka *Xitsonga*.\nŽwala *0* kumbe *menu* ku cinca ririmi.',
  ss:  '✅ Lulwimi lubekwe ku *siSwati*.\nTayipha *0* nome *menu* kushintshe lulwimi.',
  ve:  '✅ Luambo lu lavhelelwa kha *Tshivenda*.\nŽwala *0* kana *menu* u shandukisa luambo.',
  nr:  '✅ Ilimi libekwe ku *isiNdebele*.\nBhala *0* nome *menu* ukushintsha ilimi.',
};

async function translateText(englishText, lang) {
  if (lang === 'en') return englishText;
  const langName = LANG_NAMES[lang] || lang;
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: `Translate into ${langName}. Use simple everyday spoken language. Keep numbers, emoji, WhatsApp bold markers (*text*), and emergency phone numbers unchanged. Output only the translation.`,
      messages: [{ role: 'user', content: englishText }],
    });
    for (const block of response.content) {
      if (block.type === 'text') return block.text.trim();
    }
  } catch (err) {
    console.error(`Translation to ${langName} failed:`, err.message);
  }
  return englishText;
}

// ================================================================
// AGENT 2: CONSENT (POPIA compliant)
// ================================================================

const CONSENT_PROMPT = {
  en: '⚖️ *HealthBridgeSA Privacy Notice*\n\n' +
    'This service provides health guidance only — it is *not* a diagnosis.\n' +
    'Your information is kept confidential under the POPIA Act.\n' +
    'We store anonymised health data to improve our service.\n\n' +
    'Do you consent to proceed?\n\n' +
    '1. ✅ Yes, I consent\n' +
    '2. ❌ No, I decline',
};

const CONSENT_RECEIVED = {
  en: '✅ Thank you. Your consent has been recorded.\n\nPlease describe your symptoms or choose from the menu below.',
};

const CONSENT_DECLINED = {
  en: '❌ You have declined consent. We respect your decision.\n' +
    'If you change your mind, send any message to start again.\n' +
    'For emergencies, always call *10177*.',
};

// ================================================================
// AGENT 3: TRIAGE — Structured menu + Claude free-text fallback
// ================================================================

const CATEGORY_MENU_EN =
  'What is your main concern today?\n\n' +
  '1. 🫁 Breathing problems / Chest pain\n' +
  '2. 🤕 Head injury / Severe headache\n' +
  '3. 🤰 Pregnancy related\n' +
  '4. 🩸 Bleeding / Wound\n' +
  '5. 🤒 Fever / Flu / Cough\n' +
  '6. 🤢 Stomach pain / Vomiting / Diarrhoea\n' +
  '7. 👶 Baby or child is sick\n' +
  '8. 💊 Medication / Chronic condition refill\n' +
  '9. 🦴 Bone / Joint / Back pain\n' +
  '10. 😔 Mental health / Feeling distressed\n' +
  '11. ⚡ Allergic reaction / Rash / Swelling\n' +
  '12. 🔢 Other (type your symptoms)\n' +
  '13. 👤 Speak to a human\n\n' +
  'Type *0* or *menu* anytime to change language.';

const FOLLOWUP_EN = {
  '1': 'Please choose:\n\n1. Struggling to breathe right now\n2. Having chest pain\n3. Coughing for more than 2 weeks\n4. Wheezing / Asthma attack',
  '2': 'Please choose:\n\n1. Head injury from an accident or fall\n2. Severe sudden headache ("worst of my life")\n3. Headache with blurred vision or confusion\n4. Mild or regular headache',
  '3': 'Please choose:\n\n1. Bleeding during pregnancy\n2. Severe headache or blurred vision\n3. Waters have broken\n4. Regular contractions / labour pains\n5. General pregnancy question',
  '4': 'Please choose:\n\n1. Uncontrolled / heavy bleeding\n2. Deep cut or wound that may need stitches\n3. Minor cut or scrape\n4. Internal bleeding (stomach pain after injury)',
  '5': 'Please choose:\n\n1. Very high fever with confusion or fits\n2. High fever (child under 5)\n3. Fever with cough and difficulty breathing\n4. Mild fever / flu / cough',
  '6': 'Please choose:\n\n1. Severe stomach pain (cannot stand up straight)\n2. Vomiting blood or black material\n3. Diarrhoea with signs of dehydration\n4. Mild stomach pain or nausea',
  '7': 'Please choose:\n\n1. Baby under 3 months with fever\n2. Child having a fit / seizure\n3. Child struggling to breathe\n4. Child with rash, vomiting or diarrhoea\n5. General concern about a child',
  '8': 'Please choose:\n\n1. Ran out of chronic medication (hypertension, diabetes, TB, HIV etc.)\n2. Side effects from medication\n3. Need a repeat prescription\n4. Question about medication',
  '9': 'Please choose:\n\n1. Injury from accident (possible fracture)\n2. Severe joint swelling or cannot move limb\n3. Chronic back or joint pain\n4. Mild muscle or joint pain',
  '10': 'Please choose:\n\n1. Thinking of harming yourself or others\n2. Feeling very low, hopeless or unable to cope\n3. Anxiety or panic attacks\n4. General mental health question',
  '11': 'Please choose:\n\n1. Severe allergic reaction (face/throat swelling, difficulty breathing)\n2. Widespread rash with fever\n3. Mild rash or skin irritation\n4. Insect bite or sting',
};

const FOLLOWUP_TRIAGE = {
  '1':  ['RED', 'ORANGE', 'YELLOW', 'YELLOW'],
  '2':  ['ORANGE', 'ORANGE', 'ORANGE', 'GREEN'],
  '3':  ['RED', 'ORANGE', 'ORANGE', 'ORANGE', 'GREEN'],
  '4':  ['RED', 'ORANGE', 'GREEN', 'ORANGE'],
  '5':  ['ORANGE', 'ORANGE', 'ORANGE', 'GREEN'],
  '6':  ['ORANGE', 'RED', 'YELLOW', 'GREEN'],
  '7':  ['ORANGE', 'RED', 'RED', 'YELLOW', 'GREEN'],
  '8':  ['YELLOW', 'YELLOW', 'GREEN', 'GREEN'],
  '9':  ['ORANGE', 'ORANGE', 'YELLOW', 'GREEN'],
  '10': ['RED', 'YELLOW', 'YELLOW', 'GREEN'],
  '11': ['RED', 'ORANGE', 'GREEN', 'GREEN'],
};

// Mental health category gets special handling
const MENTAL_HEALTH_CRISIS_REPLY = {
  en: '🆘 *You are not alone.*\n\n' +
    'If you or someone near you is in immediate danger, call *10177* now.\n\n' +
    '📞 *SADAG 24hr Helpline:* 0800 567 567\n' +
    '📞 *Suicide Crisis Line:* 0800 567 567\n' +
    '📞 *SMS Helpline:* 31393\n\n' +
    'A trained counsellor is available 24 hours a day, 7 days a week.\n' +
    'Please reach out — help is available right now.',
};

// SATS triage reply templates
const TRIAGE_REPLIES_EN = {
  RED:
    '🔴 *CODE RED — EMERGENCY*\n' +
    'Call *10177* for an ambulance immediately.\n' +
    'Gauteng ER24: *084 124*\n' +
    'Do not move the patient unless in danger. Stay on the line with the operator.',
  ORANGE:
    '🟠 *CODE ORANGE — VERY URGENT*\n' +
    'Get to your nearest hospital emergency unit within 1 hour.\n' +
    'If you cannot transport safely, call *10177*.\n' +
    'Do not eat or drink until assessed.',
  YELLOW:
    '🟡 *CODE YELLOW — URGENT*\n' +
    'Visit your nearest clinic or hospital within 4 hours.\n' +
    'Bring your ID and medical aid card if you have one.',
  GREEN:
    '🟢 *CODE GREEN — ROUTINE*\n' +
    'Book an appointment at your local clinic.\n' +
    'You can also visit a pharmacy for over-the-counter advice.\n' +
    'If symptoms worsen, message again.',
  BLUE:
    '🔵 *CODE BLUE — PALLIATIVE CARE*\n' +
    'We are deeply sorry for what you and your loved one are going through.\n' +
    'Hospice Palliative Care Association of SA: *011 807 2586*\n' +
    'You are not alone.',
};

async function buildTriageReply(classification, lang) {
  const englishReply = TRIAGE_REPLIES_EN[classification] || TRIAGE_REPLIES_EN.GREEN;
  return await translateText(englishReply, lang);
}

async function claudeTriage(patientText) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: `You are a medical triage assistant for HealthBridge SA.
Classify using the South African Triage Scale (SATS).
The message may be in any of South Africa's 11 official languages.

Understand regional dialects, code-switching (e.g. "Ngi-ne chest pain"), and township medical slang.
When in doubt, classify toward the more serious level.

RED    – Life-threatening: cardiac arrest, severe breathing difficulty, uncontrolled bleeding,
         unconsciousness, stroke signs, major trauma, poisoning.
ORANGE – Very urgent: moderate breathing difficulty, high fever with altered mental state,
         severe pain, fractures, head injury (conscious), active seizures.
YELLOW – Urgent (within 4 hours): high fever, moderate pain, lacerations, vomiting/diarrhoea
         with mild dehydration, worsening chronic condition.
GREEN  – Non-urgent: mild cold/flu, minor wounds, general health questions, prescription refills.
BLUE   – Deceased or palliative: end-of-life, comfort care only.

Respond with ONLY a JSON object:
{"classification":"YELLOW","english_summary":"Patient reports...","confidence":"HIGH"}

confidence: HIGH (clear match), MEDIUM (could fit multiple levels), LOW (ambiguous/brief).
No markdown, no code fences, no extra text.`,
      messages: [{ role: 'user', content: patientText }],
    });

    const valid = new Set(['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE']);
    for (const block of response.content) {
      if (block.type !== 'text') continue;
      try {
        const parsed = JSON.parse(block.text.trim());
        return {
          classification: valid.has(String(parsed.classification).toUpperCase())
            ? String(parsed.classification).toUpperCase() : 'GREEN',
          englishSummary: String(parsed.english_summary || patientText),
          confidence: ['HIGH', 'MEDIUM', 'LOW'].includes(String(parsed.confidence).toUpperCase())
            ? String(parsed.confidence).toUpperCase() : 'LOW',
        };
      } catch { break; }
    }
  } catch (err) {
    console.error('Claude triage failed:', err.message);
  }
  return { classification: 'GREEN', englishSummary: patientText, confidence: 'LOW' };
}

// Clinical rules engine — hard overrides for known dangerous combinations
function applyClinicalRules(text, triage) {
  const lower = text.toLowerCase();
  if (lower.includes('chest pain') && (lower.includes('breath') || lower.includes('arm')))
    return { ...triage, classification: 'RED', confidence: 'HIGH', ruleOverride: 'cardiac_emergency' };
  if (lower.includes('pregnant') && lower.includes('bleed'))
    return { ...triage, classification: 'RED', confidence: 'HIGH', ruleOverride: 'obstetric_emergency' };
  if (lower.includes('not breathing') || lower.includes('unconscious') || lower.includes('choking'))
    return { ...triage, classification: 'RED', confidence: 'HIGH', ruleOverride: 'airway_emergency' };
  if (lower.includes('snake') && lower.includes('bit'))
    return { ...triage, classification: 'RED', confidence: 'HIGH', ruleOverride: 'envenomation' };
  if ((lower.includes('baby') || lower.includes('infant')) && lower.includes('not breathing'))
    return { ...triage, classification: 'RED', confidence: 'HIGH', ruleOverride: 'neonatal_emergency' };
  return triage;
}

// ================================================================
// AGENT 4: FACILITY ROUTING
// ================================================================

async function getFacilities() {
  const { data, error } = await supabase
    .from('facilities')
    .select('*')
    .eq('active', true);
  if (error) { console.error('Facility fetch error:', error.message); return []; }
  return data || [];
}

async function routePatient(triageLevel, location) {
  if (!location || !location.latitude || !location.longitude) {
    return { pathway: pathwayForLevel(triageLevel), facility: null, directions: null };
  }

  const facilities = await getFacilities();
  if (facilities.length === 0) {
    return { pathway: pathwayForLevel(triageLevel), facility: null, directions: null };
  }

  // RED/ORANGE → hospitals only. YELLOW → clinics preferred. GREEN → any.
  const preferredType = (triageLevel === 'RED' || triageLevel === 'ORANGE') ? 'hospital'
    : triageLevel === 'YELLOW' ? 'clinic' : null;

  let candidates = preferredType
    ? facilities.filter(f => f.type === preferredType)
    : facilities;

  // Fall back to all if no candidates of preferred type
  if (candidates.length === 0) candidates = facilities;

  let best = null;
  let bestScore = Infinity;

  for (const f of candidates) {
    const dist = haversine(location.latitude, location.longitude, f.latitude, f.longitude);
    const capacityRatio = f.capacity > 0 ? f.current_queue / f.capacity : 0;
    const waitNorm = f.wait_time_minutes > 0 ? f.wait_time_minutes / 120 : 0; // normalize to 2hr max
    const score = dist * 0.5 + capacityRatio * 0.3 + waitNorm * 0.2;
    if (score < bestScore) { bestScore = score; best = f; }
  }

  const directions = best
    ? `https://www.google.com/maps/dir/?api=1&destination=${best.latitude},${best.longitude}`
    : null;

  return { pathway: pathwayForLevel(triageLevel), facility: best, directions };
}

function pathwayForLevel(level) {
  if (level === 'RED') return 'ambulance';
  if (level === 'ORANGE') return 'emergency_unit';
  if (level === 'YELLOW') return 'clinic_visit';
  if (level === 'BLUE') return 'palliative';
  return 'self_care';
}

function buildRoutingMessage(routing, lang, hasLocation) {
  // If no facility found (no GPS), prompt to share location for critical cases
  if (!routing.facility) {
    if (routing.pathway === 'ambulance' || routing.pathway === 'emergency_unit') {
      return '\n\n📍 *Share your location* so we can find the nearest hospital for you. You can send a location pin anytime.';
    }
    if (routing.pathway === 'clinic_visit') {
      return '\n\n📍 Share your location so we can find the nearest clinic for you.';
    }
    return '';
  }
  const f = routing.facility;
  let msg = '';
  if (routing.pathway === 'ambulance') {
    msg = `\n\n🏥 *Nearest hospital:* ${f.name}\n⏱ Estimated wait: ~${f.wait_time_minutes} mins`;
  } else if (routing.pathway === 'emergency_unit') {
    msg = `\n\n🏥 *Nearest emergency unit:* ${f.name}\n⏱ Estimated wait: ~${f.wait_time_minutes} mins`;
  } else if (routing.pathway === 'clinic_visit') {
    msg = `\n\n🏥 *Nearest clinic:* ${f.name}\n⏱ Estimated wait: ~${f.wait_time_minutes} mins`;
  }
  if (routing.directions) {
    msg += `\n📍 Directions: ${routing.directions}`;
  }
  return msg;
}

// ================================================================
// AGENT 5: ESCALATION
// ================================================================

function needsEscalation(classification, confidence, ruleOverride) {
  if (classification === 'RED') return { escalate: true, reason: 'CODE_RED_EMERGENCY' };
  if (confidence === 'LOW') return { escalate: true, reason: 'LOW_CONFIDENCE_TRIAGE' };
  if (confidence === 'MEDIUM') return { escalate: true, reason: 'MEDIUM_CONFIDENCE_REVIEW' };
  if (ruleOverride) return { escalate: true, reason: `RULE_OVERRIDE_${ruleOverride.toUpperCase()}` };
  return { escalate: false, reason: null };
}

// ================================================================
// AGENT 6: FOLLOW-UP (48hr scheduled check-ins)
// ================================================================

const FOLLOWUP_CHECK_MESSAGE_EN =
  'Hi, you contacted HealthBridgeSA recently. How are you doing?\n\n' +
  '1. ✅ Feeling better\n' +
  '2. 🟡 Same as before\n' +
  '3. ⚠️ Worse\n' +
  '4. 🏥 I visited the recommended facility';

async function scheduleFollowUp(patientId, phone, triageLevel, triageLogId) {
  // Don't schedule follow-ups for GREEN (routine) cases
  if (triageLevel === 'GREEN') return;
  const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const { error } = await supabase.from('follow_ups').insert({
    patient_id: patientId,
    phone,
    triage_level: triageLevel,
    triage_log_id: triageLogId,
    scheduled_at: scheduledAt,
    status: 'pending',
  });
  if (error) console.error('Follow-up schedule error:', error.message);
}

async function runFollowUpAgent() {
  try {
    const { data: due, error } = await supabase
      .from('follow_ups')
      .select('*')
      .lte('scheduled_at', new Date().toISOString())
      .eq('status', 'pending')
      .limit(50);
    if (error || !due || due.length === 0) return;

    for (const item of due) {
      try {
        await sendWhatsAppMessage(item.phone, FOLLOWUP_CHECK_MESSAGE_EN);
        await supabase.from('follow_ups')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', item.id);
        console.log(`Follow-up sent to ${item.phone}`);
      } catch (err) {
        console.error(`Follow-up send failed for ${item.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Follow-up agent error:', err.message);
  }
}

// Run follow-up agent every 5 minutes
setInterval(runFollowUpAgent, 5 * 60 * 1000);

// ================================================================
// AGENT 8: OUTBREAK DETECTION
// ================================================================

async function getOutbreakConfig() {
  const { data, error } = await supabase.from('outbreak_config').select('key, value');
  if (error) { console.error('Outbreak config error:', error.message); return null; }
  const config = {};
  for (const row of (data || [])) config[row.key] = row.value;
  return config;
}

async function runOutbreakScan() {
  try {
    const config = await getOutbreakConfig();
    if (!config || config.enabled !== 'true') return;

    const timeWindowHrs = parseInt(config.time_window_hrs) || 48;
    const radiusKm = parseFloat(config.radius_km) || 5;
    const minCases = parseInt(config.min_cases) || 3;
    const warningCases = parseInt(config.warning_cases) || 5;
    const criticalCases = parseInt(config.critical_cases) || 10;
    const baselineMultiplier = parseFloat(config.baseline_multiplier) || 2.5;
    const baselineWindowDays = parseInt(config.baseline_window_days) || 14;
    const growthThresholdPct = parseFloat(config.growth_threshold_pct) || 100;
    const weightRed = parseInt(config.severity_weight_red) || 3;
    const weightOrange = parseInt(config.severity_weight_orange) || 2;
    const weightYellow = parseInt(config.severity_weight_yellow) || 1;

    const since = new Date(Date.now() - timeWindowHrs * 60 * 60 * 1000).toISOString();
    const baselineSince = new Date(Date.now() - baselineWindowDays * 24 * 60 * 60 * 1000).toISOString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const dayBefore = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Fetch recent triage logs with location (current window)
    const { data: logs, error } = await supabase
      .from('triage_logs')
      .select('id, category, location, triage_level, english_summary, created_at')
      .gte('created_at', since)
      .not('location', 'is', null)
      .not('category', 'is', null);
    if (error || !logs || logs.length === 0) return;

    // Fetch baseline data (older window for comparison)
    const { data: baselineLogs } = await supabase
      .from('triage_logs')
      .select('category, created_at')
      .gte('created_at', baselineSince)
      .lt('created_at', since)
      .not('category', 'is', null);

    // Calculate baseline rates per category (cases per time_window period)
    const baselineRates = {};
    if (baselineLogs && baselineLogs.length > 0) {
      const baselineDays = baselineWindowDays - (timeWindowHrs / 24);
      const periodsInBaseline = Math.max(1, baselineDays / (timeWindowHrs / 24));
      const baseCounts = {};
      for (const bl of baselineLogs) {
        baseCounts[bl.category] = (baseCounts[bl.category] || 0) + 1;
      }
      for (const [cat, count] of Object.entries(baseCounts)) {
        baselineRates[cat] = count / periodsInBaseline;
      }
    }

    // Fetch 24h-ago data for growth rate calculation
    const { data: prevDayLogs } = await supabase
      .from('triage_logs')
      .select('category, location')
      .gte('created_at', dayBefore)
      .lt('created_at', yesterday)
      .not('location', 'is', null)
      .not('category', 'is', null);

    const prevDayCounts = {};
    if (prevDayLogs) {
      for (const pl of prevDayLogs) {
        prevDayCounts[pl.category] = (prevDayCounts[pl.category] || 0) + 1;
      }
    }

    // Filter to logs with valid GPS and apply severity weighting
    const geoLogs = logs.filter(l => l.location?.latitude && l.location?.longitude);
    if (geoLogs.length === 0) return;

    // Apply severity weights
    const weightedLogs = geoLogs.map(l => ({
      ...l,
      weight: l.triage_level === 'RED' ? weightRed : l.triage_level === 'ORANGE' ? weightOrange : weightYellow,
    }));

    // Group by category
    const byCategory = {};
    for (const log of weightedLogs) {
      if (!byCategory[log.category]) byCategory[log.category] = [];
      byCategory[log.category].push(log);
    }

    // For each category, find geographic clusters and apply 3-layer detection
    for (const [category, catLogs] of Object.entries(byCategory)) {
      const clusters = findGeoClusters(catLogs, radiusKm);

      for (const cluster of clusters) {
        const rawCount = cluster.length;
        const weightedCount = cluster.reduce((s, l) => s + l.weight, 0);

        // === LAYER 1: Absolute threshold (weighted) ===
        const absTriggered = weightedCount >= minCases;

        // === LAYER 2: Baseline comparison ===
        const baseline = baselineRates[category] || 0;
        const baselineTriggered = baseline > 0 && rawCount >= baseline * baselineMultiplier;

        // === LAYER 3: Growth rate (24h) ===
        const prevCount = prevDayCounts[category] || 0;
        const last24Count = cluster.filter(l => new Date(l.created_at) >= new Date(yesterday)).length;
        const growthRate = prevCount > 0 ? ((last24Count - prevCount) / prevCount) * 100 : (last24Count >= 2 ? 999 : 0);
        const growthTriggered = growthRate >= growthThresholdPct;

        // ANY trigger fires the alert
        if (!absTriggered && !baselineTriggered && !growthTriggered) continue;

        // Determine which triggers fired
        const triggers = [];
        if (absTriggered) triggers.push('absolute');
        if (baselineTriggered) triggers.push('baseline');
        if (growthTriggered) triggers.push('growth_rate');
        const triggerReason = triggers.join('+');

        // Calculate cluster center
        const centerLat = cluster.reduce((s, l) => s + l.location.latitude, 0) / cluster.length;
        const centerLng = cluster.reduce((s, l) => s + l.location.longitude, 0) / cluster.length;
        const clusterId = `${category}-${centerLat.toFixed(3)}-${centerLng.toFixed(3)}`;

        // Determine severity (use weighted count)
        let severity = 'WATCH';
        if (weightedCount >= criticalCases || growthRate >= 200) severity = 'CRITICAL';
        else if (weightedCount >= warningCases || baselineTriggered) severity = 'WARNING';

        // Build enhanced report
        const report = generateOutbreakReport(
          category, cluster, centerLat, centerLng, radiusKm, timeWindowHrs, severity,
          { triggerReason, weightedCount, baseline, growthRate: Math.round(growthRate), prevCount, last24Count }
        );

        // Check for existing alert
        const { data: existing } = await supabase
          .from('outbreak_alerts')
          .select('id, case_count, severity')
          .eq('cluster_id', clusterId)
          .in('status', ['active', 'monitoring'])
          .maybeSingle();

        if (existing) {
          if (rawCount > existing.case_count || severity !== existing.severity) {
            await supabase.from('outbreak_alerts').update({
              case_count: rawCount,
              severity,
              triage_log_ids: cluster.map(l => l.id),
              report,
              trigger_reason: triggerReason,
              updated_at: new Date().toISOString(),
              notified: severity !== existing.severity ? false : true,
            }).eq('id', existing.id);

            if (severity !== existing.severity) {
              await sendOutbreakAlert(clusterId, category, cluster, centerLat, centerLng, severity, report, triggerReason);
              await supabase.from('outbreak_alerts').update({ notified: true }).eq('id', existing.id);
            }
          }
        } else {
          const { data: inserted } = await supabase.from('outbreak_alerts').insert({
            cluster_id: clusterId, category, category_name: getCategoryName(category),
            center_lat: centerLat, center_lng: centerLng, radius_km: radiusKm,
            case_count: rawCount, time_window_hrs: timeWindowHrs,
            triage_log_ids: cluster.map(l => l.id), severity, report,
            trigger_reason: triggerReason, notified: false,
          }).select('id').single();

          await sendOutbreakAlert(clusterId, category, cluster, centerLat, centerLng, severity, report, triggerReason);
          if (inserted) await supabase.from('outbreak_alerts').update({ notified: true }).eq('id', inserted.id);
          console.log(`[outbreak] NEW ${severity} (${triggerReason}): ${rawCount} cases (weighted:${weightedCount}) of cat ${category}`);
        }
      }
    }
  } catch (err) {
    console.error('Outbreak scan error:', err.message);
  }
}

function findGeoClusters(logs, radiusKm) {
  // Simple density-based clustering: pick each point as potential center,
  // find all points within radius, keep clusters that meet threshold
  const used = new Set();
  const clusters = [];

  // Sort by time (newest first) so we anchor on recent cases
  const sorted = [...logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  for (const anchor of sorted) {
    if (used.has(anchor.id)) continue;

    const nearby = sorted.filter(l =>
      !used.has(l.id) &&
      haversine(anchor.location.latitude, anchor.location.longitude, l.location.latitude, l.location.longitude) <= radiusKm
    );

    if (nearby.length >= 2) { // at least 2 nearby (including self)
      clusters.push(nearby);
      nearby.forEach(l => used.add(l.id));
    }
  }

  return clusters;
}

function generateOutbreakReport(category, cluster, centerLat, centerLng, radiusKm, timeWindowHrs, severity, detection = {}) {
  const catName = getCategoryName(category);
  const timestamp = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
  const mapsLink = `https://www.google.com/maps/@${centerLat},${centerLng},14z`;

  const levelBreakdown = {};
  const summaries = [];
  for (const log of cluster) {
    levelBreakdown[log.triage_level] = (levelBreakdown[log.triage_level] || 0) + 1;
    if (log.english_summary && summaries.length < 5) summaries.push(log.english_summary);
  }

  let report = `OUTBREAK DETECTION REPORT\n`;
  report += `========================\n\n`;
  report += `Generated: ${timestamp}\n`;
  report += `Severity: ${severity}\n`;
  report += `Status: Active — Requires Investigation\n\n`;

  report += `DETECTION METHOD\n`;
  const reasons = (detection.triggerReason || 'absolute').split('+');
  if (reasons.includes('absolute')) report += `  ✓ Absolute threshold: ${detection.weightedCount || cluster.length} weighted cases (threshold met)\n`;
  if (reasons.includes('baseline')) report += `  ✓ Baseline exceeded: ${cluster.length} cases vs ${(detection.baseline || 0).toFixed(1)} baseline (${((cluster.length / (detection.baseline || 1)) * 100).toFixed(0)}% of normal)\n`;
  if (reasons.includes('growth_rate')) report += `  ✓ Rapid growth: ${detection.growthRate || 0}% increase in 24hrs (${detection.prevCount || 0} → ${detection.last24Count || 0} cases)\n`;
  report += `\n`;

  report += `CLUSTER DETAILS\n`;
  report += `Symptom category: ${catName} (category ${category})\n`;
  report += `Raw cases: ${cluster.length}\n`;
  if (detection.weightedCount) report += `Severity-weighted cases: ${detection.weightedCount} (RED=×3, ORANGE=×2, YELLOW=×1)\n`;
  report += `Time window: Last ${timeWindowHrs} hours\n`;
  report += `Geographic radius: ${radiusKm}km\n`;
  report += `Center: ${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}\n`;
  report += `Map: ${mapsLink}\n\n`;

  report += `TRIAGE LEVEL BREAKDOWN\n`;
  for (const [level, count] of Object.entries(levelBreakdown)) {
    report += `  ${level}: ${count} cases\n`;
  }

  if (detection.baseline > 0) {
    report += `\nBASELINE COMPARISON\n`;
    report += `  Normal rate: ~${detection.baseline.toFixed(1)} cases per ${timeWindowHrs}hrs\n`;
    report += `  Current rate: ${cluster.length} cases (${((cluster.length / detection.baseline) * 100).toFixed(0)}% of normal)\n`;
  }

  if (detection.growthRate > 0) {
    report += `\nGROWTH ANALYSIS\n`;
    report += `  Previous 24hrs: ${detection.prevCount || 0} cases\n`;
    report += `  Latest 24hrs: ${detection.last24Count || 0} cases\n`;
    report += `  Growth rate: ${detection.growthRate}%\n`;
  }

  report += `\nPATIENT SUMMARIES (up to 5)\n`;
  summaries.forEach((s, i) => { report += `  ${i + 1}. ${s}\n`; });
  report += `\nRECOMMENDED ACTIONS\n`;
  if (severity === 'CRITICAL') {
    report += `  1. IMMEDIATELY notify District Health Office\n`;
    report += `  2. Deploy mobile health team to affected area\n`;
    report += `  3. Alert nearest facilities to prepare for surge\n`;
    report += `  4. Begin contact tracing if infectious disease suspected\n`;
    report += `  5. Prepare situation report for Provincial Health\n`;
  } else if (severity === 'WARNING') {
    report += `  1. Notify facility managers in affected area\n`;
    report += `  2. Increase monitoring frequency\n`;
    report += `  3. Prepare resources for potential escalation\n`;
    report += `  4. Review patient summaries for common exposure\n`;
  } else {
    report += `  1. Monitor cluster over next 24 hours\n`;
    report += `  2. Review if cases share common exposure\n`;
    report += `  3. Escalate if case count increases\n`;
  }
  report += `\n--- End of Report ---`;
  return report;
}

async function sendOutbreakAlert(clusterId, category, cluster, lat, lng, severity, report, triggerReason) {
  if (!ALERT_PHONE) return;

  const sevEmoji = { WATCH: '🟡', WARNING: '🟠', CRITICAL: '🔴' };
  const catName = getCategoryName(category);
  const mapsLink = `https://www.google.com/maps/@${lat},${lng},14z`;

  let msg = `${sevEmoji[severity] || '🔔'} *OUTBREAK ${severity}: ${catName}*\n\n`;
  msg += `📊 ${cluster.length} cases in area\n`;
  msg += `📍 Area: ${mapsLink}\n`;
  msg += `🏥 Category: ${catName}\n`;

  // Show what triggered the alert
  const triggers = (triggerReason || 'absolute').split('+');
  msg += `\n🔬 *Triggered by:*\n`;
  if (triggers.includes('absolute')) msg += `  • Case count exceeded threshold\n`;
  if (triggers.includes('baseline')) msg += `  • Unusual rate vs baseline (2.5× normal)\n`;
  if (triggers.includes('growth_rate')) msg += `  • Rapid growth (100%+ in 24hrs)\n`;
  msg += `\n`;

  if (severity === 'CRITICAL') {
    msg += `🚨 *CRITICAL — Notify District Health Office immediately*\n`;
    msg += `Consider deploying mobile health team.\n`;
  } else if (severity === 'WARNING') {
    msg += `⚠️ *WARNING — Alert facility managers in area*\n`;
    msg += `Increase monitoring. Prepare for escalation.\n`;
  } else {
    msg += `👁 *WATCH — Monitor over next 24 hours*\n`;
  }

  msg += `\n📋 Full report available on dashboard.`;

  try {
    await sendWhatsAppMessage(ALERT_PHONE, msg);
    console.log(`[outbreak] Alert sent: ${severity} for ${catName}`);
  } catch (err) {
    console.error('[outbreak] Alert failed:', err.message);
  }
}

// Run outbreak scan periodically (default every 15 minutes)
let outbreakInterval = null;
async function startOutbreakScanner() {
  const config = await getOutbreakConfig();
  const mins = parseInt(config?.scan_interval_mins) || 15;
  if (outbreakInterval) clearInterval(outbreakInterval);
  outbreakInterval = setInterval(runOutbreakScan, mins * 60 * 1000);
  // Run immediately on startup
  setTimeout(runOutbreakScan, 10000);
  console.log(`[outbreak] Scanner started, interval: ${mins}min`);
}
startOutbreakScanner();

async function handleFollowUpResponse(patientId, session, text) {
  const { data: pending, error } = await supabase
    .from('follow_ups')
    .select('*')
    .eq('patient_id', patientId)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(1);
  if (error || !pending || pending.length === 0) return false;

  const followUp = pending[0];
  const lang = session.lang || 'en';

  if (['1', '2', '3', '4'].includes(text)) {
    let reply = '';
    let newStatus = 'completed';

    if (text === '1') reply = await translateText('✅ Glad you are feeling better! Take care.', lang);
    if (text === '2') reply = await translateText('🟡 Continue monitoring. If symptoms worsen, message us again.', lang);
    if (text === '3') {
      reply = await translateText('⚠️ Your symptoms are worsening. A healthcare worker has been alerted and will follow up with you. If this is urgent, please call *10177*.', lang);
      // Log escalation
      await supabase.from('triage_logs').insert({
        patient_id: patientId,
        triage_level: 'RECHECK',
        confidence: 'HIGH',
        method: 'follow_up',
        escalation: true,
        escalation_reason: 'FOLLOW_UP_WORSENING',
        needs_human_review: true,
        original_message: 'Follow-up: symptoms worsening',
        english_summary: 'Patient reported worsening symptoms at 48hr follow-up',
      });
    }
    if (text === '4') reply = await translateText('🏥 Thank you for visiting. We hope you received good care. Rate your experience 1-5 (5=excellent).', lang);

    await supabase.from('follow_ups')
      .update({ status: newStatus, response: text, completed_at: new Date().toISOString() })
      .eq('id', followUp.id);

    await sendWhatsAppMessage(session.phone, reply);
    return true;
  }

  return false;
}

// ================================================================
// DATABASE LAYER
// ================================================================

// In-memory session fallback (covers DB failures)
const sessionCache = new Map();

async function getSession(patientId) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('data')
      .eq('patient_id', patientId)
      .maybeSingle();
    if (error) {
      console.error('Session fetch error:', error.message);
      // Fall back to in-memory cache
      const cached = sessionCache.get(patientId);
      console.log(`[session:get:cache] ${patientId} → step=${cached?.step || 'none'}`);
      return cached || {};
    }
    const session = data?.data || {};
    console.log(`[session:get:db] ${patientId} → step=${session.step || 'none'}, lang=${session.lang || 'none'}`);
    // Keep cache in sync
    if (session.step) sessionCache.set(patientId, session);
    return session;
  } catch (err) {
    console.error('Session fetch exception:', err.message);
    return sessionCache.get(patientId) || {};
  }
}

async function saveSession(patientId, session) {
  // Always save to in-memory cache first
  sessionCache.set(patientId, { ...session });
  
  try {
    const { error } = await supabase.from('sessions').upsert(
      { patient_id: patientId, data: session, updated_at: new Date().toISOString() },
      { onConflict: 'patient_id' }
    );
    if (error) {
      console.error('Session save DB error:', error.message);
    } else {
      console.log(`[session:save:db] ${patientId} → step=${session.step}, lang=${session.lang || 'none'}`);
    }
  } catch (err) {
    console.error('Session save exception:', err.message);
  }
  console.log(`[session:save:cache] ${patientId} → step=${session.step}, lang=${session.lang || 'none'}`);
}

async function logTriage(entry) {
  const { data, error } = await supabase
    .from('triage_logs')
    .insert(entry)
    .select('id')
    .single();
  if (error) { console.error('Triage log error:', error.message); return null; }
  const logId = data?.id || null;

  // ── ALERT AGENT: Notify supervisor for critical cases ──
  const alertLevels = ['RED', 'ORANGE', 'HUMAN_REQUEST', 'RECHECK'];
  if (logId && alertLevels.includes(entry.triage_level)) {
    await sendStaffAlert(entry, logId);
  }

  return logId;
}

// ================================================================
// ALERT AGENT — WhatsApp alerts to supervisor for critical cases
// ================================================================

const ALERT_PHONE = process.env.ALERT_PHONE_NUMBER;

async function sendStaffAlert(entry, logId) {
  if (!ALERT_PHONE) {
    console.log('[alert] No ALERT_PHONE_NUMBER configured, skipping');
    return;
  }

  const levelEmoji = {
    RED: '🔴', ORANGE: '🟠', HUMAN_REQUEST: '👤', RECHECK: '⚠️',
  };

  const emoji = levelEmoji[entry.triage_level] || '🔔';
  const timestamp = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });

  let alertMsg = `${emoji} *STAFF ALERT — ${entry.triage_level}*\n`;
  alertMsg += `📋 Log #${logId}\n`;
  alertMsg += `🕐 ${timestamp}\n`;
  alertMsg += `🌐 Language: ${LANG_NAMES[entry.language] || entry.language || 'Unknown'}\n`;

  if (entry.on_behalf_of) {
    const behalfLabels = { child: '👶 Requesting for their CHILD', family_member: '👨‍👩‍👧 Requesting for a FAMILY MEMBER', friend_neighbour: '🤝 Requesting for a FRIEND/NEIGHBOUR', stranger: '🆘 Requesting for a STRANGER' };
    alertMsg += `${behalfLabels[entry.on_behalf_of] || '👤 Requesting for someone else'}\n`;
  }
  alertMsg += '\n';

  if (entry.english_summary) {
    alertMsg += `📝 *Summary:* ${entry.english_summary}\n\n`;
  }

  if (entry.escalation_reason) {
    alertMsg += `⚡ *Reason:* ${entry.escalation_reason.replace(/_/g, ' ')}\n`;
  }

  if (entry.facility_name) {
    alertMsg += `🏥 *Routed to:* ${entry.facility_name}\n`;
  }

  if (entry.triage_level === 'RED') {
    alertMsg += `\n🚨 *IMMEDIATE ACTION REQUIRED*\nPatient may need ambulance dispatch.`;
  } else if (entry.triage_level === 'HUMAN_REQUEST') {
    alertMsg += `\n📞 *Patient requested to speak to a healthcare worker.*`;
  }

  alertMsg += `\n\n📊 Review on dashboard: /dashboard → Escalations`;

  try {
    await sendWhatsAppMessage(ALERT_PHONE, alertMsg);
    console.log(`[alert] Sent ${entry.triage_level} alert to supervisor`);
  } catch (err) {
    console.error('[alert] Failed to send staff alert:', err.message);
  }
}

// ================================================================
// WHATSAPP MESSAGING
// ================================================================

async function sendWhatsAppMessage(to, text) {
  try {
    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('WhatsApp API error:', response.status, JSON.stringify(err));
    }
  } catch (err) {
    console.error('WhatsApp send failed:', err.message);
  }
}

async function sendLocationRequest(to, bodyText) {
  try {
    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'location_request_message',
          body: { text: bodyText },
          action: { name: 'send_location' },
        },
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('WhatsApp location request error:', response.status, JSON.stringify(err));
    }
  } catch (err) {
    console.error('Location request send failed:', err.message);
  }
}

// ================================================================
// POST-TRIAGE FLOW
// ================================================================

const POST_TRIAGE_PROMPT_EN =
  'Is there anything else I can help with?\n\n' +
  '1. Yes, I have another concern\n' +
  '2. No, thank you\n\n' +
  'Type *0* to change language.';

const CLOSING_MESSAGE_EN =
  'Stay safe. If your condition worsens, message us again anytime. 🏥';

const TRANSPORT_QUESTION_EN =
  '🚗 *How will you get to the hospital?*\n\n' +
  '1. 🚑 I need an ambulance\n' +
  '2. 🚗 I can drive myself or get a taxi\n' +
  '3. 👨‍👩‍👧 Someone is taking me\n\n' +
  'If this is life-threatening, call *10177* now.';

const WHO_IS_PATIENT_EN =
  '👤 *Who is this request for?*\n\n' +
  '1. 🙋 Myself\n' +
  '2. 👶 My child\n' +
  '3. 👨‍👩‍👧 A family member\n' +
  '4. 🤝 A friend or neighbour\n' +
  '5. 🆘 A stranger who needs help';

// ================================================================
// ORCHESTRATOR — routes each message through the agent pipeline
// ================================================================

async function orchestrate(from, text, session) {
  const patientId = hashPhone(from);
  const normalized = text.toLowerCase().trim();

  // Attach phone to session for follow-up agent
  session.phone = from;

  // ── GLOBAL RESET ──────────────────────────────────────────
  if (normalized === '0' || normalized === 'menu') {
    session.step = 'language_select';
    session.consent = false;
    await saveSession(patientId, session);
    await sendWhatsAppMessage(from, WELCOME_MENU);
    return;
  }

  // ── AGENT 6: CHECK FOR PENDING FOLLOW-UP RESPONSE ─────────
  if (session.step !== 'language_select' && session.step !== 'consent' && session.step !== 'location_request' && session.step !== 'transport_select' && session.step !== 'who_is_patient') {
    const handled = await handleFollowUpResponse(patientId, session, normalized);
    if (handled) return;
  }

  // ── AGENT 1: LANGUAGE SELECTION ────────────────────────────
  if (!session.step || session.step === 'language_select') {
    const chosen = LANG_CODES[text.trim()];
    if (!chosen) {
      await sendWhatsAppMessage(from, WELCOME_MENU);
      return;
    }
    session.lang = chosen;
    session.step = 'consent';
    await saveSession(patientId, session);
    await sendWhatsAppMessage(from, LANG_CONFIRMED[chosen]);
    // Proceed to consent
    const consentMsg = await translateText(CONSENT_PROMPT.en, chosen);
    await sendWhatsAppMessage(from, consentMsg);
    return;
  }

  const lang = session.lang || 'en';

  // ── AGENT 2: CONSENT ──────────────────────────────────────
  if (session.step === 'consent') {
    if (normalized === '1') {
      session.consent = true;
      session.step = 'who_is_patient';
      await saveSession(patientId, session);
      // Log consent
      await supabase.from('consent_log').insert({
        patient_id: patientId,
        consented: true,
        language: lang,
      });
      const confirmMsg = await translateText(CONSENT_RECEIVED.en, lang);
      await sendWhatsAppMessage(from, confirmMsg);
      // Ask who the patient is
      const whoMsg = await translateText(WHO_IS_PATIENT_EN, lang);
      await sendWhatsAppMessage(from, whoMsg);
    } else if (normalized === '2') {
      session.consent = false;
      session.step = 'language_select';
      await saveSession(patientId, session);
      await supabase.from('consent_log').insert({
        patient_id: patientId,
        consented: false,
        language: lang,
      });
      const declineMsg = await translateText(CONSENT_DECLINED.en, lang);
      await sendWhatsAppMessage(from, declineMsg);
    } else {
      const consentMsg = await translateText(CONSENT_PROMPT.en, lang);
      await sendWhatsAppMessage(from, consentMsg);
    }
    return;
  }

  // ── WHO IS THE PATIENT ────────────────────────────────────
  if (session.step === 'who_is_patient') {
    if (normalized === '1') {
      session.onBehalfOf = null;
      session.step = 'location_request';
      await saveSession(patientId, session);
      const locText = await translateText(
        '📍 To find the nearest clinic or hospital, please share your location. Tap the button below.\n\nYou can also type *skip* to continue without sharing your location.',
        lang
      );
      await sendLocationRequest(from, locText);
    } else if (['2', '3', '4', '5'].includes(normalized)) {
      const relationships = { '2': 'child', '3': 'family_member', '4': 'friend_neighbour', '5': 'stranger' };
      session.onBehalfOf = relationships[normalized];
      session.step = 'location_request';
      await saveSession(patientId, session);

      // Context-specific follow-up
      let contextMsg;
      if (normalized === '2') {
        contextMsg = 'You are requesting help for your child. Please describe *their* symptoms when asked.';
      } else if (normalized === '5') {
        contextMsg = 'Thank you for helping a stranger. Please describe *their* symptoms as best you can. If they are unconscious or not breathing, call *10177* immediately.';
      } else {
        contextMsg = 'You are requesting help for someone else. Please describe *their* symptoms when asked.';
      }
      const translated = await translateText(contextMsg, lang);
      await sendWhatsAppMessage(from, translated);

      const locText = await translateText(
        '📍 Please share the *patient\'s location* (where they are right now). Tap the button below.\n\nYou can also type *skip* to continue without sharing location.',
        lang
      );
      await sendLocationRequest(from, locText);
    } else {
      const whoMsg = await translateText(WHO_IS_PATIENT_EN, lang);
      await sendWhatsAppMessage(from, whoMsg);
    }
    return;
  }

  // ── LOCATION REQUEST (skip or wait for location pin) ──────
  if (session.step === 'location_request') {
    if (normalized === 'skip') {
      session.step = 'category_select';
      session.location = null;  // Explicitly clear any stale location
      await saveSession(patientId, session);
      const skipMsg = await translateText('No problem! You can share your location anytime by sending a location pin.', lang);
      await sendWhatsAppMessage(from, skipMsg);
      const categoryMenu = await translateText(CATEGORY_MENU_EN, lang);
      await sendWhatsAppMessage(from, categoryMenu);
    } else {
      // Re-prompt — they typed something other than skip and didn't send a location
      const locText = await translateText(
        '📍 Please tap the button to share your location, or type *skip* to continue without it.',
        lang
      );
      await sendLocationRequest(from, locText);
    }
    return;
  }

  // ── AGENT 3: CATEGORY SELECTION ────────────────────────────
  if (session.step === 'category_select') {
    // Category 13 → human escalation
    if (normalized === '13') {
      const logId = await logTriage({
        patient_id: patientId,
        phone_hash: patientId,
        language: lang,
        original_message: 'User requested to speak to a human.',
        english_summary: session.onBehalfOf ? `Requesting for ${session.onBehalfOf}. User requested to speak to a human.` : 'User requested to speak to a human.',
        triage_level: 'HUMAN_REQUEST',
        confidence: 'HIGH',
        method: 'menu',
        category: '13',
        escalation: true,
        escalation_reason: 'USER_REQUESTED_HUMAN',
        needs_human_review: true,
        on_behalf_of: session.onBehalfOf || null,
      });
      const humanMsg = await translateText(
        'Your request has been flagged. A healthcare worker will contact you on this number as soon as possible. If this is an emergency, please call *10177* immediately.',
        lang
      );
      await sendWhatsAppMessage(from, humanMsg);
      session.step = 'post_triage';
      await saveSession(patientId, session);
      const postPrompt = await translateText(POST_TRIAGE_PROMPT_EN, lang);
      await sendWhatsAppMessage(from, postPrompt);
      return;
    }

    // Category 12 → free text
    if (normalized === '12') {
      session.step = 'free_text';
      await saveSession(patientId, session);
      const prompt = await translateText(
        'Please describe your symptoms in as much detail as you can. Include how long you have had them.',
        lang
      );
      await sendWhatsAppMessage(from, prompt);
      return;
    }

    // Categories 1-11 → follow-up questions
    if (FOLLOWUP_EN[text.trim()]) {
      session.step = 'followup';
      session.category = text.trim();
      await saveSession(patientId, session);
      const followup = await translateText(FOLLOWUP_EN[text.trim()], lang);
      await sendWhatsAppMessage(from, followup);
      return;
    }

    // Invalid input
    const categoryMenu = await translateText(CATEGORY_MENU_EN, lang);
    await sendWhatsAppMessage(from, categoryMenu);
    return;
  }

  // ── AGENT 3b: FOLLOW-UP ANSWER → menu-based triage ────────
  if (session.step === 'followup') {
    const { category } = session;
    const triageMap = FOLLOWUP_TRIAGE[category];
    const answerIndex = parseInt(text.trim(), 10) - 1;

    if (!triageMap || answerIndex < 0 || answerIndex >= triageMap.length) {
      const followup = await translateText(FOLLOWUP_EN[category], lang);
      await sendWhatsAppMessage(from, followup);
      return;
    }

    const classification = triageMap[answerIndex];

    // Special handling: mental health crisis (category 10, option 1)
    if (category === '10' && answerIndex === 0) {
      const crisisMsg = await translateText(MENTAL_HEALTH_CRISIS_REPLY.en, lang);
      await sendWhatsAppMessage(from, crisisMsg);
    }

    // Build and send triage reply
    let reply = await buildTriageReply(classification, lang);

    // AGENT 4: Facility routing
    const routing = await routePatient(classification, session.location);
    reply += buildRoutingMessage(routing, lang);

    // AGENT 5: Escalation check
    const esc = needsEscalation(classification, 'HIGH', null);
    if (esc.escalate && classification === 'RED') {
      const alert = await translateText('A healthcare worker has been alerted and will follow up with you.', lang);
      reply += `\n\n${alert}`;
    }

    await sendWhatsAppMessage(from, reply);

    // Log to database
    const logId = await logTriage({
      patient_id: patientId,
      phone_hash: patientId,
      language: lang,
      original_message: `Category ${category}, answer ${text.trim()}`,
      english_summary: `${session.onBehalfOf ? `On behalf of ${session.onBehalfOf}. ` : ''}Category ${category} (${getCategoryName(category)}), option ${text.trim()} selected.`,
      triage_level: classification,
      confidence: 'HIGH',
      method: 'menu',
      category,
      followup_answer: text.trim(),
      escalation: esc.escalate,
      escalation_reason: esc.reason,
      pathway: routing.pathway,
      facility_name: routing.facility?.name || null,
      facility_id: routing.facility?.id || null,
      location: session.location || null,
      needs_human_review: esc.escalate,
      on_behalf_of: session.onBehalfOf || null,
    });

    // AGENT 6: Schedule follow-up
    await scheduleFollowUp(patientId, from, classification, logId);

    // ORANGE cases → ask about transport
    if (classification === 'ORANGE') {
      session.step = 'transport_select';
      session.lastTriageLogId = logId;
      session.lastRouting = routing;
      await saveSession(patientId, session);
      const transportQ = await translateText(TRANSPORT_QUESTION_EN, lang);
      await sendWhatsAppMessage(from, transportQ);
      return;
    }

    session.step = 'post_triage';
    await saveSession(patientId, session);
    const postPrompt = await translateText(POST_TRIAGE_PROMPT_EN, lang);
    await sendWhatsAppMessage(from, postPrompt);
    return;
  }

  // ── AGENT 3c: FREE TEXT TRIAGE (Claude) ────────────────────
  if (session.step === 'free_text') {
    let triage = await claudeTriage(text);
    triage = applyClinicalRules(text, triage);

    let reply = await buildTriageReply(triage.classification, lang);

    // AGENT 4: Routing
    const routing = await routePatient(triage.classification, session.location);
    reply += buildRoutingMessage(routing, lang);

    // AGENT 5: Escalation
    const esc = needsEscalation(triage.classification, triage.confidence, triage.ruleOverride);
    if (esc.escalate) {
      if (triage.classification === 'RED') {
        const alert = await translateText('A healthcare worker has been alerted and will follow up with you.', lang);
        reply += `\n\n${alert}`;
      } else {
        const reviewNote = await translateText('Note: A healthcare worker will review your case for accuracy.', lang);
        reply += `\n\n${reviewNote}`;
      }
    }

    await sendWhatsAppMessage(from, reply);

    const logId = await logTriage({
      patient_id: patientId,
      phone_hash: patientId,
      language: lang,
      original_message: text,
      english_summary: `${session.onBehalfOf ? `On behalf of ${session.onBehalfOf}. ` : ''}${triage.englishSummary}`,
      triage_level: triage.classification,
      confidence: triage.confidence,
      method: triage.ruleOverride ? 'rule_override' : 'free_text',
      category: '12',
      escalation: esc.escalate,
      escalation_reason: esc.reason,
      pathway: routing.pathway,
      facility_name: routing.facility?.name || null,
      facility_id: routing.facility?.id || null,
      location: session.location || null,
      needs_human_review: esc.escalate,
      on_behalf_of: session.onBehalfOf || null,
    });

    await scheduleFollowUp(patientId, from, triage.classification, logId);

    // ORANGE cases → ask about transport
    if (triage.classification === 'ORANGE') {
      session.step = 'transport_select';
      session.lastTriageLogId = logId;
      session.lastRouting = routing;
      await saveSession(patientId, session);
      const transportQ = await translateText(TRANSPORT_QUESTION_EN, lang);
      await sendWhatsAppMessage(from, transportQ);
      return;
    }

    session.step = 'post_triage';
    await saveSession(patientId, session);
    const postPrompt = await translateText(POST_TRIAGE_PROMPT_EN, lang);
    await sendWhatsAppMessage(from, postPrompt);
    return;
  }

  // ── TRANSPORT SELECT (ORANGE cases only) ────────────────────
  if (session.step === 'transport_select') {
    if (normalized === '1') {
      // Patient needs ambulance → alert nurse to dispatch
      const alertMsg = await translateText(
        '🚑 We are alerting a healthcare worker to arrange an ambulance for you.\n\n' +
        'Please stay where you are and keep your phone nearby.\n' +
        'If your condition worsens, call *10177* directly.',
        lang
      );
      await sendWhatsAppMessage(from, alertMsg);

      // Log the ambulance request so nurse sees it on dashboard
      if (session.lastTriageLogId) {
        await supabase.from('dispatch_log').insert({
          triage_log_id: session.lastTriageLogId,
          patient_id: patientId,
          patient_phone: from,
          status: 'pending',
          service: null,
          nurse_name: null,
          notes: 'Patient requested ambulance via WhatsApp',
          patient_location: session.location || null,
          maps_link: session.location
            ? `https://www.google.com/maps/dir/?api=1&destination=${session.location.latitude},${session.location.longitude}`
            : null,
        }).then(({ error }) => { if (error) console.error('Dispatch insert error:', error.message); });
      }

      // Notify supervisor
      if (ALERT_PHONE) {
        const timestamp = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
        let supervisorMsg = `🚑 *AMBULANCE REQUESTED*\n`;
        supervisorMsg += `📋 Log #${session.lastTriageLogId || '—'}\n`;
        supervisorMsg += `🕐 ${timestamp}\n`;
        supervisorMsg += `🟠 ORANGE case — patient requesting ambulance\n`;
        if (session.location) {
          supervisorMsg += `📍 Patient location: https://www.google.com/maps/dir/?api=1&destination=${session.location.latitude},${session.location.longitude}\n`;
        }
        supervisorMsg += `\n👉 Open the dashboard to dispatch an ambulance.`;
        await sendWhatsAppMessage(ALERT_PHONE, supervisorMsg);
      }

    } else if (normalized === '2' || normalized === '3') {
      // Self-transport or someone taking them → give directions
      let transportReply;
      if (normalized === '2') {
        transportReply = await translateText(
          '🚗 Please get to the hospital as quickly and safely as possible.\n' +
          'Do not drive if you feel dizzy, faint, or confused — ask someone else to drive you.',
          lang
        );
      } else {
        transportReply = await translateText(
          '👨‍👩‍👧 Thank you. Please make sure your driver knows this is urgent and goes directly to the hospital emergency unit.\n' +
          'Show them the directions below.',
          lang
        );
      }

      // Add facility directions if available
      if (session.lastRouting?.directions) {
        transportReply += `\n\n📍 Directions: ${session.lastRouting.directions}`;
      }
      if (session.lastRouting?.facility) {
        transportReply += `\n🏥 ${session.lastRouting.facility.name} — ~${session.lastRouting.facility.wait_time_minutes} min wait`;
      }

      await sendWhatsAppMessage(from, transportReply);

      // Log self-transport
      if (session.lastTriageLogId) {
        await supabase.from('dispatch_log').insert({
          triage_log_id: session.lastTriageLogId,
          patient_id: patientId,
          patient_phone: from,
          status: 'self_transport',
          service: 'Self',
          notes: normalized === '2' ? 'Patient driving themselves or taking taxi' : 'Someone is taking the patient',
          patient_location: session.location || null,
          maps_link: session.lastRouting?.directions || null,
        }).then(({ error }) => { if (error) console.error('Dispatch insert error:', error.message); });
      }

    } else {
      // Invalid input — re-send transport question
      const transportQ = await translateText(TRANSPORT_QUESTION_EN, lang);
      await sendWhatsAppMessage(from, transportQ);
      return;
    }

    // Clean up session and move to post-triage
    delete session.lastTriageLogId;
    delete session.lastRouting;
    session.step = 'post_triage';
    await saveSession(patientId, session);
    const postPrompt = await translateText(POST_TRIAGE_PROMPT_EN, lang);
    await sendWhatsAppMessage(from, postPrompt);
    return;
  }

  // ── POST-TRIAGE ────────────────────────────────────────────
  if (session.step === 'post_triage') {
    if (normalized === '1') {
      session.step = 'category_select';
      await saveSession(patientId, session);
      const categoryMenu = await translateText(CATEGORY_MENU_EN, lang);
      await sendWhatsAppMessage(from, categoryMenu);
    } else if (normalized === '2') {
      session.step = 'category_select';
      await saveSession(patientId, session);
      const closing = await translateText(CLOSING_MESSAGE_EN, lang);
      await sendWhatsAppMessage(from, closing);
    } else {
      const postPrompt = await translateText(POST_TRIAGE_PROMPT_EN, lang);
      await sendWhatsAppMessage(from, postPrompt);
    }
    return;
  }

  // ── UNKNOWN STATE — reset to language select ───────────────
  session.step = 'language_select';
  await saveSession(patientId, session);
  await sendWhatsAppMessage(from, WELCOME_MENU);
}

function getCategoryName(cat) {
  const names = {
    '1': 'Breathing/Chest', '2': 'Head injury/Headache', '3': 'Pregnancy',
    '4': 'Bleeding/Wound', '5': 'Fever/Flu/Cough', '6': 'Stomach/Vomiting',
    '7': 'Child illness', '8': 'Medication/Chronic', '9': 'Bone/Joint/Back',
    '10': 'Mental health', '11': 'Allergy/Rash', '12': 'Other (free text)',
    '13': 'Speak to human',
  };
  return names[cat] || 'Unknown';
}

// ================================================================
// WEBHOOK HANDLERS
// ================================================================

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expected = process.env.VERIFY_TOKEN || 'healthbridge_verify_2024';

  if (mode === 'subscribe' && token === expected) {
    console.log('Webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Acknowledge immediately

  try {
    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return;

    const from = message.from;
    const patientId = hashPhone(from);
    let session = await getSession(patientId);

    // Handle location messages
    if (message.type === 'location' && message.location) {
      session.location = {
        latitude: message.location.latitude,
        longitude: message.location.longitude,
      };
      session.phone = from;
      const lang = session.lang || 'en';

      // If they were on the location_request step, advance to category_select
      if (session.step === 'location_request') {
        session.step = 'category_select';
        await saveSession(patientId, session);
        const locMsg = await translateText(
          '📍 Location received! We\'ll find the nearest facility for you.',
          lang
        );
        await sendWhatsAppMessage(from, locMsg);
        const categoryMenu = await translateText(CATEGORY_MENU_EN, lang);
        await sendWhatsAppMessage(from, categoryMenu);
        return;
      }

      await saveSession(patientId, session);

      // Check if patient was already triaged at a critical level — auto-route them
      const { data: recentTriage } = await supabase
        .from('triage_logs')
        .select('triage_level, facility_name')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const criticalLevels = ['RED', 'ORANGE', 'YELLOW'];
      if (recentTriage && criticalLevels.includes(recentTriage.triage_level)) {
        // Route them now that we have GPS
        const routing = await routePatient(recentTriage.triage_level, session.location);

        if (routing.facility) {
          let routeMsg = await translateText('📍 Location received! Based on your symptoms, here is your nearest facility:', lang);
          
          if (routing.pathway === 'ambulance' || routing.pathway === 'emergency_unit') {
            routeMsg += `\n\n🏥 *${routing.facility.name}*`;
            routeMsg += `\n⏱ Estimated wait: ~${routing.facility.wait_time_minutes} mins`;
          } else if (routing.pathway === 'clinic_visit') {
            routeMsg += `\n\n🏥 *${routing.facility.name}*`;
            routeMsg += `\n⏱ Estimated wait: ~${routing.facility.wait_time_minutes} mins`;
          }

          if (routing.directions) {
            routeMsg += `\n📍 Directions: ${routing.directions}`;
          }

          await sendWhatsAppMessage(from, routeMsg);

          // Update the triage log with the facility
          await supabase.from('triage_logs')
            .update({
              facility_name: routing.facility.name,
              facility_id: routing.facility.id,
              location: session.location,
            })
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(1);

          // Also notify supervisor with patient location for RED cases
          if (recentTriage.triage_level === 'RED' && ALERT_PHONE) {
            const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${session.location.latitude},${session.location.longitude}`;
            await sendWhatsAppMessage(ALERT_PHONE,
              `📍 *LOCATION UPDATE — RED CASE*\n` +
              `Patient has shared their location.\n` +
              `🏥 Nearest: ${routing.facility.name}\n` +
              `📍 Patient location: ${mapsLink}`
            );
          }
        } else {
          const locMsg = await translateText('📍 Location received! Thank you.', lang);
          await sendWhatsAppMessage(from, locMsg);
        }
      } else {
        const locMsg = await translateText('📍 Location received! This helps us find the nearest facility for you.', lang);
        await sendWhatsAppMessage(from, locMsg);
      }
      return;
    }

    // Only handle text messages
    if (message.type !== 'text' || !message.text?.body) return;

    const text = message.text.body.trim();
    console.log(`[${new Date().toISOString()}] ${from}: ${text}`);

    await orchestrate(from, text, session);

  } catch (err) {
    console.error('Webhook error:', err.message, err.stack);
  }
});

// ================================================================
// DASHBOARD API (Agent 7) — All endpoints require authentication
// ================================================================

// Health check (public — needed for Railway healthcheck)
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'HealthBridgeSA v2.0', timestamp: new Date().toISOString() });
});

// Stats overview
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('triage_logs')
      .select('triage_level, language, confidence, created_at, method');
    if (error) throw error;

    const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
    const stats = {
      total: logs.length,
      last24h: logs.filter(l => new Date(l.created_at).getTime() >= cutoff24h).length,
      byLevel: {},
      byLanguage: {},
      byMethod: {},
      byConfidence: {},
    };

    for (const l of logs) {
      stats.byLevel[l.triage_level] = (stats.byLevel[l.triage_level] || 0) + 1;
      const langName = LANG_NAMES[l.language] || l.language || 'Unknown';
      stats.byLanguage[langName] = (stats.byLanguage[langName] || 0) + 1;
      stats.byMethod[l.method] = (stats.byMethod[l.method] || 0) + 1;
      stats.byConfidence[l.confidence] = (stats.byConfidence[l.confidence] || 0) + 1;
    }

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Escalation queue — cases needing human review (enriched with patient phone)
app.get('/api/escalations', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('triage_logs')
      .select('*')
      .eq('needs_human_review', true)
      .eq('reviewed', false)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;

    // Enrich with patient phone numbers from sessions
    const enriched = [];
    for (const log of (data || [])) {
      let phone = null;
      if (log.patient_id) {
        const { data: sess } = await supabase
          .from('sessions')
          .select('data')
          .eq('patient_id', log.patient_id)
          .maybeSingle();
        phone = sess?.data?.phone || null;
      }
      enriched.push({ ...log, patient_phone: phone });
    }
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark escalation as reviewed
app.post('/api/escalations/:id/review', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewed_by, review_notes } = req.body || {};
    const { error } = await supabase
      .from('triage_logs')
      .update({
        reviewed: true,
        reviewed_by: reviewed_by || 'staff',
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes || null,
      })
      .eq('id', parseInt(id, 10));
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Escalation count (for badge on dashboard)
app.get('/api/escalations/count', requireAuth, async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('triage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('needs_human_review', true)
      .eq('reviewed', false);
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recent triage logs
app.get('/api/logs', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const { data, error } = await supabase
      .from('triage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Facility list with live capacity
app.get('/api/facilities', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .eq('active', true)
      .order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Follow-up status
app.get('/api/follow-ups', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('follow_ups')
      .select('*')
      .order('scheduled_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// ANALYTICS API (Charts, Heatmaps, Outcomes)
// ================================================================

// Triage volume over time (by day, last 30 days)
app.get('/api/analytics/timeline', requireAuth, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('triage_logs')
      .select('triage_level, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true });
    if (error) throw error;

    // Group by date and level
    const byDay = {};
    for (const log of (data || [])) {
      const day = log.created_at.slice(0, 10); // YYYY-MM-DD
      if (!byDay[day]) byDay[day] = { date: day, RED: 0, ORANGE: 0, YELLOW: 0, GREEN: 0, BLUE: 0, total: 0 };
      byDay[day][log.triage_level] = (byDay[day][log.triage_level] || 0) + 1;
      byDay[day].total++;
    }

    // Fill in missing days with zeros
    const result = [];
    const start = new Date(since);
    const end = new Date();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      result.push(byDay[key] || { date: key, RED: 0, ORANGE: 0, YELLOW: 0, GREEN: 0, BLUE: 0, total: 0 });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hourly distribution (what time of day do patients message)
app.get('/api/analytics/hourly', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('triage_logs')
      .select('created_at');
    if (error) throw error;

    const hours = Array(24).fill(0);
    for (const log of (data || [])) {
      const h = new Date(log.created_at).getHours();
      hours[h]++;
    }
    res.json(hours.map((count, hour) => ({ hour, count })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Geographic data (patient locations for heatmap)
app.get('/api/analytics/locations', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('triage_logs')
      .select('triage_level, location, facility_name, created_at')
      .not('location', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    res.json((data || []).map(l => ({
      level: l.triage_level,
      lat: l.location?.latitude,
      lng: l.location?.longitude,
      facility: l.facility_name,
      time: l.created_at,
    })).filter(l => l.lat && l.lng));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Follow-up outcomes
app.get('/api/analytics/outcomes', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('follow_ups')
      .select('status, response, triage_level, scheduled_at, completed_at');
    if (error) throw error;

    const outcomes = { better: 0, same: 0, worse: 0, visited: 0, no_response: 0, pending: 0 };
    const byLevel = {};
    const responseMap = { '1': 'better', '2': 'same', '3': 'worse', '4': 'visited' };

    for (const f of (data || [])) {
      if (f.status === 'completed' && f.response) {
        const outcome = responseMap[f.response] || 'other';
        outcomes[outcome] = (outcomes[outcome] || 0) + 1;
        // Track by triage level
        if (!byLevel[f.triage_level]) byLevel[f.triage_level] = { better: 0, same: 0, worse: 0, visited: 0 };
        byLevel[f.triage_level][outcome] = (byLevel[f.triage_level][outcome] || 0) + 1;
      } else if (f.status === 'sent') {
        outcomes.no_response++;
      } else if (f.status === 'pending') {
        outcomes.pending++;
      }
    }

    const total = data?.length || 0;
    const responseRate = total > 0 ? Math.round(((total - outcomes.pending - outcomes.no_response) / total) * 100) : 0;

    res.json({ outcomes, byLevel, total, responseRate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Category breakdown
app.get('/api/analytics/categories', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('triage_logs')
      .select('category, triage_level, on_behalf_of');
    if (error) throw error;

    const cats = {};
    const behalfCounts = { self: 0, child: 0, family_member: 0, friend_neighbour: 0, stranger: 0 };

    for (const l of (data || [])) {
      const cat = l.category || 'unknown';
      cats[cat] = (cats[cat] || 0) + 1;
      const behalf = l.on_behalf_of || 'self';
      behalfCounts[behalf] = (behalfCounts[behalf] || 0) + 1;
    }

    res.json({ categories: cats, behalfOf: behalfCounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// OUTBREAK DETECTION API
// ================================================================

// Get active outbreak alerts
app.get('/api/outbreaks', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('outbreak_alerts')
      .select('*')
      .in('status', ['active', 'monitoring'])
      .order('severity', { ascending: true }) // CRITICAL first
      .order('case_count', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get outbreak history (resolved)
app.get('/api/outbreaks/history', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('outbreak_alerts')
      .select('*')
      .in('status', ['resolved', 'dismissed'])
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update outbreak status (resolve, dismiss, monitor)
app.post('/api/outbreaks/:id/update', requireAuth, async (req, res) => {
  try {
    const { status, resolved_by, resolve_notes } = req.body;
    const { error } = await supabase.from('outbreak_alerts').update({
      status,
      resolved_by: resolved_by || 'dashboard_user',
      resolved_at: ['resolved', 'dismissed'].includes(status) ? new Date().toISOString() : null,
      resolve_notes: resolve_notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', parseInt(req.params.id, 10));
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get/update outbreak config
app.get('/api/outbreaks/config', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('outbreak_config').select('*').order('id');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/outbreaks/config', requireAuth, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) return res.status(400).json({ error: 'key and value required' });
    const { error } = await supabase.from('outbreak_config')
      .update({ value: String(value), updated_at: new Date().toISOString() })
      .eq('key', key);
    if (error) throw error;
    // Restart scanner with new config
    startOutbreakScanner();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger manual scan
app.post('/api/outbreaks/scan', requireAuth, async (req, res) => {
  try {
    await runOutbreakScan();
    res.json({ success: true, message: 'Scan completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// DISPATCH TRACKING API
// ================================================================

// Get dispatch status for a triage log
app.get('/api/dispatch/:triageLogId', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('dispatch_log')
      .select('*')
      .eq('triage_log_id', parseInt(req.params.triageLogId, 10))
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    res.json(data || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or update dispatch record
app.post('/api/dispatch', requireAuth, async (req, res) => {
  try {
    const { triage_log_id, status, service, reference_number, nurse_name, notes } = req.body;
    if (!triage_log_id || !status) {
      return res.status(400).json({ error: 'triage_log_id and status are required' });
    }

    // Get patient info from triage log + session
    const { data: triageLog } = await supabase
      .from('triage_logs')
      .select('*')
      .eq('id', triage_log_id)
      .single();

    let patientPhone = null;
    let patientLocation = null;
    let mapsLink = null;
    if (triageLog?.patient_id) {
      const { data: sess } = await supabase
        .from('sessions')
        .select('data')
        .eq('patient_id', triageLog.patient_id)
        .maybeSingle();
      patientPhone = sess?.data?.phone || null;
      if (sess?.data?.location) {
        patientLocation = sess.data.location;
        mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${patientLocation.latitude},${patientLocation.longitude}`;
      }
    }

    // Check for existing dispatch record
    const { data: existing } = await supabase
      .from('dispatch_log')
      .select('id')
      .eq('triage_log_id', triage_log_id)
      .maybeSingle();

    let dispatch;
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('dispatch_log')
        .update({
          status,
          service: service || null,
          reference_number: reference_number || null,
          nurse_name: nurse_name || null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      dispatch = data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('dispatch_log')
        .insert({
          triage_log_id,
          patient_id: triageLog?.patient_id || 'unknown',
          patient_phone: patientPhone,
          status,
          service: service || null,
          reference_number: reference_number || null,
          nurse_name: nurse_name || null,
          notes: notes || null,
          patient_location: patientLocation,
          maps_link: mapsLink,
        })
        .select()
        .single();
      if (error) throw error;
      dispatch = data;
    }

    // Send WhatsApp notifications
    await sendDispatchNotifications(dispatch, triageLog, patientPhone, mapsLink);

    res.json(dispatch);
  } catch (err) {
    console.error('Dispatch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Dispatch notification logic
async function sendDispatchNotifications(dispatch, triageLog, patientPhone, mapsLink) {
  const statusMessages = {
    called_10177:    { patient: '🚑 An ambulance has been requested for you via 10177. Please stay where you are and keep your phone nearby.', supervisor: '📞 Nurse called 10177' },
    called_er24:     { patient: '🚑 An ER24 ambulance has been requested for you. Please stay where you are and keep your phone nearby.', supervisor: '📞 Nurse called ER24' },
    called_netcare:  { patient: '🚑 A Netcare 911 ambulance has been requested for you. Please stay where you are and keep your phone nearby.', supervisor: '📞 Nurse called Netcare 911' },
    self_transport:  { patient: '🚗 We understand you are arranging your own transport. Please get to the nearest hospital emergency unit as quickly as possible.', supervisor: '🚗 Patient self-transporting' },
    dispatched:      { patient: '✅ An ambulance has been dispatched and is on its way to you.', supervisor: '✅ Ambulance dispatched' },
    en_route:        { patient: '🚑 The ambulance is en route to your location. Please stay calm and keep your phone nearby.', supervisor: '🚑 Ambulance en route' },
    arrived:         { patient: '🏥 The ambulance has arrived. Please follow the paramedics\' instructions.', supervisor: '🏥 Ambulance arrived at patient' },
    patient_handed_over: { patient: '✅ You have been handed over to the medical team. We wish you a speedy recovery.', supervisor: '✅ Patient handed over to medical team' },
    cancelled:       { patient: null, supervisor: '❌ Dispatch cancelled' },
  };

  const msgs = statusMessages[dispatch.status];
  if (!msgs) return;

  const timestamp = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });

  // Notify patient
  if (msgs.patient && patientPhone) {
    let patientMsg = msgs.patient;
    if (dispatch.reference_number) {
      patientMsg += `\n\n📋 Reference: ${dispatch.reference_number}`;
    }
    if (mapsLink && ['self_transport'].includes(dispatch.status)) {
      patientMsg += `\n\n📍 Hospital directions: ${mapsLink}`;
    }
    try {
      await sendWhatsAppMessage(patientPhone, patientMsg);
      console.log(`[dispatch] Patient notified: ${dispatch.status}`);
    } catch (err) {
      console.error('[dispatch] Patient notification failed:', err.message);
    }
  }

  // Notify supervisor
  if (ALERT_PHONE) {
    let supervisorMsg = `🚑 *DISPATCH UPDATE — Log #${dispatch.triage_log_id}*\n`;
    supervisorMsg += `${msgs.supervisor}\n`;
    supervisorMsg += `🕐 ${timestamp}\n`;
    if (dispatch.nurse_name) supervisorMsg += `👩‍⚕️ Nurse: ${dispatch.nurse_name}\n`;
    if (dispatch.service) supervisorMsg += `🏥 Service: ${dispatch.service}\n`;
    if (dispatch.reference_number) supervisorMsg += `📋 Ref: ${dispatch.reference_number}\n`;
    if (dispatch.notes) supervisorMsg += `📝 Notes: ${dispatch.notes}\n`;
    if (mapsLink) supervisorMsg += `📍 Patient location: ${mapsLink}`;
    try {
      await sendWhatsAppMessage(ALERT_PHONE, supervisorMsg);
      console.log(`[dispatch] Supervisor notified: ${dispatch.status}`);
    } catch (err) {
      console.error('[dispatch] Supervisor notification failed:', err.message);
    }
  }
}

// ================================================================
// USSD EMERGENCY TRIAGE (Channel 2)
// ================================================================
// USSD flow: fast, 160-char screens, emergency-focused
// Compatible with: Africa's Talking, Nalo Solutions, or any
// USSD gateway that POSTs sessionId, phoneNumber, text, serviceCode
//
// Flow:
// Screen 1: Language (EN/ZU/AF)
// Screen 2: Emergency type (breathing, bleeding, unconscious, pregnancy, other)
// Screen 3: Location (province → area)
// Screen 4: Triage result + facility + ambulance number
//
// Session timeout: ~180s. Every screen must be fast.

// USSD sessions (in-memory, short-lived)
const ussdSessions = new Map();

// Clean expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sid, sess] of ussdSessions) {
    if (now - sess.lastActivity > 5 * 60 * 1000) ussdSessions.delete(sid);
  }
}, 5 * 60 * 1000);

// USSD provinces → rough center coordinates for facility routing
const PROVINCE_COORDS = {
  '1': { name: 'Gauteng', lat: -26.20, lng: 28.04 },
  '2': { name: 'KwaZulu-Natal', lat: -29.60, lng: 30.38 },
  '3': { name: 'Western Cape', lat: -33.93, lng: 18.42 },
  '4': { name: 'Eastern Cape', lat: -32.98, lng: 27.87 },
  '5': { name: 'Free State', lat: -29.12, lng: 26.21 },
  '6': { name: 'Limpopo', lat: -23.40, lng: 29.42 },
  '7': { name: 'Mpumalanga', lat: -25.47, lng: 30.97 },
  '8': { name: 'North West', lat: -25.85, lng: 25.64 },
  '9': { name: 'Northern Cape', lat: -29.05, lng: 21.86 },
};

// Emergency categories mapped to triage levels
const USSD_EMERGENCIES = {
  '1': { desc: 'Cannot breathe', level: 'RED', category: '1' },
  '2': { desc: 'Heavy bleeding', level: 'RED', category: '4' },
  '3': { desc: 'Unconscious/not responding', level: 'RED', category: '1' },
  '4': { desc: 'Pregnancy emergency', level: 'RED', category: '3' },
  '5': { desc: 'Chest pain', level: 'ORANGE', category: '1' },
  '6': { desc: 'Severe injury/accident', level: 'ORANGE', category: '9' },
  '7': { desc: 'Child very sick', level: 'ORANGE', category: '7' },
  '8': { desc: 'Poisoning/overdose', level: 'RED', category: '1' },
};

app.post('/ussd', async (req, res) => {
  // Standard USSD gateway fields (Africa's Talking format)
  // Other providers use similar fields — adapt as needed
  const sessionId = req.body.sessionId || req.body.session_id || req.body.SESSION_ID || '';
  const phone = req.body.phoneNumber || req.body.msisdn || req.body.MSISDN || '';
  const text = (req.body.text || req.body.TEXT || '').trim();
  const serviceCode = req.body.serviceCode || req.body.service_code || '';

  // Parse USSD input chain (Africa's Talking sends "1*2*3" for multi-step)
  const inputs = text ? text.split('*') : [];
  const step = inputs.length;

  let session = ussdSessions.get(sessionId) || { step: 0, phone, created: Date.now() };
  session.lastActivity = Date.now();

  let response = '';
  let endSession = false;

  try {
    // ── SCREEN 1: Language ──
    if (step === 0) {
      response = 'HealthBridgeSA Emergency\n';
      response += 'Choose language:\n';
      response += '1. English\n';
      response += '2. isiZulu\n';
      response += '3. Afrikaans';

    // ── SCREEN 2: Emergency type ──
    } else if (step === 1) {
      const langMap = { '1': 'en', '2': 'zu', '3': 'af' };
      session.lang = langMap[inputs[0]] || 'en';

      if (session.lang === 'zu') {
        response = 'Isimo esiphuthumayo:\n';
        response += '1. Angikwazi ukuphefumula\n';
        response += '2. Ukopha okukhulu\n';
        response += '3. Akaphapheme\n';
        response += '4. Isimo sokukhulelwa\n';
        response += '5. Ubuhlungu besifuba\n';
        response += '6. Ingozi/ukulimala\n';
        response += '7. Ingane igula kakhulu\n';
        response += '8. Ushefo';
      } else if (session.lang === 'af') {
        response = 'Noodgeval tipe:\n';
        response += '1. Kan nie asemhaal\n';
        response += '2. Erge bloeding\n';
        response += '3. Bewusteloos\n';
        response += '4. Swangerskap nood\n';
        response += '5. Borspyn\n';
        response += '6. Ernstige besering\n';
        response += '7. Kind baie siek\n';
        response += '8. Vergiftiging';
      } else {
        response = 'Emergency type:\n';
        response += '1. Cannot breathe\n';
        response += '2. Heavy bleeding\n';
        response += '3. Unconscious\n';
        response += '4. Pregnancy emergency\n';
        response += '5. Chest pain\n';
        response += '6. Severe injury\n';
        response += '7. Child very sick\n';
        response += '8. Poisoning';
      }

    // ── SCREEN 3: Province (for facility routing) ──
    } else if (step === 2) {
      const emergency = USSD_EMERGENCIES[inputs[1]];
      if (!emergency) {
        response = 'Invalid choice. Dial again.\nFor emergencies call 10177';
        endSession = true;
      } else {
        session.emergency = emergency;
        response = 'Your province:\n';
        response += '1. Gauteng\n2. KZN\n3. W.Cape\n';
        response += '4. E.Cape\n5. Free State\n';
        response += '6. Limpopo\n7. Mpumalanga\n';
        response += '8. North West\n9. N.Cape';
      }

    // ── SCREEN 4: Triage result ──
    } else if (step === 3) {
      const emergency = session.emergency || USSD_EMERGENCIES['1'];
      const province = PROVINCE_COORDS[inputs[2]];
      const location = province ? { latitude: province.lat, longitude: province.lng } : null;

      // Route to nearest facility
      const routing = await routePatient(emergency.level, location);
      const facility = routing.facility;

      // Build result screen
      if (emergency.level === 'RED') {
        if (session.lang === 'zu') {
          response = 'ISIMO ESIPHUTHUMAYO!\n';
          response += 'Shaya 10177 MANJE\n';
          response += 'ER24: 084 124\n';
        } else if (session.lang === 'af') {
          response = 'NOODGEVAL!\n';
          response += 'Bel 10177 NOU\n';
          response += 'ER24: 084 124\n';
        } else {
          response = 'EMERGENCY!\n';
          response += 'Call 10177 NOW\n';
          response += 'ER24: 084 124\n';
        }
      } else {
        if (session.lang === 'zu') {
          response = 'KUPHUTHUMILE!\nYa esibhedlela manje.\n';
        } else if (session.lang === 'af') {
          response = 'DRINGEND!\nGaan hospitaal toe nou.\n';
        } else {
          response = 'URGENT!\nGo to hospital now.\n';
        }
      }

      if (facility) {
        response += `\nNearest: ${facility.name}\nWait: ~${facility.wait_time_minutes}min`;
      } else if (province) {
        response += `\nGo to nearest ${emergency.level === 'RED' ? 'hospital' : 'clinic'} in ${province.name}`;
      }

      endSession = true;

      // Log to database (same as WhatsApp triages)
      const patientId = hashPhone(phone);
      await logTriage({
        patient_id: patientId,
        phone_hash: patientId,
        language: session.lang || 'en',
        original_message: `USSD: ${emergency.desc}`,
        english_summary: `USSD emergency triage: ${emergency.desc}. Province: ${province?.name || 'unknown'}`,
        triage_level: emergency.level,
        confidence: 'HIGH',
        method: 'ussd',
        category: emergency.category,
        escalation: emergency.level === 'RED',
        escalation_reason: emergency.level === 'RED' ? 'USSD_RED_EMERGENCY' : null,
        pathway: routing.pathway,
        facility_name: facility?.name || null,
        facility_id: facility?.id || null,
        location: location || null,
        needs_human_review: emergency.level === 'RED',
      });

      // Alert supervisor for RED cases
      if (emergency.level === 'RED' && ALERT_PHONE) {
        const timestamp = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
        let alertMsg = `🔴 *USSD RED ALERT*\n`;
        alertMsg += `📞 Patient: ${phone}\n`;
        alertMsg += `🕐 ${timestamp}\n`;
        alertMsg += `⚡ ${emergency.desc}\n`;
        if (province) alertMsg += `📍 Province: ${province.name}\n`;
        if (facility) alertMsg += `🏥 Nearest: ${facility.name}\n`;
        alertMsg += `\n⚠️ USSD patient — cannot receive WhatsApp. Call them directly.`;
        await sendWhatsAppMessage(ALERT_PHONE, alertMsg);
      }

      // Schedule SMS follow-up for USSD patients (future: integrate SMS gateway)
      console.log(`[ussd] ${emergency.level} triage: ${phone} - ${emergency.desc} - ${province?.name || 'unknown'}`);
    } else {
      response = 'Session error. Dial again.\nEmergency: 10177';
      endSession = true;
    }
  } catch (err) {
    console.error('USSD error:', err.message);
    response = 'System error.\nCall 10177 for emergency.';
    endSession = true;
  }

  ussdSessions.set(sessionId, session);

  // USSD response format:
  // CON = continue session (show menu, wait for input)
  // END = end session (final screen)
  // This is Africa's Talking format. Other providers may use different prefixes.
  const prefix = endSession ? 'END ' : 'CON ';
  res.set('Content-Type', 'text/plain');
  res.send(prefix + response);
});

// USSD health check
app.get('/ussd', (req, res) => {
  res.json({ status: 'ok', service: 'HealthBridgeSA USSD Emergency Triage' });
});

// ================================================================
// START
// ================================================================

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HealthBridgeSA v2.0 running on port ${PORT}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL ? '✅' : '❌'}`);
  console.log(`   WhatsApp: ${process.env.WHATSAPP_TOKEN ? '✅' : '❌'}`);
  console.log(`   Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'}`);
});
