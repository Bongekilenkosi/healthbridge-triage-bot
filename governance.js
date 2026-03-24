// ================================================================
// BIZUSIZO GOVERNANCE FRAMEWORK v1.0
// ================================================================
// Four-pillar monitoring adapted from Stanford Health Care's
// three-pillar strategy (System Integrity, Performance, Impact)
// with a fourth Incident Management layer for SA NHI compliance.
//
// Pillar 1: Real-Time Operational Escalation (System Integrity)
// Pillar 2: Clinical Performance Escalation (Accuracy & Safety)
// Pillar 3: Strategic Lifecycle Escalation (Governance Forums)
// Pillar 4: Severity-Based Incident Management
//
// Supabase tables required:
//   governance_metrics        — rolling performance counters
//   governance_incidents      — incident reports (L1–L4)
//   governance_audits         — monthly 40-conversation audit logs
//   governance_reviews        — 90-day / annual lifecycle reviews
//   governance_alerts         — alert history for all pillars
//   governance_baselines      — original validation values for PPV/sensitivity/concordance
// ================================================================

// ================================================================
// PILLAR 1: REAL-TIME OPERATIONAL ESCALATION (System Integrity)
// ================================================================
// Monitors: API uptime, inference errors, missing data features,
// WhatsApp delivery failures, Supabase connectivity.
// Failsafe: When AI is unreachable, the deterministic rules engine
// takes over RED classification to maintain critical safety.
// ================================================================

class SystemIntegrityMonitor {
  constructor(supabase, alertCallback) {
    this.supabase = supabase;
    this.alertCallback = alertCallback; // function(alert) — sends to engineering team

    // Rolling window counters (reset every WINDOW_MINUTES)
    this.WINDOW_MINUTES = 15;
    this.window = this._freshWindow();

    // Thresholds
    this.THRESHOLDS = {
      API_TIMEOUT_MS: 10000,              // 10s timeout for Anthropic API
      ERROR_RATE_SPIKE: 0.20,             // 20% increase triggers alert
      MIN_REQUESTS_FOR_RATE: 10,          // Need at least 10 requests to calculate rate
      CONSECUTIVE_FAILURES: 3,            // 3 consecutive API failures → failsafe mode
      WHATSAPP_DELIVERY_FAIL_RATE: 0.15,  // 15% delivery failure rate
      SUPABASE_LATENCY_MS: 5000,          // 5s DB query timeout
    };

    // State
    this.failsafeMode = false;
    this.consecutiveAPIFailures = 0;
    this.baselineErrorRate = 0.02; // 2% baseline — updated from governance_metrics

    // Start rolling window reset
    this._startWindowReset();
  }

  _freshWindow() {
    return {
      startedAt: new Date(),
      totalRequests: 0,
      apiCalls: 0,
      apiFailures: 0,
      apiTimeouts: 0,
      inferenceErrors: 0,
      missingFeatures: 0,
      whatsappSent: 0,
      whatsappFailed: 0,
      supabaseQueries: 0,
      supabaseFailures: 0,
      triageRequests: 0,
      triageFallbacks: 0, // times deterministic rules took over
    };
  }

  _startWindowReset() {
    setInterval(() => {
      this._flushWindow();
      this.window = this._freshWindow();
    }, this.WINDOW_MINUTES * 60 * 1000);
  }

  async _flushWindow() {
    // Persist window snapshot to governance_metrics for historical analysis
    const w = this.window;
    if (w.totalRequests === 0) return;

    try {
      await this.supabase.from('governance_metrics').insert({
        metric_type: 'system_integrity_window',
        window_start: w.startedAt,
        window_end: new Date(),
        data: {
          total_requests: w.totalRequests,
          api_calls: w.apiCalls,
          api_failures: w.apiFailures,
          api_timeouts: w.apiTimeouts,
          inference_errors: w.inferenceErrors,
          missing_features: w.missingFeatures,
          whatsapp_sent: w.whatsappSent,
          whatsapp_failed: w.whatsappFailed,
          supabase_queries: w.supabaseQueries,
          supabase_failures: w.supabaseFailures,
          triage_requests: w.triageRequests,
          triage_fallbacks: w.triageFallbacks,
          failsafe_active: this.failsafeMode,
          error_rate: w.apiCalls > 0 ? w.apiFailures / w.apiCalls : 0,
        },
        created_at: new Date()
      });
    } catch (e) {
      console.error('[GOV] Failed to flush integrity window:', e.message);
    }
  }

  // --- Recording methods (called from main application code) ---

  recordAPICall(success, latencyMs, error = null) {
    this.window.apiCalls++;
    this.window.totalRequests++;

    if (!success) {
      this.window.apiFailures++;
      this.consecutiveAPIFailures++;

      if (error?.code === 'ETIMEDOUT' || latencyMs > this.THRESHOLDS.API_TIMEOUT_MS) {
        this.window.apiTimeouts++;
      }

      // Check consecutive failure threshold → enter failsafe
      if (this.consecutiveAPIFailures >= this.THRESHOLDS.CONSECUTIVE_FAILURES && !this.failsafeMode) {
        this._enterFailsafe('consecutive_api_failures', `${this.consecutiveAPIFailures} consecutive API failures`);
      }
    } else {
      this.consecutiveAPIFailures = 0;

      // Exit failsafe if we get a successful call
      if (this.failsafeMode) {
        this._exitFailsafe();
      }
    }

    // Check error rate spike
    this._checkErrorRateSpike();
  }

  recordInferenceError(details) {
    this.window.inferenceErrors++;
    this.window.totalRequests++;

    // Inference error = AI returned unparseable/invalid response
    this._logAlert('inference_error', 'MEDIUM', `Inference error: ${details}`);
  }

  recordMissingFeature(featureName) {
    this.window.missingFeatures++;

    // Missing feature = expected data field absent from patient input
    // Alert if spike (>20% of requests in this window have missing features)
    if (this.window.totalRequests >= this.THRESHOLDS.MIN_REQUESTS_FOR_RATE) {
      const rate = this.window.missingFeatures / this.window.totalRequests;
      if (rate > this.THRESHOLDS.ERROR_RATE_SPIKE) {
        this._logAlert('missing_feature_spike', 'HIGH',
          `${(rate * 100).toFixed(1)}% of requests have missing data features (feature: ${featureName})`
        );
      }
    }
  }

