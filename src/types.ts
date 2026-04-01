export type MarketType = 'cool' | 'moderate' | 'hot';
export type PropertyType = 'single-family' | '2-flat' | 'multi-unit' | 'apartment';
export type ConstructionType = 'brick' | 'frame';
export type RehabLevel = 'light' | 'moderate' | 'gut';
export type DealStrategy = 'flip' | 'brrrr' | 'hold';
export type Verdict = 'buy' | 'counter' | 'walk';

export interface ItemizedRehab {
  foundation: number;
  roof: number;
  kitchen: number;
  baths: number;
  hvac: number;
  electrical: number;
  plumbing: number;
  windows: number;
  flooring: number;
  paint: number;
  landscaping: number;
}

export interface Deal {
  id: string;
  address: string;
  arv: number;
  purchasePrice: number;
  rehabCost: number;
  netProfit: number;
  grossProfit: number;
  roi: number;
  verdict: Verdict;
  strategy: DealStrategy;
  market: MarketType;
  createdAt: string;
}

export interface DealAnalyzerState {
  address: string;
  sqft: number;
  zillowArv: number;
  redfinArv: number;
  realtorArv: number;
  market: MarketType;
  propertyType: PropertyType;
  constructionType: ConstructionType;
  beds: number;
  baths: number;
  rehabLevel: RehabLevel;
  customRehab: number;
  useCustomRehab: boolean;
  contingencyPct: number;
  buyingClosingPct: number;
  sellingClosingPct: number;
  holdingMonths: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  monthlyUtilities: number;
  monthlyInterest: number;
  purchasePrice: number;
  itemizedRehab: ItemizedRehab;
  showItemized: boolean;
}

export interface BRRRRState {
  arv: number;
  purchasePrice: number;
  rehabCost: number;
  closingCosts: number;
  holdingCosts: number;
  refiLtv: number;
  monthlyRent: number;
  vacancyRate: number;
  mgmtRate: number;
  capexRate: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  refiRate: number;
  refiTermYears: number;
}

export interface HardMoneyState {
  purchasePrice: number;
  arv: number;
  rehabCost: number;
  market: MarketType;
  loanToArvPct: number;      // % of ARV the lender will loan (70–90%)
  interestRate: number;
  points: number;
  termMonths: number;
  sellingClosingPct: number;
  holdingMonths: number;
}
