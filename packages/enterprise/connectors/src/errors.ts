/** Error raised when a connector is misconfigured or used incorrectly. */
export class ConnectorConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectorConfigError';
  }
}

/** Error raised when a connector lacks a requested capability. */
export class CapabilityError extends Error {
  constructor(
    public readonly connectorId: string,
    public readonly capability: string,
  ) {
    super(`Connector "${connectorId}" does not support capability "${capability}"`);
    this.name = 'CapabilityError';
  }
}

/** Error raised when a transport request fails after exhausting retries. */
export class TransportError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly attempts: number,
  ) {
    super(message);
    this.name = 'TransportError';
  }
}

/** Error raised when no connector is registered under a given id. */
export class ConnectorNotFoundError extends Error {
  constructor(id: string) {
    super(`No connector registered with id "${id}"`);
    this.name = 'ConnectorNotFoundError';
  }
}