  recordWhatsAppSend(success) {
    this.window.whatsappSent++;
    if (!success) {
      this.window.whatsappFailed++;
    }

    // Check delivery failure rate
    if (this.window.whatsappSent >= this.THRESHOLDS.MIN_REQUESTS_FOR_RATE) {
      const rate = this.window.whatsappFailed / this.window.whatsappSent;
      if (rate > this.THRESHOLDS.WHATSAPP_DELIVERY_FAIL_RATE) {
        this._logAlert('whatsapp_delivery_degraded', 'HIGH',
          `WhatsApp delivery failure rate: ${(rate * 100).toFixed(1)}%`
        );
      }
    }
  }

  recordSupabaseQuery(success, latencyMs) {
    this.window.supabaseQueries++;
    if (!success) {
      this.window.supabaseFailures++;
    }

    if (latencyMs > this.THRESHOLDS.SUPABASE_LATENCY_MS) {
      this._logAlert('supabase_slow', 'MEDIUM', `DB query took ${latencyMs}ms`);
    }
  }

  recordTriageRequest(usedAI) {
    this.window.triageRequests++;
    if (!usedAI) {
      this.window.triageFallbacks++;
    }
  }

  // --- Failsafe mode ---

  _enterFailsafe(reason, details) {
    this.failsafeMode = true;
    console.warn(`[GOV] ⚠️ FAILSAFE MODE ACTIVATED — ${reason}: ${details}`);
    this._logAlert('failsafe_activated', 'CRITICAL', `Failsafe engaged: ${details}`);
  }

  _exitFailsafe() {
    this.failsafeMode = false;
    console.log('[GOV] ✅ Failsafe mode deactivated — API connectivity restored');
    this._logAlert('failsafe_deactivated', 'INFO', 'API connectivity restored, AI triage resumed');
  }

  isFailsafeActive() {
    return this.failsafeMode;
  }

  _checkErrorRateSpike() {
    if (this.window.apiCalls < this.THRESHOLDS.MIN_REQUESTS_FOR_RATE) return;
    const currentRate = this.window.apiFailures / this.window.apiCalls;
    const spikeThreshold = this.baselineErrorRate + this.THRESHOLDS.ERROR_RATE_SPIKE;

    if (currentRate > spikeThreshold) {
      this._logAlert('error_rate_spike', 'HIGH',
        `API error rate ${(currentRate * 100).toFixed(1)}% exceeds baseline+20% threshold (${(spikeThreshold * 100).toFixed(1)}%)`
      );
    }
  }

  async _logAlert(type, severity, message) {
    try {
      const alert = {
        alert_type: type,
        severity,
        pillar: 'system_integrity',
        message,
        window_snapshot: { ...this.window },
        created_at: new Date(),
        resolved: false
      };

      await this.supabase.from('governance_alerts').insert(alert);

      // Callback for real-time notification (email, Slack, PagerDuty, etc.)
      if (this.alertCallback && ['HIGH', 'CRITICAL'].includes(severity)) {
        this.alertCallback(alert);
      }
    } catch (e) {
      console.error('[GOV] Failed to log alert:', e.message);
    }
  }

  // Status snapshot for dashboard
  getStatus() {
    const w = this.window;
    return {
      failsafe_active: this.failsafeMode,
      consecutive_api_failures: this.consecutiveAPIFailures,
      current_window: {
        started_at: w.startedAt,
        total_requests: w.totalRequests,
        api_error_rate: w.apiCalls > 0 ? (w.apiFailures / w.apiCalls * 100).toFixed(1) + '%' : 'N/A',
        whatsapp_fail_rate: w.whatsappSent > 0 ? (w.whatsappFailed / w.whatsappSent * 100).toFixed(1) + '%' : 'N/A',
        inference_errors: w.inferenceErrors,
        triage_fallbacks: w.triageFallbacks,
      }
    };
  }
}


// ================================================================
// DETERMINISTIC RED CLASSIFIER (AI-Independent Failsafe)
// ================================================================
// When the AI API is unreachable, this classifier ensures that
// life-threatening presentations are STILL identified and routed
// to emergency services. It uses keyword matching across all 11
// languages and returns RED or null (unable to classify → escalate).
// ================================================================

