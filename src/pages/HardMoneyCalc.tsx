import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { useApp } from '../store/AppContext';
import type { MarketType } from '../types';
import { fmt, fmtPct, getMultiplier, getVerdict, verdictColor, verdictLabel, verdictBg } from '../utils';

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

export default function HardMoneyCalc() {
  const { hardMoney: s, setHardMoney: set, addDeal, analyzer } = useApp();
  const [added, setAdded] = useState(false);

  const analyzerHasData = [analyzer.zillowArv, analyzer.redfinArv, analyzer.realtorArv].some(v => v > 0);

  const upd = (key: keyof typeof s) => (val: any) => set(prev => ({ ...prev, [key]: val }));

  // ─── Hard Money: Loan is based on ARV ───────────────────────────────
  // Lender lends X% of ARV. That single loan covers purchase + rehab.
  // Investor brings the gap (total project cost − loan) plus points.
  const loanAmount = s.arv * (s.loanToArvPct / 100);
  const totalProjectCost = s.purchasePrice + s.rehabCost;
  const pointsCost = loanAmount * (s.points / 100);
  const monthlyInterest = loanAmount * (s.interestRate / 100 / 12);
  const totalInterest = monthlyInterest * s.termMonths;

  // Cash investor must bring = gap between project cost and loan + points fee
  const cashGap = Math.max(0, totalProjectCost - loanAmount);
  const totalCashInDeal = cashGap + pointsCost;

  // Does the loan fully cover purchase + rehab?
  const loanCoversAll = loanAmount >= totalProjectCost;

  // Profit analysis
  const multiplier = getMultiplier(s.market);
  const mao = s.arv * multiplier - s.rehabCost;
  const sellClosing = s.arv * (s.sellingClosingPct / 100);
  const holdingInterest = monthlyInterest * s.holdingMonths;
  const netProfit = s.arv - s.purchasePrice - s.rehabCost - pointsCost - sellClosing - holdingInterest;
  const roiOnCash = totalCashInDeal > 0 ? (netProfit / totalCashInDeal) * 100 : 0;
  const monthlyBurnRate = monthlyInterest;

  const verdict = getVerdict(netProfit);

  // Timeline — investor's running cash position
  const timelineData = Array.from({ length: Math.max(s.termMonths, s.holdingMonths) + 1 }, (_, i) => {
    const interestAccrued = monthlyInterest * Math.min(i, s.holdingMonths);
    const cashOut = totalCashInDeal + interestAccrued;
    const cashIn = i >= s.holdingMonths ? (s.arv - sellClosing - loanAmount) : 0;
    return {
      month: i,
      cumulative: cashIn > 0 ? cashIn - totalCashInDeal : -cashOut,
    };
  });

  const handleAdd = () => {
    addDeal({
      address: 'Hard Money Deal',
      arv: s.arv,
      purchasePrice: s.purchasePrice,
      rehabCost: s.rehabCost,
      grossProfit: s.arv - s.purchasePrice - s.rehabCost,
      netProfit,
      roi: roiOnCash,
      verdict,
      strategy: 'flip',
      market: s.market,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Hard Money Calculator</h2>
            {analyzerHasData && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400">
                ⟳ Synced from Deal Analyzer
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm mt-0.5">Financing is a tool, not a strategy — you still buy at MAO or below</p>
        </div>
        <button
          onClick={handleAdd}
          disabled={!s.arv || !s.purchasePrice}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {added ? '✓ Added!' : '+ Add to Portfolio'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Deal Inputs */}
        <SectionCard title="Deal Inputs">
          <div className="space-y-3">
            <InputField label="Purchase Price" value={s.purchasePrice} onChange={upd('purchasePrice')} step={5000} />
            <InputField label="ARV (After Repair Value)" value={s.arv} onChange={upd('arv')} step={10000} />
            <InputField label="Rehab Cost" value={s.rehabCost} onChange={upd('rehabCost')} step={5000} />
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Market Type</label>
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

            {/* MAO check */}
            <div className={`p-3 rounded-lg border text-sm ${s.purchasePrice <= mao && mao > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
              <div className="flex justify-between">
                <span className="text-slate-400">MAO ({(getMultiplier(s.market) * 100).toFixed(0)}% rule):</span>
                <span className="text-white font-semibold">{fmt(mao)}</span>
              </div>
              <div className={`mt-1 text-xs ${s.purchasePrice <= mao ? 'text-emerald-400' : 'text-amber-400'}`}>
                {s.purchasePrice <= mao ? '✓ Purchase at/below MAO' : `⚠ ${fmt(s.purchasePrice - mao)} above MAO — leverage doesn't fix this`}
              </div>
            </div>

            {/* Project cost summary */}
            <div className="bg-slate-700/30 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-400"><span>Purchase</span><span>{fmt(s.purchasePrice)}</span></div>
              <div className="flex justify-between text-slate-400"><span>Rehab</span><span>{fmt(s.rehabCost)}</span></div>
              <div className="flex justify-between font-semibold border-t border-slate-600/40 pt-1.5 text-white">
                <span>Total Project Cost</span><span>{fmt(totalProjectCost)}</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Loan Terms */}
        <SectionCard title="Hard Money Loan Terms">
          <div className="space-y-4">
            {/* ARV-based LTV slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Loan-to-ARV</label>
                <span className="text-blue-400 font-bold text-sm">{s.loanToArvPct}% of ARV</span>
              </div>
              <input
                type="range" min={60} max={90} step={5} value={s.loanToArvPct}
                onChange={e => upd('loanToArvPct')(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>60%</span><span>65%</span><span>70%</span><span>75%</span><span>80%</span><span>85%</span><span>90%</span>
              </div>
            </div>

            {/* Loan amount display */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-slate-400">Loan Amount</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.loanToArvPct}% × {fmt(s.arv)} ARV</div>
                </div>
                <div className="text-2xl font-bold text-blue-400">{fmt(loanAmount)}</div>
              </div>
              <div className={`mt-2 pt-2 border-t border-blue-500/20 text-xs flex items-center gap-2 ${loanCoversAll ? 'text-emerald-400' : 'text-amber-400'}`}>
                {loanCoversAll
                  ? `✓ Loan covers full project cost + ${fmt(loanAmount - totalProjectCost)} extra`
                  : `⚠ Loan is ${fmt(totalProjectCost - loanAmount)} short of project cost`}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InputField label="Interest Rate" value={s.interestRate} onChange={upd('interestRate')} prefix="" suffix="%" step={0.5} />
              <InputField label="Points" value={s.points} onChange={upd('points')} prefix="" suffix="pts" step={0.5} />
              <InputField label="Loan Term" value={s.termMonths} onChange={upd('termMonths')} prefix="" suffix="mo" step={3} min={3} />
              <InputField label="Holding Period" value={s.holdingMonths} onChange={upd('holdingMonths')} prefix="" suffix="mo" step={1} min={1} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Points Cost', value: fmt(pointsCost), color: 'text-rose-400' },
                { label: 'Monthly Interest', value: fmt(monthlyInterest), color: 'text-amber-400' },
                { label: `Interest (${s.holdingMonths}mo)`, value: fmt(holdingInterest), color: 'text-rose-400' },
                { label: 'Total Interest (full term)', value: fmt(totalInterest), color: 'text-slate-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/40">
                  <div className="text-xs text-slate-400">{label}</div>
                  <div className={`text-sm font-bold mt-0.5 ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Cash Required */}
        <SectionCard title="Cash Requirement">
          <div className="space-y-3">
            <div className="bg-slate-700/30 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Purchase Price</span><span>{fmt(s.purchasePrice)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Rehab Cost</span><span>{fmt(s.rehabCost)}</span>
              </div>
              <div className="flex justify-between font-semibold text-white border-t border-slate-600/30 pt-2">
                <span>Total Project Cost</span><span>{fmt(totalProjectCost)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Hard Money Loan ({s.loanToArvPct}% of ARV)</span><span>− {fmt(loanAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-400 border-t border-slate-600/30 pt-2">
                <span>Gap (out of pocket)</span>
                <span className={cashGap === 0 ? 'text-emerald-400' : 'text-white'}>{cashGap === 0 ? '✓ $0 — fully funded' : fmt(cashGap)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>Points ({s.points} pts)</span><span>+ {fmt(pointsCost)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-slate-600/30 pt-2">
                <span className="text-slate-200">Total Cash In Deal</span>
                <span className="text-blue-400">{fmt(totalCashInDeal)}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-700/20 rounded-lg text-xs space-y-1.5 text-slate-400">
              <div className="flex justify-between">
                <span className="text-amber-400 font-medium">Monthly Burn Rate</span>
                <span className="text-white">{fmt(monthlyBurnRate)}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400 font-medium">Lender LTV at close</span>
                <span className="text-white">{s.arv > 0 ? fmtPct((loanAmount / s.arv) * 100) : '—'} of ARV</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Profit Analysis */}
        <SectionCard title="Profit Analysis">
          <div className="space-y-3">
            <InputField label="Selling Closing %" value={s.sellingClosingPct} onChange={upd('sellingClosingPct')} prefix="" suffix="%" step={0.5} />
            <div className="bg-slate-700/30 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-400"><span>ARV (Sale Price)</span><span>{fmt(s.arv)}</span></div>
              <div className="flex justify-between text-rose-400"><span>Purchase</span><span>− {fmt(s.purchasePrice)}</span></div>
              <div className="flex justify-between text-rose-400"><span>Rehab</span><span>− {fmt(s.rehabCost)}</span></div>
              <div className="flex justify-between text-rose-400"><span>Points ({s.points} pts)</span><span>− {fmt(pointsCost)}</span></div>
              <div className="flex justify-between text-rose-400"><span>Sell Closing ({s.sellingClosingPct}%)</span><span>− {fmt(sellClosing)}</span></div>
              <div className="flex justify-between text-rose-400"><span>Interest ({s.holdingMonths}mo × {fmt(monthlyInterest)}/mo)</span><span>− {fmt(holdingInterest)}</span></div>
              <div className={`flex justify-between font-bold text-base border-t border-slate-600/40 pt-1.5 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span>Net Profit</span><span>{fmt(netProfit)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/60 border border-slate-700/40 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-400">ROI on Cash In</div>
                <div className={`text-xl font-bold mt-0.5 ${roiOnCash >= 30 ? 'text-emerald-400' : roiOnCash >= 15 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {totalCashInDeal > 0 ? fmtPct(roiOnCash) : '∞'}
                </div>
              </div>
              <div className={`border rounded-lg p-3 text-center ${verdictBg(verdict)}`}>
                <div className="text-xs text-slate-400">Verdict</div>
                <div className={`text-base font-bold mt-0.5 ${verdictColor(verdict)}`}>{verdictLabel(verdict)}</div>
              </div>
            </div>

            {/* The leverage insight */}
            <div className="bg-slate-700/20 rounded-lg p-3 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Without leverage (all cash ROI)</span>
                <span className="text-white">{totalProjectCost > 0 ? fmtPct((netProfit / totalProjectCost) * 100) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400">With hard money (levered ROI)</span>
                <span className="text-blue-400 font-semibold">{totalCashInDeal > 0 ? fmtPct(roiOnCash) : '∞'}</span>
              </div>
              <div className="text-slate-500 pt-1 border-t border-slate-600/30">
                Leverage multiplies your return on deployed cash — but the deal must work first.
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Cash Flow Timeline */}
      <SectionCard title="Cash Flow Timeline — Investor's Running Position">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData} margin={{ top: 5, right: 20, left: 15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: 'Month', position: 'insideBottom', offset: -3, fill: '#64748b', fontSize: 11 }}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={v => `${v >= 0 ? '+' : ''}$${(v / 1000).toFixed(0)}k`}
              />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
              <ReferenceLine
                x={s.holdingMonths}
                stroke="#f59e0b"
                strokeDasharray="4 2"
                label={{ value: 'Sale', fill: '#f59e0b', fontSize: 11 }}
              />
              <Tooltip
                formatter={(v: any) => fmt(v as number)}
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Net Position"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Shows investor cash position over time. Red zone = cash out during rehab/hold. Jump at sale = profit after loan payoff + all costs.
        </p>
      </SectionCard>
    </div>
  );
}
