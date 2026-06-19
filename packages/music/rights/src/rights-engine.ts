import { TERRITORIES, TerritoryService, Territory } from './territory';

export interface RightsBundle {
  id: string;
  trackId: string;
  type: 'master' | 'publishing' | 'sync' | 'performance' | 'mechanical';
  holders: RightsHolder[];
  territories: string[];
  excludedTerritories: string[];
  startDate: Date;
  endDate: Date | null;
  restrictions: string[];
}

export interface RightsHolder {
  id: string;
  name: string;
  role: 'owner' | 'publisher' | 'label' | 'distributor' | 'collecting_society';
  share: number;
  ipi?: string;
}

export interface RoyaltyCalculation {
  trackId: string;
  totalAmount: number;
  currency: string;
  splits: RoyaltySplit[];
  period: string;
  streams: number;
}

export interface RoyaltySplit {
  holderId: string;
  holderName: string;
  share: number;
  amount: number;
  role: string;
}

export interface Contract {
  id: string;
  tenantId: string;
  type: 'master' | 'publishing' | 'sync' | 'performance' | 'mechanical' | 'distribution';
  artistId: string;
  labelId: string | null;
  terms: ContractTerms;
  territories: string[];
  status: 'draft' | 'active' | 'expired' | 'terminated';
  startDate: Date;
  endDate: Date | null;
  autoRenew: boolean;
  renewalTermMonths: number;
}

export interface ContractTerms {
  royaltyRate: number;
  advanceAmount: number;
  advanceCurrency: string;
  recoupable: boolean;
  recoupedAmount: number;
  minimumGuarantee: number;
  mechanicalRate: number;
  syncFeeRange: { min: number; max: number };
  performanceShare: number;
}

export class RightsEngine {
  private territoryService = new TerritoryService();

  resolveRights(
    rightsBundles: RightsBundle[],
    territory: string,
  ): RightsBundle[] {
    return rightsBundles.filter((bundle) => {
      if (bundle.excludedTerritories.includes(territory)) return false;

      if (bundle.territories.includes('WORLDWIDE')) return true;
      if (bundle.territories.includes(territory)) return true;

      const groups = this.territoryService.getGroupsForTerritory(territory);
      return bundle.territories.some((t) => groups.includes(t));
    });
  }

  calculateRoyalties(
    streams: number,
    ratePerStream: number,
    holders: RightsHolder[],
    currency: string = 'USD',
  ): RoyaltyCalculation {
    const totalAmount = streams * ratePerStream;

    const splits: RoyaltySplit[] = holders.map((holder) => ({
      holderId: holder.id,
      holderName: holder.name,
      share: holder.share,
      amount: totalAmount * (holder.share / 100),
      role: holder.role,
    }));

    return {
      trackId: '',
      totalAmount,
      currency,
      splits,
      period: new Date().toISOString().slice(0, 7),
      streams,
    };
  }

  splitRoyalties(amount: number, holders: RightsHolder[]): RoyaltySplit[] {
    const totalShares = holders.reduce((sum, h) => sum + h.share, 0);

    return holders.map((holder) => ({
      holderId: holder.id,
      holderName: holder.name,
      share: holder.share,
      amount: (amount * holder.share) / totalShares,
      role: holder.role,
    }));
  }

  checkTerritoryRestrictions(
    rightsBundles: RightsBundle[],
    territory: string,
  ): { available: boolean; restrictions: string[] } {
    const applicable = this.resolveRights(rightsBundles, territory);

    if (applicable.length === 0) {
      return { available: false, restrictions: ['No rights available in this territory'] };
    }

    const restrictions = applicable.flatMap((b) => b.restrictions);
    return { available: true, restrictions };
  }

  validateContract(contract: Contract): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (contract.terms.royaltyRate < 0 || contract.terms.royaltyRate > 100) {
      errors.push('Royalty rate must be between 0 and 100');
    }
    if (contract.territories.length === 0) {
      errors.push('Contract must specify at least one territory');
    }
    if (contract.endDate && contract.startDate > contract.endDate) {
      errors.push('End date must be after start date');
    }

    const totalShares = contract.terms.royaltyRate + contract.terms.performanceShare;
    if (totalShares > 100) {
      errors.push('Combined royalty shares cannot exceed 100%');
    }

    return { valid: errors.length === 0, errors };
  }
}