function deterministicRedClassifier(text) {
  const lower = (text || '').toLowerCase();

  // Pattern groups: each group has keywords across languages
  // If ANY pattern matches → RED
  const RED_PATTERNS = [
    // Cardiac / Chest emergency
    {
      rule: 'cardiac_emergency',
      patterns: [
        // English
        () => lower.includes('chest pain') && (lower.includes('breath') || lower.includes('arm') || lower.includes('jaw')),
        () => lower.includes('heart attack'),
        // isiZulu
        () => lower.includes('isifuba') && lower.includes('ukuphefumula'),
        () => lower.includes('inhliziyo') && lower.includes('buhlungu'),
        // isiXhosa
        () => lower.includes('isifuba') && lower.includes('ukuphefumla'),
        // Afrikaans
        () => lower.includes('borspyn') && lower.includes('asem'),
        () => lower.includes('hartaanval'),
        // Sesotho
        () => lower.includes('sefuba') && lower.includes('hema'),
        // Setswana
        () => lower.includes('sehuba') && lower.includes('hema'),
      ]
    },

    // Obstetric emergency
    {
      rule: 'obstetric_emergency',
      patterns: [
        () => lower.includes('pregnant') && lower.includes('bleeding'),
        () => lower.includes('khulelwe') && lower.includes('opha'),
        () => lower.includes('swanger') && lower.includes('bloei'),
        () => lower.includes('boima') && lower.includes('madi'),
        () => lower.includes('boimana') && lower.includes('madi'),
      ]
    },

    // Airway / Unconscious
    {
      rule: 'airway_emergency',
      patterns: [
        () => lower.includes('not breathing'),
        () => lower.includes('stopped breathing'),
        () => lower.includes('unconscious'),
        () => lower.includes('akaphefumuli'),
        () => lower.includes('uqulekile'),
        () => lower.includes('asem nie'),
        () => lower.includes('a heme'),
      ]
    },

    // Severe trauma
    {
      rule: 'trauma_emergency',
      patterns: [
        () => lower.includes('stab') && (lower.includes('wound') || lower.includes('chest') || lower.includes('stomach')),
        () => lower.includes('gunshot') || lower.includes('shot'),
        () => lower.includes('heavy bleeding') || lower.includes('won\'t stop bleeding'),
        () => lower.includes('igazi') && lower.includes('elingi'),
        () => lower.includes('hlabile') || lower.includes('dubule'),
      ]
    },

    // Envenomation
    {
      rule: 'envenomation',
      patterns: [
        () => lower.includes('snake') && lower.includes('bit'),
        () => lower.includes('snakebite'),
        () => lower.includes('inyoka') && lower.includes('lum'),
        () => lower.includes('slang') && lower.includes('byt'),
      ]
    },

    // Neonatal emergency
    {
      rule: 'neonatal_emergency',
      patterns: [
        () => lower.includes('baby') && lower.includes('not breathing'),
        () => lower.includes('newborn') && (lower.includes('blue') || lower.includes('limp')),
        () => lower.includes('ingane') && lower.includes('phefumul'),
        () => lower.includes('baba') && lower.includes('phefumul'),
      ]
    },

    // Stroke
    {
      rule: 'stroke_emergency',
      patterns: [
        () => lower.includes('stroke'),
        () => lower.includes('face droop') || (lower.includes('can\'t') && lower.includes('speak') && lower.includes('arm')),
        () => lower.includes('beroerte'),
      ]
    },

    // Seizure
    {
      rule: 'seizure_emergency',
      patterns: [
        () => lower.includes('seizure') && lower.includes('won\'t stop'),
        () => lower.includes('fitting') && (lower.includes('long') || lower.includes('won\'t stop')),
        () => lower.includes('isifo sokuwa') && lower.includes('khawu'),
      ]
    },

    // Severe allergic reaction
    {
      rule: 'anaphylaxis',
      patterns: [
        () => lower.includes('throat') && lower.includes('swelling') && lower.includes('breath'),
        () => lower.includes('anaphyla'),
        () => lower.includes('can\'t breathe') && lower.includes('swell'),
      ]
    },

    // Overdose / Poisoning
    {
      rule: 'poisoning',
      patterns: [
        () => lower.includes('overdose') || lower.includes('too many pills'),
        () => lower.includes('poison') && (lower.includes('drank') || lower.includes('swallowed') || lower.includes('ate')),
        () => lower.includes('paraffin') && (lower.includes('drank') || lower.includes('child')),
        () => lower.includes('bleach') && lower.includes('drank'),
      ]
    },
  ];

  for (const group of RED_PATTERNS) {
    for (const pattern of group.patterns) {
      try {
        if (pattern()) {
          return {
            triage_level: 'RED',
            confidence: 100,
            rule_override: `failsafe_${group.rule}`,
            failsafe: true
          };
        }
      } catch (e) {
        // Pattern evaluation error — skip
      }
    }
  }

  // Cannot classify deterministically → return null
  // Caller should escalate to human / show category menu
  return null;
}


// ================================================================
// PILLAR 2: CLINICAL PERFORMANCE ESCALATION (Accuracy & Safety)
// ================================================================
// Monitors: AI confidence scores, PPV, sensitivity, concordance
// against original validation baselines.
// Enforces: one-directional risk upgrades, confidence threshold,
// statistical acceptance bands.
// ================================================================

class ClinicalPerformanceMonitor {
  constructor(supabase, alertCallback) {
    this.supabase = supabase;
    this.alertCallback = alertCallback;

    // Thresholds
    this.CONFIDENCE_THRESHOLD = 75;
    this.ACCEPTANCE_BAND = { lower: 0.75, upper: 1.25 }; // 75-125% of baseline

    // Baselines (loaded from governance_baselines on init)
    this.baselines = {
      ppv: null,           // Positive Predictive Value per triage level
      sensitivity: null,   // Sensitivity per triage level
      concordance: null,   // Overall concordance with clinical review
    };

    // Rolling performance buffer (flushed periodically)
    this.BUFFER_SIZE = 100;
    this.performanceBuffer = [];

    // Risk factor registry for one-directional upgrades
    this.RISK_UPGRADE_FACTORS = [
      {
        name: 'pregnancy',
        detect: (text) => {
          const l = (text || '').toLowerCase();
          return l.includes('pregnant') || l.includes('khulelwe') ||
                 l.includes('swanger') || l.includes('boima') ||
                 l.includes('boimana') || l.includes('ṱhimana') ||
                 l.includes('pregnancy');
        },
        minLevel: 'YELLOW' // At minimum YELLOW for any pregnancy-related complaint
      },
      {
        name: 'child_under_5',
        detect: (text) => {
          const l = (text || '').toLowerCase();
          return (l.includes('baby') || l.includes('ingane') || l.includes('ngwana') ||
                  l.includes('ṅwana') || l.includes('baba') || l.includes('infant') ||
                  l.includes('toddler')) && !l.includes('sit');
        },
        minLevel: 'YELLOW'
      },
      {
        name: 'elderly',
        detect: (text, session) => {
          return session?.patientAge && session.patientAge >= 65;
        },
        minLevel: 'YELLOW'
      },
      {
        name: 'chronic_multimorbid',
        detect: (text, session) => {
          // Check both sources: chronicConditions (from universal screening)
          // and ccmddConditions (from CCMDD medication flow)
          const conditions = session?.chronicConditions || session?.ccmddConditions || [];
          return conditions.length >= 2;
        },
        minLevel: 'YELLOW'
      },
      {
        name: 'hiv_on_arvs',
        detect: (text, session) => {
          const l = (text || '').toLowerCase();
          const conditions = session?.chronicConditions || session?.ccmddConditions || [];
          const hasHIV = conditions.some(c => c.key === 'hiv');
          const mentionsHIV = l.includes('hiv') || l.includes('arv');
          return hasHIV || mentionsHIV;
        },
        minLevel: 'YELLOW'
      }
    ];

    this._loadBaselines();
  }

