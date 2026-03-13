require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.json());

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'HealthBridge Triage Bot is running.' });
});

// ─── GET /webhook  (WhatsApp verification challenge) ─────────────────────────
app.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook verified successfully.');
    return res.status(200).send(challenge);
  }

  console.warn('Webhook verification failed – token mismatch.');
  res.sendStatus(403);
});

// ─── POST /webhook  (incoming WhatsApp messages) ─────────────────────────────
app.post('/webhook', async (req, res) => {
  // Acknowledge immediately so WhatsApp doesn't retry
  res.sendStatus(200);

  try {
    const entry   = req.body?.entry?.[0];
    const change  = entry?.changes?.[0];
    const value   = change?.value;
    const message = value?.messages?.[0];

    if (!message || message.type !== 'text') return;

    const from    = message.from;          // patient's phone number
    const text    = message.text?.body;

    if (!text) return;

    console.log(`Received from ${from}: ${text}`);

    const triageResult = await getTriageDecision(text);
    console.log('Claude triage response:', JSON.stringify(triageResult, null, 2));
    await sendWhatsAppMessage(from, triageResult);
  } catch (err) {
    console.error('Error handling webhook:', err.message);
  }
});

// ─── Triage via Claude ────────────────────────────────────────────────────────
async function getTriageDecision(patientMessage) {
  const stream = anthropic.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: `You are a medical triage assistant for a South African primary-healthcare system.

Classify the patient's reported symptoms into exactly ONE of these four categories:

  EMERGENCY  – life-threatening; patient needs an ambulance immediately
  URGENT     – serious but not immediately life-threatening; patient must visit a clinic today
  ROUTINE    – non-urgent complaint; patient should visit a clinic this week
  CHRONIC    – ongoing condition management; patient can collect medication at a CCMDD pickup point

Respond with a single JSON object and nothing else:
{
  "classification": "<EMERGENCY|URGENT|ROUTINE|CHRONIC>",
  "routing": "<ambulance|clinic today|clinic this week|CCMDD pickup point>",
  "advice": "<one concise sentence of patient-facing guidance>"
}`,
    messages: [{ role: 'user', content: patientMessage }],
  });

  const response = await stream.finalMessage();

  for (const block of response.content) {
    if (block.type === 'text') {
      try {
        const cleaned = block.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        return JSON.parse(cleaned);
      } catch {
        // Model returned plain text – wrap it
        return {
          classification: 'ROUTINE',
          routing: 'clinic this week',
          advice: block.text,
        };
      }
    }
  }

  return {
    classification: 'ROUTINE',
    routing: 'clinic this week',
    advice: 'Please visit your nearest clinic for an assessment.',
  };
}

// ─── Send WhatsApp message ────────────────────────────────────────────────────
async function sendWhatsAppMessage(to, triage) {
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const accessToken   = process.env.WHATSAPP_TOKEN;

  const body = [
    `*HealthBridge Triage Result*`,
    ``,
    `Classification: *${triage.classification}*`,
    `Recommended action: *${triage.routing}*`,
    ``,
    triage.advice,
  ].join('\n');

  const response = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    console.error(`WhatsApp send failed (${response.status}):`, err);
  } else {
    console.log(`Triage result sent to ${to}`);
  }
}

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
