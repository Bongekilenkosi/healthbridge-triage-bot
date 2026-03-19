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

// Serve dashboard at /dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

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

function buildRoutingMessage(routing, lang) {
  if (!routing.facility) return '';
  const f = routing.facility;
  let msg = '';
  if (routing.pathway === 'emergency_unit') {
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

async function getSession(patientId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('data')
    .eq('patient_id', patientId)
    .single();
  if (error || !data) return {};
  return data.data || {};
}

async function saveSession(patientId, session) {
  const { error } = await supabase.from('sessions').upsert({
    patient_id: patientId,
    data: session,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error('Session save error:', error.message);
}

async function logTriage(entry) {
  const { data, error } = await supabase
    .from('triage_logs')
    .insert(entry)
    .select('id')
    .single();
  if (error) { console.error('Triage log error:', error.message); return null; }
  return data?.id || null;
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
  if (session.step !== 'language_select' && session.step !== 'consent') {
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
      session.step = 'category_select';
      await saveSession(patientId, session);
      // Log consent
      await supabase.from('consent_log').insert({
        patient_id: patientId,
        consented: true,
        language: lang,
      });
      const confirmMsg = await translateText(CONSENT_RECEIVED.en, lang);
      await sendWhatsAppMessage(from, confirmMsg);
      const categoryMenu = await translateText(CATEGORY_MENU_EN, lang);
      await sendWhatsAppMessage(from, categoryMenu);
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

  // ── AGENT 3: CATEGORY SELECTION ────────────────────────────
  if (session.step === 'category_select') {
    // Category 13 → human escalation
    if (normalized === '13') {
      const logId = await logTriage({
        patient_id: patientId,
        phone_hash: patientId,
        language: lang,
        original_message: 'User requested to speak to a human.',
        english_summary: 'User requested to speak to a human.',
        triage_level: 'HUMAN_REQUEST',
        confidence: 'HIGH',
        method: 'menu',
        category: '13',
        escalation: true,
        escalation_reason: 'USER_REQUESTED_HUMAN',
        needs_human_review: true,
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
      english_summary: `Category ${category} (${getCategoryName(category)}), option ${text.trim()} selected.`,
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
    });

    // AGENT 6: Schedule follow-up
    await scheduleFollowUp(patientId, from, classification, logId);

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
      english_summary: triage.englishSummary,
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
    });

    await scheduleFollowUp(patientId, from, triage.classification, logId);

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
      await saveSession(patientId, session);
      const locMsg = await translateText(
        '📍 Location received! This helps us find the nearest facility for you.',
        session.lang || 'en'
      );
      await sendWhatsAppMessage(from, locMsg);
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
// DASHBOARD API (Agent 7)
// ================================================================

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'HealthBridgeSA v2.0', timestamp: new Date().toISOString() });
});

// Stats overview
app.get('/api/stats', async (req, res) => {
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

// Escalation queue — cases needing human review
app.get('/api/escalations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('triage_logs')
      .select('*')
      .eq('needs_human_review', true)
      .eq('reviewed', false)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark escalation as reviewed
app.post('/api/escalations/:id/review', async (req, res) => {
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
app.get('/api/escalations/count', async (req, res) => {
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
app.get('/api/logs', async (req, res) => {
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
app.get('/api/facilities', async (req, res) => {
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
app.get('/api/follow-ups', async (req, res) => {
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
// START
// ================================================================

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HealthBridgeSA v2.0 running on port ${PORT}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL ? '✅' : '❌'}`);
  console.log(`   WhatsApp: ${process.env.WHATSAPP_TOKEN ? '✅' : '❌'}`);
  console.log(`   Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'}`);
});