  async _loadBaselines() {
    try {
      const { data } = await this.supabase
        .from('governance_baselines')
        .select('*')
        .eq('active', true)
        .single();

      if (data) {
        this.baselines = data.values;
        console.log('[GOV] Clinical baselines loaded:', Object.keys(this.baselines));
      } else {
        console.warn('[GOV] No active baselines found — statistical monitoring disabled until baselines are set');
      }
    } catch (e) {
      console.error('[GOV] Failed to load baselines:', e.message);
    }
  }

  // --- Called after every triage ---

  evaluateTriageResult(triageResult, originalText, session) {
    const issues = [];
    let finalResult = { ...triageResult };

    // 1. Confidence threshold check
    if (triageResult.confidence < this.CONFIDENCE_THRESHOLD) {
      issues.push({
        type: 'low_confidence',
        severity: 'HIGH',
        detail: `AI confidence ${triageResult.confidence}% below threshold ${this.CONFIDENCE_THRESHOLD}%`,
        action: 'escalate_to_clinical_lead'
      });
    }

    // 2. One-directional risk upgrades
    const LEVEL_ORDER = { 'GREEN': 0, 'YELLOW': 1, 'ORANGE': 2, 'RED': 3 };

    for (const factor of this.RISK_UPGRADE_FACTORS) {
      if (factor.detect(originalText, session)) {
        const currentLevel = LEVEL_ORDER[finalResult.triage_level] || 0;
        const minLevel = LEVEL_ORDER[factor.minLevel] || 0;

        if (currentLevel < minLevel) {
          const previousLevel = finalResult.triage_level;
          finalResult.triage_level = factor.minLevel;
          finalResult.risk_upgrade = factor.name;

          issues.push({
            type: 'risk_upgrade',
            severity: 'INFO',
            detail: `Upgraded ${previousLevel} → ${factor.minLevel} due to risk factor: ${factor.name}`,
            action: 'logged'
          });
        }
      }
    }

    // 3. Buffer for statistical analysis
    this.performanceBuffer.push({
      timestamp: new Date(),
      original_level: triageResult.triage_level,
      final_level: finalResult.triage_level,
      confidence: triageResult.confidence,
      risk_upgrades: issues.filter(i => i.type === 'risk_upgrade').map(i => i.detail),
      text_length: (originalText || '').length,
      language: session?.language || 'en',
    });

    if (this.performanceBuffer.length >= this.BUFFER_SIZE) {
      this._flushPerformanceBuffer();
    }

    // 4. Log any high-severity issues
    for (const issue of issues) {
      if (['HIGH', 'CRITICAL'].includes(issue.severity)) {
        this._logClinicalAlert(issue);
      }
    }

    return { result: finalResult, issues };
  }

  // --- Statistical monitoring (called by audit agent) ---

  async runStatisticalCheck() {
    if (!this.baselines.ppv && !this.baselines.sensitivity && !this.baselines.concordance) {
      return { status: 'skipped', reason: 'no_baselines_configured' };
    }

    // Fetch recent audit results from governance_audits
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { data: audits } = await this.supabase
      .from('governance_audits')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .eq('audit_type', 'monthly_conversation_review');

    if (!audits || audits.length === 0) {
      return { status: 'skipped', reason: 'no_recent_audits' };
    }

    const deviations = [];

    // Calculate current metrics from audits
    const latestAudit = audits[audits.length - 1];
    const currentMetrics = latestAudit.computed_metrics || {};

    // Check PPV per triage level
    if (this.baselines.ppv && currentMetrics.ppv) {
      for (const level of ['RED', 'ORANGE', 'YELLOW', 'GREEN']) {
        const baseline = this.baselines.ppv[level];
        const current = currentMetrics.ppv[level];
        if (baseline && current !== undefined) {
          const ratio = current / baseline;
          if (ratio < this.ACCEPTANCE_BAND.lower || ratio > this.ACCEPTANCE_BAND.upper) {
            deviations.push({
              metric: `PPV_${level}`,
              baseline,
              current,
              ratio: ratio.toFixed(2),
              band: `${this.ACCEPTANCE_BAND.lower * 100}%-${this.ACCEPTANCE_BAND.upper * 100}%`
            });
          }
        }
      }
    }

    // Check sensitivity per triage level
    if (this.baselines.sensitivity && currentMetrics.sensitivity) {
      for (const level of ['RED', 'ORANGE', 'YELLOW', 'GREEN']) {
        const baseline = this.baselines.sensitivity[level];
        const current = currentMetrics.sensitivity[level];
        if (baseline && current !== undefined) {
          const ratio = current / baseline;
          if (ratio < this.ACCEPTANCE_BAND.lower || ratio > this.ACCEPTANCE_BAND.upper) {
            deviations.push({
              metric: `Sensitivity_${level}`,
              baseline,
              current,
              ratio: ratio.toFixed(2),
              band: `${this.ACCEPTANCE_BAND.lower * 100}%-${this.ACCEPTANCE_BAND.upper * 100}%`
            });
          }
        }
      }
    }

    // Check concordance
    if (this.baselines.concordance && currentMetrics.concordance !== undefined) {
      const ratio = currentMetrics.concordance / this.baselines.concordance;
      if (ratio < this.ACCEPTANCE_BAND.lower || ratio > this.ACCEPTANCE_BAND.upper) {
        deviations.push({
          metric: 'Concordance',
          baseline: this.baselines.concordance,
          current: currentMetrics.concordance,
          ratio: ratio.toFixed(2),
          band: `${this.ACCEPTANCE_BAND.lower * 100}%-${this.ACCEPTANCE_BAND.upper * 100}%`
        });
      }
    }

    if (deviations.length > 0) {
      this._logClinicalAlert({
        type: 'statistical_deviation',
        severity: 'HIGH',
        detail: `${deviations.length} metric(s) outside acceptance band`,
        deviations,
        action: 'escalate_to_clinical_governance_lead'
      });
    }

    return { status: 'completed', deviations, checked_at: new Date() };
  }

