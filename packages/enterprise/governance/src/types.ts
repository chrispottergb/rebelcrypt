/**
 * Shared primitives for the governance engine.
 *
 * A {@link PolicyValue} is any JSON-compatible scalar or collection that can
 * appear inside a policy {@link EvaluationContext} or as a comparison operand.
 */
export type PolicyValue =
  | string
  | number
  | boolean
  | null
  | readonly PolicyValue[]
  | { readonly [key: string]: PolicyValue };

/** A flat-ish attribute bag describing an entity (subject, resource, etc.). */
export type Attributes = Readonly<Record<string, PolicyValue>>;

/** The actor requesting access (a user, service account, or API key). */
export interface Subject {
  readonly id: string;
  /** e.g. "user", "service", "apiKey". */
  readonly type: string;
  readonly roles?: readonly string[];
  readonly attributes?: Attributes;
}

/** The thing being acted upon (a track, dataset, model, payout, etc.). */
export interface Resource {
  readonly id: string;
  /** e.g. "track", "dataset", "model". */
  readonly type: string;
  /** Owning tenant/org used for multi-tenant isolation checks. */
  readonly tenantId?: string;
  readonly attributes?: Attributes;
}

/** Ambient request context (time, ip, region, etc.). */
export type RequestContext = Attributes;

/** A fully-formed authorization question. */
export interface AccessRequest {
  readonly subject: Subject;
  /** Verb being attempted, e.g. "read", "delete", "train". */
  readonly action: string;
  readonly resource: Resource;
  readonly context?: RequestContext;
}

/** The two terminal effects a rule can assert. */
export type Effect = 'allow' | 'deny';

/** Comparison operators supported by rule conditions. */
export type ConditionOperator =
  | 'eq'
  | 'neq'
  | 'in'
  | 'notIn'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'exists';

/**
 * Dotted attribute paths are resolved against a synthetic object of the shape
 * `{ subject, action, resource, context }` derived from an {@link AccessRequest}.
 */
export interface Condition {
  /** Dotted path, e.g. "subject.attributes.plan" or "resource.tenantId". */
  readonly attribute: string;
  readonly operator: ConditionOperator;
  /** Operand to compare against. Ignored by the `exists` operator. */
  readonly value?: PolicyValue;
}

/** A single declarative authorization rule. */
export interface PolicyRule {
  readonly id: string;
  readonly description?: string;
  readonly effect: Effect;
  /** Match the request's action against this set ("*" matches any). */
  readonly actions: readonly string[];
  /** Match the resource type against this set ("*" matches any). */
  readonly resourceTypes: readonly string[];
  /** All conditions must pass (logical AND) for the rule to match. */
  readonly conditions?: readonly Condition[];
  /**
   * Higher priority rules are evaluated first. Defaults to 0.
   * Among equal priorities, `deny` is considered before `allow`.
   */
  readonly priority?: number;
}

/** A trace entry explaining whether a rule matched and why. */
export interface RuleTrace {
  readonly ruleId: string;
  readonly matched: boolean;
  readonly effect: Effect;
  /** Per-condition outcomes, empty when the rule has no conditions. */
  readonly conditionResults: readonly ConditionResult[];
  /** Set when the rule failed to match purely on action/resource shape. */
  readonly skippedReason?: 'action' | 'resourceType';
}

export interface ConditionResult {
  readonly attribute: string;
  readonly operator: ConditionOperator;
  readonly passed: boolean;
  readonly actual: PolicyValue | undefined;
}

/** The outcome of evaluating an {@link AccessRequest} against a policy set. */
export interface PolicyDecision {
  readonly allowed: boolean;
  readonly effect: Effect;
  /** Id of the rule that determined the outcome, if any. */
  readonly matchedRuleId: string | null;
  /** Human-readable explanation of the decision. */
  readonly reason: string;
  /** Ordered trace of every rule that was considered. */
  readonly trace: readonly RuleTrace[];
}
