/**
 * A single validation issue encountered while loading config.
 */
export interface ConfigIssue {
  /** The configuration key (as seen in the source record). */
  readonly key: string;
  /** Human-readable reason the value failed validation. */
  readonly reason: string;
  /** The raw value that was present, if any. */
  readonly received?: string | undefined;
}

/**
 * Thrown when one or more configuration keys are missing or invalid.
 * Aggregates ALL issues so callers can fix everything in one pass.
 */
export class ConfigError extends Error {
  public readonly issues: readonly ConfigIssue[];

  constructor(issues: readonly ConfigIssue[]) {
    const summary = issues
      .map((i) => `  - ${i.key}: ${i.reason}`)
      .join('\n');
    super(
      `Configuration failed to load with ${issues.length} issue(s):\n${summary}`,
    );
    this.name = 'ConfigError';
    this.issues = issues;
    // Restore prototype chain for instanceof checks across compilation targets.
    Object.setPrototypeOf(this, ConfigError.prototype);
  }

  /** Returns the sorted list of keys that failed. */
  public keys(): string[] {
    return [...new Set(this.issues.map((i) => i.key))].sort();
  }
}
