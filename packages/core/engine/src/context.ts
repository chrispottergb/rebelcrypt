// ─────────────────────────────────────────────────────────────────────────────
// context.ts — Execution context with tenant isolation & variable scoping
// ─────────────────────────────────────────────────────────────────────────────

import {
  ExecutionContext,
  ExecutionId,
  WorkflowId,
  TenantId,
  NodeId,
  NodeOutput,
  Logger,
} from './types';

/**
 * Default logger implementation that writes to console with structured metadata.
 */
class DefaultLogger implements Logger {
  constructor(
    private readonly executionId: ExecutionId,
    private readonly tenantId: TenantId,
  ) {}

  private formatMeta(meta?: Record<string, unknown>): Record<string, unknown> {
    return {
      executionId: this.executionId,
      tenantId: this.tenantId,
      timestamp: Date.now(),
      ...meta,
    };
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.debug(JSON.stringify({ level: 'debug', message, ...this.formatMeta(meta) }));
  }

  info(message: string, meta?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.info(JSON.stringify({ level: 'info', message, ...this.formatMeta(meta) }));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(JSON.stringify({ level: 'warn', message, ...this.formatMeta(meta) }));
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(JSON.stringify({ level: 'error', message, ...this.formatMeta(meta) }));
  }
}

/**
 * WorkflowContext provides isolated execution context for each workflow run.
 *
 * Features:
 * - Tenant isolation: each context is scoped to a specific tenant
 * - Variable scoping: variables are isolated per context with parent chain lookup
 * - Node output tracking: stores outputs from completed nodes
 * - Parent/child chains: child contexts inherit from parent but maintain isolation
 */
export class WorkflowContext implements ExecutionContext {
  public readonly executionId: ExecutionId;
  public readonly workflowId: WorkflowId;
  public readonly tenantId: TenantId;
  public readonly variables: Record<string, unknown>;
  public readonly nodeOutputs: Map<NodeId, NodeOutput>;
  public readonly logger: Logger;

  private readonly parent: WorkflowContext | null;
  private readonly localVariables: Map<string, unknown>;
  private readonly createdAt: number;

  constructor(params: {
    executionId: ExecutionId;
    workflowId: WorkflowId;
    tenantId: TenantId;
    variables?: Record<string, unknown>;
    parent?: WorkflowContext;
    logger?: Logger;
  }) {
    this.executionId = params.executionId;
    this.workflowId = params.workflowId;
    this.tenantId = params.tenantId;
    this.parent = params.parent ?? null;
    this.nodeOutputs = new Map();
    this.localVariables = new Map();
    this.createdAt = Date.now();

    // Logger is either injected or created with tenant-scoped default
    this.logger = params.logger ?? new DefaultLogger(this.executionId, this.tenantId);

    // Build the variables proxy that delegates to localVariables + parent chain
    this.variables = new Proxy({} as Record<string, unknown>, {
      get: (_target, prop: string) => {
        return this.getVariable(prop);
      },
      set: (_target, prop: string, value: unknown) => {
        this.setVariable(prop, value);
        return true;
      },
      has: (_target, prop: string) => {
        return this.hasVariable(prop);
      },
      ownKeys: () => {
        return Array.from(this.getAllVariableKeys());
      },
      getOwnPropertyDescriptor: (_target, prop: string) => {
        if (this.hasVariable(prop)) {
          return { configurable: true, enumerable: true, value: this.getVariable(prop) };
        }
        return undefined;
      },
    });

    // Seed initial variables
    if (params.variables) {
      for (const [key, value] of Object.entries(params.variables)) {
        this.localVariables.set(key, value);
      }
    }
  }

  /**
   * Get a variable value. Looks up local scope first, then walks the parent chain.
   */
  getVariable(name: string): unknown {
    if (this.localVariables.has(name)) {
      return this.localVariables.get(name);
    }
    if (this.parent) {
      return this.parent.getVariable(name);
    }
    return undefined;
  }

  /**
   * Set a variable value in the local scope.
   * Does NOT propagate up the parent chain — child writes are isolated.
   */
  setVariable(name: string, value: unknown): void {
    this.localVariables.set(name, value);
  }

  /**
   * Check if a variable exists in the local scope or parent chain.
   */
  hasVariable(name: string): boolean {
    if (this.localVariables.has(name)) {
      return true;
    }
    if (this.parent) {
      return this.parent.hasVariable(name);
    }
    return false;
  }

  /**
   * Get the output of a completed node. Checks local context first, then parent.
   */
  getNodeOutput(nodeId: NodeId): NodeOutput | undefined {
    if (this.nodeOutputs.has(nodeId)) {
      return this.nodeOutputs.get(nodeId);
    }
    if (this.parent) {
      return this.parent.getNodeOutput(nodeId);
    }
    return undefined;
  }

  /**
   * Store the output of a completed node.
   */
  setNodeOutput(nodeId: NodeId, output: NodeOutput): void {
    this.nodeOutputs.set(nodeId, output);
  }

  /**
   * Create a child context that inherits from this context.
   * The child has its own variable scope and node outputs,
   * but can read from the parent chain.
   */
  createChildContext(overrides?: {
    executionId?: ExecutionId;
    variables?: Record<string, unknown>;
  }): WorkflowContext {
    return new WorkflowContext({
      executionId: overrides?.executionId ?? this.executionId,
      workflowId: this.workflowId,
      tenantId: this.tenantId,
      variables: overrides?.variables,
      parent: this,
      logger: this.logger,
    });
  }

  /**
   * Merge node outputs from a child context back into this context.
   * Used after parallel branch execution to consolidate results.
   */
  mergeChildOutputs(child: WorkflowContext): void {
    for (const [nodeId, output] of child.nodeOutputs) {
      this.nodeOutputs.set(nodeId, output);
    }
  }

  /**
   * Get all variable keys across the entire scope chain.
   */
  private getAllVariableKeys(): Set<string> {
    const keys = new Set<string>(this.localVariables.keys());
    if (this.parent) {
      for (const key of this.parent.getAllVariableKeys()) {
        keys.add(key);
      }
    }
    return keys;
  }

  /**
   * Snapshot the context state for debugging/serialization.
   */
  toSnapshot(): Record<string, unknown> {
    const vars: Record<string, unknown> = {};
    for (const key of this.getAllVariableKeys()) {
      vars[key] = this.getVariable(key);
    }

    const outputs: Record<string, unknown> = {};
    for (const [nodeId, output] of this.nodeOutputs) {
      outputs[nodeId] = output;
    }

    return {
      executionId: this.executionId,
      workflowId: this.workflowId,
      tenantId: this.tenantId,
      createdAt: this.createdAt,
      variables: vars,
      nodeOutputs: outputs,
      hasParent: this.parent !== null,
    };
  }
}
