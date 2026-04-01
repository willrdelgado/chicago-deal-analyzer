import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { useApp } from '../store/AppContext';
import type { MarketType, PropertyType, ConstructionType, RehabLevel } from '../types';
import { fmt, fmtPct, getMultiplier, getVerdict, verdictColor, verdictBg, verdictLabel } from '../utils';

const REHAB_RANGES: Record<RehabLevel, [number, number]> = {
  light: [25, 40],
  moderate: [50, 75],
  gut: [90, 150],
};

const ITEMIZED_LABELS: Record<string, string> = {
  foundation: 'Foundation / Structure',
  roof: 'Roof',
  kitchen: 'Kitchen',
  baths: 'Bathrooms',
  hvac: 'HVAC',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  windows: 'Windows',
  flooring: 'Flooring',
  paint: 'Paint / Cosmetic',
  landscaping: 'Landscaping',
};

function InputField({ label, value, onChange, prefix = '$', suffix = '', step = 1000, min = 0 }: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; step?: number; min?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</label>
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-3 text-slate-400 text-sm">{prefix}</span>}
        <input
          type="number"
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          min={min}
          className={`w-full bg-slate-800/60 border border-slate-600/50 rounded-lg py-2.5 text-white text-sm
            focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all
            ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-10' : 'pr-3'}`}
        />
        {suffix && <span className="absolute right-3 text-slate-400 text-sm">{suffix}</span>}
      </div>
    </div>
  );
}

function SectionCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4">{title}</h3>
      {children}
    </div>
  );
}

const CustomWaterfallTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-600/50 rounded-lg p-3 text-sm">
        <p className="text-white font-semibold">{payload[0]?.payload?.name}</p>
        <p className="text-blue-400">{fmt(payload[0]?.value || 0)}</p>
      </div>
    );
  }
  return null;
};