  async _flushPerformanceBuffer() {
    const snapshot = [...this.performanceBuffer];
    this.performanceBuffer = [];

    try {
      // Aggregate stats
      const total = snapshot.length;
      const byLevel = {};
      const avgConfidence = snapshot.reduce((s, r) => s + r.confidence, 0) / total;
      const riskUpgrades = snapshot.filter(r => r.risk_upgrades.length > 0).length;
      const lowConfidence = snapshot.filter(r => r.confidence < this.CONFIDENCE_THRESHOLD).length;

      for (const r of snapshot) {
        byLevel[r.final_level] = (byLevel[r.final_level] || 0) + 1;
      }

      await this.supabase.from('governance_metrics').insert({
        metric_type: 'clinical_performance_batch',
        data: {
          batch_size: total,
          distribution: byLevel,
          avg_confidence: Math.round(avgConfidence * 10) / 10,
          low_confidence_count: lowConfidence,
          low_confidence_rate: (lowConfidence / total * 100).toFixed(1) + '%',
          risk_upgrade_count: riskUpgrades,
          risk_upgrade_rate: (riskUpgrades / total * 100).toFixed(1) + '%',
        },
        created_at: new Date()
      });
    } catch (e) {
      console.error('[GOV] Failed to flush performance buffer:', e.message);
    }
  }

  async _logClinicalAlert(issue) {
    try {
      const alert = {
        alert_type: issue.type,
        severity: issue.severity,
        pillar: 'clinical_performance',
        message: issue.detail,
        data: issue,
        created_at: new Date(),
        resolved: false,
        assigned_to: 'clinical_governance_lead'
      };

      await this.supabase.from('governance_alerts').insert(alert);

      if (this.alertCallback && ['HIGH', 'CRITICAL'].includes(issue.severity)) {
        this.alertCallback(alert);
      }
    } catch (e) {
      console.error('[GOV] Failed to log clinical alert:', e.message);
    }
  }
}


// ================================================================
// PILLAR 3: STRATEGIC LIFECYCLE ESCALATION (Governance Forums)
// ================================================================
// Manages: 90-day post-deployment reviews, annual reviews,
// enrollment tracking, false negative monitoring,
// clinician feedback aggregation.
// ================================================================

class StrategicLifecycleMonitor {
  constructor(supabase, alertCallback) {
    this.supabase = supabase;
    this.alertCallback = alertCallback;

    // Review schedule
    this.REVIEW_SCHEDULE = {
      FIRST_REVIEW_DAYS: 90,
      ANNUAL_REVIEW_DAYS: 365,
    };

    // Decision triggers
    this.TRIGGERS = {
      MIN_MONTHLY_ENROLLMENT: parseInt(process.env.GOV_MIN_MONTHLY_ENROLLMENT || '50'),
      MAX_FALSE_NEGATIVE_RATE: 0.02,          // 2% false negative tolerance
      MAX_CLINICIAN_NOT_RELEVANT_RATE: 0.15,  // 15% "not relevant" feedback tolerance
      MIN_PATIENT_SATISFACTION: 3.5,           // Out of 5
    };
  }

  // --- Scheduled review check (run daily) ---

  async checkReviewSchedule() {
    try {
      // Get deployment date from governance_reviews or fallback to env
      const deploymentDate = process.env.GOV_DEPLOYMENT_DATE
        ? new Date(process.env.GOV_DEPLOYMENT_DATE)
        : null;

      if (!deploymentDate) return { status: 'skipped', reason: 'no_deployment_date' };

      const daysSinceDeployment = Math.floor((Date.now() - deploymentDate.getTime()) / (24 * 60 * 60 * 1000));

      // Check if 90-day review is due
      if (daysSinceDeployment >= this.REVIEW_SCHEDULE.FIRST_REVIEW_DAYS) {
        const { data: existing } = await this.supabase
          .from('governance_reviews')
          .select('id')
          .eq('review_type', '90_day')
          .limit(1);

        if (!existing || existing.length === 0) {
          await this._triggerReview('90_day', daysSinceDeployment);
        }
      }

      // Check annual reviews
      const annualReviewNumber = Math.floor(daysSinceDeployment / this.REVIEW_SCHEDULE.ANNUAL_REVIEW_DAYS);
      if (annualReviewNumber >= 1) {
        const { data: existing } = await this.supabase
          .from('governance_reviews')
          .select('id')
          .eq('review_type', 'annual')
          .eq('review_number', annualReviewNumber)
          .limit(1);

        if (!existing || existing.length === 0) {
          await this._triggerReview('annual', daysSinceDeployment, annualReviewNumber);
        }
      }

      return { status: 'checked', days_since_deployment: daysSinceDeployment };
    } catch (e) {
      console.error('[GOV] Review schedule check failed:', e.message);
      return { status: 'error', error: e.message };
    }
  }

  // --- Enrollment and engagement tracking ---

  async checkEnrollmentThresholds() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Count unique patients in last 30 days
      const { data: sessions } = await this.supabase
        .from('sessions')
        .select('patient_id')
        .gte('updated_at', thirtyDaysAgo.toISOString());

      const uniquePatients = sessions ? new Set(sessions.map(s => s.patient_id)).size : 0;

      if (uniquePatients < this.TRIGGERS.MIN_MONTHLY_ENROLLMENT) {
        await this._logStrategicAlert({
          type: 'enrollment_below_threshold',
          severity: 'MEDIUM',
          detail: `Monthly enrollment ${uniquePatients} below threshold ${this.TRIGGERS.MIN_MONTHLY_ENROLLMENT}`,
          data: { current: uniquePatients, threshold: this.TRIGGERS.MIN_MONTHLY_ENROLLMENT },
          action: 'escalate_to_governance_forum'
        });
      }

