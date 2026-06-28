import {
  DAG,
  NodeId,
  ParallelGroup,
  WorkflowNodeDefinition,
  WorkflowEdgeDefinition,
} from './types';

export class DAGBuilder {
  static build(
    nodes: WorkflowNodeDefinition[],
    edges: WorkflowEdgeDefinition[],
  ): DAG {
    const nodeMap = new Map<NodeId, WorkflowNodeDefinition>();
    const adjacencyList = new Map<NodeId, Set<NodeId>>();
    const inDegree = new Map<NodeId, number>();

    for (const node of nodes) {
      nodeMap.set(node.id, node);
      adjacencyList.set(node.id, new Set());
      inDegree.set(node.id, 0);
    }

    for (const edge of edges) {
      adjacencyList.get(edge.source)?.add(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }

    const roots = nodes
      .filter((n) => (inDegree.get(n.id) ?? 0) === 0)
      .map((n) => n.id);

    const leaves = nodes
      .filter((n) => (adjacencyList.get(n.id)?.size ?? 0) === 0)
      .map((n) => n.id);

    return { nodes: nodeMap, adjacencyList, inDegree, roots, leaves };
  }

  static detectCycles(dag: DAG): boolean {
    const visited = new Set<NodeId>();
    const recursionStack = new Set<NodeId>();

    const dfs = (nodeId: NodeId): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = dag.adjacencyList.get(nodeId) ?? new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of dag.nodes.keys()) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId)) return true;
      }
    }

    return false;
  }

  static topologicalSort(dag: DAG): NodeId[] {
    const inDegree = new Map<NodeId, number>();
    for (const [id, deg] of dag.inDegree) {
      inDegree.set(id, deg);
    }

    const queue: NodeId[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const sorted: NodeId[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);

      const neighbors = dag.adjacencyList.get(current) ?? new Set();
      for (const neighbor of neighbors) {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    if (sorted.length !== dag.nodes.size) {
      throw new Error('Cycle detected in workflow DAG');
    }

    return sorted;
  }

  static getParallelGroups(dag: DAG): ParallelGroup[] {
    const inDegree = new Map<NodeId, number>();
    for (const [id, deg] of dag.inDegree) {
      inDegree.set(id, deg);
    }

    const groups: ParallelGroup[] = [];
    let currentLevel = 0;
    let queue: NodeId[] = [];

    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    while (queue.length > 0) {
      groups.push({ level: currentLevel, nodeIds: [...queue] });

      const nextQueue: NodeId[] = [];
      for (const nodeId of queue) {
        const neighbors = dag.adjacencyList.get(nodeId) ?? new Set();
        for (const neighbor of neighbors) {
          const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
          inDegree.set(neighbor, newDeg);
          if (newDeg === 0) nextQueue.push(neighbor);
        }
      }

      queue = nextQueue;
      currentLevel++;
    }

    return groups;
  }

  static getExecutionOrder(dag: DAG): NodeId[][] {
    return this.getParallelGroups(dag).map((g) => g.nodeIds);
  }
}
