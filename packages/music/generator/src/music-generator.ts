export interface MusicGenerationParams {
  prompt: string;
  genre?: string;
  bpm?: number;
  key?: string;
  durationSeconds?: number;
  style?: string;
  mood?: string;
  instruments?: string[];
  referenceTrackIds?: string[];
  temperature?: number;
}

export interface GeneratedTrack {
  id: string;
  audioUrl: string;
  waveform: number[];
  bpm: number;
  key: string;
  duration: number;
  genre: string;
  tags: string[];
  quality: number;
  createdAt: Date;
}

export interface GenerationJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  params: MusicGenerationParams;
  result?: GeneratedTrack;
  error?: string;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
}

const KEYS = [
  'C major', 'C minor', 'D major', 'D minor',
  'E major', 'E minor', 'F major', 'F minor',
  'G major', 'G minor', 'A major', 'A minor',
  'B major', 'B minor',
];

export class MusicGenerator {
  private jobs: Map<string, GenerationJob>;

  constructor() {
    this.jobs = new Map();
  }

  async generate(params: MusicGenerationParams): Promise<GenerationJob> {
    const jobId = `gen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const job: GenerationJob = {
      id: jobId,
      status: 'queued',
      params,
      progress: 0,
      startedAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Start async processing without awaiting
    this.processGeneration(job).catch((err) => {
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : String(err);
    });

    return job;
  }

  async getStatus(jobId: string): Promise<GenerationJob | undefined> {
    return this.jobs.get(jobId);
  }

  private async processGeneration(job: GenerationJob): Promise<void> {
    job.status = 'processing';

    // Simulate progress: 0 -> 25 -> 50 -> 75 -> 100
    const progressSteps = [25, 50, 75, 100];

    for (const step of progressSteps) {
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      job.progress = step;
    }

    const params = job.params;

    const bpm = params.bpm ?? Math.floor(Math.random() * 121) + 60; // 60-180
    const key = params.key ?? KEYS[Math.floor(Math.random() * KEYS.length)];
    const duration = params.durationSeconds ?? 30;
    const genre = params.genre ?? 'electronic';

    const waveform: number[] = [];
    for (let i = 0; i < 100; i++) {
      waveform.push(Math.random());
    }

    const quality = 0.5 + Math.random() * 0.5; // 0.5 - 1.0

    const tags: string[] = [genre];
    if (params.mood) tags.push(params.mood);
    if (params.style) tags.push(params.style);

    const track: GeneratedTrack = {
      id: `track_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      audioUrl: `https://cdn.music-ai.example/tracks/${job.id}.wav`,
      waveform,
      bpm,
      key,
      duration,
      genre,
      tags,
      quality: Math.round(quality * 1000) / 1000,
      createdAt: new Date(),
    };

    job.result = track;
    job.status = 'completed';
    job.completedAt = new Date();
  }

  async listJobs(filter?: { status?: string }): Promise<GenerationJob[]> {
    const allJobs = Array.from(this.jobs.values());

    if (filter?.status) {
      return allJobs.filter((job) => job.status === filter.status);
    }

    return allJobs;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);

    if (!job) {
      return false;
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    job.status = 'failed';
    job.error = 'Job cancelled by user';
    job.completedAt = new Date();

    return true;
  }
}
