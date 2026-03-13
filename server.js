// force redeploy v2
require('dotenv').config();
console.log('RAW process.env:', JSON.stringify(Object.keys(process.env)));
console.log('ENV CHECK - WHATSAPP_TOKEN exists:', !!process.env.WHATSAPP_TOKEN);
console.log('ENV CHECK - WHATSAPP_PHONE_ID exists:', !!process.env.WHATSAPP_PHONE_ID);
console.log('ENV CHECK - ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
const express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk').default;

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WHATSAPP_API_URL = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

// ── In-memory stores (reset on server restart) ───────────────────────────────
// NOTE: For production, replace with a persistent store (Redis, DB, etc.)
// session shape: { lang, step: 'language_select'|'category_select'|'followup'|'free_text'|'post_triage', category }
const userSessions  = new Map(); // phone -> session object
const conversations = [];        // append-only log of every triage interaction

const LANG_CODES = {
  '1': 'en', '2': 'zu', '3':  'xh', '4':  'af',
  '5': 'nso', '6': 'tn', '7': 'st', '8':  'ts',
  '9': 'ss', '10': 've', '11': 'nr',
};

// ── Symptom category menu (English) ───────────────────────────────────────────
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

// ── Follow-up questions per category (English) ────────────────────────────────
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
  '10': 'Please choose:\n\n1. Thinking of harming yourself or others (crisis)\n2. Feeling very low, hopeless or unable to cope\n3. Anxiety or panic attacks\n4. General mental health question',
  '11': 'Please choose:\n\n1. Severe allergic reaction (face/throat swelling, difficulty breathing)\n2. Widespread rash with fever\n3. Mild rash or skin irritation\n4. Insect bite or sting',
};

// Maps category + followup answer to a SATS triage level
// Each entry is an array indexed by answer (1-based)
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

// ── Post-triage prompt & closing message (English) ────────────────────────────
const POST_TRIAGE_PROMPT_EN =
  'Is there anything else I can help with?\n\n' +
  '1. Yes, I have another concern\n' +
  '2. No, thank you\n\n' +
  'Type *0* to change language.';

const CLOSING_MESSAGE_EN =
  'Stay safe. If your condition worsens, message us again anytime. 🏥';

// ── Welcome menu ──────────────────────────────────────────────────────────────
const WELCOME_MENU =
  'Welcome to HealthBridgeSA 🏥\n' +
  'Please choose your language / Khetha ulimi lwakho:\n\n' +
  '1. English\n'      +
  '2. isiZulu\n'      +
  '3. isiXhosa\n'     +
  '4. Afrikaans\n'    +
  '5. Sepedi\n'       +
  '6. Setswana\n'     +
  '7. Sesotho\n'      +
  '8. Xitsonga\n'     +
  '9. siSwati\n'      +
  '10. Tshivenda\n'   +
  '11. isiNdebele';

// ── Language confirmation messages ───────────────────────────────────────────
const LANG_CONFIRMED = {
  en:  '✅ Language set to *English*.\nType *0* or *menu* anytime to change language.',
  zu:  '✅ Ulimi lusetelwe ku *isiZulu*.\nBhala *0* noma *menu* nganoma yisiphi isikhathi ukushintsha ulimi.',
  xh:  '✅ Ulwimi lusethwe kwi *isiXhosa*.\nTayipha *0* okanye *menu* nangaliphi ixesha ukuguqula ulwimi.',
  af:  '✅ Taal ingestel op *Afrikaans*.\nTik *0* of *menu* enige tyd om taal te verander.',
  nso: '✅ Polelo e beelwe go *Sepedi*.\nŽwala *0* goba *menu* neng le neng go fetola polelo.',
  tn:  '✅ Puo e beelwe go *Setswana*.\nKwala *0* kgotsa *menu* neng le neng go fetola puo.',
  st:  '✅ Puo e behilwe ho *Sesotho*.\nKwala *0* kapa *menu* nako efe kapa efe ho fetola puo.',
  ts:  '✅ Ririmi ri sethiwa eka *Xitsonga*.\nNyorisisa *0* kumbe *menu* nkarhi wowuhi ku cinca ririmi.',
  ss:  '✅ Lulwimi lubekwe ku *siSwati*.\nTayipha *0* nome *menu* nganoma ngesiphi isikhathi kushintshe lulwimi.',
  ve:  '✅ Luambo lu lavhelelwa kha *Tshivenda*.\nNyorisisa *0* kana *menu* ngomu wa tshifhinga tshine na tshine u shandukisa luambo.',
  nr:  '✅ Ilimi libekwe ku *isiNdebele*.\nBhala *0* nome *menu* nanoma ngesiphi isikhathi ukushintsha ilimi.',
};

