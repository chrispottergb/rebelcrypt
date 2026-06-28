import {
  NodeCategory,
  NodeHandler,
  NodeInput,
  NodeOutput,
  NodeRegistration,
  ExecutionContext,
} from './types';

export class NodeRegistry {
  private nodes = new Map<string, NodeRegistration>();

  register(registration: NodeRegistration): void {
    if (this.nodes.has(registration.type)) {
      throw new Error(`Node type "${registration.type}" is already registered`);
    }
    this.nodes.set(registration.type, registration);
  }

  get(type: string): NodeRegistration | undefined {
    return this.nodes.get(type);
  }

  getOrThrow(type: string): NodeRegistration {
    const node = this.nodes.get(type);
    if (!node) throw new Error(`Unknown node type: "${type}"`);
    return node;
  }

  has(type: string): boolean {
    return this.nodes.has(type);
  }

  list(): NodeRegistration[] {
    return Array.from(this.nodes.values());
  }

  listByCategory(category: NodeCategory): NodeRegistration[] {
    return this.list().filter((n) => n.category === category);
  }

  get size(): number {
    return this.nodes.size;
  }
}

function makeHandler(
  fn: (input: NodeInput, ctx: ExecutionContext) => Promise<NodeOutput>,
): NodeHandler {
  return fn;
}

