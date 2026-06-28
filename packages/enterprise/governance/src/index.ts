/**
 * @music-ai/governance
 *
 * Policy, audit and compliance engine for the music platform.
 */
export type {
  AccessRequest,
  Attributes,
  Condition,
  ConditionOperator,
  ConditionResult,
  Effect,
  PolicyDecision,
  PolicyRule,
  PolicyValue,
  RequestContext,
  Resource,
  RuleTrace,
  Subject,
} from './types';

export { PolicyEngine } from './policy-engine';
export type { PolicyEngineOptions } from './policy-engine';

export { AuditLog } from './audit-log';
export type { AuditEntry, AuditInput, AuditQuery, AuditSeverity, Clock } from './audit-log';

export {
  classifyField,
  classifyRecord,
  evaluateRetention,
  ConsentRegistry,
} from './compliance';
export type {
  ConsentGrant,
  ConsentStatus,
  FieldClassification,
  PiiCategory,
  RetentionEvaluation,
  RetentionPolicy,
  SensitivityLevel,
} from './compliance';