// ── Triage replies – all 11 official languages ────────────────────────────────
// NOTE: Translations are an approximation and should be reviewed by certified
//       translators before clinical deployment.
const TRIAGE_REPLIES = {

  // ── RED ─────────────────────────────────────────────────────────────────────
  RED: {
    en:
      '🔴 *CODE RED - EMERGENCY*\n' +
      'Call 10177 for an ambulance immediately. If in Gauteng, also try ER24: 084 124. ' +
      'Do not move the patient unless in danger. Stay on the line with the operator.',

    zu:
      '🔴 *IKHODI EBOMVU - ISIMO ESIPHUTHUMAYO*\n' +
      'Shaya ucingo ku-10177 ukuthola inqola yeziguli ngokushesha. Uma usesifundazweni ' +
      'saseGauteng, zama futhi i-ER24: 084 124. Ungashintshi indawo yegula ngaphandle ' +
      'uma lisengozini. Hlala unxuswe nomphathi wocingo.',

    xh:
      '🔴 *IKHOWUDI EBOMVU - INGXAKI EPHUTHUMAYO*\n' +
      'Fowuna ku-10177 ufumane i-ambulensi ngoko nangoko. Ukuba useMantla Gauteng, ' +
      'zama kwanase-ER24: 084 124. Musa ukuhambisa umntu ogulayo ngaphandle kokuba ' +
      'esengozini. Hlala unxuswe nomphathi wocingo.',

    af:
      '🔴 *KODE ROOI - NOODGEVAL*\n' +
      "Bel 10177 vir 'n ambulans onmiddellik. As jy in Gauteng is, probeer ook ER24: 084 124. " +
      'Moenie die pasiënt beweeg tensy in gevaar nie. Bly op die lyn met die operateur.',

    nso:
      '🔴 *KHOUTHI YA BOHIBIDU - TSHOGANYETŠO*\n' +
      'Letsetša 10177 ya ambulanse ka pela. Ge o le Gauteng, leka gape ER24: 084 124. ' +
      'Se suthiše mokulegi ntle le ge a le kotsing. Dula o bolela le molaodi wa mohala.',

    tn:
      '🔴 *KHOUTHI E KHIBIDU - TSHOGANYETSO*\n' +
      'Leletsa 10177 go bona ambulanse ka bonako. Fa o le Gauteng, leka gape ER24: 084 124. ' +
      'Se sutise mokaulengwe ntle le fa a le kotsing. Nna mo moleng le molaodi.',

    st:
      '🔴 *KHOUTHI E KHUBELU - TSHOHANYETSO*\n' +
      'Leletsa 10177 bakeng sa ambulanse hona joale. Haeba o Gauteng, leka hape ER24: 084 124. ' +
      'Se suthise mokuli haese a le kotsing. Dula o bua le molaedi wa mohala.',

    ts:
      '🔴 *KHODI YA TSWUKU - XIYIMO XA XIHATLA*\n' +
      'Fowuna ku 10177 hi ambulance hi ku hatlisa. Loko u ri Gauteng, linga gape ER24: 084 124. ' +
      "U nga sususeli munhu lowu kulaka ntsena loko a ri enkarheni wa ngozi. Tshama u hlamula muendli wa foni.",

    ss:
      '🔴 *IKHODI LEBOVU - SIGAMEKO*\n' +
      'Shayela ku-10177 ngekweshesha lenqola yetiguli. Uma useGauteng, zama futsi i-ER24: 084 124. ' +
      'Ungashukumisi loligula ngaphandle uma asengozini. Hlala unxuswe nomphathi wefoni.',

    ve:
      '🔴 *KHODI YA TSWUKU - TSHENZHELO*\n' +
      'Fona 10177 ya ambulense nga u fhurufhedzea. Arali u Gauteng, linga hafhu ER24: 084 124. ' +
      'Ni shanduki mukololo nge nḓila fhedzi arali a khou vhidzwa. Ima u amba na mufhinduli wa foni.',

    nr:
      '🔴 *IKHODI EBOVU - ISIMO ESIPHUTHUMAKO*\n' +
      'Biza 10177 ngeleshesha ukuthola inqola yabagulako. Uma useGauteng, zama futhi i-ER24: 084 124. ' +
      'Ungasusi umguli ngaphandle uma asengozini. Hlala unxuswe nomphathi wocingo.',
  },

  // ── ORANGE ──────────────────────────────────────────────────────────────────
  ORANGE: {
    en:
      '🟠 *CODE ORANGE - VERY URGENT*\n' +
      'Get to your nearest hospital emergency unit within 1 hour. ' +
      'If you cannot transport safely, call 10177. Do not eat or drink until assessed.',

    zu:
      '🟠 *IKHODI YORANJI - IPHUTHUMILE KAKHULU*\n' +
      'Ya esibhedlela esisondele kuwe (emnyangweni wezimo eziphuthumayo) ngaphakathi nehora elilodwa. ' +
      'Uma ungakwazi ukuya ngokuphepha, shaya ucingo ku-10177. Ungadli noma uphuze uze uhlolwe.',

    xh:
      '🟠 *IKHOWUDI EORENTSHI - IPHUTHUMAYO KAKHULU*\n' +
      'Yiya kwisibhedlele esikufutshane (kwisebe lezimo eziphuthumayo) ngaphakathi kweyure enye. ' +
      'Ukuba awukwazi ukuya ngokukhuselekileyo, fowuna ku-10177. Musa ukutya okanye ukusela de uhlolwe.',

    af:
      '🟠 *KODE ORANJE - BAIE DRINGEND*\n' +
      "Gaan na jou naaste hospitaal se noodafdeling binne 1 uur. " +
      'As jy nie veilig kan vervoer nie, bel 10177. Moenie eet of drink totdat jy ondersoek is nie.',

    nso:
      '🟠 *KHOUTHI YA ORENTŠHE - GO GÔGÔŠWA THATA*\n' +
      'Ya sepetlele sa gaisane le wena (ka kgaolo ya tshoganyetšo) go ya go ura e tee. ' +
      'Ge o sa kgone go sepela ka go hloka kotsi, letsetša 10177. Se je goba sele go fihlela o hlolilwe.',

    tn:
      '🟠 *KHOUTHI E ORANJE - GO TSHOGANYA THATA*\n' +
      'Ya kwa sepetlele se gaufi le wena (kwa lefapheng la tshoganyetso) mo tikelong ya ura e nngwe. ' +
      'Fa o sa kgone go tsamaya ka tshireletsego, leletsa 10177. Se je kgotsa nwe go fitlha o sekasekiwa.',

    st:
      '🟠 *KHOUTHI E ORENTJHE - HO POTLAKA HAHOLO*\n' +
      'Ea sepetlele se haufi (lefapheng la ho potlaka) ka hora e le nngwe. ' +
      'Haeba o ke ke wa tsamaea ka polokeho, leletsa 10177. O se je kapa o nwe ho fihlela o hlahlojwa.',

    ts:
      '🟠 *KHODI YA ORANGE - XIHATLA SWINENE*\n' +
      "Ya ku hospitala ya kusuhi na wena (eka xiyimo xa xihatla) enkarheni wa hora yin'we. " +
      'Loko u nga koti ku famba hi ku hlayiseka, fowuna ku 10177. U nga dyi kumbe u nwa ku fikelela loko u kamberiwa.',

    ss:
      '🟠 *IKHODI YORENDZHI - KUPHUTFUMA KAKHULU*\n' +
      'Ya esibhedlela lesisedvute nawe (emnyangweni wetimo letiphutfumako) ngaphakathi kwelikhasi lelilodwa. ' +
      'Uma ungakwazi ukuya ngekuphepha, shayela ku-10177. Ungadli nome uphuze uze uhlolwe.',

    ve:
      '🟠 *KHODI YA ORANJE - HU FHURUFHEDZEA VHUKUMA*\n' +
      'Ya kha hospitela ya vhufhasi ha hao (kha thundu ya tshitatutshedzo) nga awa ḽithihi. ' +
      'Arali u sa koni u famba nga u tshidifala, fona 10177. Ni songo ḽa kana u nwa u swika musi wa u sedzuluswa.',

    nr:
      '🟠 *IKHODI YORENSHI - IPHUTHUMAKO KAKHULU*\n' +
      'Ya esibhedlela esisedvute nawe (emnyangweni wezimo eziphuthumako) ngaphakathi kwelikhasi elilodwa. ' +
      'Uma ungakwazi ukuya ngokuphepha, biza 10177. Ungadli nome uphuze uze uhlolwe.',
  },

  // ── YELLOW ──────────────────────────────────────────────────────────────────
  YELLOW: {
    en:
      '🟡 *CODE YELLOW - URGENT*\n' +
      'Visit your nearest clinic or hospital within 4 hours. ' +
      'Bring your ID and medical aid card if you have one.',

    zu:
      '🟡 *IKHODI YOMTHUBI - IPHUTHUMILE*\n' +
      'Vakashela ikhliniki noma isibhedlela esisondele kuwe phakathi kwamahora amane. ' +
      'Letha ikhadi lakho lomazisi kanye nekhadi lakho lensizakusimama yezempilo uma unalo.',

    xh:
      '🟡 *IKHOWUDI YOMTHUBI - IPHUTHUMAYO*\n' +
      'Tyelela ikliniki okanye isibhedlele esikufutshane ngaphakathi kwamahora amane. ' +
      'Zisa ikhadi lakho lomazisi kunye nekhadi loncedo lwezonyango ukuba unalo.',

    af:
      '🟡 *KODE GEEL - DRINGEND*\n' +
      'Besoek jou naaste kliniek of hospitaal binne 4 uur. ' +
      'Bring jou ID en mediese hulpkaart as jy een het.',

    nso:
      '🟡 *KHOUTHI YA TSHWEU - GO GÔGÔŠWA*\n' +
      'Etela kliniki goba sepetlele se gaufi le wena go ya go diiri tše nne. ' +
      'Tliša karata ya gago ya ID le karata ya thušo ya bophelo ge o na le yona.',

    tn:
      '🟡 *KHOUTHI E TSHWEU - GO TSHOGANYA*\n' +
      'Etela kliniki kgotsa sepetlele se gaufi le wena mo diureng tse nne. ' +
      'Tlisa karata ya gago ya ID le karata ya thuso ya kalafi fa o na le yone.',

    st:
      '🟡 *KHOUTHI E TSHEHLA - HO POTLAKA*\n' +
      'Etela kliniki kapa sepetlele se haufi ho wena ka hora tse nne. ' +
      'Tliisa karata ya hao ya ID le karata ya thuso ea bongaka haeba o na le yona.',

    ts:
      '🟡 *KHODI YA YELLOW - XIHATLA*\n' +
      'Ya eka kiliniki kumbe hospitala ya kusuhi na wena enkarheni wa mahora mane. ' +
      'Yisa khadi ya wena ya ID na khadi ya vukorhokeri bya vulavulelo bya ximunhu loko u na yona.',

    ss:
      '🟡 *IKHODI YOMTFUBI - KUPHUTFUMA*\n' +
      'Vakashela ikhliniki nome isibhedlela lesisedvute nawe ngaphakathi kwamahora lamane. ' +
      'Letha ikhadi lakho lemazisi kanye nekhadi lakho lensizakusimama yezempilo uma unalo.',

    ve:
      '🟡 *KHODI YA TSHENA - HU FHURUFHEDZEA*\n' +
      'Ya kha kiliniki kana hospitela ya vhufhasi ha hao nga maawa mane. ' +
      'Isa karada yau ya ID na karada ya thuso ya maphunzisi arali u na yone.',

    nr:
      '🟡 *IKHODI YOMTFUBI - IPHUTHUMAKO*\n' +
      'Vakashela ikhliniki nome isibhedlela esisedvute nawe ngaphakathi kwamahora amane. ' +
      'Letha ikhadi lakho lomazisi kanye nekhadi lakho lensizakusimama yezempilo uma unalo.',
  },

  // ── GREEN ───────────────────────────────────────────────────────────────────
  GREEN: {
    en:
      '🟢 *CODE GREEN - ROUTINE*\n' +
      'Book an appointment at your local clinic. You can also visit a pharmacy for ' +
      'over-the-counter advice. If symptoms worsen, message again.',

    zu:
      '🟢 *IKHODI ELUHLAZA - EJWAYELEKILE*\n' +
      'Bhuka isikhathi ekhliniki yakho endaweni yakho. Ungavakashela futhi indlu yemithi ' +
      'ukuze uthole iseluleko. Uma izimpawu ziba zimbi, thumela umlayezo futhi.',

    xh:
      '🟢 *IKHOWUDI ELUHLAZA - EJWAYELEKILEYO*\n' +
      'Bhukisha isigcawu kwikliniki yakho yendawo. Ungaya kwifamasi ukuze ufumane icebiso. ' +
      'Ukuba iimpawu ziba mbi, thumela umyalezo kwakhona.',

    af:
      "🟢 *KODE GROEN - ROETINE*\n" +
      "Bespreek 'n afspraak by jou plaaslike kliniek. Jy kan ook 'n apteek besoek vir raad. " +
      'As simptome vererger, stuur weer \'n boodskap.',

    nso:
      '🟢 *KHOUTHI YA BOTALA - TLWAELWA*\n' +
      'Buka nako klinikhing ya gago ya selegae. O ka etela gape lefelo la dihlare go hwetša keletšo. ' +
      'Ge matshwao a le mabe, romela molaetša gape.',

    tn:
      '🟢 *KHOUTHI E TALA - TLWAELO*\n' +
      'Buka nako kwa kliniki ya gago ya lefelo. O ka etela gape lefelo la ditlhare go bona kgakololo. ' +
      'Fa dika di le botlhoko, romela molaetsa gape.',

    st:
      '🟢 *KHOUTHI E TALA - TLWAELO*\n' +
      'Buka nako klinikeng ya hao ya lehae. O ka etela hape lefelo la lithethefatsi ho fumana keletso. ' +
      'Ha matshwao a phela, romela molaetsa hape.',

    ts:
      '🟢 *KHODI YA RIVALA - NTOLOVELO*\n' +
      'Hlawula nkarhi eka kiliniki ya wena ya le kule. U nga ya gape eka farmasiti ku kuma vutivi. ' +
      'Loko tihlawulelo ti hlamarisa, romela mhaka gape.',

    ss:
      '🟢 *IKHODI ELUHLAZA - EJWAYELEKILE*\n' +
      'Bhukha isikhathi ekhliniki yakho yalapho uhlala khona. Ungavakashela futsi indlu yemitsi ' +
      'ukuze utfole iseluleko. Uma tintfo tiba tibi, thumela umlayezo futsi.',

    ve:
      '🟢 *KHODI YA LUTOMBO - NZUDZANYO*\n' +
      'Buka nako kha kiliniki yau ya hayani. U nga ya hafhu kha famasi u wana zwidivho. ' +
      'Arali zwivhidzo zwi ita zwawo, rumela mafhungo hafhu.',

    nr:
      '🟢 *IKHODI ELUHLAZA - EJWAYELEKILE*\n' +
      'Bhuka isikhathi ekhliniki yakho yendaweni yakho. Ungavakashela futhi indlu yemithi ' +
      'ukuze uthole iseluleko. Uma tintfo tiba tibi, thumela umlayezo futhi.',
  },

  // ── BLUE ────────────────────────────────────────────────────────────────────
  BLUE: {
    en:
      '🔵 *CODE BLUE - PALLIATIVE CARE*\n' +
      'We are deeply sorry for what you and your loved one are going through. ' +
      'Please contact your nearest hospice or call the Hospice Palliative Care Association of SA: 011 807 2586. ' +
      'Reach out to family and trusted loved ones for support. You are not alone.',

    zu:
      '🔵 *IKHODI ELUHLAZA OKWESIBHAKABHAKA - UKUNAKEKELWA KWABANGENATHEMBA*\n' +
      'Sizwela kakhulu ngalokho okudlula kukho wena nomuntu wakho othandekayo. ' +
      'Sicela uxhumane ne-hospice efuze nendawo yakho noma ubize i-Hospice Palliative Care Association yase-SA: 011 807 2586. ' +
      'Xhumana nomndeni nabantu abakuthandayo ukuze uthole usekelo. Awukhona wedwa.',

    xh:
      '🔵 *IKHOWUDI YEBLUE - UKUNYANGWA NGOKONWABISA*\n' +
      'Silusizi kakhulu ngoko ukudlulayo wena nomntu wakho othandekileyo. ' +
      'Nceda uqhagamshelane ne-hospice ekufutshane okanye ubize i-Hospice Palliative Care Association yase-SA: 011 807 2586. ' +
      'Fikelela usapho nabantu abathembekileyo ukuze ufumane inkxaso. Awukho wedwa.',

    af:
      '🔵 *KODE BLOU - PALLIATIEWE SORG*\n' +
      'Ons is innig jammer vir wat jy en jou geliefde deurmaak. ' +
      'Kontak asseblief jou naaste hospies of skakel die Hospice Palliative Care Association of SA: 011 807 2586. ' +
      'Reik uit na familie en vertroude geliefdes vir ondersteuning. Jy is nie alleen nie.',

    nso:
      '🔵 *KHOUTHI YA BOTALA BJA LEGODIMO - TLHOKOMELO YA BOFEFO*\n' +
      'Re swabile thata ka se se hlolago wena le motho wa gago yo o rategago. ' +
      'Ikgokaganya le hospice ya gaufi goba letsetša Hospice Palliative Care Association ya SA: 011 807 2586. ' +
      'Ikgokaganya le ba lelapa le ba go go rata go hwetša thekgo. Ga o le tee.',

    tn:
      '🔵 *KHOUTHI E TALA YA LEGODIMO - TLHOKOMELO YA BOFUTEGO*\n' +
      'Re maswabi thata ka se se diragalang go wena le motho yo o o ratang. ' +
      'Ikgolaganya le hospice e gaufi kgotsa leletsa Hospice Palliative Care Association ya SA: 011 807 2586. ' +
      'Ikgolaganya le lelapa le batho ba o baratang go bona thuso. Ga o le tee.',

    st:
      '🔵 *KHOUTHI E BULUU - TLHOKOMELO EA BOCHA*\n' +
      'Re maswabi haholo ka seo o se fetang wena le e leng ratwi wa hao. ' +
      'Ka kopo ikopanye le hospice e haufi kapa o leletse Hospice Palliative Care Association ya SA: 011 807 2586. ' +
      'Ikopanye le lelapa le ba ratwang ba tshephehang ho bona tshehetso. Ha u le mong.',

    ts:
      '🔵 *KHODI YA BULE - XIKONGOMELO XA VUHLAYISEKI*\n' +
      "Hi tweriwile swinene hi leswi wena na munhu wa wena loyi u n'wi rhandzelaka mi hlolaka. " +
      'Hi kombela u fambisana na hospice ya kusuhi kana u fowuna Hospice Palliative Care Association ya SA: 011 807 2586. ' +
      'Fambisana na ndyangu na vanhu lava u va tshembaka ku kuma vuseketeli. U nga ri wena ntsena.',

    ss:
      '🔵 *IKHODI LELUHLAZA LWESIBHAKABHAKA - UKUNAKELWA KWABANGAPHILIYO*\n' +
      'Sizwela kakhulu ngalokho lokwedlula kukho wena nomuntfu wakho lothandekako. ' +
      'Sicela uxhumane ne-hospice lefuze endaweni yakho nome ubize i-Hospice Palliative Care Association yase-SA: 011 807 2586. ' +
      'Xhumana nemndeni nabantu labatsetfwe yibo ukuze utfole usekelo. Awukho wedwa.',

    ve:
      '🔵 *KHODI YA BLUU - NDANGULO YA U FHODZA*\n' +
      'Ri na vhusuwa vhukuma nga zwine zwi khou itea kha ḽifu ḽau na muṅwe waṋu. ' +
      'Kumbwa nga nḓila ya hospitela ya hospice ya vhufhasi kana fona Hospice Palliative Care Association ya SA: 011 807 2586. ' +
      'Dzudzanya na ṱhangano na vhaṅwe vha vhu rali. A ni vhathihi.',

    nr:
      '🔵 *IKHODI YEBULUU - UKUNAKEKELWA KWABANGENATHEMBA*\n' +
      'Sizwela kakhulu ngalokho okudlula kukho wena nomuntu wakho othandekako. ' +
      'Sicela uxhumane ne-hospice efuze endaweni yakho nome ubize i-Hospice Palliative Care Association yase-SA: 011 807 2586. ' +
      'Xhumana nomndeni nabantu abathandekako ukuze uthole usekelo. Awukho wedwa.',
  },
};