export function createDefaultRegistry(): NodeRegistry {
  const registry = new NodeRegistry();

  // ── Core Execution Nodes ──
  registry.register({
    type: 'start',
    category: NodeCategory.CoreExecution,
    label: 'Start',
    description: 'Entry point of a workflow',
    handler: makeHandler(async (input) => ({ ...input })),
  });
  registry.register({
    type: 'end',
    category: NodeCategory.CoreExecution,
    label: 'End',
    description: 'Terminal node of a workflow',
    handler: makeHandler(async (input) => ({ ...input })),
  });
  registry.register({
    type: 'branch',
    category: NodeCategory.CoreExecution,
    label: 'Branch',
    description: 'Conditional branch based on expression',
    handler: makeHandler(async (input) => {
      const condition = input['condition'] as string;
      const value = input['value'];
      return { branch: condition ? 'true' : 'false', value };
    }),
  });
  registry.register({
    type: 'merge',
    category: NodeCategory.CoreExecution,
    label: 'Merge',
    description: 'Merge multiple branches back together',
    handler: makeHandler(async (input) => ({ merged: true, ...input })),
  });
  registry.register({
    type: 'delay',
    category: NodeCategory.CoreExecution,
    label: 'Delay',
    description: 'Wait for a specified duration',
    handler: makeHandler(async (input) => {
      const ms = (input['delayMs'] as number) ?? 1000;
      await new Promise((r) => setTimeout(r, ms));
      return { delayed: true, delayMs: ms };
    }),
  });
  registry.register({
    type: 'loop',
    category: NodeCategory.CoreExecution,
    label: 'Loop',
    description: 'Iterate over a collection',
    handler: makeHandler(async (input) => {
      const items = (input['items'] as unknown[]) ?? [];
      return { items, count: items.length };
    }),
  });
  registry.register({
    type: 'foreach',
    category: NodeCategory.CoreExecution,
    label: 'ForEach',
    description: 'Execute a sub-workflow for each item',
    handler: makeHandler(async (input) => {
      const items = (input['items'] as unknown[]) ?? [];
      return { processed: items.length };
    }),
  });
  registry.register({
    type: 'noop',
    category: NodeCategory.CoreExecution,
    label: 'No-Op',
    description: 'Pass-through node',
    handler: makeHandler(async (input) => input),
  });

  // ── Data Nodes ──
  registry.register({
    type: 'storage_read',
    category: NodeCategory.Data,
    label: 'Storage Read',
    description: 'Read data from storage layer',
    handler: makeHandler(async (input) => ({
      data: null,
      table: input['table'],
      query: input['query'],
    })),
  });
  registry.register({
    type: 'storage_write',
    category: NodeCategory.Data,
    label: 'Storage Write',
    description: 'Write data to storage layer',
    handler: makeHandler(async (input) => ({
      written: true,
      table: input['table'],
      rowCount: 1,
    })),
  });
  registry.register({
    type: 'storage_update',
    category: NodeCategory.Data,
    label: 'Storage Update',
    description: 'Update records in storage',
    handler: makeHandler(async (input) => ({
      updated: true,
      table: input['table'],
    })),
  });
  registry.register({
    type: 'storage_delete',
    category: NodeCategory.Data,
    label: 'Storage Delete',
    description: 'Delete records from storage',
    handler: makeHandler(async (input) => ({
      deleted: true,
      table: input['table'],
    })),
  });
  registry.register({
    type: 'batch_read',
    category: NodeCategory.Data,
    label: 'Batch Read',
    description: 'Read multiple records in batch',
    handler: makeHandler(async (input) => ({
      data: [],
      batchSize: input['batchSize'] ?? 100,
    })),
  });
  registry.register({
    type: 'sql_query',
    category: NodeCategory.Data,
    label: 'SQL Query',
    description: 'Execute raw SQL query',
    handler: makeHandler(async (input) => ({
      rows: [],
      query: input['query'],
    })),
  });
  registry.register({
    type: 'vector_search',
    category: NodeCategory.Data,
    label: 'Vector Search',
    description: 'Similarity search across vector embeddings',
    handler: makeHandler(async (input) => ({
      results: [],
      query: input['query'],
      topK: input['topK'] ?? 10,
    })),
  });
  registry.register({
    type: 'cache_read',
    category: NodeCategory.Data,
    label: 'Cache Read',
    description: 'Read from Redis cache',
    handler: makeHandler(async (input) => ({
      value: null,
      key: input['key'],
      hit: false,
    })),
  });
  registry.register({
    type: 'cache_write',
    category: NodeCategory.Data,
    label: 'Cache Write',
    description: 'Write to Redis cache',
    handler: makeHandler(async (input) => ({
      written: true,
      key: input['key'],
    })),
  });

  // ── Transform Nodes ──
  registry.register({
    type: 'json_transform',
    category: NodeCategory.Transform,
    label: 'JSON Transform',
    description: 'Transform JSON data structure',
    handler: makeHandler(async (input) => ({
      transformed: input['data'],
    })),
  });
  registry.register({
    type: 'map_fields',
    category: NodeCategory.Transform,
    label: 'Map Fields',
    description: 'Map field names between schemas',
    handler: makeHandler(async (input) => ({
      mapped: true,
      data: input['data'],
    })),
  });
  registry.register({
    type: 'filter_items',
    category: NodeCategory.Transform,
    label: 'Filter Items',
    description: 'Filter collection by criteria',
    handler: makeHandler(async (input) => {
      const items = (input['items'] as unknown[]) ?? [];
      return { items, filtered: items.length };
    }),
  });
  registry.register({
    type: 'aggregate',
    category: NodeCategory.Transform,
    label: 'Aggregate',
    description: 'Aggregate data (sum, avg, count, etc.)',
    handler: makeHandler(async (input) => ({
      result: 0,
      operation: input['operation'],
    })),
  });
  registry.register({
    type: 'sort',
    category: NodeCategory.Transform,
    label: 'Sort',
    description: 'Sort a collection',
    handler: makeHandler(async (input) => ({
      sorted: input['items'],
    })),
  });
  registry.register({
    type: 'deduplicate',
    category: NodeCategory.Transform,
    label: 'Deduplicate',
    description: 'Remove duplicate entries',
    handler: makeHandler(async (input) => ({
      deduplicated: true,
      data: input['data'],
    })),
  });
  registry.register({
    type: 'enrich',
    category: NodeCategory.Transform,
    label: 'Enrich',
    description: 'Enrich data with additional context',
    handler: makeHandler(async (input) => ({
      enriched: true,
      data: input['data'],
    })),
  });

  // ── AI Nodes ──
  registry.register({
    type: 'llm_generate',
    category: NodeCategory.AI,
    label: 'LLM Generate',
    description: 'Generate text using LLM',
    handler: makeHandler(async (input) => ({
      text: '',
      model: input['model'] ?? 'default',
      prompt: input['prompt'],
      tokensUsed: 0,
    })),
  });
  registry.register({
    type: 'llm_summarize',
    category: NodeCategory.AI,
    label: 'LLM Summarize',
    description: 'Summarize text using LLM',
    handler: makeHandler(async (input) => ({
      summary: '',
      inputLength: String(input['text'] ?? '').length,
    })),
  });
  registry.register({
    type: 'llm_score',
    category: NodeCategory.AI,
    label: 'LLM Score',
    description: 'Score content using LLM evaluation',
    handler: makeHandler(async (input) => ({
      score: 0,
      criteria: input['criteria'],
    })),
  });
  registry.register({
    type: 'llm_classify',
    category: NodeCategory.AI,
    label: 'LLM Classify',
    description: 'Classify content using LLM',
    handler: makeHandler(async (input) => ({
      classification: '',
      confidence: 0,
      labels: input['labels'],
    })),
  });
  registry.register({
    type: 'llm_extract',
    category: NodeCategory.AI,
    label: 'LLM Extract',
    description: 'Extract structured data from text',
    handler: makeHandler(async (input) => ({
      extracted: {},
      schema: input['schema'],
    })),
  });
  registry.register({
    type: 'embedding_generate',
    category: NodeCategory.AI,
    label: 'Embedding Generate',
    description: 'Generate vector embedding from text or audio',
    handler: makeHandler(async (input) => ({
      embedding: [],
      dimensions: 1536,
      model: input['model'] ?? 'text-embedding-3-small',
    })),
  });
  registry.register({
    type: 'embedding_compare',
    category: NodeCategory.AI,
    label: 'Embedding Compare',
    description: 'Compute similarity between embeddings',
    handler: makeHandler(async (input) => ({
      similarity: 0,
      method: input['method'] ?? 'cosine',
    })),
  });

  // ── Music Nodes ──
  registry.register({
    type: 'music_generate',
    category: NodeCategory.Music,
    label: 'Music Generate',
    description: 'Generate music audio using AI',
    handler: makeHandler(async (input) => ({
      trackId: '',
      duration: input['durationMs'] ?? 30000,
      genre: input['genre'],
      mood: input['mood'],
      status: 'pending',
    })),
  });
  registry.register({
    type: 'music_to_embedding',
    category: NodeCategory.Music,
    label: 'Music to Embedding',
    description: 'Convert audio track to vector embedding',
    handler: makeHandler(async (input) => ({
      embedding: [],
      trackId: input['trackId'],
    })),
  });
  registry.register({
    type: 'bpm_estimator',
    category: NodeCategory.Music,
    label: 'BPM Estimator',
    description: 'Estimate tempo (BPM) from audio',
    handler: makeHandler(async (input) => ({
      bpm: 120,
      confidence: 0.95,
      trackId: input['trackId'],
    })),
  });
  registry.register({
    type: 'mood_classifier',
    category: NodeCategory.Music,
    label: 'Mood Classifier',
    description: 'Classify mood/emotion of a track',
    handler: makeHandler(async (input) => ({
      mood: 'neutral',
      moods: [],
      trackId: input['trackId'],
    })),
  });
  registry.register({
    type: 'key_detector',
    category: NodeCategory.Music,
    label: 'Key Detector',
    description: 'Detect musical key signature',
    handler: makeHandler(async (input) => ({
      key: 'C',
      mode: 'major',
      confidence: 0.9,
      trackId: input['trackId'],
    })),
  });
  registry.register({
    type: 'genre_classifier',
    category: NodeCategory.Music,
    label: 'Genre Classifier',
    description: 'Classify track genre using AI',
    handler: makeHandler(async (input) => ({
      genres: [],
      trackId: input['trackId'],
    })),
  });
  registry.register({
    type: 'stem_separator',
    category: NodeCategory.Music,
    label: 'Stem Separator',
    description: 'Separate audio into stems (vocals, drums, bass, other)',
    handler: makeHandler(async (input) => ({
      stems: { vocals: '', drums: '', bass: '', other: '' },
      trackId: input['trackId'],
    })),
  });
  registry.register({
    type: 'music_master',
    category: NodeCategory.Music,
    label: 'Music Master',
    description: 'Apply mastering to audio track',
    handler: makeHandler(async (input) => ({
      mastered: true,
      trackId: input['trackId'],
      loudnessLufs: -14,
    })),
  });

  // ── Rights Nodes ──
  registry.register({
    type: 'royalties_calculate',
    category: NodeCategory.Rights,
    label: 'Royalties Calculate',
    description: 'Calculate royalty payments',
    handler: makeHandler(async (input) => ({
      totalAmount: 0,
      splits: [],
      currency: input['currency'] ?? 'USD',
    })),
  });
  registry.register({
    type: 'rights_resolver',
    category: NodeCategory.Rights,
    label: 'Rights Resolver',
    description: 'Resolve rights ownership for a track',
    handler: makeHandler(async (input) => ({
      resolved: true,
      trackId: input['trackId'],
      owners: [],
    })),
  });
  registry.register({
    type: 'territory_checker',
    category: NodeCategory.Rights,
    label: 'Territory Checker',
    description: 'Check territory availability for content',
    handler: makeHandler(async (input) => ({
      available: true,
      territory: input['territory'],
      restrictions: [],
    })),
  });
  registry.register({
    type: 'license_validator',
    category: NodeCategory.Rights,
    label: 'License Validator',
    description: 'Validate license terms and conditions',
    handler: makeHandler(async (input) => ({
      valid: true,
      licenseType: input['licenseType'],
    })),
  });

  // ── Analytics Nodes ──
  registry.register({
    type: 'compute_kpi',
    category: NodeCategory.Analytics,
    label: 'Compute KPI',
    description: 'Calculate key performance indicator',
    handler: makeHandler(async (input) => ({
      value: 0,
      kpi: input['kpiName'],
      period: input['period'],
    })),
  });
  registry.register({
    type: 'forecast_metric',
    category: NodeCategory.Analytics,
    label: 'Forecast Metric',
    description: 'Generate forecast for a metric',
    handler: makeHandler(async (input) => ({
      forecast: [],
      metric: input['metric'],
      horizon: input['horizon'] ?? 30,
    })),
  });
  registry.register({
    type: 'experiment_assign',
    category: NodeCategory.Analytics,
    label: 'Experiment Assign',
    description: 'Assign user to experiment variant',
    handler: makeHandler(async (input) => ({
      variant: 'control',
      experimentId: input['experimentId'],
    })),
  });
  registry.register({
    type: 'cohort_segment',
    category: NodeCategory.Analytics,
    label: 'Cohort Segment',
    description: 'Segment users into cohorts',
    handler: makeHandler(async (input) => ({
      segments: [],
      criteria: input['criteria'],
    })),
  });
  registry.register({
    type: 'revenue_model',
    category: NodeCategory.Analytics,
    label: 'Revenue Model',
    description: 'Model revenue scenarios',
    handler: makeHandler(async (input) => ({
      projections: [],
      scenario: input['scenario'],
    })),
  });

  // ── SRE Nodes ──
  registry.register({
    type: 'health_probe',
    category: NodeCategory.SRE,
    label: 'Health Probe',
    description: 'Check system health endpoint',
    handler: makeHandler(async (input) => ({
      healthy: true,
      service: input['service'],
      latencyMs: 0,
    })),
  });
  registry.register({
    type: 'anomaly_detection',
    category: NodeCategory.SRE,
    label: 'Anomaly Detection',
    description: 'Detect anomalies in metrics',
    handler: makeHandler(async (input) => ({
      anomalies: [],
      metric: input['metric'],
    })),
  });
  registry.register({
    type: 'cost_estimator',
    category: NodeCategory.SRE,
    label: 'Cost Estimator',
    description: 'Estimate operational costs',
    handler: makeHandler(async (input) => ({
      estimatedCost: 0,
      currency: 'USD',
      period: input['period'],
    })),
  });
  registry.register({
    type: 'log_aggregator',
    category: NodeCategory.SRE,
    label: 'Log Aggregator',
    description: 'Aggregate and analyze logs',
    handler: makeHandler(async (input) => ({
      entries: [],
      level: input['level'] ?? 'error',
    })),
  });
  registry.register({
    type: 'incident_create',
    category: NodeCategory.SRE,
    label: 'Incident Create',
    description: 'Create incident record',
    handler: makeHandler(async (input) => ({
      incidentId: '',
      severity: input['severity'] ?? 'medium',
    })),
  });

  // ── Notification Nodes ──
  registry.register({
    type: 'email_notify',
    category: NodeCategory.Notification,
    label: 'Email Notify',
    description: 'Send email notification',
    handler: makeHandler(async (input) => ({
      sent: true,
      to: input['to'],
      subject: input['subject'],
    })),
  });
  registry.register({
    type: 'slack_notify',
    category: NodeCategory.Notification,
    label: 'Slack Notify',
    description: 'Send Slack message',
    handler: makeHandler(async (input) => ({
      sent: true,
      channel: input['channel'],
    })),
  });
  registry.register({
    type: 'webhook_notify',
    category: NodeCategory.Notification,
    label: 'Webhook Notify',
    description: 'Call external webhook',
    handler: makeHandler(async (input) => ({
      sent: true,
      url: input['url'],
      statusCode: 200,
    })),
  });
  registry.register({
    type: 'sms_notify',
    category: NodeCategory.Notification,
    label: 'SMS Notify',
    description: 'Send SMS notification',
    handler: makeHandler(async (input) => ({
      sent: true,
      to: input['to'],
    })),
  });

  // ── System Nodes ──
  registry.register({
    type: 'audit_log',
    category: NodeCategory.System,
    label: 'Audit Log',
    description: 'Record audit log entry',
    handler: makeHandler(async (input, ctx) => ({
      logged: true,
      action: input['action'],
      tenantId: ctx.tenantId,
    })),
  });
  registry.register({
    type: 'save_snapshot',
    category: NodeCategory.System,
    label: 'Save Snapshot',
    description: 'Save system state snapshot',
    handler: makeHandler(async (input) => ({
      snapshotId: '',
      type: input['type'],
    })),
  });
  registry.register({
    type: 'governance_record',
    category: NodeCategory.System,
    label: 'Governance Record',
    description: 'Create governance compliance record',
    handler: makeHandler(async (input) => ({
      recorded: true,
      policy: input['policy'],
    })),
  });
  registry.register({
    type: 'http_call',
    category: NodeCategory.System,
    label: 'HTTP Call',
    description: 'Make HTTP request to external service',
    handler: makeHandler(async (input) => ({
      statusCode: 200,
      body: null,
      url: input['url'],
      method: input['method'] ?? 'GET',
    })),
  });
  registry.register({
    type: 'model_selector',
    category: NodeCategory.System,
    label: 'Model Selector',
    description: 'Select optimal AI model for task',
    handler: makeHandler(async (input) => ({
      selectedModel: 'default',
      task: input['task'],
      criteria: input['criteria'],
    })),
  });
  registry.register({
    type: 'narrative_generate',
    category: NodeCategory.System,
    label: 'Narrative Generate',
    description: 'Generate executive narrative from data',
    handler: makeHandler(async (input) => ({
      narrative: '',
      dataPoints: input['dataPoints'],
    })),
  });
  registry.register({
    type: 'deck_generate',
    category: NodeCategory.System,
    label: 'Deck Generate',
    description: 'Generate presentation deck',
    handler: makeHandler(async (input) => ({
      deckUrl: '',
      format: input['format'] ?? 'pdf',
      slides: 0,
    })),
  });
  registry.register({
    type: 'risk_assess',
    category: NodeCategory.System,
    label: 'Risk Assess',
    description: 'Assess risk score for content or operation',
    handler: makeHandler(async (input) => ({
      riskScore: 0,
      level: 'low',
      factors: [],
      subject: input['subject'],
    })),
  });
  registry.register({
    type: 'compliance_check',
    category: NodeCategory.System,
    label: 'Compliance Check',
    description: 'Run compliance validation',
    handler: makeHandler(async (input) => ({
      compliant: true,
      violations: [],
      regulation: input['regulation'],
    })),
  });
  registry.register({
    type: 'cost_forecast',
    category: NodeCategory.System,
    label: 'Cost Forecast',
    description: 'Forecast infrastructure and operational costs',
    handler: makeHandler(async (input) => ({
      forecast: [],
      totalEstimated: 0,
      period: input['period'],
    })),
  });

  return registry;
}
