export interface Territory {
  code: string;
  name: string;
  region: string;
  groups: string[];
}

export const TERRITORIES: Territory[] = [
  { code: 'US', name: 'United States', region: 'North America', groups: ['WORLDWIDE','NORTH_AMERICA','AMERICAS','NATO','G7','G20','OECD'] },
  { code: 'CA', name: 'Canada', region: 'North America', groups: ['WORLDWIDE','NORTH_AMERICA','AMERICAS','NATO','G7','G20','OECD'] },
  { code: 'MX', name: 'Mexico', region: 'North America', groups: ['WORLDWIDE','NORTH_AMERICA','LATAM','AMERICAS','G20'] },
  { code: 'GB', name: 'United Kingdom', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU_PLUS','NATO','G7','G20','OECD'] },
  { code: 'DE', name: 'Germany', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','NATO','G7','G20','OECD'] },
  { code: 'FR', name: 'France', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','NATO','G7','G20','OECD'] },
  { code: 'IT', name: 'Italy', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','NATO','G7','G20','OECD'] },
  { code: 'ES', name: 'Spain', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','NATO','OECD'] },
  { code: 'NL', name: 'Netherlands', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','NATO','OECD'] },
  { code: 'BE', name: 'Belgium', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','NATO','OECD'] },
  { code: 'SE', name: 'Sweden', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','NORDICS','NATO','OECD'] },
  { code: 'NO', name: 'Norway', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EEA','NORDICS','NATO','OECD'] },
  { code: 'DK', name: 'Denmark', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','NORDICS','NATO','OECD'] },
  { code: 'FI', name: 'Finland', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','NORDICS','NATO','OECD'] },
  { code: 'AT', name: 'Austria', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','OECD'] },
  { code: 'CH', name: 'Switzerland', region: 'Europe', groups: ['WORLDWIDE','EUROPE','OECD'] },
  { code: 'PT', name: 'Portugal', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','NATO','OECD'] },
  { code: 'PL', name: 'Poland', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','NATO','OECD'] },
  { code: 'IE', name: 'Ireland', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','OECD'] },
  { code: 'GR', name: 'Greece', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','NATO','OECD'] },
  { code: 'CZ', name: 'Czech Republic', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','NATO','OECD'] },
  { code: 'RO', name: 'Romania', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','NATO'] },
  { code: 'HU', name: 'Hungary', region: 'Europe', groups: ['WORLDWIDE','EUROPE','EU','EEA','NATO','OECD'] },
  { code: 'JP', name: 'Japan', region: 'East Asia', groups: ['WORLDWIDE','APAC','EAST_ASIA','G7','G20','OECD'] },
  { code: 'KR', name: 'South Korea', region: 'East Asia', groups: ['WORLDWIDE','APAC','EAST_ASIA','G20','OECD'] },
  { code: 'CN', name: 'China', region: 'East Asia', groups: ['WORLDWIDE','APAC','EAST_ASIA','G20'] },
  { code: 'TW', name: 'Taiwan', region: 'East Asia', groups: ['WORLDWIDE','APAC','EAST_ASIA'] },
  { code: 'HK', name: 'Hong Kong', region: 'East Asia', groups: ['WORLDWIDE','APAC','EAST_ASIA'] },
  { code: 'IN', name: 'India', region: 'South Asia', groups: ['WORLDWIDE','APAC','SOUTH_ASIA','G20'] },
  { code: 'ID', name: 'Indonesia', region: 'Southeast Asia', groups: ['WORLDWIDE','APAC','ASEAN','G20'] },
  { code: 'TH', name: 'Thailand', region: 'Southeast Asia', groups: ['WORLDWIDE','APAC','ASEAN'] },
  { code: 'VN', name: 'Vietnam', region: 'Southeast Asia', groups: ['WORLDWIDE','APAC','ASEAN'] },
  { code: 'PH', name: 'Philippines', region: 'Southeast Asia', groups: ['WORLDWIDE','APAC','ASEAN'] },
  { code: 'MY', name: 'Malaysia', region: 'Southeast Asia', groups: ['WORLDWIDE','APAC','ASEAN'] },
  { code: 'SG', name: 'Singapore', region: 'Southeast Asia', groups: ['WORLDWIDE','APAC','ASEAN'] },
  { code: 'AU', name: 'Australia', region: 'Oceania', groups: ['WORLDWIDE','APAC','OCEANIA','G20','OECD'] },
  { code: 'NZ', name: 'New Zealand', region: 'Oceania', groups: ['WORLDWIDE','APAC','OCEANIA','OECD'] },
  { code: 'BR', name: 'Brazil', region: 'South America', groups: ['WORLDWIDE','LATAM','SOUTH_AMERICA','AMERICAS','G20'] },
  { code: 'AR', name: 'Argentina', region: 'South America', groups: ['WORLDWIDE','LATAM','SOUTH_AMERICA','AMERICAS','G20'] },
  { code: 'CO', name: 'Colombia', region: 'South America', groups: ['WORLDWIDE','LATAM','SOUTH_AMERICA','AMERICAS','OECD'] },
  { code: 'CL', name: 'Chile', region: 'South America', groups: ['WORLDWIDE','LATAM','SOUTH_AMERICA','AMERICAS','OECD'] },
  { code: 'PE', name: 'Peru', region: 'South America', groups: ['WORLDWIDE','LATAM','SOUTH_AMERICA','AMERICAS'] },
  { code: 'NG', name: 'Nigeria', region: 'West Africa', groups: ['WORLDWIDE','AFRICA','WEST_AFRICA'] },
  { code: 'ZA', name: 'South Africa', region: 'Southern Africa', groups: ['WORLDWIDE','AFRICA','SOUTHERN_AFRICA','G20'] },
  { code: 'KE', name: 'Kenya', region: 'East Africa', groups: ['WORLDWIDE','AFRICA','EAST_AFRICA'] },
  { code: 'GH', name: 'Ghana', region: 'West Africa', groups: ['WORLDWIDE','AFRICA','WEST_AFRICA'] },
  { code: 'EG', name: 'Egypt', region: 'North Africa', groups: ['WORLDWIDE','AFRICA','NORTH_AFRICA','MENA'] },
  { code: 'MA', name: 'Morocco', region: 'North Africa', groups: ['WORLDWIDE','AFRICA','NORTH_AFRICA','MENA'] },
  { code: 'AE', name: 'UAE', region: 'Middle East', groups: ['WORLDWIDE','MENA','GULF'] },
  { code: 'SA', name: 'Saudi Arabia', region: 'Middle East', groups: ['WORLDWIDE','MENA','GULF','G20'] },
  { code: 'TR', name: 'Turkey', region: 'Middle East / Europe', groups: ['WORLDWIDE','MENA','EUROPE','NATO','G20','OECD'] },
  { code: 'IL', name: 'Israel', region: 'Middle East', groups: ['WORLDWIDE','MENA','OECD'] },
  { code: 'RU', name: 'Russia', region: 'Eastern Europe / Central Asia', groups: ['WORLDWIDE','EUROPE','CIS'] },
  { code: 'UA', name: 'Ukraine', region: 'Eastern Europe', groups: ['WORLDWIDE','EUROPE'] },
];

export class TerritoryService {
  private territories: Map<string, Territory>;

  constructor() {
    this.territories = new Map(TERRITORIES.map((t) => [t.code, t]));
  }

  getTerritory(code: string): Territory | undefined {
    return this.territories.get(code);
  }

  getAllTerritories(): Territory[] {
    return Array.from(this.territories.values());
  }

  getByRegion(region: string): Territory[] {
    const lower = region.toLowerCase();
    return this.getAllTerritories().filter((t) => t.region.toLowerCase().includes(lower));
  }

  getByGroup(group: string): Territory[] {
    return this.getAllTerritories().filter((t) => t.groups.includes(group));
  }

  getGroupsForTerritory(code: string): string[] {
    return this.territories.get(code)?.groups ?? [];
  }

  isInGroup(code: string, group: string): boolean {
    return this.getGroupsForTerritory(code).includes(group);
  }

  get count(): number {
    return this.territories.size;
  }
}
