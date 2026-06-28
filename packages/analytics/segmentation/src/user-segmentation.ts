export interface SegmentCriteria {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: unknown;
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria[];
  userCount: number;
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  attributes: Record<string, unknown>;
}

export class SegmentationEngine {
  private segments: Map<string, UserSegment> = new Map();

  createSegment(name: string, description: string, criteria: SegmentCriteria[]): UserSegment {
    const id = `seg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const segment: UserSegment = {
      id,
      name,
      description,
      criteria,
      userCount: 0,
      createdAt: new Date(),
    };

    this.segments.set(id, segment);
    return segment;
  }

  evaluateUser(user: UserProfile, segmentId: string): boolean {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      throw new Error(`Segment not found: ${segmentId}`);
    }

    return segment.criteria.every((criteria) => {
      const value = user.attributes[criteria.field];
      return this.matchesCriteria(value, criteria);
    });
  }

  assignUsers(users: UserProfile[], segmentId: string): string[] {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      throw new Error(`Segment not found: ${segmentId}`);
    }

    const matchingIds: string[] = [];

    for (const user of users) {
      if (this.evaluateUser(user, segmentId)) {
        matchingIds.push(user.id);
      }
    }

    segment.userCount = matchingIds.length;
    return matchingIds;
  }

  getSegment(id: string): UserSegment | undefined {
    return this.segments.get(id);
  }

  listSegments(): UserSegment[] {
    return Array.from(this.segments.values());
  }

  getOverlap(
    segmentIdA: string,
    segmentIdB: string,
    users: UserProfile[],
  ): { overlap: number; onlyA: number; onlyB: number } {
    const segmentA = this.segments.get(segmentIdA);
    const segmentB = this.segments.get(segmentIdB);

    if (!segmentA) {
      throw new Error(`Segment not found: ${segmentIdA}`);
    }
    if (!segmentB) {
      throw new Error(`Segment not found: ${segmentIdB}`);
    }

    let overlap = 0;
    let onlyA = 0;
    let onlyB = 0;

    for (const user of users) {
      const inA = this.evaluateUser(user, segmentIdA);
      const inB = this.evaluateUser(user, segmentIdB);

      if (inA && inB) {
        overlap++;
      } else if (inA) {
        onlyA++;
      } else if (inB) {
        onlyB++;
      }
    }

    return { overlap, onlyA, onlyB };
  }

  private matchesCriteria(value: unknown, criteria: SegmentCriteria): boolean {
    if (value === undefined || value === null) {
      return false;
    }

    switch (criteria.operator) {
      case 'eq':
        return value === criteria.value;

      case 'neq':
        return value !== criteria.value;

      case 'gt':
        return typeof value === 'number' && typeof criteria.value === 'number'
          ? value > criteria.value
          : false;

      case 'lt':
        return typeof value === 'number' && typeof criteria.value === 'number'
          ? value < criteria.value
          : false;

      case 'gte':
        return typeof value === 'number' && typeof criteria.value === 'number'
          ? value >= criteria.value
          : false;

      case 'lte':
        return typeof value === 'number' && typeof criteria.value === 'number'
          ? value <= criteria.value
          : false;

      case 'contains':
        if (typeof value === 'string' && typeof criteria.value === 'string') {
          return value.includes(criteria.value);
        }
        if (Array.isArray(value)) {
          return value.includes(criteria.value);
        }
        return false;

      case 'in':
        if (Array.isArray(criteria.value)) {
          return criteria.value.includes(value);
        }
        return false;

      default:
        return false;
    }
  }
}