// ── GET /api/conversations ────────────────────────────────────────────────────
app.get('/api/conversations', (req, res) => {
  res.json(conversations);
});

// ── GET /api/stats ────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const LEVELS = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE'];
  const LANG_NAMES = {
    en: 'English', zu: 'isiZulu', xh: 'isiXhosa', af: 'Afrikaans',
    nso: 'Sepedi', tn: 'Setswana', st: 'Sesotho', ts: 'Xitsonga',
    ss: 'siSwati', ve: 'Tshivenda', nr: 'isiNdebele',
  };

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  const byTriageLevel = Object.fromEntries(LEVELS.map(l => [l, 0]));
  const byLanguage    = {};
  let last24hCount    = 0;

  for (const c of conversations) {
    byTriageLevel[c.triageLevel] = (byTriageLevel[c.triageLevel] ?? 0) + 1;

    const langName = LANG_NAMES[c.languageSelected] ?? c.languageSelected;
    byLanguage[langName] = (byLanguage[langName] ?? 0) + 1;

    if (new Date(c.timestamp).getTime() >= cutoff) last24hCount++;
  }

  res.json({
    totalConversations: conversations.length,
    byTriageLevel,
    byLanguage,
    last24hCount,
  });
});

// ── GET /api/escalations ──────────────────────────────────────────────────────
app.get('/api/escalations', (req, res) => {
  const escalations = conversations
    .filter(c => c.needsHumanReview)
    .slice()
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(escalations);
});

