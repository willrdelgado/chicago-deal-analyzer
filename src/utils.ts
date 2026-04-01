import type { MarketType, Verdict } from './types';

export const fmt = (n: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export const fmtPct = (n: number): string => `${n.toFixed(1)}%`;

export const getMultiplier = (market: MarketType): number => {
  if (market === 'cool') return 0.65;
  if (market === 'moderate') return 0.70;
  return 0.75;
};

export const getVerdict = (netProfit: number): Verdict => {
  if (netProfit >= 40000) return 'buy';
  if (netProfit >= 20000) return 'counter';
  return 'walk';
};

export const verdictColor = (verdict: Verdict): string => {
  if (verdict === 'buy') return 'text-emerald-400';
  if (verdict === 'counter') return 'text-amber-400';
  return 'text-rose-400';
};

export const verdictBg = (verdict: Verdict): string => {
  if (verdict === 'buy') return 'bg-emerald-400/10 border-emerald-400/30';
  if (verdict === 'counter') return 'bg-amber-400/10 border-amber-400/30';
  return 'bg-rose-400/10 border-rose-400/30';
};

export const verdictLabel = (verdict: Verdict): string => {
  if (verdict === 'buy') return '🟢 BUY';
  if (verdict === 'counter') return '🟡 COUNTER';
  return '🔴 WALK';
};

export const marketLabel = (market: MarketType): string => {
  if (market === 'cool') return 'Cool — South/West Side';
  if (market === 'moderate') return 'Moderate';
  return 'Hot — North Side/Suburbs';
};

export const marketColor = (market: MarketType): string => {
  if (market === 'cool') return 'text-blue-400';
  if (market === 'moderate') return 'text-amber-400';
  return 'text-rose-400';
};

export const calcMortgagePayment = (principal: number, annualRate: number, termYears: number): number => {
  if (principal <= 0 || annualRate <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};
