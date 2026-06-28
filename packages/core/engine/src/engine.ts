import {
  WorkflowDefinition,
  WorkflowExecutionResult,
  WorkflowStatus,
  WorkflowMetrics,
  NodeStatus,
  NodeExecutionResult,
  EngineConfig,
  EngineEventType,
  EngineEventListener,
  AnyEngineEvent,
  DEFAULT_ENGINE_CONFIG,
  ExecutionId,
  TenantId,
  NodeId,
} from './types';
import { DAGBuilder } from './dag';
import { NodeExecutor } from './executor';
import { NodeRegistry, createDefaultRegistry } from './node-registry';
import { WorkflowContext } from './context';

export class WorkflowEngine {
  private readonly config: EngineConfig;
  private readonly registry: NodeRegistry;
  private readonly executor: NodeExecutor;
  private readonly listeners: Map<EngineEventType, Set<EngineEventListener>> = new Map();
  private activeExecutions = 0;

  constructor(config?: Partial<EngineConfig>, registry?: NodeRegistry) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.registry = registry ?? createDefaultRegistry();
    this.executor = new NodeExecutor(this.registry);
  }

  getRegistry(): NodeRegistry {
    return this.registry;
  }

  on(event: EngineEventType, listener: EngineEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  private emit(event: AnyEngineEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch {
          // listener errors must not crash the engine
        }
      }
    }
  }

  async execute(
    workflow: WorkflowDefinition,
    tenantId: TenantId,
    variables?: Record<string, unknown>,
  ): Promise<WorkflowExecutionResult> {
    if (this.activeExecutions >= this.config.maxConcurrentWorkflows) {
      throw new Error(
        `Max concurrent workflows (${this.config.maxConcurrentWorkflows}) exceeded`,
      );
    }

    const executionId: ExecutionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const startTime = Date.now();
    this.activeExecutions++;

    const context = new WorkflowContext({
      executionId,
      workflowId: workflow.id,
      tenantId,
      variables: { ...workflow.variables, ...variables },
    });

    this.emit({
      type: EngineEventType.WorkflowStart,
      executionId,
      workflowId: workflow.id,
      tenantId,
      timestamp: Date.now(),
    });

    try {
      const dag = DAGBuilder.build(workflow.nodes, workflow.edges);

      if (DAGBuilder.detectCycles(dag)) {
        throw new Error(`Cycle detected in workflow "${workflow.name}"`);
      }

      const executionOrder = DAGBuilder.getExecutionOrder(dag);
      const nodeResults = new Map<NodeId, NodeExecutionResult>();
      let completedNodes = 0;
      let failedNodes = 0;
      let skippedNodes = 0;
      let totalRetries = 0;

      for (const parallelGroup of executionOrder) {
        const groupPromises = parallelGroup.map(async (nodeId) => {
          const nodeDef = dag.nodes.get(nodeId);
          if (!nodeDef) {
            throw new Error(`Node ${nodeId} not found in DAG`);
          }

          if (nodeDef.condition) {
            const conditionMet = this.evaluateCondition(nodeDef.condition, context);
            if (!conditionMet) {
              const skipped: NodeExecutionResult = {
                nodeId,
                status: NodeStatus.Skipped,
                startTime: Date.now(),
                endTime: Date.now(),
                durationMs: 0,
                retryCount: 0,
                metrics: { executionTimeMs: 0, retryCount: 0 },
              };
              nodeResults.set(nodeId, skipped);
              skippedNodes++;
              return;
            }
          }

          this.emit({
            type: EngineEventType.NodeStart,
            executionId,
            workflowId: workflow.id,
            tenantId,
            timestamp: Date.now(),
            nodeId,
            nodeType: nodeDef.type,
          });

          const predecessorOutputs: Record<string, unknown> = {};
          const predecessors = this.getPredecessors(nodeId, workflow);
          for (const predId of predecessors) {
            const predResult = nodeResults.get(predId);
            if (predResult?.output) {
              Object.assign(predecessorOutputs, predResult.output);
            }
          }

          const result = await this.executor.execute(nodeDef, context, predecessorOutputs);
          nodeResults.set(nodeId, result);

          if (result.output) {
            context.setNodeOutput(nodeId, result.output);
          }

          totalRetries += result.retryCount;

          if (result.status === NodeStatus.Completed) {
            completedNodes++;
            this.emit({
              type: EngineEventType.NodeComplete,
              executionId,
              workflowId: workflow.id,
              tenantId,
              timestamp: Date.now(),
              nodeId,
              nodeType: nodeDef.type,
              output: result.output ?? {},
              durationMs: result.durationMs,
            });
          } else if (result.status === NodeStatus.Failed) {
            failedNodes++;
            this.emit({
              type: EngineEventType.NodeFail,
              executionId,
              workflowId: workflow.id,
              tenantId,
              timestamp: Date.now(),
              nodeId,
              nodeType: nodeDef.type,
              error: result.error ?? new Error('Unknown error'),
              retryCount: result.retryCount,
              willRetry: false,
            });
            throw result.error ?? new Error(`Node ${nodeId} failed`);
          }
        });

        await Promise.all(groupPromises);
      }

      const endTime = Date.now();
      this.activeExecutions--;

      const metrics: WorkflowMetrics = {
        totalDurationMs: endTime - startTime,
        nodeCount: workflow.nodes.length,
        completedNodes,
        failedNodes,
        skippedNodes,
        parallelGroupsExecuted: executionOrder.length,
        totalRetries,
      };

      const result: WorkflowExecutionResult = {
        executionId,
        workflowId: workflow.id,
        status: WorkflowStatus.Completed,
        startTime,
        endTime,
        durationMs: endTime - startTime,
        nodeResults,
        output: context.toSnapshot().nodeOutputs as Record<string, unknown>,
        metrics,
      };

      this.emit({
        type: EngineEventType.WorkflowComplete,
        executionId,
        workflowId: workflow.id,
        tenantId,
        timestamp: Date.now(),
        status: WorkflowStatus.Completed,
        durationMs: result.durationMs,
        output: result.output,
      });

      return result;
    } catch (error) {
      const endTime = Date.now();
      this.activeExecutions--;

      const err = error instanceof Error ? error : new Error(String(error));

      this.emit({
        type: EngineEventType.WorkflowFail,
        executionId,
        workflowId: workflow.id,
        tenantId,
        timestamp: Date.now(),
        error: err,
      });

      return {
        executionId,
        workflowId: workflow.id,
        status: WorkflowStatus.Failed,
        startTime,
        endTime,
        durationMs: endTime - startTime,
        nodeResults: new Map(),
        error: err,
        metrics: {
          totalDurationMs: endTime - startTime,
          nodeCount: workflow.nodes.length,
          completedNodes: 0,
          failedNodes: 1,
          skippedNodes: 0,
          parallelGroupsExecuted: 0,
          totalRetries: 0,
        },
      };
    }
  }

  private evaluateCondition(condition: string, context: WorkflowContext): boolean {
    try {
      const variables = context.toSnapshot().variables as Record<string, unknown>;
      const keys = Object.keys(variables);
      const values = Object.values(variables);
      const fn = new Function(...keys, `return Boolean(${condition})`);
      return fn(...values);
    } catch {
      return true;
    }
  }

  private getPredecessors(nodeId: NodeId, workflow: WorkflowDefinition): NodeId[] {
    return workflow.edges
      .filter((e) => e.target === nodeId)
      .map((e) => e.source);
  }
}