// ── GET /api/escalations/count ────────────────────────────────────────────────
app.get('/api/escalations/count', (req, res) => {
  const count = conversations.filter(c => c.needsHumanReview).length;
  res.json({ count });
});

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'HealthBridge Triage Bot' });
});

// ── Meta webhook verification ─────────────────────────────────────────────────
app.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.VERIFY_TOKEN || 'healthbridge_verify_2024';

  // TEMP DEBUG
  console.log('[webhook] received token :', token);
  console.log('[webhook] expected token :', expectedToken);
  console.log('[webhook] tokens match   :', token === expectedToken);
  console.log('[webhook] relevant env keys:', Object.keys(process.env).filter(k => k.startsWith('VERIFY') || k.startsWith('WHATSAPP') || k.startsWith('ANTHROPIC')));

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('Webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ── Incoming WhatsApp messages ────────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  // Acknowledge immediately so Meta doesn't retry
  res.sendStatus(200);

  try {
    const entry   = req.body?.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const message = changes?.messages?.[0];

    if (!message || message.type !== 'text') return;

    const from       = message.from;
    const text       = message.text.body.trim();
    const normalized = text.toLowerCase();

    console.log(`Message from ${from}: ${text}`);

    // ── Global reset ─────────────────────────────────────────────────────────
    if (normalized === '0' || normalized === 'menu') {
      userSessions.delete(from);
      await sendWhatsAppMessage(from, WELCOME_MENU);
      return;
    }

    const session = userSessions.get(from) ?? { step: 'language_select' };

    // ── Step 1: language selection ────────────────────────────────────────────
    if (session.step === 'language_select') {
      const chosen = LANG_CODES[text];
      if (!chosen) {
        await sendWhatsAppMessage(from, WELCOME_MENU);
        return;
      }
      userSessions.set(from, { lang: chosen, step: 'category_select' });
      await sendWhatsAppMessage(from, LANG_CONFIRMED[chosen]);
      const categoryMenu = await translateMenu(CATEGORY_MENU_EN, chosen);
      await sendWhatsAppMessage(from, categoryMenu);
      return;
    }

    const { lang } = session;

    // ── Step 2: category selection ────────────────────────────────────────────
    if (session.step === 'category_select') {
      // Category 13 → speak to a human
      if (text === '13') {
        conversations.push({
          timestamp:         new Date().toISOString(),
          phoneNumber:       from,
          languageSelected:  lang,
          originalMessage:   'User requested to speak to a human.',
          englishTranslation:'User requested to speak to a human.',
          triageLevel:       'HUMAN_REQUEST',
          replyLanguage:     lang,
          needsHumanReview:  true,
          escalationReason:  'USER_REQUESTED_HUMAN',
        });
        const humanMsg = await translateMenu(
          'Your request has been flagged. A healthcare worker will contact you on this number as soon as possible. If this is an emergency, please call 10177 immediately.',
          lang
        );
        await sendWhatsAppMessage(from, humanMsg);
        userSessions.set(from, { lang, step: 'post_triage' });
        const postPrompt = await translateMenu(POST_TRIAGE_PROMPT_EN, lang);
        await sendWhatsAppMessage(from, postPrompt);
        return;
      }

      // Category 12 → free text triage
      if (text === '12') {
        userSessions.set(from, { ...session, step: 'free_text' });
        const prompt = await translateMenu(
          'Please describe your symptoms and we will assess them for you. Type as much detail as you can.',
          lang
        );
        await sendWhatsAppMessage(from, prompt);
        return;
      }

      if (FOLLOWUP_EN[text]) {
        userSessions.set(from, { ...session, step: 'followup', category: text });
        const followup = await translateMenu(FOLLOWUP_EN[text], lang);
        await sendWhatsAppMessage(from, followup);
        return;
      }

      // Invalid input — re-send the category menu
      const categoryMenu = await translateMenu(CATEGORY_MENU_EN, lang);
      await sendWhatsAppMessage(from, categoryMenu);
      return;
    }

    // ── Step 3a: follow-up answer → direct triage ─────────────────────────────
    if (session.step === 'followup') {
      const { category } = session;
      const triageMap    = FOLLOWUP_TRIAGE[category];
      const answerIndex  = parseInt(text, 10) - 1;

      if (!triageMap || answerIndex < 0 || answerIndex >= triageMap.length) {
        // Invalid answer — re-send the follow-up question
        const followup = await translateMenu(FOLLOWUP_EN[category], lang);
        await sendWhatsAppMessage(from, followup);
        return;
      }

      const classification = triageMap[answerIndex];
      const englishSummary = `Category ${category}, option ${text} selected.`;
      const isCodeRed      = classification === 'RED';

      let reply = await buildReply(classification, lang);
      if (isCodeRed) {
        const alert = await translateMenu('A healthcare worker has been alerted and will follow up with you.', lang);
        reply += `\n\n${alert}`;
      }
      await sendWhatsAppMessage(from, reply);

      const logEntry = {
        timestamp:          new Date().toISOString(),
        phoneNumber:        from,
        languageSelected:   lang,
        originalMessage:    `Category ${category}, answer ${text}`,
        englishTranslation: englishSummary,
        triageLevel:        classification,
        replyLanguage:      lang,
        needsHumanReview:   isCodeRed,
        ...(isCodeRed && { escalationReason: 'CODE_RED_EMERGENCY' }),
      };
      conversations.push(logEntry);
      console.log(`Logged: ${from} | ${lang} | ${classification} | ${englishSummary}`);

      userSessions.set(from, { lang, step: 'post_triage' });
      const postPrompt = await translateMenu(POST_TRIAGE_PROMPT_EN, lang);
      await sendWhatsAppMessage(from, postPrompt);
      return;
    }

    // ── Step 3b: free text triage (category 12 / Other) ──────────────────────
    if (session.step === 'free_text') {
      const { classification, englishSummary, confidence } = await triageMessage(text);
      const isCodeRed     = classification === 'RED';
      const lowConfidence = confidence !== 'HIGH';
      const needsReview   = isCodeRed || lowConfidence;

      let reply = await buildReply(classification, lang);
      if (isCodeRed) {
        const alert = await translateMenu('A healthcare worker has been alerted and will follow up with you.', lang);
        reply += `\n\n${alert}`;
      } else if (lowConfidence) {
        const reviewNote = await translateMenu('Note: A healthcare worker will review your case for accuracy.', lang);
        reply += `\n\n${reviewNote}`;
      }
      await sendWhatsAppMessage(from, reply);

      const escalationReason = isCodeRed ? 'CODE_RED_EMERGENCY'
        : lowConfidence ? 'LOW_CONFIDENCE_TRIAGE' : undefined;

      const logEntry = {
        timestamp:          new Date().toISOString(),
        phoneNumber:        from,
        languageSelected:   lang,
        originalMessage:    text,
        englishTranslation: englishSummary,
        triageLevel:        classification,
        confidence,
        replyLanguage:      lang,
        needsHumanReview:   needsReview,
        ...(escalationReason && { escalationReason }),
      };
      conversations.push(logEntry);
      console.log(`Logged: ${from} | ${lang} | ${classification} | confidence:${confidence} | ${englishSummary}`);

      userSessions.set(from, { lang, step: 'post_triage' });
      const postPrompt = await translateMenu(POST_TRIAGE_PROMPT_EN, lang);
      await sendWhatsAppMessage(from, postPrompt);
      return;
    }

    // ── Step 4: post-triage prompt ────────────────────────────────────────────
    if (session.step === 'post_triage') {
      if (text === '1') {
        userSessions.set(from, { lang, step: 'category_select' });
        const categoryMenu = await translateMenu(CATEGORY_MENU_EN, lang);
        await sendWhatsAppMessage(from, categoryMenu);
      } else if (text === '2') {
        userSessions.set(from, { lang, step: 'category_select' });
        const closing = await translateMenu(CLOSING_MESSAGE_EN, lang);
        await sendWhatsAppMessage(from, closing);
      } else {
        // Invalid input — re-send the post-triage prompt
        const postPrompt = await translateMenu(POST_TRIAGE_PROMPT_EN, lang);
        await sendWhatsAppMessage(from, postPrompt);
      }
      return;
    }

  } catch (err) {
    console.error('Error handling webhook:', err.message);
  }
});

