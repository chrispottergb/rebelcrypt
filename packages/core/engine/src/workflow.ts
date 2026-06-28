import {
  WorkflowDefinition,
  WorkflowNodeDefinition,
  WorkflowEdgeDefinition,
  WorkflowId,
  NodeId,
  EdgeId,
  RetryPolicy,
  TimeoutConfig,
  DEFAULT_RETRY_POLICY,
  DEFAULT_TIMEOUT,
} from './types';

export class WorkflowBuilder {
  private id: WorkflowId;
  private name: string;
  private version = '1.0.0';
  private description?: string;
  private nodes: WorkflowNodeDefinition[] = [];
  private edges: WorkflowEdgeDefinition[] = [];
  private retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY;
  private timeoutConfig: TimeoutConfig = DEFAULT_TIMEOUT;
  private metadata: Record<string, unknown> = {};
  private variables: Record<string, unknown> = {};
  private edgeCounter = 0;

  constructor(id: WorkflowId, name: string) {
    this.id = id;
    this.name = name;
  }

  static create(id: WorkflowId, name: string): WorkflowBuilder {
    return new WorkflowBuilder(id, name);
  }

  setVersion(version: string): this {
    this.version = version;
    return this;
  }

  setDescription(description: string): this {
    this.description = description;
    return this;
  }

  setRetryPolicy(policy: Partial<RetryPolicy>): this {
    this.retryPolicy = { ...this.retryPolicy, ...policy };
    return this;
  }

  setTimeout(config: Partial<TimeoutConfig>): this {
    this.timeoutConfig = { ...this.timeoutConfig, ...config };
    return this;
  }

  setMetadata(metadata: Record<string, unknown>): this {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  setVariables(variables: Record<string, unknown>): this {
    this.variables = { ...this.variables, ...variables };
    return this;
  }

  addNode(
    id: NodeId,
    type: string,
    config: Record<string, unknown> = {},
    options?: {
      label?: string;
      retryPolicy?: RetryPolicy;
      timeoutMs?: number;
      condition?: string;
    },
  ): this {
    this.nodes.push({
      id,
      type,
      config,
      label: options?.label,
      retryPolicy: options?.retryPolicy,
      timeoutMs: options?.timeoutMs,
      condition: options?.condition,
    });
    return this;
  }

  connect(source: NodeId, target: NodeId, condition?: string): this {
    const edgeId: EdgeId = `e_${this.edgeCounter++}`;
    this.edges.push({ id: edgeId, source, target, condition });
    return this;
  }

  addStart(id: NodeId = 'start'): this {
    return this.addNode(id, 'start', {}, { label: 'Start' });
  }

  addEnd(id: NodeId = 'end'): this {
    return this.addNode(id, 'end', {}, { label: 'End' });
  }

  addChain(...nodes: Array<{ id: NodeId; type: string; config?: Record<string, unknown> }>): this {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      this.addNode(n.id, n.type, n.config ?? {});
      if (i > 0) {
        this.connect(nodes[i - 1].id, n.id);
      }
    }
    return this;
  }

  build(): WorkflowDefinition {
    if (this.nodes.length === 0) {
      throw new Error('Workflow must have at least one node');
    }

    return {
      id: this.id,
      name: this.name,
      version: this.version,
      description: this.description,
      nodes: [...this.nodes],
      edges: [...this.edges],
      retryPolicy: this.retryPolicy,
      timeoutConfig: this.timeoutConfig,
      metadata: this.metadata,
      variables: this.variables,
    };
  }
}
