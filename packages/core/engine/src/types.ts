// ─────────────────────────────────────────────────────────────────────────────
// types.ts — All TypeScript types for the Global Music AI Workflow Engine
// ─────────────────────────────────────────────────────────────────────────────

/** Unique identifier types */
export type WorkflowId = string;
export type NodeId = string;
export type EdgeId = string;
export type TenantId = string;
export type ExecutionId = string;

/** Status of a workflow execution */
export enum WorkflowStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
  TimedOut = 'timed_out',
}

/** Status of an individual node execution */
export enum NodeStatus {
  Pending = 'pending',
  Queued = 'queued',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Skipped = 'skipped',
  TimedOut = 'timed_out',
  Retrying = 'retrying',
}

/** Node categories supported by the engine */
export enum NodeCategory {
  CoreExecution = 'core_execution',
  Data = 'data',
  Transform = 'transform',
  AI = 'ai',
  Music = 'music',
  Rights = 'rights',
  Analytics = 'analytics',
  SRE = 'sre',
  Notification = 'notification',
  System = 'system',
}

/** Retry strategy for node execution */
export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

/** Default retry policy */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/** Timeout configuration */
export interface TimeoutConfig {
  nodeTimeoutMs: number;
  workflowTimeoutMs: number;
}

/** Default timeout configuration */
export const DEFAULT_TIMEOUT: TimeoutConfig = {
  nodeTimeoutMs: 60000,
  workflowTimeoutMs: 600000,
};

/** Definition of a workflow node */
export interface WorkflowNodeDefinition {
  id: NodeId;
  type: string;
  label?: string;
  config: Record<string, unknown>;
  retryPolicy?: RetryPolicy;
  timeoutMs?: number;
  condition?: string;
  metadata?: Record<string, unknown>;
}

/** Definition of a workflow edge (connection between nodes) */
export interface WorkflowEdgeDefinition {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  condition?: string;
  label?: string;
}

/** Complete workflow definition */
export interface WorkflowDefinition {
  id: WorkflowId;
  name: string;
  version: string;
  description?: string;
  nodes: WorkflowNodeDefinition[];
  edges: WorkflowEdgeDefinition[];
  retryPolicy?: RetryPolicy;
  timeoutConfig?: TimeoutConfig;
  metadata?: Record<string, unknown>;
  variables?: Record<string, unknown>;
}

/** Input/Output for a node handler */
export interface NodeInput {
  [key: string]: unknown;
}

export interface NodeOutput {
  [key: string]: unknown;
}

/** Node handler function signature */
export type NodeHandler = (
  input: NodeInput,
  context: ExecutionContext,
) => Promise<NodeOutput>;

