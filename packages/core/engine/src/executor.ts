import {
  NodeExecutionResult,
  NodeStatus,
  NodeMetrics,
  WorkflowNodeDefinition,
  RetryPolicy,
  DEFAULT_RETRY_POLICY,
  ExecutionContext,
} from './types';
import { NodeRegistry } from './node-registry';

export class NodeExecutor {
  constructor(private readonly registry: NodeRegistry) {}

  async execute(
    node: WorkflowNodeDefinition,
    context: ExecutionContext,
    inputData: Record<string, unknown> = {},
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const retryPolicy = node.retryPolicy ?? DEFAULT_RETRY_POLICY;
    const timeoutMs = node.timeoutMs ?? 60000;
    let retryCount = 0;
    let lastError: Error | undefined;

    while (retryCount <= retryPolicy.maxRetries) {
      try {
        const registration = this.registry.getOrThrow(node.type);

        context.logger.info(`Executing node ${node.id} (${node.type})`, {
          nodeId: node.id,
          attempt: retryCount + 1,
        });

        const output = await this.executeWithTimeout(
          () => registration.handler({ ...node.config, ...inputData }, context),
          timeoutMs,
          node.id,
        );

        const endTime = Date.now();
        return {
          nodeId: node.id,
          status: NodeStatus.Completed,
          output,
          startTime,
          endTime,
          durationMs: endTime - startTime,
          retryCount,
          metrics: this.buildMetrics(startTime, endTime, retryCount, output),
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (retryCount < retryPolicy.maxRetries && this.isRetryable(lastError, retryPolicy)) {
          const delay = this.calculateDelay(retryCount, retryPolicy);
          context.logger.warn(`Node ${node.id} failed, retrying in ${delay}ms`, {
            nodeId: node.id,
            attempt: retryCount + 1,
            error: lastError.message,
          });
          await this.sleep(delay);
          retryCount++;
        } else {
          break;
        }
      }
    }

    const endTime = Date.now();
    context.logger.error(`Node ${node.id} failed permanently`, {
      nodeId: node.id,
      error: lastError?.message,
      retries: retryCount,
    });

    return {
      nodeId: node.id,
      status: NodeStatus.Failed,
      error: lastError,
      startTime,
      endTime,
      durationMs: endTime - startTime,
      retryCount,
      metrics: this.buildMetrics(startTime, endTime, retryCount),
    };
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    nodeId: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Node ${nodeId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private isRetryable(error: Error, policy: RetryPolicy): boolean {
    if (!policy.retryableErrors || policy.retryableErrors.length === 0) {
      return true;
    }
    return policy.retryableErrors.some(
      (pattern) =>
        error.message.includes(pattern) || error.constructor.name === pattern,
    );
  }

  private calculateDelay(retryCount: number, policy: RetryPolicy): number {
    const delay = Math.min(
      policy.initialDelayMs * Math.pow(policy.backoffMultiplier, retryCount),
      policy.maxDelayMs,
    );
    const jitter = delay * 0.1 * Math.random();
    return Math.floor(delay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildMetrics(
    startTime: number,
    endTime: number,
    retryCount: number,
    output?: Record<string, unknown>,
  ): NodeMetrics {
    return {
      executionTimeMs: endTime - startTime,
      retryCount,
      outputSizeBytes: output ? JSON.stringify(output).length : 0,
    };
  }
}