      return { unique_patients_30d: uniquePatients, threshold: this.TRIGGERS.MIN_MONTHLY_ENROLLMENT };
    } catch (e) {
      console.error('[GOV] Enrollment check failed:', e.message);
      return { status: 'error', error: e.message };
    }
  }

  // --- Clinician feedback aggregation ---

  async checkClinicianFeedback() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const { data: feedback } = await this.supabase
        .from('governance_audits')
        .select('clinician_feedback')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('clinician_feedback', 'is', null);

      if (!feedback || feedback.length === 0) return { status: 'no_feedback' };

      const total = feedback.length;
      const notRelevant = feedback.filter(f =>
        f.clinician_feedback === 'not_relevant' ||
        f.clinician_feedback?.rating === 'not_relevant'
      ).length;

      const notRelevantRate = notRelevant / total;

      if (notRelevantRate > this.TRIGGERS.MAX_CLINICIAN_NOT_RELEVANT_RATE) {
        await this._logStrategicAlert({
          type: 'clinician_feedback_degraded',
          severity: 'HIGH',
          detail: `"Not relevant" feedback rate ${(notRelevantRate * 100).toFixed(1)}% exceeds ${(this.TRIGGERS.MAX_CLINICIAN_NOT_RELEVANT_RATE * 100)}% threshold`,
          data: { total_feedback: total, not_relevant: notRelevant, rate: notRelevantRate },
          action: 'escalate_to_governance_forum'
        });
      }

      return { total_feedback: total, not_relevant: notRelevant, rate: (notRelevantRate * 100).toFixed(1) + '%' };
    } catch (e) {
      console.error('[GOV] Feedback check failed:', e.message);
      return { status: 'error', error: e.message };
    }
  }

  // --- False negative monitoring ---

  async checkFalseNegativeRate() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // False negatives: patient triaged GREEN/YELLOW but returned within 48h
      // with ORANGE/RED, or follow-up marked "worse"
      const { data: escalations } = await this.supabase
        .from('triage_logs')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('pathway', 'follow_up_escalation');

      const { data: totalTriages } = await this.supabase
        .from('triage_logs')
        .select('id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const total = totalTriages ? totalTriages.length : 0;
      const falseNeg = escalations ? escalations.length : 0;

      if (total > 0) {
        const rate = falseNeg / total;
        if (rate > this.TRIGGERS.MAX_FALSE_NEGATIVE_RATE) {
          await this._logStrategicAlert({
            type: 'false_negative_rate_high',
            severity: 'CRITICAL',
            detail: `False negative rate ${(rate * 100).toFixed(2)}% exceeds ${(this.TRIGGERS.MAX_FALSE_NEGATIVE_RATE * 100)}% tolerance — 0% under-triage target at risk`,
            data: { total_triages: total, false_negatives: falseNeg, rate },
            action: 'immediate_governance_review'
          });
        }
      }

      return { total_triages: total, false_negatives: falseNeg };
    } catch (e) {
      console.error('[GOV] False negative check failed:', e.message);
      return { status: 'error', error: e.message };
    }
  }

  async _triggerReview(type, daysSinceDeployment, reviewNumber = 1) {
    try {
      await this.supabase.from('governance_reviews').insert({
        review_type: type,
        review_number: reviewNumber,
        status: 'scheduled',
        scheduled_at: new Date(),
        days_since_deployment: daysSinceDeployment,
        created_at: new Date()
      });

      await this._logStrategicAlert({
        type: `${type}_review_due`,
        severity: 'HIGH',
        detail: `${type.replace('_', '-')} governance review is due (day ${daysSinceDeployment})`,
        action: 'schedule_governance_forum'
      });
    } catch (e) {
      console.error('[GOV] Failed to trigger review:', e.message);
    }
  }

  async _logStrategicAlert(issue) {
    try {
      const alert = {
        alert_type: issue.type,
        severity: issue.severity,
        pillar: 'strategic_lifecycle',
        message: issue.detail,
        data: issue.data || null,
        created_at: new Date(),
        resolved: false,
        assigned_to: issue.action === 'immediate_governance_review' ? 'governance_forum' : 'clinical_governance_lead'
      };

      await this.supabase.from('governance_alerts').insert(alert);

      if (this.alertCallback) {
        this.alertCallback(alert);
      }
    } catch (e) {
      console.error('[GOV] Failed to log strategic alert:', e.message);
    }
  }
}


// ================================================================
// PILLAR 4: SEVERITY-BASED INCIDENT MANAGEMENT
// ================================================================
// Incident classification: L1 (near miss) to L4 (serious harm/death)
// L3/L4 trigger immediate stop-work review.
// Monthly audit: 40 randomly selected conversations.
// Dataset drift detection via terminology analysis.
// ================================================================

class IncidentManager {
  constructor(supabase, alertCallback) {
    this.supabase = supabase;
    this.alertCallback = alertCallback;

    // Severity levels
    this.SEVERITY_LEVELS = {
      1: { name: 'Near Miss', description: 'Potential error caught before reaching patient', response_time: '7 days', stop_work: false },
      2: { name: 'Minor Harm', description: 'Error reached patient but caused no clinical harm', response_time: '72 hours', stop_work: false },
      3: { name: 'Moderate Harm', description: 'Error contributed to delayed or inappropriate care', response_time: 'Immediate', stop_work: true },
      4: { name: 'Serious Harm / Death', description: 'Error contributed to serious harm or death', response_time: 'Immediate', stop_work: true },
    };

    // Monthly audit config
    this.MONTHLY_AUDIT_SIZE = 40;
  }

  // --- Report an incident ---

  async reportIncident(report) {
    const {
      severity_level,          // 1-4
      reporter,                // who is reporting
      patient_id,              // affected patient (optional)
      conversation_id,         // relevant conversation
      description,             // what happened
      triage_level_given,      // what BIZUSIZO said
      triage_level_correct,    // what it should have been
      contributing_factors,    // e.g. ['language_misparse', 'low_confidence']
    } = report;

    const level = this.SEVERITY_LEVELS[severity_level];
    if (!level) throw new Error(`Invalid severity level: ${severity_level}`);

    try {
      const incident = {
        severity_level,
        severity_name: level.name,
        reporter,
        patient_id: patient_id || null,
        conversation_id: conversation_id || null,
        description,
        triage_level_given: triage_level_given || null,
        triage_level_correct: triage_level_correct || null,
        contributing_factors: contributing_factors || [],
        status: severity_level >= 3 ? 'stop_work_review' : 'open',
        response_deadline: new Date(Date.now() + this._responseTimeMs(severity_level)),
        created_at: new Date(),
        resolved_at: null,
        resolution: null,
        root_cause: null,
      };

      const { data } = await this.supabase
        .from('governance_incidents')
        .insert(incident)
        .select()
        .single();

      // L3/L4: immediate escalation
      if (severity_level >= 3) {
        await this._triggerStopWork(data || incident);
      }

      // Log alert
      await this._logIncidentAlert(incident);

      return { success: true, incident: data || incident };
    } catch (e) {
      console.error('[GOV] Failed to report incident:', e.message);
      return { success: false, error: e.message };
    }
  }

