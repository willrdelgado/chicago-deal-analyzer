import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Deal, DealAnalyzerState, BRRRRState, HardMoneyState } from '../types';

const SAMPLE_DEALS: Deal[] = [
  {
    id: '1',
    address: '1842 S Millard Ave, Chicago IL (South Side)',
    arv: 210000,
    purchasePrice: 95000,
    rehabCost: 45000,
    grossProfit: 70000,
    netProfit: 47500,
    roi: 33.8,
    verdict: 'buy',
    strategy: 'flip',
    market: 'cool',
    createdAt: '2026-03-10',
  },
  {
    id: '2',
    address: '2318 N Kedzie Ave, Chicago IL (Logan Square)',
    arv: 480000,
    purchasePrice: 265000,
    rehabCost: 60000,
    grossProfit: 155000,
    netProfit: 98000,
    roi: 28.4,
    verdict: 'buy',
    strategy: 'brrrr',
    market: 'moderate',
    createdAt: '2026-03-14',
  },
  {
    id: '3',
    address: '412 Diehl Rd, Naperville IL',
    arv: 620000,
    purchasePrice: 395000,
    rehabCost: 55000,
    grossProfit: 170000,
    netProfit: 118000,
    roi: 24.1,
    verdict: 'buy',
    strategy: 'flip',
    market: 'hot',
    createdAt: '2026-03-18',
  },
];

const DEFAULT_ANALYZER: DealAnalyzerState = {
  address: '',
  sqft: 1200,
  zillowArv: 0,
  redfinArv: 0,
  realtorArv: 0,
  market: 'moderate',
  propertyType: 'single-family',
  constructionType: 'brick',
  beds: 3,
  baths: 2,
  rehabLevel: 'moderate',
  customRehab: 0,
  useCustomRehab: false,
  contingencyPct: 10,
  buyingClosingPct: 2,
  sellingClosingPct: 3,
  holdingMonths: 6,
  monthlyTaxes: 600,
  monthlyInsurance: 120,
  monthlyUtilities: 150,
  monthlyInterest: 0,
  purchasePrice: 0,
  itemizedRehab: {
    foundation: 0, roof: 0, kitchen: 0, baths: 0, hvac: 0,
    electrical: 0, plumbing: 0, windows: 0, flooring: 0, paint: 0, landscaping: 0,
  },
  showItemized: false,
};

const DEFAULT_BRRRR: BRRRRState = {
  arv: 300000,
  purchasePrice: 140000,
  rehabCost: 50000,
  closingCosts: 4000,
  holdingCosts: 8000,
  refiLtv: 75,
  monthlyRent: 2200,
  vacancyRate: 8,
  mgmtRate: 10,
  capexRate: 10,
  monthlyTaxes: 600,
  monthlyInsurance: 120,
  refiRate: 7.5,
  refiTermYears: 30,
};

const DEFAULT_HM: HardMoneyState = {
  purchasePrice: 150000,
  arv: 300000,
  rehabCost: 60000,
  market: 'moderate',
  loanToArvPct: 75,
  interestRate: 11,
  points: 2,
  termMonths: 12,
  sellingClosingPct: 3,
  holdingMonths: 8,
};

interface AppContextType {
  deals: Deal[];
  addDeal: (deal: Omit<Deal, 'id' | 'createdAt'>) => void;
  removeDeal: (id: string) => void;
  analyzer: DealAnalyzerState;
  setAnalyzer: React.Dispatch<React.SetStateAction<DealAnalyzerState>>;
  brrrr: BRRRRState;
  setBrrrr: React.Dispatch<React.SetStateAction<BRRRRState>>;
  hardMoney: HardMoneyState;
  setHardMoney: React.Dispatch<React.SetStateAction<HardMoneyState>>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [deals, setDeals] = useState<Deal[]>(() => {
    try {
      const stored = localStorage.getItem('chicago-deals');
      return stored ? JSON.parse(stored) : SAMPLE_DEALS;
    } catch {
      return SAMPLE_DEALS;
    }
  });

  const [analyzer, setAnalyzer] = useState<DealAnalyzerState>(DEFAULT_ANALYZER);
  const [brrrr, setBrrrr] = useState<BRRRRState>(DEFAULT_BRRRR);
  const [hardMoney, setHardMoney] = useState<HardMoneyState>(DEFAULT_HM);

  useEffect(() => {
    localStorage.setItem('chicago-deals', JSON.stringify(deals));
  }, [deals]);

  const addDeal = (deal: Omit<Deal, 'id' | 'createdAt'>) => {
    const newDeal: Deal = {
      ...deal,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setDeals(prev => [newDeal, ...prev]);
  };

  const removeDeal = (id: string) => {
    setDeals(prev => prev.filter(d => d.id !== id));
  };

  return (
    <AppContext.Provider value={{ deals, addDeal, removeDeal, analyzer, setAnalyzer, brrrr, setBrrrr, hardMoney, setHardMoney }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
