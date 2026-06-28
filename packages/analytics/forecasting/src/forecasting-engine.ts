export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface ForecastResult {
  predictions: TimeSeriesPoint[];
  confidence: number;
  model: string;
  metrics: {
    mae: number;
    rmse: number;
    mape: number;
  };
  upperBound: TimeSeriesPoint[];
  lowerBound: TimeSeriesPoint[];
}

export type ForecastModel = 'linear' | 'exponential' | 'arima' | 'prophet' | 'neural';

export class ForecastingEngine {
  async forecast(
    data: TimeSeriesPoint[],
    horizonDays: number,
    model: ForecastModel = 'linear',
  ): Promise<ForecastResult> {
    if (data.length < 2) {
      throw new Error('At least 2 data points are required for forecasting');
    }

    switch (model) {
      case 'linear':
        return this.linearForecast(data, horizonDays);
      case 'exponential':
        return this.exponentialForecast(data, horizonDays);
      case 'arima':
      case 'prophet':
      case 'neural':
        // Fall back to linear for unimplemented models
        return this.linearForecast(data, horizonDays);
      default:
        return this.linearForecast(data, horizonDays);
    }
  }

  private linearForecast(data: TimeSeriesPoint[], horizon: number): ForecastResult {
    const n = data.length;
    const xValues = data.map((_, i) => i);
    const yValues = data.map((p) => p.value);

    // Simple linear regression: y = mx + b
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate residuals for error metrics
    const residuals = yValues.map((y, i) => y - (slope * i + intercept));
    const mae = residuals.reduce((sum, r) => sum + Math.abs(r), 0) / n;
    const rmse = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / n);
    const mape =
      residuals.reduce((sum, r, i) => {
        return sum + (yValues[i] !== 0 ? Math.abs(r / yValues[i]) : 0);
      }, 0) /
      n *
      100;