  async _triggerStopWork(incident) {
    console.error(`[GOV] 🛑 STOP-WORK TRIGGERED — Level ${incident.severity_level}: ${incident.description}`);

    const alert = {
      alert_type: `stop_work_level_${incident.severity_level}`,
      severity: 'CRITICAL',
      pillar: 'incident_management',
      message: `STOP-WORK: Level ${incident.severity_level} (${incident.severity_name}) incident reported. System may need rollback.`,
      data: {
        incident_id: incident.id,
        description: incident.description,
        triage_given: incident.triage_level_given,
        triage_correct: incident.triage_level_correct,
        action_required: 'Immediate review. Consider rollback to previous model version or transition to structured category menu.'
      },
      created_at: new Date(),
      resolved: false,
      assigned_to: 'governance_forum'
    };

    await this.supabase.from('governance_alerts').insert(alert);

    if (this.alertCallback) {
      this.alertCallback(alert);
    }
  }

  // --- Resolve an incident ---

  async resolveIncident(incidentId, resolution) {
    const {
      root_cause,
      corrective_action,
      resolved_by,
      model_rollback,       // boolean
      pathway_retired,      // boolean
      retrained,            // boolean
    } = resolution;

    try {
      await this.supabase
        .from('governance_incidents')
        .update({
          status: 'resolved',
          resolved_at: new Date(),
          root_cause,
          resolution: {
            corrective_action,
            resolved_by,
            model_rollback: model_rollback || false,
            pathway_retired: pathway_retired || false,
            retrained: retrained || false,
          }
        })
        .eq('id', incidentId);

      return { success: true };
    } catch (e) {
      console.error('[GOV] Failed to resolve incident:', e.message);
      return { success: false, error: e.message };
    }
  }

  // --- Monthly conversation audit ---

  async runMonthlyAudit() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get all triage logs from past 30 days
      const { data: logs } = await this.supabase
        .from('triage_logs')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (!logs || logs.length === 0) {
        return { status: 'skipped', reason: 'no_triage_logs' };
      }

      // Random sample of 40
      const sampleSize = Math.min(this.MONTHLY_AUDIT_SIZE, logs.length);
      const sample = this._randomSample(logs, sampleSize);

      // Create audit record
      const audit = {
        audit_type: 'monthly_conversation_review',
        audit_month: new Date().toISOString().slice(0, 7), // YYYY-MM
        sample_size: sampleSize,
        total_population: logs.length,
        conversations: sample.map(s => ({
          triage_log_id: s.id,
          patient_id: s.patient_id,
          triage_level: s.triage_level,
          confidence: s.confidence,
          symptoms: s.symptoms,
          pathway: s.pathway,
          escalation: s.escalation,
        })),
        status: 'pending_review',     // Needs clinical reviewer
        clinician_feedback: null,     // Filled by reviewer
        computed_metrics: null,       // Computed after review
        created_at: new Date()
      };

      const { data } = await this.supabase
        .from('governance_audits')
        .insert(audit)
        .select()
        .single();

      // Detect terminology drift
      const driftAnalysis = this._analyzeTerminologyDrift(logs);

      // Alert about new audit
      await this._logIncidentAlert({
        alert_type: 'monthly_audit_ready',
        severity_level: 0,
        description: `Monthly audit ready: ${sampleSize} conversations selected for clinical review. ${driftAnalysis.newTerms.length} potential new terms detected.`,
      });

