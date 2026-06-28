import { BaseConnector } from './connector';
import { NormalizedRequest, NormalizedResponse } from './types';

/**
 * Concrete connector definitions. Each provides a normalized mapping layer that
 * translates domain operations into {@link NormalizedRequest}s and shapes the
 * raw upstream payload into a stable domain model. No live network logic lives
 * here — transport is inherited from {@link BaseConnector}.
 */

/* ------------------------------------------------------------------ DSP --- */

export interface Track {
  readonly isrc: string;
  readonly title: string;
  readonly artist: string;
  readonly durationMs: number;
}

export interface StreamCount {
  readonly isrc: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly streams: number;
}

interface RawDspTrack {
  id?: string;
  isrc?: string;
  name?: string;
  artists?: { name?: string }[];
  duration_ms?: number;
}

interface RawDspStream {
  isrc?: string;
  start?: string;
  end?: string;
  count?: number;
}

/** Streaming-platform connector (Spotify/Apple-like). */
export class DspConnector extends BaseConnector {
  async getTrack(isrc: string): Promise<Track> {
    this.requireCapability('catalog.read');
    const res = await this.execute<RawDspTrack>({
      operation: 'getTrack',
      method: 'GET',
      path: `/v1/tracks/${encodeURIComponent(isrc)}`,
    });
    return this.mapTrack(res.data, isrc);
  }

  async getStreams(isrc: string, from: string, to: string): Promise<StreamCount[]> {
    this.requireCapability('streams.read');
    const res = await this.execute<{ items?: RawDspStream[] }>({
      operation: 'getStreams',
      method: 'GET',
      path: '/v1/analytics/streams',
      query: { isrc, from, to },
    });
    const items = res.data.items ?? [];
    return items.map((s) => this.mapStream(s, isrc));
  }

  private mapTrack(raw: RawDspTrack, fallbackIsrc: string): Track {
    return {
      isrc: raw.isrc ?? fallbackIsrc,
      title: raw.name ?? 'Unknown',
      artist: raw.artists?.[0]?.name ?? 'Unknown',
      durationMs: raw.duration_ms ?? 0,
    };
  }

  private mapStream(raw: RawDspStream, fallbackIsrc: string): StreamCount {
    return {
      isrc: raw.isrc ?? fallbackIsrc,
      periodStart: raw.start ?? '',
      periodEnd: raw.end ?? '',
      streams: raw.count ?? 0,
    };
  }
}

/* ------------------------------------------------------------------ PRO --- */

export interface RoyaltyLine {
  readonly workId: string;
  readonly territory: string;
  readonly grossAmount: number;
  readonly currency: string;
}

interface RawProLine {
  work_id?: string;
  territory_code?: string;
  amount?: number;
  currency?: string;
}

/** Performing-rights-organization / royalty-reporting connector. */
export class ProConnector extends BaseConnector {
  async getRoyalties(workId: string, period: string): Promise<RoyaltyLine[]> {
    this.requireCapability('royalties.read');
    const res = await this.execute<{ lines?: RawProLine[] }>({
      operation: 'getRoyalties',
      method: 'GET',
      path: `/reporting/works/${encodeURIComponent(workId)}/royalties`,
      query: { period },
    });
    return (res.data.lines ?? []).map((l) => this.mapLine(l));
  }

  async submitReport(period: string, lines: readonly RoyaltyLine[]): Promise<string> {
    this.requireCapability('royalties.report');
    const res = await this.execute<{ submission_id?: string }, unknown>({
      operation: 'submitReport',
      method: 'POST',
      path: '/reporting/submissions',
      body: {
        period,
        lines: lines.map((l) => ({
          work_id: l.workId,
          territory_code: l.territory,
          amount: l.grossAmount,
          currency: l.currency,
        })),
      },
    });
    return res.data.submission_id ?? '';
  }

  private mapLine(raw: RawProLine): RoyaltyLine {
    return {
      workId: raw.work_id ?? '',
      territory: raw.territory_code ?? 'XX',
      grossAmount: raw.amount ?? 0,
      currency: raw.currency ?? 'USD',
    };
  }
}

/* ---------------------------------------------------------- Distributor --- */

export interface ReleaseDelivery {
  readonly upc: string;
  readonly title: string;
  readonly targets: readonly string[];
  readonly releaseDate: string;
}

export interface DeliveryReceipt {
  readonly upc: string;
  readonly accepted: boolean;
  readonly deliveryId: string;
}

interface RawReceipt {
  upc?: string;
  status?: string;
  delivery_id?: string;
}

/** Distributor connector for delivering and taking down releases. */
export class DistributorConnector extends BaseConnector {
  async deliver(release: ReleaseDelivery): Promise<DeliveryReceipt> {
    this.requireCapability('releases.deliver');
    const res = await this.execute<RawReceipt, unknown>({
      operation: 'deliver',
      method: 'POST',
      path: '/deliveries',
      body: {
        upc: release.upc,
        title: release.title,
        targets: release.targets,
        release_date: release.releaseDate,
      },
    });
    return this.mapReceipt(res.data, release.upc);
  }

  async takedown(upc: string): Promise<DeliveryReceipt> {
    this.requireCapability('releases.takedown');
    const res = await this.execute<RawReceipt, unknown>({
      operation: 'takedown',
      method: 'DELETE',
      path: `/deliveries/${encodeURIComponent(upc)}`,
    });
    return this.mapReceipt(res.data, upc);
  }

  private mapReceipt(raw: RawReceipt, fallbackUpc: string): DeliveryReceipt {
    return {
      upc: raw.upc ?? fallbackUpc,
      accepted: raw.status === 'accepted' || raw.status === 'queued',
      deliveryId: raw.delivery_id ?? '',
    };
  }
}

/* ------------------------------------------------------------------ CRM --- */

export interface Contact {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly tags: readonly string[];
}

interface RawContact {
  id?: string;
  email_address?: string;
  full_name?: string;
  labels?: string[];
}

/** CRM connector for managing label/artist relationship contacts. */
export class CrmConnector extends BaseConnector {
  async getContact(id: string): Promise<Contact> {
    this.requireCapability('contacts.read');
    const res = await this.execute<RawContact>({
      operation: 'getContact',
      method: 'GET',
      path: `/contacts/${encodeURIComponent(id)}`,
    });
    return this.mapContact(res.data, id);
  }

  async upsertContact(contact: Omit<Contact, 'id'> & { id?: string }): Promise<Contact> {
    this.requireCapability('contacts.write');
    const res: NormalizedResponse<RawContact> = await this.execute<RawContact, unknown>({
      operation: 'upsertContact',
      method: 'PUT',
      path: contact.id ? `/contacts/${encodeURIComponent(contact.id)}` : '/contacts',
      body: {
        email_address: contact.email,
        full_name: contact.name,
        labels: contact.tags,
      },
    });
    return this.mapContact(res.data, contact.id ?? '');
  }

  private mapContact(raw: RawContact, fallbackId: string): Contact {
    return {
      id: raw.id ?? fallbackId,
      email: raw.email_address ?? '',
      name: raw.full_name ?? '',
      tags: raw.labels ?? [],
    };
  }
}

/** Re-exported for convenience by registry consumers. */
export type AnyDomainRequest = NormalizedRequest<unknown>;
