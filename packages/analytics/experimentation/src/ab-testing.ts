export interface Variant {
  id: string;
  name: string;
  weight: number;
  conversions: number;
  impressions: number;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: Variant[];
  targetMetric: string;
  startDate?: Date;
  endDate?: Date;
  sampleSize: number;
  currentSampleSize: number;
}

export interface ExperimentResult {
  experimentId: string;
  winner?: string;
  confidence: number;
  variants: {
    id: string;
    conversionRate: number;
    uplift: number;
    pValue: number;
  }[];
  significanceReached: boolean;
}

export class ABTestingEngine {
  private experiments: Map<string, Experiment> = new Map();
  private userAssignments: Map<string, Map<string, string>> = new Map();

  createExperiment(
    name: string,
    description: string,
    variants: Omit<Variant, 'conversions' | 'impressions'>[],
    targetMetric: string,
    sampleSize: number,
  ): Experiment {
    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const fullVariants: Variant[] = variants.map((v) => ({
      ...v,
      conversions: 0,
      impressions: 0,
    }));

    const experiment: Experiment = {
      id,
      name,
      description,
      status: 'draft',
      variants: fullVariants,
      targetMetric,
      sampleSize,
      currentSampleSize: 0,
    };

    this.experiments.set(id, experiment);
    this.userAssignments.set(id, new Map());
    return experiment;
  }

  startExperiment(experimentId: string): Experiment {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    if (experiment.status !== 'draft' && experiment.status !== 'paused') {
      throw new Error(`Experiment cannot be started from status: ${experiment.status}`);
    }

    experiment.status = 'running';
    experiment.startDate = experiment.startDate ?? new Date();
    return experiment;
  }

  assignVariant(experimentId: string, userId: string): string {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    if (experiment.status !== 'running') {
      throw new Error(`Experiment is not running: ${experimentId}`);
    }

    // Check for existing assignment
    const assignments = this.userAssignments.get(experimentId)!;
    const existing = assignments.get(userId);
    if (existing) {
      return existing;
    }

    // Weighted random assignment
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedVariant = experiment.variants[0];

    for (const variant of experiment.variants) {
      random -= variant.weight;
      if (random <= 0) {
        selectedVariant = variant;
        break;
      }
    }

    assignments.set(userId, selectedVariant.id);
    selectedVariant.impressions += 1;
    experiment.currentSampleSize += 1;

    return selectedVariant.id;
  }

  recordConversion(experimentId: string, variantId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const variant = experiment.variants.find((v) => v.id === variantId);
    if (!variant) {
      throw new Error(`Variant not found: ${variantId}`);
    }

    variant.conversions += 1;
  }

  recordImpression(experimentId: string, variantId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const variant = experiment.variants.find((v) => v.id === variantId);
    if (!variant) {
      throw new Error(`Variant not found: ${variantId}`);
    }

    variant.impressions += 1;
  }

  getResults(experimentId: string): ExperimentResult {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const variantResults = experiment.variants.map((variant) => {
      const conversionRate =
        variant.impressions > 0 ? variant.conversions / variant.impressions : 0;
      return {
        id: variant.id,
        conversionRate,
        impressions: variant.impressions,
        conversions: variant.conversions,
      };
    });

    // Use first variant as control for uplift calculation
    const controlRate = variantResults[0]?.conversionRate ?? 0;

    const resultsWithStats = variantResults.map((vr) => {
      const uplift = controlRate > 0 ? (vr.conversionRate - controlRate) / controlRate : 0;

      // Simplified z-test for statistical significance
      const pValue = this.calculatePValue(
        vr.conversions,
        vr.impressions,
        variantResults[0]?.conversions ?? 0,
        variantResults[0]?.impressions ?? 0,
      );

      return {
        id: vr.id,
        conversionRate: vr.conversionRate,
        uplift,
        pValue,
      };
    });

    // Determine winner (variant with highest conversion rate and p-value < 0.05)
    const significanceThreshold = 0.05;
    const significantVariants = resultsWithStats.filter(
      (v, i) => i > 0 && v.pValue < significanceThreshold && v.uplift > 0,
    );

    const winner =
      significantVariants.length > 0
        ? significantVariants.reduce((best, v) =>
            v.conversionRate > best.conversionRate ? v : best,
          ).id
        : undefined;

    const minPValue = Math.min(
      ...resultsWithStats.filter((_, i) => i > 0).map((v) => v.pValue),
      1,
    );

    return {
      experimentId,
      winner,
      confidence: 1 - minPValue,
      variants: resultsWithStats,
      significanceReached: minPValue < significanceThreshold,
    };
  }

  stopExperiment(experimentId: string): Experiment {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    experiment.status = 'completed';
    experiment.endDate = new Date();
    return experiment;
  }

  listExperiments(status?: string): Experiment[] {
    const experiments = Array.from(this.experiments.values());
    if (status) {
      return experiments.filter((e) => e.status === status);
    }
    return experiments;
  }

  private calculatePValue(
    conversionsA: number,
    impressionsA: number,
    conversionsB: number,
    impressionsB: number,
  ): number {
    if (impressionsA === 0 || impressionsB === 0) {
      return 1;
    }

    const pA = conversionsA / impressionsA;
    const pB = conversionsB / impressionsB;
    const pPooled = (conversionsA + conversionsB) / (impressionsA + impressionsB);

    if (pPooled === 0 || pPooled === 1) {
      return 1;
    }

    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / impressionsA + 1 / impressionsB));

    if (se === 0) {
      return 1;
    }

    const z = Math.abs(pA - pB) / se;

    // Approximate two-tailed p-value using normal distribution
    // Using the approximation: p = 2 * (1 - Phi(|z|))
    const pValue = 2 * (1 - this.normalCDF(z));
    return Math.min(1, Math.max(0, pValue));
  }

  private normalCDF(z: number): number {
    // Approximation of the cumulative normal distribution function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    const absZ = Math.abs(z) / Math.SQRT2;

    const t = 1.0 / (1.0 + p * absZ);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ);

    return 0.5 * (1.0 + sign * y);
  }
}