/** Node registration record */
export interface NodeRegistration {
  type: string;
  category: NodeCategory;
  label: string;
  description: string;
  handler: NodeHandler;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

/** Result of a single node execution */
export interface NodeExecutionResult {
  nodeId: NodeId;
  status: NodeStatus;
  output?: NodeOutput;
  error?: Error;
  startTime: number;
  endTime: number;
  durationMs: number;
  retryCount: number;
  metrics: NodeMetrics;
}

/** Metrics collected per node */
export interface NodeMetrics {
  executionTimeMs: number;
  retryCount: number;
  memoryUsageMB?: number;
  inputSizeBytes?: number;
  outputSizeBytes?: number;
  custom?: Record<string, number>;
}

/** Result of a complete workflow execution */
export interface WorkflowExecutionResult {
  executionId: ExecutionId;
  workflowId: WorkflowId;
  status: WorkflowStatus;
  startTime: number;
  endTime: number;
  durationMs: number;
  nodeResults: Map<NodeId, NodeExecutionResult>;
  output?: Record<string, unknown>;
  error?: Error;
  metrics: WorkflowMetrics;
}

/** Aggregate workflow metrics */
export interface WorkflowMetrics {
  totalDurationMs: number;
  nodeCount: number;
  completedNodes: number;
  failedNodes: number;
  skippedNodes: number;
  parallelGroupsExecuted: number;
  totalRetries: number;
}

/** Execution context data (passed to handlers) */
export interface ExecutionContext {
  executionId: ExecutionId;
  workflowId: WorkflowId;
  tenantId: TenantId;
  variables: Record<string, unknown>;
  nodeOutputs: Map<NodeId, NodeOutput>;
  getVariable(name: string): unknown;
  setVariable(name: string, value: unknown): void;
  getNodeOutput(nodeId: NodeId): NodeOutput | undefined;
  logger: Logger;
}

/** Logger interface */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/** Event types emitted by the engine */
export enum EngineEventType {
  NodeStart = 'node:start',
  NodeComplete = 'node:complete',
  NodeFail = 'node:fail',
  NodeRetry = 'node:retry',
  WorkflowStart = 'workflow:start',
  WorkflowComplete = 'workflow:complete',
  WorkflowFail = 'workflow:fail',
  WorkflowCancel = 'workflow:cancel',
}

/** Event payload base */
export interface EngineEvent {
  type: EngineEventType;
  executionId: ExecutionId;
  workflowId: WorkflowId;
  tenantId: TenantId;
  timestamp: number;
}

export interface NodeStartEvent extends EngineEvent {
  type: EngineEventType.NodeStart;
  nodeId: NodeId;
  nodeType: string;
}

export interface NodeCompleteEvent extends EngineEvent {
  type: EngineEventType.NodeComplete;
  nodeId: NodeId;
  nodeType: string;
  output: NodeOutput;
  durationMs: number;
}

export interface NodeFailEvent extends EngineEvent {
  type: EngineEventType.NodeFail;
  nodeId: NodeId;
  nodeType: string;
  error: Error;
  retryCount: number;
  willRetry: boolean;
}

export interface NodeRetryEvent extends EngineEvent {
  type: EngineEventType.NodeRetry;
  nodeId: NodeId;
  nodeType: string;
  retryCount: number;
  delayMs: number;
  error: Error;
}

export interface WorkflowStartEvent extends EngineEvent {
  type: EngineEventType.WorkflowStart;
}

export interface WorkflowCompleteEvent extends EngineEvent {
  type: EngineEventType.WorkflowComplete;
  status: WorkflowStatus;
  durationMs: number;
  output?: Record<string, unknown>;
}

export interface WorkflowFailEvent extends EngineEvent {
  type: EngineEventType.WorkflowFail;
  error: Error;
}

export interface WorkflowCancelEvent extends EngineEvent {
  type: EngineEventType.WorkflowCancel;
}

export type AnyEngineEvent =
  | NodeStartEvent
  | NodeCompleteEvent
  | NodeFailEvent
  | NodeRetryEvent
  | WorkflowStartEvent
  | WorkflowCompleteEvent
  | WorkflowFailEvent
  | WorkflowCancelEvent;

/** Event listener signature */
export type EngineEventListener = (event: AnyEngineEvent) => void;

/** DAG representation */
export interface DAG {
  nodes: Map<NodeId, WorkflowNodeDefinition>;
  adjacencyList: Map<NodeId, Set<NodeId>>;
  inDegree: Map<NodeId, number>;
  roots: NodeId[];
  leaves: NodeId[];
}

/** Parallel execution group — nodes that can run concurrently */
export interface ParallelGroup {
  level: number;
  nodeIds: NodeId[];
}

/** Engine configuration */
export interface EngineConfig {
  maxConcurrentWorkflows: number;
  maxConcurrentNodes: number;
  defaultRetryPolicy: RetryPolicy;
  defaultTimeout: TimeoutConfig;
  enableMetrics: boolean;
  enableLogging: boolean;
}

/** Default engine configuration */
export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  maxConcurrentWorkflows: 100,
  maxConcurrentNodes: 50,
  defaultRetryPolicy: DEFAULT_RETRY_POLICY,
  defaultTimeout: DEFAULT_TIMEOUT,
  enableMetrics: true,
  enableLogging: true,
};
