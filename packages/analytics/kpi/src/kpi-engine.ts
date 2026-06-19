export interface KPIDefinition {
  id: string;
  name: string;
  description: string;
  unit: string;
  category: 'revenue' | 'engagement' | 'growth' | 'quality' | 'operational';
  calculation: string;
  target?: number;
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface KPIValue {
  kpiId: string;
  value: number;
  timestamp: Date;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  trend: 'up' | 'down' | 'flat';
  changePercent: number;
  status: 'healthy' | 'warning' | 'critical';
}

export class KPIEngine {
  private definitions: Map<string, KPIDefinition> = new Map();
  private history: Map<string, KPIValue[]> = new Map();

  constructor() {
    // Register default KPIs
    const defaults: KPIDefinition[] = [
      {
        id: 'streams_total',
        name: 'Total Streams',
        description: 'Total number of music streams across all platforms',
        unit: 'streams',
        category: 'engagement',
        calculation: 'SUM(streams)',
        target: 1000000,
        threshold: { warning: 800000, critical: 500000 },
      },
      {
        id: 'revenue_total',
        name: 'Total Revenue',
        description: 'Total revenue from all sources',
        unit: 'USD',
        category: 'revenue',
        calculation: 'SUM(revenue)',
        target: 100000,
        threshold: { warning: 80000, critical: 50000 },
      },
      {
        id: 'active_users',
        name: 'Active Users',
        description: 'Number of daily active users',
        unit: 'users',
        category: 'growth',
        calculation: 'COUNT(DISTINCT user_id) WHERE active = true',
        target: 50000,
        threshold: { warning: 40000, critical: 25000 },
      },
      {
        id: 'ai_generations',
        name: 'AI Generations',
        description: 'Number of AI-generated music pieces',
        unit: 'generations',
        category: 'engagement',
        calculation: 'COUNT(ai_generations)',
        target: 10000,
        threshold: { warning: 8000, critical: 5000 },
      },
      {
        id: 'track_quality_avg',
        name: 'Average Track Quality',
        description: 'Average quality score of tracks in the catalog',
        unit: 'score',
        category: 'quality',
        calculation: 'AVG(quality_score)',
        target: 0.85,
        threshold: { warning: 0.75, critical: 0.6 },
      },
      {
        id: 'api_latency_p99',
        name: 'API Latency P99',
        description: '99th percentile API response latency',
        unit: 'ms',
        category: 'operational',
        calculation: 'PERCENTILE(latency, 0.99)',
        target: 200,
        threshold: { warning: 500, critical: 1000 },
      },
      {
        id: 'error_rate',
        name: 'Error Rate',
        description: 'Percentage of requests resulting in errors',
        unit: '%',
        category: 'operational',
        calculation: 'COUNT(errors) / COUNT(requests) * 100',
        target: 0.1,
        threshold: { warning: 1, critical: 5 },
      },
      {
        id: 'catalog_size',
        name: 'Catalog Size',
        description: 'Total number of tracks in the catalog',
        unit: 'tracks',
        category: 'growth',
        calculation: 'COUNT(tracks)',
        target: 100000,
        threshold: { warning: 80000, critical: 50000 },
      },
      {
        id: 'territory_coverage',
        name: 'Territory Coverage',
        description: 'Percentage of target territories with active distribution',
        unit: '%',
        category: 'growth',
        calculation: 'COUNT(active_territories) / COUNT(target_territories) * 100',
        target: 95,
        threshold: { warning: 85, critical: 70 },
      },
      {
        id: 'royalty_accuracy',
        name: 'Royalty Accuracy',
        description: 'Percentage of royalty payments calculated correctly',
        unit: '%',
        category: 'quality',
        calculation: 'COUNT(correct_royalties) / COUNT(total_royalties) * 100',
        target: 99.9,
        threshold: { warning: 99, critical: 95 },
      },
    ];

    for (const def of defaults) {
      this.definitions.set(def.id, def);
      this.history.set(def.id, []);
    }
  }

  registerKPI(definition: KPIDefinition): void {
    this.definitions.set(definition.id, definition);
    if (!this.history.has(definition.id)) {
      this.history.set(definition.id, []);
    }
  }

  async computeKPI(kpiId: string): Promise<KPIValue> {
    const definition = this.definitions.get(kpiId);
    if (!definition) {
      throw new Error(`KPI not found: ${kpiId}`);
    }

    // Simulate computation -- in production this would execute the calculation query
    const history = this.history.get(kpiId) ?? [];
    const lastValue = history.length > 0 ? history[history.length - 1].value : 0;
    const variation = (Math.random() - 0.45) * lastValue * 0.1; // Slight upward bias
    const value = lastValue > 0 ? lastValue + variation : (definition.target ?? 100) * (0.8 + Math.random() * 0.4);

    return this.recordValue(kpiId, value);
  }

  recordValue(kpiId: string, value: number): KPIValue {
    const definition = this.definitions.get(kpiId);
    if (!definition) {
      throw new Error(`KPI not found: ${kpiId}`);
    }

    const history = this.history.get(kpiId) ?? [];
    const previousValue = history.length > 0 ? history[history.length - 1].value : value;
    const changePercent = previousValue !== 0 ? ((value - previousValue) / Math.abs(previousValue)) * 100 : 0;

    let trend: 'up' | 'down' | 'flat';
    if (Math.abs(changePercent) < 0.1) {
      trend = 'flat';
    } else if (changePercent > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (definition.threshold) {
      // For inverse KPIs (latency, error rate) higher is worse
      const isInverseKPI = ['api_latency_p99', 'error_rate'].includes(kpiId);

      if (isInverseKPI) {
        if (value >= definition.threshold.critical) {
          status = 'critical';
        } else if (value >= definition.threshold.warning) {
          status = 'warning';
        }
      } else {
        if (value <= definition.threshold.critical) {
          status = 'critical';
        } else if (value <= definition.threshold.warning) {
          status = 'warning';
        }
      }
    }

    const kpiValue: KPIValue = {
      kpiId,
      value,
      timestamp: new Date(),
      period: 'daily',
      trend,
      changePercent,
      status,
    };

    history.push(kpiValue);
    this.history.set(kpiId, history);

    return kpiValue;
  }

  getHistory(kpiId: string, period?: string, limit?: number): KPIValue[] {
    const definition = this.definitions.get(kpiId);
    if (!definition) {
      throw new Error(`KPI not found: ${kpiId}`);
    }

    let history = this.history.get(kpiId) ?? [];

    if (period) {
      history = history.filter((v) => v.period === period);
    }

    if (limit && limit > 0) {
      history = history.slice(-limit);
    }

    return history;
  }

  getDashboard(): { kpis: (KPIDefinition & { current?: KPIValue })[] } {
    const kpis: (KPIDefinition & { current?: KPIValue })[] = [];

    for (const [id, definition] of this.definitions) {
      const history = this.history.get(id) ?? [];
      const current = history.length > 0 ? history[history.length - 1] : undefined;

      kpis.push({
        ...definition,
        current,
      });
    }

    return { kpis };
  }

  getAlerts(): { kpiId: string; status: string; value: number; threshold: number }[] {
    const alerts: { kpiId: string; status: string; value: number; threshold: number }[] = [];

    for (const [id] of this.definitions) {
      const history = this.history.get(id) ?? [];
      if (history.length === 0) continue;

      const current = history[history.length - 1];
      const definition = this.definitions.get(id)!;

      if (current.status !== 'healthy' && definition.threshold) {
        const threshold =
          current.status === 'critical'
            ? definition.threshold.critical
            : definition.threshold.warning;

        alerts.push({
          kpiId: id,
          status: current.status,
          value: current.value,
          threshold,
        });
      }
    }

    return alerts;
  }
}
