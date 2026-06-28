export interface DataSource {
  id: string;
  type: 'database' | 'api' | 'file' | 'stream';
  config: Record<string, unknown>;
}

export interface TransformStep {
  name: string;
  type: 'map' | 'filter' | 'aggregate' | 'join' | 'deduplicate' | 'normalize';
  config: Record<string, unknown>;
}

export interface ETLJob {
  id: string;
  name: string;
  source: DataSource;
  transforms: TransformStep[];
  destination: DataSource;
  schedule?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastRun?: Date;
  nextRun?: Date;
  metrics: {
    rowsRead: number;
    rowsWritten: number;
    rowsFiltered: number;
    durationMs: number;
    errors: number;
  };
}

export class ETLPipeline {
  private jobs: Map<string, ETLJob> = new Map();

  createJob(
    name: string,
    source: DataSource,
    transforms: TransformStep[],
    destination: DataSource,
    schedule?: string,
  ): ETLJob {
    const id = `etl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const job: ETLJob = {
      id,
      name,
      source,
      transforms,
      destination,
      schedule,
      status: 'idle',
      metrics: {
        rowsRead: 0,
        rowsWritten: 0,
        rowsFiltered: 0,
        durationMs: 0,
        errors: 0,
      },
    };

    if (schedule) {
      job.nextRun = this.calculateNextRun(schedule);
    }

    this.jobs.set(id, job);
    return job;
  }

  async runJob(jobId: string): Promise<ETLJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status === 'running') {
      throw new Error(`Job is already running: ${jobId}`);
    }

    job.status = 'running';
    const startTime = Date.now();

    try {
      // Simulate ETL processing
      const rowsRead = Math.floor(Math.random() * 10000) + 100;
      let rowsAfterTransform = rowsRead;

      for (const transform of job.transforms) {
        switch (transform.type) {
          case 'filter':
            rowsAfterTransform = Math.floor(rowsAfterTransform * 0.7);
            break;
          case 'deduplicate':
            rowsAfterTransform = Math.floor(rowsAfterTransform * 0.9);
            break;
          case 'aggregate':
            rowsAfterTransform = Math.floor(rowsAfterTransform * 0.3);
            break;
          default:
            break;
        }
      }

      job.metrics = {
        rowsRead,
        rowsWritten: rowsAfterTransform,
        rowsFiltered: rowsRead - rowsAfterTransform,
        durationMs: Date.now() - startTime,
        errors: 0,
      };

      job.status = 'completed';
      job.lastRun = new Date();

      if (job.schedule) {
        job.nextRun = this.calculateNextRun(job.schedule);
      }
    } catch (error) {
      job.status = 'failed';
      job.metrics.durationMs = Date.now() - startTime;
      job.metrics.errors += 1;
      job.lastRun = new Date();
    }

    return job;
  }

  getJob(jobId: string): ETLJob | undefined {
    return this.jobs.get(jobId);
  }

  listJobs(filter?: { status?: string }): ETLJob[] {
    const jobs = Array.from(this.jobs.values());
    if (filter?.status) {
      return jobs.filter((job) => job.status === filter.status);
    }
    return jobs;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status !== 'running') {
      return false;
    }

    job.status = 'failed';
    job.metrics.errors += 1;
    return true;
  }

  getMetrics(): {
    totalJobs: number;
    activeJobs: number;
    totalRowsProcessed: number;
    avgDurationMs: number;
  } {
    const jobs = Array.from(this.jobs.values());
    const completedJobs = jobs.filter((j) => j.status === 'completed');
    const totalDuration = completedJobs.reduce((sum, j) => sum + j.metrics.durationMs, 0);

    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((j) => j.status === 'running').length,
      totalRowsProcessed: jobs.reduce((sum, j) => sum + j.metrics.rowsWritten, 0),
      avgDurationMs: completedJobs.length > 0 ? totalDuration / completedJobs.length : 0,
    };
  }

  private calculateNextRun(schedule: string): Date {
    const now = new Date();
    // Simple cron-like schedule parsing: supports 'hourly', 'daily', 'weekly'
    switch (schedule) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }
}
