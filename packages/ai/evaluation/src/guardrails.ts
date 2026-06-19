import { GuardrailResult, SafetyScore } from './quality-evaluator';

export interface GuardrailRule {
  id: string;
  name: string;
  category: 'content' | 'copyright' | 'brand' | 'legal' | 'technical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  check: (input: Record<string, unknown>) => { pass: boolean; message: string };
}

export class GuardrailsEngine {
  private rules: GuardrailRule[] = [
    {
      id: 'explicit_content',
      name: 'Explicit Content Check',
      category: 'content',
      severity: 'medium',
      check: (input) => {
        const text = String(input['text'] ?? input['lyrics'] ?? '').toLowerCase();
        const explicit = ['explicit_word_placeholder'].some((w) => text.includes(w));
        return { pass: !explicit, message: explicit ? 'Explicit content detected' : 'Clean' };
      },
    },
    {
      id: 'duration_check',
      name: 'Minimum Duration',
      category: 'technical',
      severity: 'low',
      check: (input) => {
        const durationMs = Number(input['durationMs'] ?? 0);
        const pass = durationMs >= 15000;
        return { pass, message: pass ? 'Duration OK' : 'Track is too short (< 15s)' };
      },
    },
    {
      id: 'copyright_similarity',
      name: 'Copyright Similarity',
      category: 'copyright',
      severity: 'critical',
      check: (input) => {
        const similarity = Number(input['copyrightSimilarity'] ?? 0);
        const pass = similarity < 0.85;
        return { pass, message: pass ? 'No copyright issues' : 'High similarity to copyrighted work' };
      },
    },
    {
      id: 'brand_safety',
      name: 'Brand Safety',
      category: 'brand',
      severity: 'high',
      check: (input) => {
        const score = Number(input['brandSafetyScore'] ?? 100);
        const pass = score >= 60;
        return { pass, message: pass ? 'Brand safe' : 'Brand safety concerns' };
      },
    },
    {
      id: 'territory_compliance',
      name: 'Territory Compliance',
      category: 'legal',
      severity: 'high',
      check: (input) => {
        const restricted = input['restrictedTerritories'] as string[] | undefined;
        const target = input['targetTerritory'] as string | undefined;
        if (!restricted || !target) return { pass: true, message: 'No territory restrictions' };
        const pass = !restricted.includes(target);
        return { pass, message: pass ? 'Territory compliant' : `Restricted in ${target}` };
      },
    },
  ];

  runAll(input: Record<string, unknown>): GuardrailResult {
    const flags: string[] = [];
    let worstSeverity: GuardrailResult['severity'] = 'low';
    let totalScore = 100;

    const severityRank = { low: 1, medium: 2, high: 3, critical: 4 };

    for (const rule of this.rules) {
      const result = rule.check(input);
      if (!result.pass) {
        flags.push(`[${rule.severity.toUpperCase()}] ${rule.name}: ${result.message}`);
        if (severityRank[rule.severity] > severityRank[worstSeverity]) {
          worstSeverity = rule.severity;
        }
        totalScore -= rule.severity === 'critical' ? 40 : rule.severity === 'high' ? 25 : rule.severity === 'medium' ? 15 : 5;
      }
    }

    return {
      pass: flags.length === 0,
      score: Math.max(0, totalScore),
      flags,
      severity: flags.length > 0 ? worstSeverity : 'low',
      details: { rulesChecked: this.rules.length, rulesFailed: flags.length },
    };
  }

  addRule(rule: GuardrailRule): void {
    this.rules.push(rule);
  }

  computeSafetyScore(input: Record<string, unknown>): SafetyScore {
    return {
      overall: Number(input['overallSafety'] ?? 85),
      explicit: Number(input['explicitScore'] ?? 95),
      violence: Number(input['violenceScore'] ?? 98),
      hateSpeech: Number(input['hateSpeechScore'] ?? 99),
      copyright: Number(input['copyrightScore'] ?? 80),
      drugReferences: Number(input['drugScore'] ?? 90),
    };
  }
}