// ── Menu translation via Claude ───────────────────────────────────────────────
const LANG_NAMES_FULL = {
  en: 'English', zu: 'isiZulu', xh: 'isiXhosa', af: 'Afrikaans',
  nso: 'Sepedi', tn: 'Setswana', st: 'Sesotho', ts: 'Xitsonga',
  ss: 'siSwati', ve: 'Tshivenda', nr: 'isiNdebele',
};

async function translateMenu(englishText, lang) {
  if (lang === 'en') return englishText;
  const langName = LANG_NAMES_FULL[lang] ?? lang;
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      system: `Translate the following WhatsApp menu message into ${langName}.
Rules:
- Use simple, everyday spoken language — not formal or textbook language.
- Keep all numbers (1. 2. 3. etc.), emoji, and WhatsApp bold markers (*text*) exactly as they are.
- Keep emergency numbers unchanged (10177, 084 124).
- Do not add or remove any menu items.
- Output only the translated text with no explanation.`,
      messages: [{ role: 'user', content: englishText }],
    });
    for (const block of response.content) {
      if (block.type === 'text') return block.text.trim();
    }
    return englishText;
  } catch (err) {
    console.error(`translateMenu to ${langName} failed:`, err.message);
    return englishText; // fall back to English
  }
}

// ── Claude triage ─────────────────────────────────────────────────────────────
async function triageMessage(patientText) {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    thinking: { type: 'adaptive' },
    system: `You are a medical triage assistant for HealthBridge SA.
Classify the patient's message using the South African Triage Scale (SATS).
The message may be in any of South Africa's 11 official languages — understand it regardless of language.

LANGUAGE UNDERSTANDING:
- Recognise regional dialects and colloquial expressions across all 11 official languages.
  Examples: "ngiyaphathwa yikhanda" and "nginobuhlungu ekhanda" both mean headache in isiZulu.
- Understand code-switching (mixing English with indigenous languages), which is very common in SA.
  Examples: "Ngi-ne chest pain", "Ke na le flu", "I-stomach yami iyabuhlungu".
- Recognise township slang medical terms: "ipilisi" (pill), "ugogo/umkhulu" (elderly person),
  "isisu" (stomach/belly), "inyongo" (bile/nausea), "umkhuhlane" (flu/fever), "isifuba" (chest).
- Understand common SA medical shorthand and cross-language borrowings used in clinics and townships.
- When in doubt about meaning, interpret charitably toward the more serious classification.

RED    – Life-threatening emergency: cardiac arrest, severe breathing difficulty,
         uncontrolled bleeding, unconsciousness, stroke signs, major trauma, poisoning,
         or any immediate threat to life. Requires resuscitation immediately.

ORANGE – Very urgent, serious but not immediately life-threatening: moderate breathing
         difficulty, high fever with altered mental state, severe pain, fractures,
         head injury (conscious), active seizures, signs of shock.

YELLOW – Urgent, needs attention within 4 hours: high fever without altered mental
         state, moderate pain, lacerations needing sutures, vomiting or diarrhoea
         with mild dehydration, worsening chronic condition.

GREEN  – Non-urgent, minor complaint: mild cold or flu symptoms, minor wounds,
         general health questions, prescription refills, mild pain well-controlled.

BLUE   – Deceased or expected death / palliative care: patient is deceased,
         end-of-life, or in need of comfort care only with no curative intent.

Respond with a JSON object containing exactly three fields:
- "classification": one of "RED", "ORANGE", "YELLOW", "GREEN", or "BLUE"
- "english_summary": a concise English translation/summary (1-2 sentences) of what the patient described
- "confidence": your confidence in the classification — "HIGH", "MEDIUM", or "LOW"
  Use LOW when the message is ambiguous, very brief, or unclear.
  Use MEDIUM when you can classify but the symptoms could fit multiple levels.
  Use HIGH when the symptoms clearly match one level.

Output only valid JSON with no additional text, markdown, or code fences.
Example: {"classification":"YELLOW","english_summary":"Patient reports a headache and mild fever lasting 2 days.","confidence":"HIGH"}`,
    messages: [{ role: 'user', content: patientText }],
  });

  // Adaptive thinking produces thinking blocks before the text block — skip them
  const valid = new Set(['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE']);
  for (const block of response.content) {
    if (block.type !== 'text') continue;
    try {
      const parsed = JSON.parse(block.text.trim());
      const classification = String(parsed.classification ?? '').toUpperCase();
      const englishSummary = String(parsed.english_summary ?? patientText);
      const confidence     = ['HIGH', 'MEDIUM', 'LOW'].includes(String(parsed.confidence).toUpperCase())
        ? String(parsed.confidence).toUpperCase() : 'LOW';
      return {
        classification: valid.has(classification) ? classification : 'GREEN',
        englishSummary,
        confidence,
      };
    } catch {
      // JSON parse failed — fall through to default
      break;
    }
  }
  // Safety fallback: if Claude returned something unexpected, default to GREEN
  return { classification: 'GREEN', englishSummary: patientText, confidence: 'LOW' };
}