export default function DealAnalyzer() {
  const { analyzer: s, setAnalyzer: set, addDeal, setBrrrr, setHardMoney } = useApp();
  const [added, setAdded] = useState(false);

  const upd = (key: keyof typeof s) => (val: any) => set(prev => ({ ...prev, [key]: val }));

  // ARV Calculation — rounded to nearest dollar to avoid floating point display issues
  const arvValues = [s.zillowArv, s.redfinArv, s.realtorArv].filter(v => v > 0);
  const blendedArv = arvValues.length > 0 ? Math.round(arvValues.reduce((a, b) => a + b, 0) / arvValues.length) : 0;

  // Rehab Calculation
  const [rehabMin, rehabMax] = REHAB_RANGES[s.rehabLevel];
  const suggestedRehab = s.sqft * ((rehabMin + rehabMax) / 2);
  const itemizedTotal = Object.values(s.itemizedRehab).reduce((a, b) => a + b, 0);
  const baseRehab = s.showItemized ? itemizedTotal : (s.useCustomRehab ? s.customRehab : suggestedRehab);
  const contingencyAmt = baseRehab * (s.contingencyPct / 100);
  const totalRehab = baseRehab + contingencyAmt;

  // Sync to BRRRR and Hard Money whenever key deal values change
  useEffect(() => {
    if (blendedArv <= 0) return;
    const roundedArv = Math.round(blendedArv);
    const roundedRehab = Math.round(totalRehab);
    setBrrrr(prev => ({
      ...prev,
      arv: roundedArv,
      purchasePrice: s.purchasePrice,
      rehabCost: roundedRehab,
      monthlyTaxes: s.monthlyTaxes,
      monthlyInsurance: s.monthlyInsurance,
    }));
    setHardMoney(prev => ({
      ...prev,
      arv: roundedArv,
      purchasePrice: s.purchasePrice,
      rehabCost: roundedRehab,
      market: s.market,
      holdingMonths: s.holdingMonths,
      sellingClosingPct: s.sellingClosingPct,
    }));
  }, [blendedArv, s.purchasePrice, totalRehab, s.market, s.monthlyTaxes, s.monthlyInsurance, s.holdingMonths, s.sellingClosingPct]);

  // MAO
  const multiplier = getMultiplier(s.market);
  const mao = blendedArv * multiplier - totalRehab;

  // Costs
  const buyClosing = s.purchasePrice * (s.buyingClosingPct / 100);
  const sellClosing = blendedArv * (s.sellingClosingPct / 100);
  const totalHolding = s.holdingMonths * (s.monthlyTaxes + s.monthlyInsurance + s.monthlyUtilities + s.monthlyInterest);
  const totalCosts = buyClosing + sellClosing + totalHolding;

  // Profit
  const grossProfit = blendedArv - s.purchasePrice - totalRehab;
  const netProfit = grossProfit - totalCosts;
  const roi = s.purchasePrice > 0 ? (netProfit / (s.purchasePrice + totalRehab + buyClosing)) * 100 : 0;
  const verdict = getVerdict(netProfit);
  const spread = blendedArv - mao - totalRehab;

  const handleAddToDashboard = () => {
    if (!blendedArv || !s.purchasePrice) return;
    addDeal({
      address: s.address || 'Unnamed Property',
      arv: blendedArv,
      purchasePrice: s.purchasePrice,
      rehabCost: totalRehab,
      grossProfit,
      netProfit,
      roi,
      verdict,
      strategy: 'flip',
      market: s.market,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  // Waterfall chart data
  const waterfallData = [
    { name: 'ARV', value: blendedArv, fill: '#3b82f6' },
    { name: 'Purchase', value: -s.purchasePrice, fill: '#f43f5e' },
    { name: 'Rehab', value: -totalRehab, fill: '#f59e0b' },
    { name: 'Closing', value: -(buyClosing + sellClosing), fill: '#a78bfa' },
    { name: 'Holding', value: -totalHolding, fill: '#fb923c' },
    { name: 'Net Profit', value: netProfit, fill: netProfit >= 40000 ? '#10b981' : netProfit >= 20000 ? '#f59e0b' : '#f43f5e' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Deal Analyzer</h2>
          <p className="text-slate-400 text-sm mt-0.5">Chicago investor formula — MAO = ARV × multiplier – Repairs</p>
        </div>
        <button
          onClick={handleAddToDashboard}
          disabled={!blendedArv || !s.purchasePrice}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {added ? '✓ Added!' : '+ Add to Portfolio'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ARV Section */}
        <SectionCard title="ARV — After Repair Value">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Property Address</label>
              <input
                type="text"
                value={s.address}
                onChange={e => upd('address')(e.target.value)}
                placeholder="e.g. 1842 S Millard Ave, Chicago IL"
                className="w-full mt-1 bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2.5 text-white text-sm
                  focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Square Footage" value={s.sqft} onChange={upd('sqft')} prefix="" suffix="sqft" step={100} />
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Market</label>
                <select
                  value={s.market}
                  onChange={e => upd('market')(e.target.value as MarketType)}
                  className="w-full mt-1 bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2.5 text-white text-sm
                    focus:outline-none focus:border-blue-500/70 transition-all"
                >
                  <option value="cool">Cool — South/West Side (65%)</option>
                  <option value="moderate">Moderate (70%)</option>
                  <option value="hot">Hot — North Side/Suburbs (75%)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <InputField label="Zillow ARV" value={s.zillowArv} onChange={upd('zillowArv')} step={5000} />
              <InputField label="Redfin ARV" value={s.redfinArv} onChange={upd('redfinArv')} step={5000} />
              <InputField label="Realtor ARV" value={s.realtorArv} onChange={upd('realtorArv')} step={5000} />
            </div>
            {/* Blended ARV display */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-300">Blended ARV</span>
              <span className="text-2xl font-bold text-blue-400">{blendedArv > 0 ? fmt(blendedArv) : '—'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Property Type</label>
                <select
                  value={s.propertyType}
                  onChange={e => upd('propertyType')(e.target.value as PropertyType)}
                  className="w-full mt-1 bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2.5 text-white text-sm
                    focus:outline-none focus:border-blue-500/70 transition-all"
                >
                  <option value="single-family">Single Family</option>
                  <option value="2-flat">2-Flat</option>
                  <option value="multi-unit">Multi-Unit (3-4)</option>
                  <option value="apartment">Apartment (5-100+)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Construction</label>
                <select
                  value={s.constructionType}
                  onChange={e => upd('constructionType')(e.target.value as ConstructionType)}
                  className="w-full mt-1 bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2.5 text-white text-sm
                    focus:outline-none focus:border-blue-500/70 transition-all"
                >
                  <option value="brick">Brick (higher ARV)</option>
                  <option value="frame">Frame</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Beds" value={s.beds} onChange={upd('beds')} prefix="" step={1} />
              <InputField label="Baths" value={s.baths} onChange={upd('baths')} prefix="" step={0.5} />
            </div>
          </div>
        </SectionCard>

        {/* Rehab Section */}
        <SectionCard title="Rehab Estimate">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">Rehab Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'moderate', 'gut'] as RehabLevel[]).map(level => {
                  const [lo, hi] = REHAB_RANGES[level];
                  const active = s.rehabLevel === level && !s.showItemized;
                  return (
                    <button
                      key={level}
                      onClick={() => { upd('rehabLevel')(level); upd('showItemized')(false); }}
                      className={`p-3 rounded-lg border text-left transition-all ${active
                        ? 'bg-blue-600/20 border-blue-500/60 text-blue-300'
                        : 'bg-slate-800/60 border-slate-600/40 text-slate-400 hover:border-slate-500'}`}
                    >
                      <div className="text-xs font-semibold capitalize">{level}</div>
                      <div className="text-xs mt-0.5">${lo}–${hi}/sqft</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {!s.showItemized && (
              <div className="bg-slate-700/30 rounded-lg p-3 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Suggested range:</span>
                  <span className="text-white">{fmt(s.sqft * REHAB_RANGES[s.rehabLevel][0])} – {fmt(s.sqft * REHAB_RANGES[s.rehabLevel][1])}</span>
                </div>
                <div className="flex justify-between text-slate-400 mt-1">
                  <span>Midpoint:</span>
                  <span className="text-amber-400 font-semibold">{fmt(suggestedRehab)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => upd('useCustomRehab')(!s.useCustomRehab)}
                className={`text-xs px-3 py-1.5 rounded-md border transition-all ${s.useCustomRehab
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-slate-800 border-slate-600/50 text-slate-400 hover:text-slate-300'}`}
              >
                Manual Override
              </button>
              <button
                onClick={() => upd('showItemized')(!s.showItemized)}
                className={`text-xs px-3 py-1.5 rounded-md border transition-all ${s.showItemized
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                  : 'bg-slate-800 border-slate-600/50 text-slate-400 hover:text-slate-300'}`}
              >
                Itemized Breakdown
              </button>
            </div>

            {s.useCustomRehab && !s.showItemized && (
              <InputField label="Custom Rehab Cost" value={s.customRehab} onChange={upd('customRehab')} step={5000} />
            )}

            {s.showItemized && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {Object.entries(ITEMIZED_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-36 flex-shrink-0">{label}</span>
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        value={s.itemizedRehab[key as keyof typeof s.itemizedRehab] || ''}
                        onChange={e => set(prev => ({
                          ...prev,
                          itemizedRehab: { ...prev.itemizedRehab, [key]: parseFloat(e.target.value) || 0 }
                        }))}
                        step={500}
                        min={0}
                        className="w-full bg-slate-800/60 border border-slate-600/50 rounded-md pl-5 pr-2 py-1.5 text-white text-xs
                          focus:outline-none focus:border-blue-500/70 transition-all"
                      />
                    </div>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-2 border-t border-slate-600/40">
                  <span className="text-slate-400">Itemized Total</span>
                  <span className="text-amber-400 font-semibold">{fmt(itemizedTotal)}</span>
                </div>
              </div>
            )}

            {/* Contingency */}
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">Contingency</label>
              <div className="flex gap-2">
                {[10, 15].map(pct => (
                  <button
                    key={pct}
                    onClick={() => upd('contingencyPct')(pct)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${s.contingencyPct === pct
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                      : 'bg-slate-800/60 border-slate-600/40 text-slate-400 hover:text-slate-300'}`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Rehab Summary */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Base Rehab</span>
                <span className="text-white">{fmt(baseRehab)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Contingency ({s.contingencyPct}%)</span>
                <span className="text-rose-400">+ {fmt(contingencyAmt)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-amber-500/20 pt-1.5">
                <span className="text-slate-300">Total Rehab</span>
                <span className="text-amber-400 text-lg">{fmt(totalRehab)}</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* MAO Section */}
        <SectionCard title="MAO — Maximum Allowable Offer">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className={`p-3 rounded-lg border ${s.market === 'cool' ? 'bg-blue-600/20 border-blue-500/50' : 'bg-slate-800/40 border-slate-700/40'}`}>
                <div className="text-xs text-slate-400">Cool</div>
                <div className="text-lg font-bold text-blue-400">65%</div>
              </div>
              <div className={`p-3 rounded-lg border ${s.market === 'moderate' ? 'bg-amber-600/20 border-amber-500/50' : 'bg-slate-800/40 border-slate-700/40'}`}>
                <div className="text-xs text-slate-400">Moderate</div>
                <div className="text-lg font-bold text-amber-400">70%</div>
              </div>
              <div className={`p-3 rounded-lg border ${s.market === 'hot' ? 'bg-rose-600/20 border-rose-500/50' : 'bg-slate-800/40 border-slate-700/40'}`}>
                <div className="text-xs text-slate-400">Hot</div>
                <div className="text-lg font-bold text-rose-400">75%</div>
              </div>
            </div>

            <div className="bg-slate-700/30 rounded-lg p-3 space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">ARV × {(multiplier * 100).toFixed(0)}%</span>
                <span className="text-blue-400">{fmt(blendedArv * multiplier)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">− Repairs</span>
                <span className="text-rose-400">− {fmt(totalRehab)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-600/40 pt-2">
                <span className="text-slate-200">= MAO</span>
                <span className={mao > 0 ? 'text-emerald-400' : 'text-rose-400'}>{mao > 0 ? fmt(mao) : 'Negative'}</span>
              </div>
            </div>

            <InputField label="Your Offer / Purchase Price" value={s.purchasePrice} onChange={upd('purchasePrice')} step={5000} />

            {s.purchasePrice > 0 && (
              <div className={`p-3 rounded-lg border text-sm ${s.purchasePrice <= mao ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                {s.purchasePrice <= mao
                  ? <span className="text-emerald-400">✓ Purchase price is at or below MAO</span>
                  : <span className="text-rose-400">⚠ Purchase price is {fmt(s.purchasePrice - mao)} above MAO</span>
                }
              </div>
            )}

            <div className="bg-slate-700/30 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Spread (ARV − MAO − Rehab)</span>
                <span className={spread > 30000 ? 'text-emerald-400' : spread > 0 ? 'text-amber-400' : 'text-rose-400'}>
                  {fmt(spread)}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-400">Gross Profit (before costs)</span>
                <span className={grossProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}>{fmt(grossProfit)}</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Cost Stack */}
        <SectionCard title="Cost Stack">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Buying Closing %" value={s.buyingClosingPct} onChange={upd('buyingClosingPct')} prefix="" suffix="%" step={0.5} />
              <InputField label="Selling Closing %" value={s.sellingClosingPct} onChange={upd('sellingClosingPct')} prefix="" suffix="%" step={0.5} />
            </div>
            <InputField label="Holding Period" value={s.holdingMonths} onChange={upd('holdingMonths')} prefix="" suffix="mo" step={1} />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Monthly Taxes" value={s.monthlyTaxes} onChange={upd('monthlyTaxes')} step={100} />
              <InputField label="Monthly Insurance" value={s.monthlyInsurance} onChange={upd('monthlyInsurance')} step={50} />
              <InputField label="Monthly Utilities" value={s.monthlyUtilities} onChange={upd('monthlyUtilities')} step={50} />
              <InputField label="Monthly Interest" value={s.monthlyInterest} onChange={upd('monthlyInterest')} step={100} />
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Buy Closing</span><span>{fmt(buyClosing)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Sell Closing</span><span>{fmt(sellClosing)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Holding ({s.holdingMonths}mo)</span><span>{fmt(totalHolding)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-slate-600/40 pt-1.5">
                <span className="text-slate-300">Total Costs</span>
                <span className="text-rose-400">{fmt(totalCosts)}</span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Verdict Panel */}
      <div className={`rounded-xl border p-6 ${verdictBg(verdict)}`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="text-4xl font-black tracking-tight mb-2">{verdictLabel(verdict)}</div>
            <div className="text-slate-400 text-sm space-y-1">
              <p>2-Minute Deal Killer Test:</p>
              <div className="flex gap-4 text-xs mt-1">
                <span className={blendedArv > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                  {blendedArv > 0 ? '✓' : '○'} ARV
                </span>
                <span className={totalRehab > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                  {totalRehab > 0 ? '✓' : '○'} Rehab
                </span>
                <span className={grossProfit > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                  {grossProfit > 0 ? '✓' : '○'} Spread
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
            {[
              { label: 'ARV', value: fmt(blendedArv) },
              { label: 'Gross Profit', value: fmt(grossProfit) },
              { label: 'Net Profit', value: fmt(netProfit), color: verdictColor(verdict) },
              { label: 'ROI', value: blendedArv > 0 ? fmtPct(roi) : '—', color: verdictColor(verdict) },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-900/40 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-400 mb-1">{label}</div>
                <div className={`text-lg font-bold ${color || 'text-white'}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Waterfall Chart */}
      <SectionCard title="Profit Waterfall">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfallData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `$${Math.abs(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomWaterfallTooltip />} />
              <ReferenceLine y={0} stroke="#475569" />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {waterfallData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
