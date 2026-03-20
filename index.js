// ============================================================
// HealthBridgeSA — PRODUCTION READY v2.1
// + Hardcoded 11-language messages
// + Smart facility routing with patient confirmation
// + Bug fixes
// Railway + Meta WhatsApp + Supabase + Anthropic
// March 2026
// ============================================================

require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

// ================== CONFIG ==================
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CONFIDENCE_THRESHOLD = 75;

// ================== HELPERS ==================
function hashPhone(phone) {
  return crypto.createHash('sha256').update(phone).digest('hex').slice(0, 16);
}

async function sendWhatsAppMessage(to, text) {
  await fetch(`https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`, {
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
    _all: `Welcome to HealthBridgeSA 🏥

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
    en: '✅ Language set to *English*.',
    zu: '✅ Ulimi lusetelwe ku-*isiZulu*.',
    xh: '✅ Ulwimi lusetelwe kwisi-*Xhosa*.',
    af: '✅ Taal is gestel na *Afrikaans*.',
    nso: '✅ Polelo e beakantšwe go *Sepedi*.',
    tn: '✅ Puo e beilwe go *Setswana*.',
    st: '✅ Puo e behilwe ho *Sesotho*.',
    ts: '✅ Ririmi ri vekiwile eka *Xitsonga*.',
    ss: '✅ Lulwimi lubekwe ku-*siSwati*.',
    ve: '✅ Luambo lwo sedzwa kha *Tshivenda*.',
    nr: '✅ Ilimi libekwe ku-*isiNdebele*.'
  },

  // ==================== CONSENT PROMPT ====================
  consent: {
    en: `Welcome to HealthBridgeSA.

This service:
• Gives guidance — it does NOT diagnose
• May refer you to a nurse if needed
• Keeps your information safe under POPIA

Do you agree?
1 — Yes, I agree
2 — No, I decline`,

    zu: `Siyakwamukela ku-HealthBridgeSA.

Le sevisi:
• Inikezela iseluleko — AYIKUXILONGI
• Ingakudlulisela kunesi uma kudingeka
• Igcina imininingwane yakho iphephile nge-POPIA

Uyavuma?
1 — Yebo, ngiyavuma
2 — Cha, angivumi`,

    xh: `Wamkelekile ku-HealthBridgeSA.

Le sevisi:
• Inika iingcebiso — AYIXILONGI
• Inokukudlulisela kumongikazi ukuba kuyafuneka
• Igcina inkcazelo yakho ikhuselekile nge-POPIA

Uyavuma?
1 — Ewe, ndiyavuma
2 — Hayi, andivumi`,

    af: `Welkom by HealthBridgeSA.

Hierdie diens:
• Gee leiding — dit diagnoseer NIE
• Kan jou na 'n verpleegster verwys indien nodig
• Hou jou inligting veilig onder POPIA

Stem jy saam?
1 — Ja, ek stem saam
2 — Nee, ek stem nie saam nie`,

    nso: `O amogetšwe go HealthBridgeSA.

Tirelo ye:
• E fa maele — GA E NYAKIŠIŠE bolwetši
• E ka go romela go mooki ge go nyakega
• E boloka tshedimošo ya gago e bolokegile ka POPIA

A o dumela?
1 — Ee, ke a dumela
2 — Aowa, ga ke dumele`,

    tn: `O amogelwa go HealthBridgeSA.

Tirelo e:
• E fa kgakololo — GA E TLHATLHOBE
• E ka go romela go mooki fa go tlhokega
• E boloka tshedimosetso ya gago e babalesegile ka POPIA

A o dumela?
1 — Ee, ke a dumela
2 — Nnyaa, ga ke dumele`,

    st: `O amohelehile ho HealthBridgeSA.

Tshebeletso ena:
• E fana ka tataiso — HA E HLAHLOBE
• E ka o romela ho mooki haeba ho hlokahala
• E boloka tlhahisoleseding ya hao e bolokehile ka POPIA

Na o dumela?
1 — E, ke a dumela
2 — Tjhe, ha ke dumele`,

    ts: `U amukelekile eka HealthBridgeSA.

Vukorhokeri lebyi:
• Byi nyika switsundzuxo — A BYI KAMBELI
• Byi nga ku rhumela eka nesi loko swi laveka
• Byi hlayisa vuxokoxoko bya wena byi hlayisekile hi POPIA

Xana wa pfumela?
1 — Ina, ndza pfumela
2 — Ee-ee, a ndzi pfumeli`,

    ss: `Wemukelekile ku-HealthBridgeSA.

Lesevisi:
• Inika teluleko — AYIHLONGI
• Ingakutfumela kunesi uma kudzingeka
• Igcina lokutsintana kwakho kuphephile nge-POPIA

Uyavuma?
1 — Yebo, ngiyavuma
2 — Cha, angivumi`,

    ve: `Vho ṱanganedzwa kha HealthBridgeSA.

Tshumelo iyi:
• I ṋea vhulivhisi — A I ṰOḒISISI VHULWADZE
• I nga ni rumela kha nese arali zwi tshi ṱoḓea
• I vhulunga mafhungo aṋu o tsireledzeaho nga POPIA

Ni a tenda?
1 — Ee, ndi a tenda
2 — Hai, a thi tendi`,

    nr: `Wamukelekile ku-HealthBridgeSA.

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
    en: '🔴 *EMERGENCY*\nCall *10177* for an ambulance NOW.\nIf private: ER24 *084 124*.\nA nurse has been notified of your case.',
    zu: '🔴 *ISIMO ESIPHUTHUMAYO*\nShaya *10177* ucele i-ambulensi MANJE.\nUma usebenzisa ezimfihlo: ER24 *084 124*.\nUnesi wazisiwe ngodaba lwakho.',
    xh: '🔴 *INGXAKEKO ENGXAMISEKILEYO*\nTsalela *10177* ucele i-ambulensi NGOKU.\nYabucala: ER24 *084 124*.\nUmongikazi wazisiwe ngodaba lwakho.',
    af: '🔴 *NOODGEVAL*\nBel *10177* vir \'n ambulans NOU.\nPrivaat: ER24 *084 124*.\n\'n Verpleegster is in kennis gestel.',
    nso: '🔴 *TŠHOGANETŠO*\nLeletša *10177* go kgopela ambulense BJALE.\nPraebete: ER24 *084 124*.\nMooki o tsebišitšwe ka tiragalo ya gago.',
    tn: '🔴 *TSHOGANYETSO*\nLeletsa *10177* go kopa ambulense JAANONG.\nPraebete: ER24 *084 124*.\nMooki o itsisiwe ka tiragalo ya gago.',
    st: '🔴 *TSHOHANYETSO*\nLetsetsa *10177* ho kopa ambulense HONA JOALE.\nPraebete: ER24 *084 124*.\nMooki o tsebisitswe ka ketsahalo ya hao.',
    ts: '🔴 *XIHATLA*\nRingela *10177* ku kombela ambulense SWESWI.\nPrayivhete: ER24 *084 124*.\nNesi u tivisiwe hi mhaka ya wena.',
    ss: '🔴 *LOKUSHESHISAKO*\nShayela *10177* ucele i-ambulensi NYALO.\nYangasese: ER24 *084 124*.\nNesi watiwe ngebuhlungu bakho.',
    ve: '🔴 *TSHOGANETSO*\nFounelani *10177* u humbela ambulense ZWINO.\nPuraivete: ER24 *084 124*.\nNese o ḓivhadzwa nga mulandu waṋu.',
    nr: '🔴 *ISIMO ESIPHUTHUMAKO*\nRingela *10177* ubawa i-ambulensi NJE.\nYefihlo: ER24 *084 124*.\nUnesi watjhejiswe ngodaba lwakho.'
  },

  triage_orange: {
    en: '🟠 *VERY URGENT*\nGo to the nearest hospital emergency unit NOW.',
    zu: '🟠 *KUPHUTHUMA KAKHULU*\nYa esibhedlela esiseduze MANJE — ewodini yeziphuthumayo.',
    xh: '🟠 *KUNGXAMISEKE KAKHULU*\nYiya esibhedlele esikufutshane NGOKU — kwicandelo lezongxamiseko.',
    af: '🟠 *BAIE DRINGEND*\nGaan NA die naaste hospitaal noodafdeling NOU.',
    nso: '🟠 *GO ŠUTIŠWA KUDU*\nYa sepetleleng sa kgauswi BJALE — ka karolong ya tšhoganetšo.',
    tn: '🟠 *GO TSHOGANYETSO THATA*\nYa bookelong jo bo gaufi JAANONG — ka karolong ya tshoganyetso.',
    st: '🟠 *HO POTLAKILE HAHOLO*\nEa sepetlele se haufi HONA JOALE — karolong ya tshohanyetso.',
    ts: '🟠 *SWI HATLISA NGOPFU*\nYa exibedlhele xa kusuhi SWESWI — ka xiyenge xa swihatla.',
    ss: '🟠 *KUSHESHISA KAKHULU*\nYa esibhedlela leseduze NYALO — endlini yekusheshisa.',
    ve: '🟠 *ZWO ṰOḒEA VHUKUMA*\nYani sibadela tshi re tsini ZWINO — kha tshiimiswa tsha tshoganetso.',
    nr: '🟠 *KUPHUTHUMA KHULU*\nYa esibhedlela esiseduze NJE — esigeni seziphuthumako.'
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
    en: (facilities) => `Here are other options nearby:\n${facilities}\n\nReply with the number of your choice.`,
    zu: (facilities) => `Nazi ezinye izindawo eziseduze:\n${facilities}\n\nPhendula ngenombolo oyikhethayo.`,
    xh: (facilities) => `Nazi ezinye iindawo ezikufutshane:\n${facilities}\n\nPhendula ngenombolo oyikhethayo.`,
    af: (facilities) => `Hier is ander opsies naby:\n${facilities}\n\nAntwoord met die nommer van jou keuse.`,
    nso: (facilities) => `Tše ke mafelo a mangwe a kgauswi:\n${facilities}\n\nAraba ka nomoro ya kgetho ya gago.`,
    tn: (facilities) => `Ke mafelo a mangwe a gaufi:\n${facilities}\n\nAraba ka nomoro ya kgetho ya gago.`,
    st: (facilities) => `Mona ke mafelo a mang a haufi:\n${facilities}\n\nAraba ka nomoro ya kgetho ya hao.`,
    ts: (facilities) => `Leti i tindhawu tin'wana ta kusuhi:\n${facilities}\n\nHlamula hi nomboro ya nhlawulo wa wena.`,
    ss: (facilities) => `Nati letinye tindzawo letisetfuze:\n${facilities}\n\nPhendvula ngenombolo yalokukhetsa kwakho.`,
    ve: (facilities) => `Hafha ndi huṅwe fhethu hu re tsini:\n${facilities}\n\nFhindulani nga nomboro ya khetho yaṋu.`,
    nr: (facilities) => `Nazi ezinye iindawo ezisetjhezi:\n${facilities}\n\nPhendula ngenomboro yalokukhetha kwakho.`
  },

  // ==================== FOLLOW-UP ====================
  follow_up: {
    en: `Hi, you contacted HealthBridgeSA 2 days ago. How are your symptoms?
1. Better ✅
2. The same ➡️
3. Worse ⚠️`,
    zu: `Sawubona, usithintile eHealthBridgeSA ezinsukwini ezi-2 ezedlule. Zinjani izimpawu zakho?
1. Zingcono ✅
2. Ziyafana ➡️
3. Zimbi kakhulu ⚠️`,
    xh: `Molo, uqhagamshelane neHealthBridgeSA kwiintsuku ezi-2 ezidlulileyo. Zinjani iimpawu zakho?
1. Zibhetele ✅
2. Ziyafana ➡️
3. Zimbi ngakumbi ⚠️`,
    af: `Hallo, jy het 2 dae gelede HealthBridgeSA gekontak. Hoe is jou simptome?
1. Beter ✅
2. Dieselfde ➡️
3. Erger ⚠️`,
    nso: `Thobela, o ikgokagantše le HealthBridgeSA matšatši a 2 a go feta. Dika tša gago di bjang?
1. Di kaone ✅
2. Di swana ➡️
3. Di mpefetše ⚠️`,
    tn: `Dumela, o ikgolagantse le HealthBridgeSA malatsi a 2 a a fetileng. Matshwao a gago a ntse jang?
1. A botoka ✅
2. A tshwana ➡️
3. A maswe go feta ⚠️`,
    st: `Lumela, o ikopantse le HealthBridgeSA matsatsi a 2 a fetileng. Matshwao a hao a jwang?
1. A betere ✅
2. A tshwana ➡️
3. A mpe ho feta ⚠️`,
    ts: `Xewani, u ti tshikelele na HealthBridgeSA masiku ya 2 ya hundzi. Swikombiso swa wena swi njhani?
1. Swi antswa ✅
2. Swi fanana ➡️
3. Swi tika ku tlula ⚠️`,
    ss: `Sawubona, usitsintsile eHealthBridgeSA emalangeni la-2 langetulu. Tinjani timphawu takho?
1. Tincono ✅
2. Tiyafana ➡️
3. Timbi kakhulu ⚠️`,
    ve: `Aa, no kwama HealthBridgeSA maḓuvha a 2 o fhelaho. Zwiga zwaṋu zwi hani?
1. Zwo khwiṋa ✅
2. Zwi a fana ➡️
3. Zwo ṱoḓa u ṱavhanya ⚠️`,
    nr: `Lotjha, usitjheje ku-HealthBridgeSA emalangeni la-2 langaphambili. Iimpawu zakho zinjani?
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
  }
};

// ================================================================
// LANGUAGE HELPERS
// ================================================================
const LANG_MAP = { '1':'en','2':'zu','3':'xh','4':'af','5':'nso','6':'tn','7':'st','8':'ts','9':'ss','10':'ve','11':'nr' };

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
    model: 'claude-3-haiku-20240307',
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
async function runTriage(text, lang) {
  const res = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
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
function getTriagePathway(triageLevel) {
  switch (triageLevel) {
    case 'RED': return { pathway: 'ambulance', facilityType: 'hospital' };
    case 'ORANGE': return { pathway: 'emergency_unit', facilityType: 'hospital' };
    case 'YELLOW': return { pathway: 'clinic_visit', facilityType: 'clinic' };
    default: return { pathway: 'self_care', facilityType: null };
  }
}

// ================================================================
// ORCHESTRATOR — MAIN CONVERSATION FLOW
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
      await sendWhatsAppMessage(from, msg('category_menu', lang));
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

      await scheduleFollowUp(patientId, from, session.lastTriage?.triage_level);
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
      await sendWhatsAppMessage(from, msg('facility_alternatives', lang, listStr));
      return;
    }
  }

  // ==================== STEP: ALTERNATIVE FACILITY CHOICE ====================
  if (session.awaitingAlternativeChoice) {
    const alternatives = session.alternativeFacilities || [];
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

      await scheduleFollowUp(patientId, from, session.lastTriage?.triage_level);
      return;
    }
  }

  // ==================== STEP 2: TRIAGE ====================
  let triage = await runTriage(message, lang);
  triage = applyClinicalRules(message, triage);

  // Store for later logging
  session.lastTriage = triage;
  session.lastSymptoms = message;

  // ==================== STEP 3: RED / LOW CONFIDENCE → ESCALATE ====================
  if (triage.triage_level === 'RED' || triage.confidence < CONFIDENCE_THRESHOLD) {
    await sendWhatsAppMessage(from, msg('triage_red', lang));

    await logTriage({
      patient_id: patientId,
      triage_level: triage.triage_level,
      confidence: triage.confidence,
      escalation: triage.confidence < CONFIDENCE_THRESHOLD,
      pathway: 'ambulance',
      facility_name: null,
      location: session.location || null,
      symptoms: message
    });

    await scheduleFollowUp(patientId, from, triage.triage_level);
    await saveSession(patientId, session);
    return;
  }

  // ==================== STEP 4: SEND TRIAGE RESULT ====================
  if (triage.triage_level === 'ORANGE') {
    await sendWhatsAppMessage(from, msg('triage_orange', lang));
  } else if (triage.triage_level === 'YELLOW') {
    await sendWhatsAppMessage(from, msg('triage_yellow', lang));
  } else {
    await sendWhatsAppMessage(from, msg('triage_green', lang));
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
    await saveSession(patientId, session);
    return;
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
}

// ================== MAIN HANDLER ==================
async function handleMessage(msgObj) {
  const from = msgObj.from;
  const patientId = hashPhone(from);
  let session = await getSession(patientId);

  // RESET COMMAND
  if (msgObj.type === 'text' && msgObj.text.body.trim() === '0') {
    await saveSession(patientId, {});
    await sendWhatsAppMessage(from, MESSAGES.language_menu._all);
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

  // TEXT MESSAGE
  if (msgObj.type !== 'text') return;
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
  await orchestrate(patientId, from, text, session);
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
    await handleMessage(msgObj);
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
  res.json({ status: 'ok', version: '2.1', service: 'HealthBridgeSA' });
});

// ================== START ==================
app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 HealthBridgeSA v2.1 Orchestrator LIVE');
});
