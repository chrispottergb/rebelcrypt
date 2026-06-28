import type {
  AccessRequest,
  Condition,
  ConditionResult,
  Effect,
  PolicyDecision,
  PolicyRule,
  PolicyValue,
  RuleTrace,
} from './types';

/** Configuration for a {@link PolicyEngine}. */
export interface PolicyEngineOptions {
  /** Effect applied when no rule matches. Defaults to "deny" (deny-by-default). */
  readonly defaultEffect?: Effect;
}

/**
 * Evaluates {@link AccessRequest}s against an ordered set of declarative
 * {@link PolicyRule}s and returns a {@link PolicyDecision} with a full
 * matched-rule trace.
 *
 * Rules are sorted by descending priority; within the same priority `deny`
 * rules are considered before `allow` rules so that explicit denials win.
 * The first matching rule decides the outcome.
 */
export class PolicyEngine {
  private rules: PolicyRule[];
  private readonly defaultEffect: Effect;

  constructor(rules: readonly PolicyRule[] = [], options: PolicyEngineOptions = {}) {
    this.defaultEffect = options.defaultEffect ?? 'deny';
    this.rules = [];
    for (const rule of rules) {
      this.addRule(rule);
    }
  }

  /** Registers a rule, keeping the rule set ordered by evaluation precedence. */
  addRule(rule: PolicyRule): void {
    if (this.rules.some((r) => r.id === rule.id)) {
      throw new Error(`Duplicate policy rule id: ${rule.id}`);
    }
    this.rules.push(rule);
    this.rules.sort(PolicyEngine.compareRules);
  }

  /** Removes a rule by id; returns true when a rule was removed. */
  removeRule(ruleId: string): boolean {
    const next = this.rules.filter((r) => r.id !== ruleId);
    const removed = next.length !== this.rules.length;
    this.rules = next;
    return removed;
  }

  /** Snapshot of the currently registered rules in evaluation order. */
  listRules(): readonly PolicyRule[] {
    return [...this.rules];
  }

  /** Evaluates a request and returns the decision plus trace. */
  evaluate(request: AccessRequest): PolicyDecision {
    const trace: RuleTrace[] = [];

    for (const rule of this.rules) {
      const result = this.evaluateRule(rule, request);
      trace.push(result);
      if (result.matched) {
        return {
          allowed: rule.effect === 'allow',
          effect: rule.effect,
          matchedRuleId: rule.id,
          reason: rule.description ?? `Matched rule "${rule.id}" (${rule.effect})`,
          trace,
        };
      }
    }

    return {
      allowed: this.defaultEffect === 'allow',
      effect: this.defaultEffect,
      matchedRuleId: null,
      reason: `No rule matched; applied default effect "${this.defaultEffect}"`,
      trace,
    };
  }

  /** Convenience boolean form of {@link evaluate}. */
  isAllowed(request: AccessRequest): boolean {
    return this.evaluate(request).allowed;
  }

  private evaluateRule(rule: PolicyRule, request: AccessRequest): RuleTrace {
    if (!PolicyEngine.matchesSet(rule.actions, request.action)) {
      return {
        ruleId: rule.id,
        matched: false,
        effect: rule.effect,
        conditionResults: [],
        skippedReason: 'action',
      };
    }
    if (!PolicyEngine.matchesSet(rule.resourceTypes, request.resource.type)) {
      return {
        ruleId: rule.id,
        matched: false,
        effect: rule.effect,
        conditionResults: [],
        skippedReason: 'resourceType',
      };
    }

    const conditionResults: ConditionResult[] = (rule.conditions ?? []).map((c) =>
      PolicyEngine.evaluateCondition(c, request),
    );
    const matched = conditionResults.every((c) => c.passed);

    return {
      ruleId: rule.id,
      matched,
      effect: rule.effect,
      conditionResults,
    };
  }

  private static evaluateCondition(condition: Condition, request: AccessRequest): ConditionResult {
    const actual = resolvePath(condition.attribute, request);
    const passed = applyOperator(condition, actual);
    return {
      attribute: condition.attribute,
      operator: condition.operator,
      passed,
      actual,
    };
  }

  private static matchesSet(set: readonly string[], value: string): boolean {
    return set.includes('*') || set.includes(value);
  }

  private static compareRules(a: PolicyRule, b: PolicyRule): number {
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    if (pa !== pb) {
      return pb - pa;
    }
    // Deny precedes allow at the same priority.
    if (a.effect !== b.effect) {
      return a.effect === 'deny' ? -1 : 1;
    }
    return a.id.localeCompare(b.id);
  }
}

/** Resolves a dotted attribute path against the request projection. */
function resolvePath(path: string, request: AccessRequest): PolicyValue | undefined {
  const root: Record<string, PolicyValue> = {
    subject: toPolicyValue({
      id: request.subject.id,
      type: request.subject.type,
      roles: request.subject.roles ?? [],
      attributes: request.subject.attributes ?? {},
    }),
    action: request.action,
    resource: toPolicyValue({
      id: request.resource.id,
      type: request.resource.type,
      tenantId: request.resource.tenantId ?? null,
      attributes: request.resource.attributes ?? {},
    }),
    context: toPolicyValue(request.context ?? {}),
  };

  let current: PolicyValue | undefined = root;
  for (const segment of path.split('.')) {
    if (current === undefined || current === null || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, PolicyValue>)[segment];
  }
  return current;
}

/** Narrowing helper so plain objects satisfy {@link PolicyValue}. */
function toPolicyValue(value: Record<string, PolicyValue>): PolicyValue {
  return value;
}

function applyOperator(condition: Condition, actual: PolicyValue | undefined): boolean {
  const { operator, value } = condition;
  switch (operator) {
    case 'exists':
      return actual !== undefined && actual !== null;
    case 'eq':
      return scalarEquals(actual, value);
    case 'neq':
      return !scalarEquals(actual, value);
    case 'in':
      return Array.isArray(value) && value.some((v) => scalarEquals(actual, v));
    case 'notIn':
      return Array.isArray(value) && !value.some((v) => scalarEquals(actual, v));
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return compareNumbers(operator, actual, value);
    case 'contains':
      return containsValue(actual, value);
    case 'startsWith':
      return typeof actual === 'string' && typeof value === 'string' && actual.startsWith(value);
    default: {
      const exhaustive: never = operator;
      return exhaustive;
    }
  }
}

function scalarEquals(a: PolicyValue | undefined, b: PolicyValue | undefined): boolean {
  return a === b;
}

function compareNumbers(
  operator: 'gt' | 'gte' | 'lt' | 'lte',
  actual: PolicyValue | undefined,
  value: PolicyValue | undefined,
): boolean {
  if (typeof actual !== 'number' || typeof value !== 'number') {
    return false;
  }
  switch (operator) {
    case 'gt':
      return actual > value;
    case 'gte':
      return actual >= value;
    case 'lt':
      return actual < value;
    case 'lte':
      return actual <= value;
  }
}

function containsValue(actual: PolicyValue | undefined, value: PolicyValue | undefined): boolean {
  if (typeof actual === 'string' && typeof value === 'string') {
    return actual.includes(value);
  }
  if (Array.isArray(actual)) {
    return actual.some((v) => scalarEquals(v, value));
  }
  return false;
}
