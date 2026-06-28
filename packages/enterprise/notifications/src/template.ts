import type {
  NotificationTemplate,
  RenderedMessage,
  TemplateData,
} from './types';

/** Thrown when a template references a variable that has no value. */
export class MissingTemplateVariableError extends Error {
  public readonly variable: string;
  public readonly templateId: string;

  constructor(templateId: string, variable: string) {
    super(`Template "${templateId}" references unknown variable "${variable}"`);
    this.name = 'MissingTemplateVariableError';
    this.templateId = templateId;
    this.variable = variable;
  }
}

const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g;

function coerce(value: string | number | boolean | null): string {
  return value === null ? '' : String(value);
}

/**
 * Renders a single string containing `{{var}}` placeholders against the given
 * data. Whitespace inside the braces is tolerated. Unknown variables throw
 * unless {@link RenderOptions.strict} is disabled, in which case they render
 * as an empty string.
 */
export function renderString(
  templateId: string,
  input: string,
  data: TemplateData,
  strict: boolean,
): string {
  return input.replace(PLACEHOLDER, (_match, rawKey: string): string => {
    const key = rawKey.trim();
    if (!(key in data)) {
      if (strict) {
        throw new MissingTemplateVariableError(templateId, key);
      }
      return '';
    }
    const value = data[key];
    return value === undefined ? '' : coerce(value);
  });
}

/** Options controlling template rendering. */
export interface RenderOptions {
  /** When true (default), unknown variables throw. */
  readonly strict?: boolean;
}

/**
 * In-memory registry of templates with `{{var}}` interpolation. Maintaining a
 * dedicated renderer keeps channel adapters free of formatting concerns.
 */
export class TemplateRenderer {
  private readonly templates = new Map<string, NotificationTemplate>();

  constructor(templates: ReadonlyArray<NotificationTemplate> = []) {
    for (const template of templates) {
      this.register(template);
    }
  }

  /** Adds or replaces a template by id. */
  public register(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  public has(templateId: string): boolean {
    return this.templates.has(templateId);
  }

  public get(templateId: string): NotificationTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Renders the subject and body of a registered template. Throws if the
   * template id is unknown.
   */
  public render(
    templateId: string,
    data: TemplateData,
    options: RenderOptions = {},
  ): RenderedMessage {
    const template = this.templates.get(templateId);
    if (template === undefined) {
      throw new Error(`Unknown template: "${templateId}"`);
    }
    const strict = options.strict ?? true;
    return {
      subject: renderString(template.id, template.subject, data, strict),
      body: renderString(template.id, template.body, data, strict),
    };
  }
}