      return {
        status: 'created',
        audit_id: data?.id,
        sample_size: sampleSize,
        drift_analysis: driftAnalysis
      };
    } catch (e) {
      console.error('[GOV] Monthly audit failed:', e.message);
      return { status: 'error', error: e.message };
    }
  }

  // --- Dataset drift detection ---

  _analyzeTerminologyDrift(logs) {
    // Extract all unique terms/phrases from symptom descriptions
    // Compare against known vocabulary to detect new colloquialisms
    const KNOWN_TERMS = new Set([
      // English
      'headache', 'fever', 'cough', 'chest pain', 'bleeding', 'vomiting',
      'diarrhea', 'breathing', 'pregnant', 'dizzy', 'rash', 'swelling',
      // Township / colloquial
      'sugar', 'high blood', 'sugar disease', 'running stomach',
      'hot body', 'paining', 'swollen', 'weak', 'tired',
      // isiZulu
      'ikhanda', 'isisu', 'imfiva', 'ukukhwehlela', 'isifuba',
      'ukuphefumula', 'ukuhlanza', 'ubuhlungu',
      // isiXhosa
      'intloko', 'isisu', 'ukugabha', 'ukukhohlela',
      // Afrikaans
      'hoofpyn', 'koors', 'borspyn', 'naar',
    ]);

    const allSymptoms = logs.map(l => l.symptoms || '').join(' ').toLowerCase();
    const words = allSymptoms.split(/\s+/).filter(w => w.length > 3);

    // Count word frequencies
    const freq = {};
    for (const w of words) {
      freq[w] = (freq[w] || 0) + 1;
    }

    // Find high-frequency terms not in known vocabulary
    const newTerms = Object.entries(freq)
      .filter(([word, count]) => count >= 5 && !KNOWN_TERMS.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ term: word, frequency: count }));

    return {
      totalUniqueTerms: Object.keys(freq).length,
      knownTermsMatched: Object.keys(freq).filter(w => KNOWN_TERMS.has(w)).length,
      newTerms,
      driftDetected: newTerms.length > 5,
      analysis_date: new Date(),
    };
  }

  _randomSample(array, n) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, n);
  }

  _responseTimeMs(level) {
    switch (level) {
      case 1: return 7 * 24 * 60 * 60 * 1000;   // 7 days
      case 2: return 72 * 60 * 60 * 1000;         // 72 hours
      case 3: return 4 * 60 * 60 * 1000;          // 4 hours
      case 4: return 1 * 60 * 60 * 1000;          // 1 hour
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  async _logIncidentAlert(incident) {
    try {
      const severity = incident.severity_level >= 3 ? 'CRITICAL'
        : incident.severity_level >= 2 ? 'HIGH'
        : incident.severity_level >= 1 ? 'MEDIUM' : 'INFO';

      const alert = {
        alert_type: incident.alert_type || `incident_level_${incident.severity_level}`,
        severity,
        pillar: 'incident_management',
        message: incident.description,
        created_at: new Date(),
        resolved: false,
        assigned_to: incident.severity_level >= 3 ? 'governance_forum' : 'clinical_governance_lead'
      };

      await this.supabase.from('governance_alerts').insert(alert);

      if (this.alertCallback && ['HIGH', 'CRITICAL'].includes(severity)) {
        this.alertCallback(alert);
      }
    } catch (e) {
      console.error('[GOV] Failed to log incident alert:', e.message);
    }
  }
}


// ================================================================
// GOVERNANCE ORCHESTRATOR — Ties all four pillars together
// ================================================================

class GovernanceOrchestrator {
  constructor(supabase, config = {}) {
    // Alert callback: override to send to Slack, email, PagerDuty, etc.
    const alertCallback = config.alertCallback || ((alert) => {
      console.log(`[GOV ALERT] [${alert.severity}] [${alert.pillar}] ${alert.message}`);
    });

    this.systemIntegrity = new SystemIntegrityMonitor(supabase, alertCallback);
    this.clinicalPerformance = new ClinicalPerformanceMonitor(supabase, alertCallback);
    this.strategicLifecycle = new StrategicLifecycleMonitor(supabase, alertCallback);
    this.incidentManager = new IncidentManager(supabase, alertCallback);
    this.supabase = supabase;

    // Schedule governance agents
    this._scheduleAgents();
  }

  _scheduleAgents() {
    // Statistical performance check: every 6 hours
    setInterval(() => this.clinicalPerformance.runStatisticalCheck(), 6 * 60 * 60 * 1000);

    // Strategic checks: daily
    setInterval(() => {
      this.strategicLifecycle.checkReviewSchedule();
      this.strategicLifecycle.checkEnrollmentThresholds();
      this.strategicLifecycle.checkClinicianFeedback();
      this.strategicLifecycle.checkFalseNegativeRate();
    }, 24 * 60 * 60 * 1000);

    // Monthly audit: run on 1st of each month (approximated by checking daily)
    setInterval(async () => {
      const today = new Date();
      if (today.getDate() === 1) {
        await this.incidentManager.runMonthlyAudit();
      }
    }, 24 * 60 * 60 * 1000);
  }

  // --- Main integration points used by index.js ---

  // Call this around the Anthropic API triage call
  async runTriageWithGovernance(text, lang, session, originalTriageFn, clinicalRulesFn) {
    let triage;
    let usedAI = true;

    // Pillar 1: Check if we're in failsafe mode
    if (this.systemIntegrity.isFailsafeActive()) {
      // AI unavailable — use deterministic classifier
      triage = deterministicRedClassifier(text);
      usedAI = false;

      if (!triage) {
        // Cannot classify deterministically — return a safe default
        // that will trigger escalation in the main flow
        triage = { triage_level: 'ORANGE', confidence: 30, failsafe: true, failsafe_unclassified: true };
      }
    } else {
      // Normal AI triage with monitoring
      const startTime = Date.now();
      try {
        triage = await originalTriageFn(text, lang);
        const latency = Date.now() - startTime;
        this.systemIntegrity.recordAPICall(true, latency);
      } catch (e) {
        const latency = Date.now() - startTime;
        this.systemIntegrity.recordAPICall(false, latency, e);

        // Fallback to deterministic
        triage = deterministicRedClassifier(text);
        usedAI = false;

        if (!triage) {
          triage = { triage_level: 'ORANGE', confidence: 30, failsafe: true, failsafe_unclassified: true };
        }
      }
    }

    // Record triage request
    this.systemIntegrity.recordTriageRequest(usedAI);

    // Apply clinical rules (existing)
    triage = clinicalRulesFn(text, triage);

    // Pillar 2: Clinical performance evaluation + risk upgrades
    const { result: finalTriage, issues } = this.clinicalPerformance.evaluateTriageResult(triage, text, session);

    return {
      triage: finalTriage,
      governance: {
        used_ai: usedAI,
        failsafe: !usedAI,
        issues,
        original_level: triage.triage_level,
        final_level: finalTriage.triage_level,
      }
    };
  }

  // Call this to wrap WhatsApp sends
  async sendWithMonitoring(sendFn, to, text) {
    try {
      await sendFn(to, text);
      this.systemIntegrity.recordWhatsAppSend(true);
    } catch (e) {
      this.systemIntegrity.recordWhatsAppSend(false);
      throw e; // Re-throw so caller can handle
    }
  }

  // Call this to wrap Supabase queries
  async queryWithMonitoring(queryFn) {
    const start = Date.now();
    try {
      const result = await queryFn();
      this.systemIntegrity.recordSupabaseQuery(true, Date.now() - start);
      return result;
    } catch (e) {
      this.systemIntegrity.recordSupabaseQuery(false, Date.now() - start);
      throw e;
    }
  }

  // Dashboard status for all pillars
  async getGovernanceStatus() {
    const [integrityStatus, recentAlerts, recentIncidents] = await Promise.all([
      this.systemIntegrity.getStatus(),
      this.supabase
        .from('governance_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(20),
      this.supabase
        .from('governance_incidents')
        .select('*')
        .neq('status', 'resolved')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    return {
      system_integrity: integrityStatus,
      open_alerts: recentAlerts?.data || [],
      open_incidents: recentIncidents?.data || [],
      timestamp: new Date(),
    };
  }
}


// ================================================================
// EXPORTS
// ================================================================

module.exports = {
  GovernanceOrchestrator,
  SystemIntegrityMonitor,
  ClinicalPerformanceMonitor,
  StrategicLifecycleMonitor,
  IncidentManager,
  deterministicRedClassifier,
};