// ── Reply lookup ──────────────────────────────────────────────────────────────
// Returns the hardcoded English reply for a given classification.
function getEnglishReply(classification) {
  const level = TRIAGE_REPLIES[classification] ?? TRIAGE_REPLIES.GREEN;
  return level.en;
}

// Attempts to translate the English triage reply into the patient's language using Claude.
// Falls back to the hardcoded translation if the API call fails.
async function buildReply(classification, lang = 'en') {
  const hardcoded = (TRIAGE_REPLIES[classification] ?? TRIAGE_REPLIES.GREEN)[lang]
    ?? (TRIAGE_REPLIES[classification] ?? TRIAGE_REPLIES.GREEN).en;

  if (lang === 'en') return hardcoded;

  const langName = LANG_NAMES_FULL[lang] ?? lang;
  const englishReply = getEnglishReply(classification);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      system: `You are a medical translator for HealthBridge SA, a WhatsApp triage service serving South African patients.
Translate the given English triage message into ${langName}.

Translation guidelines:
- Use simple, clear everyday spoken language that a rural South African would understand — avoid formal or textbook phrasing.
- Use natural, warm, and respectful forms of address appropriate to ${langName} culture.
- Keep all emergency phone numbers exactly as they appear (10177, 084 124, 011 807 2586).
- Keep emoji codes (🔴 🟠 🟡 🟢 🔵) and WhatsApp bold markers (*text*) exactly as they appear.
- Do not add or remove information — translate faithfully.
- Output only the translated message with no explanation or extra text.`,
      messages: [{ role: 'user', content: englishReply }],
    });

    for (const block of response.content) {
      if (block.type === 'text') return block.text.trim();
    }
    return hardcoded;
  } catch (err) {
    console.error(`Translation to ${langName} failed, using hardcoded fallback:`, err.message);
    return hardcoded;
  }
}

// ── Send WhatsApp message ─────────────────────────────────────────────────────
async function sendWhatsAppMessage(to, text) {
  await axios.post(
    WHATSAPP_API_URL,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  ).catch(error => {
    console.log('WhatsApp API error:', error.response?.status, error.response?.data);
    throw error;
  });
  console.log(`Reply sent to ${to}`);
}

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`HealthBridge Triage Bot running on port ${PORT}`);
});