    const stdDev = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / (n - 2 || 1));
    const lastTimestamp = data[data.length - 1].timestamp.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    const predictions: TimeSeriesPoint[] = [];
    const upperBound: TimeSeriesPoint[] = [];
    const lowerBound: TimeSeriesPoint[] = [];

    for (let d = 1; d <= horizon; d++) {
      const x = n - 1 + d;
      const predicted = slope * x + intercept;
      const timestamp = new Date(lastTimestamp + d * dayMs);
      const confidenceInterval = 1.96 * stdDev * Math.sqrt(1 + 1 / n + ((x - sumX / n) ** 2) / (sumX2 - (sumX ** 2) / n));

      predictions.push({ timestamp, value: predicted });
      upperBound.push({ timestamp, value: predicted + confidenceInterval });
      lowerBound.push({ timestamp, value: predicted - confidenceInterval });
    }

    // R-squared for confidence
    const yMean = sumY / n;
    const ssRes = residuals.reduce((sum, r) => sum + r * r, 0);
    const ssTot = yValues.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return {
      predictions,
      confidence: Math.max(0, Math.min(1, rSquared)),
      model: 'linear',
      metrics: { mae, rmse, mape },
      upperBound,
      lowerBound,
    };
  }

  private exponentialForecast(data: TimeSeriesPoint[], horizon: number): ForecastResult {
    const alpha = 0.3; // Smoothing factor
    const n = data.length;
    const values = data.map((p) => p.value);

    // Simple exponential smoothing
    const smoothed: number[] = [values[0]];
    for (let i = 1; i < n; i++) {
      smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1]);
    }

    // Calculate trend using double exponential smoothing
    const beta = 0.1;
    const level: number[] = [values[0]];
    const trend: number[] = [values.length > 1 ? values[1] - values[0] : 0];

    for (let i = 1; i < n; i++) {
      level.push(alpha * values[i] + (1 - alpha) * (level[i - 1] + trend[i - 1]));
      trend.push(beta * (level[i] - level[i - 1]) + (1 - beta) * trend[i - 1]);
    }

    // Error metrics
    const residuals = values.map((v, i) => v - smoothed[i]);
    const mae = residuals.reduce((sum, r) => sum + Math.abs(r), 0) / n;
    const rmse = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / n);
    const mape =
      residuals.reduce((sum, r, i) => {
        return sum + (values[i] !== 0 ? Math.abs(r / values[i]) : 0);
      }, 0) /
      n *
      100;

    const stdDev = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / (n - 1 || 1));
    const lastTimestamp = data[data.length - 1].timestamp.getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const lastLevel = level[level.length - 1];
    const lastTrend = trend[trend.length - 1];

    const predictions: TimeSeriesPoint[] = [];
    const upperBound: TimeSeriesPoint[] = [];
    const lowerBound: TimeSeriesPoint[] = [];

    for (let d = 1; d <= horizon; d++) {
      const predicted = lastLevel + lastTrend * d;
      const timestamp = new Date(lastTimestamp + d * dayMs);
      const ci = 1.96 * stdDev * Math.sqrt(d);

      predictions.push({ timestamp, value: predicted });
      upperBound.push({ timestamp, value: predicted + ci });
      lowerBound.push({ timestamp, value: predicted - ci });
    }

    return {
      predictions,
      confidence: Math.max(0, 1 - mae / (Math.abs(lastLevel) || 1)),
      model: 'exponential',
      metrics: { mae, rmse, mape },
      upperBound,
      lowerBound,
    };
  }

  detectSeasonality(
    data: TimeSeriesPoint[],
  ): { seasonal: boolean; period?: number; strength?: number } {
    if (data.length < 4) {
      return { seasonal: false };
    }

    const values = data.map((p) => p.value);
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const centered = values.map((v) => v - mean);

    // Autocorrelation for different lags
    let bestPeriod = 0;
    let bestCorrelation = 0;

    const maxLag = Math.floor(n / 2);
    const variance = centered.reduce((sum, v) => sum + v * v, 0);

    for (let lag = 2; lag <= maxLag; lag++) {
      let correlation = 0;
      for (let i = 0; i < n - lag; i++) {
        correlation += centered[i] * centered[i + lag];
      }
      correlation = variance > 0 ? correlation / variance : 0;

      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestPeriod = lag;
      }
    }

    const threshold = 0.3;
    if (bestCorrelation > threshold) {
      return {
        seasonal: true,
        period: bestPeriod,
        strength: bestCorrelation,
      };
    }

    return { seasonal: false };
  }

  detectTrend(
    data: TimeSeriesPoint[],
  ): { direction: 'up' | 'down' | 'flat'; slope: number; confidence: number } {
    if (data.length < 2) {
      return { direction: 'flat', slope: 0, confidence: 0 };
    }

    const n = data.length;
    const xValues = data.map((_, i) => i);
    const yValues = data.map((p) => p.value);

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // R-squared for confidence
    const yMean = sumY / n;
    const intercept = (sumY - slope * sumX) / n;
    const ssRes = yValues.reduce((sum, y, i) => sum + (y - (slope * i + intercept)) ** 2, 0);
    const ssTot = yValues.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    // Normalize slope relative to mean value
    const normalizedSlope = yMean !== 0 ? slope / Math.abs(yMean) : slope;
    const flatThreshold = 0.001;

    let direction: 'up' | 'down' | 'flat';
    if (Math.abs(normalizedSlope) < flatThreshold) {
      direction = 'flat';
    } else if (slope > 0) {
      direction = 'up';
    } else {
      direction = 'down';
    }

    return {
      direction,
      slope,
      confidence: Math.max(0, Math.min(1, rSquared)),
    };
  }

  detectAnomalies(
    data: TimeSeriesPoint[],
    sensitivity: number = 2.0,
  ): { timestamp: Date; value: number; expected: number; deviation: number }[] {
    if (data.length < 3) {
      return [];
    }

    const values = data.map((p) => p.value);
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n);

    if (stdDev === 0) {
      return [];
    }

    const anomalies: { timestamp: Date; value: number; expected: number; deviation: number }[] = [];

    for (let i = 0; i < n; i++) {
      const deviation = Math.abs(values[i] - mean) / stdDev;
      if (deviation > sensitivity) {
        anomalies.push({
          timestamp: data[i].timestamp,
          value: values[i],
          expected: mean,
          deviation,
        });
      }
    }

    return anomalies;
  }
}
