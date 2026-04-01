import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { useApp } from '../store/AppContext';
import { fmt, fmtPct, calcMortgagePayment } from '../utils';

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

export default function BRRRRCalc() {
  const { brrrr: s, setBrrrr: set, addDeal, analyzer } = useApp();
  const [added, setAdded] = useState(false);

  const analyzerHasData = [analyzer.zillowArv, analyzer.redfinArv, analyzer.realtorArv].some(v => v > 0);

  const upd = (key: keyof typeof s) => (val: any) => set(prev => ({ ...prev, [key]: val }));

  // All-In Cost
  const allIn = s.purchasePrice + s.rehabCost + s.closingCosts + s.holdingCosts;

  // Refinance
  const cashOut = s.arv * (s.refiLtv / 100);
  const moneyLeftIn = allIn - cashOut;

  // Rental
  const effectiveRent = s.monthlyRent * (1 - s.vacancyRate / 100);
  const mgmtCost = effectiveRent * (s.mgmtRate / 100);
  const capexCost = effectiveRent * (s.capexRate / 100);
  const noi = effectiveRent - mgmtCost - capexCost - s.monthlyTaxes - s.monthlyInsurance;
  const refiLoanAmount = cashOut;
  const mortgage = calcMortgagePayment(refiLoanAmount, s.refiRate, s.refiTermYears);
  const monthlyCashFlow = noi - mortgage;
  const annualCashFlow = monthlyCashFlow * 12;

  // Returns
  const capRate = s.arv > 0 ? (noi * 12 / s.arv) * 100 : 0;
  const cocReturn = moneyLeftIn > 0 ? (annualCashFlow / moneyLeftIn) * 100 : moneyLeftIn <= 0 ? Infinity : 0;

  // Verdict — must pass BOTH equity recovery AND positive cash flow
  const capitalRecovered = moneyLeftIn <= 5000;
  const cashFlowPositive = monthlyCashFlow > 0;
  const cashFlowStrong = monthlyCashFlow >= 200;

  const isPerfect = capitalRecovered && cashFlowPositive;
  const isGood = !isPerfect && cashFlowPositive && (moneyLeftIn <= 20000 || cocReturn > 15);
  const isEquityOnly = capitalRecovered && !cashFlowPositive; // got money back but bleeds monthly
  // else: trapped capital OR negative cash flow

  const handleAdd = () => {
    const netProfit = annualCashFlow * 5 + (cashOut - allIn); // simplified 5yr value
    addDeal({
      address: 'BRRRR Deal',
      arv: s.arv,
      purchasePrice: s.purchasePrice,
      rehabCost: s.rehabCost,
      grossProfit: cashOut - allIn,
      netProfit,
      roi: cocReturn === Infinity ? 999 : cocReturn,
      verdict: isPerfect ? 'buy' : isGood ? 'buy' : isEquityOnly ? 'counter' : 'walk',
      strategy: 'brrrr',
      market: 'moderate',
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const equityValue = s.arv - refiLoanAmount;
  const pieData = [
    { name: 'Your Equity', value: Math.max(0, equityValue) },
    { name: 'Loan Balance', value: Math.max(0, refiLoanAmount) },
    { name: 'Cash Out Returned', value: Math.max(0, cashOut - moneyLeftIn > 0 ? cashOut - moneyLeftIn : 0) },
  ];

  const incomeData = [
    { name: 'Gross Rent', income: s.monthlyRent, type: 'income' },
    { name: 'Vacancy', expense: s.monthlyRent * (s.vacancyRate / 100) },
    { name: 'Management', expense: mgmtCost },
    { name: 'CapEx', expense: capexCost },
    { name: 'Taxes', expense: s.monthlyTaxes },
    { name: 'Insurance', expense: s.monthlyInsurance },
    { name: 'Mortgage', expense: mortgage },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f43f5e'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">BRRRR Calculator</h2>
            {analyzerHasData && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400">
                ⟳ Synced from Deal Analyzer
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm mt-0.5">Buy · Rehab · Rent · Refinance · Repeat — the wealth-building machine</p>
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
        <SectionCard title="Deal Structure">
          <div className="space-y-3">
            <InputField label="ARV (After Repair Value)" value={s.arv} onChange={upd('arv')} step={10000} />
            <InputField label="Purchase Price" value={s.purchasePrice} onChange={upd('purchasePrice')} step={5000} />
            <InputField label="Rehab Cost" value={s.rehabCost} onChange={upd('rehabCost')} step={5000} />
            <InputField label="Closing Costs (Buy Side)" value={s.closingCosts} onChange={upd('closingCosts')} step={1000} />
            <InputField label="Holding Costs (During Rehab)" value={s.holdingCosts} onChange={upd('holdingCosts')} step={1000} />
            <div className="bg-slate-700/30 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-400"><span>Purchase</span><span>{fmt(s.purchasePrice)}</span></div>
              <div className="flex justify-between text-slate-400"><span>Rehab</span><span>{fmt(s.rehabCost)}</span></div>
              <div className="flex justify-between text-slate-400"><span>Closing</span><span>{fmt(s.closingCosts)}</span></div>
              <div className="flex justify-between text-slate-400"><span>Holding</span><span>{fmt(s.holdingCosts)}</span></div>
              <div className="flex justify-between font-bold border-t border-slate-600/40 pt-1.5 text-white">
                <span>All-In Cost</span><span className="text-blue-400 text-base">{fmt(allIn)}</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Refinance */}
        <SectionCard title="Refinance Analysis">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">Refi LTV: {s.refiLtv}%</label>
              <input
                type="range" min={60} max={80} step={5} value={s.refiLtv}
                onChange={e => upd('refiLtv')(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1"><span>60%</span><span>65%</span><span>70%</span><span>75%</span><span>80%</span></div>
            </div>
            <InputField label="Refi Interest Rate" value={s.refiRate} onChange={upd('refiRate')} prefix="" suffix="%" step={0.25} />
            <InputField label="Loan Term" value={s.refiTermYears} onChange={upd('refiTermYears')} prefix="" suffix="yrs" step={5} min={10} />

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-400 mb-1">Cash-Out</div>
                <div className="text-xl font-bold text-blue-400">{fmt(cashOut)}</div>
              </div>
              <div className={`border rounded-lg p-3 text-center ${moneyLeftIn <= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : moneyLeftIn < 15000 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                <div className="text-xs text-slate-400 mb-1">Money Left In</div>
                <div className={`text-xl font-bold ${moneyLeftIn <= 0 ? 'text-emerald-400' : moneyLeftIn < 15000 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {moneyLeftIn <= 0 ? `+${fmt(Math.abs(moneyLeftIn))}` : fmt(moneyLeftIn)}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400 bg-slate-700/20 rounded-lg p-3">
              <strong className="text-slate-300">Rule:</strong> All-In ≤ 70–75% of ARV to pull all money out.<br />
              Target: All-In ≤ {fmt(s.arv * 0.75)}
            </div>

            <div className={`rounded-lg p-4 border ${
              isPerfect ? 'bg-emerald-500/10 border-emerald-500/40' :
              isGood ? 'bg-blue-500/10 border-blue-500/40' :
              isEquityOnly ? 'bg-amber-500/10 border-amber-500/40' :
              'bg-rose-500/10 border-rose-500/40'
            }`}>
              <div className={`text-xl font-black mb-2 ${
                isPerfect ? 'text-emerald-400' : isGood ? 'text-blue-400' : isEquityOnly ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {isPerfect ? '🏆 Perfect BRRRR' : isGood ? '✅ Good BRRRR' : isEquityOnly ? '⚠️ Equity Trap' : '🔴 Kill It'}
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Capital Recovery</span>
                  <span className={capitalRecovered ? 'text-emerald-400' : 'text-rose-400'}>
                    {capitalRecovered ? `✓ ${fmt(Math.abs(moneyLeftIn))} over-recovered` : `✗ ${fmt(moneyLeftIn)} still trapped`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Monthly Cash Flow</span>
                  <span className={cashFlowPositive ? (cashFlowStrong ? 'text-emerald-400' : 'text-amber-400') : 'text-rose-400'}>
                    {cashFlowPositive ? `✓ ${fmt(monthlyCashFlow)}/mo` : `✗ ${fmt(monthlyCashFlow)}/mo — bleeding`}
                  </span>
                </div>
                {isEquityOnly && (
                  <div className="mt-2 pt-2 border-t border-amber-500/20 text-amber-300">
                    Got all cash out but the rental loses money monthly. This is an equity play, not a BRRRR.
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Rental Analysis */}
        <SectionCard title="Rental Income Analysis">
          <div className="space-y-3">
            <InputField label="Monthly Rent" value={s.monthlyRent} onChange={upd('monthlyRent')} step={100} />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Vacancy Rate" value={s.vacancyRate} onChange={upd('vacancyRate')} prefix="" suffix="%" step={1} />
              <InputField label="Management" value={s.mgmtRate} onChange={upd('mgmtRate')} prefix="" suffix="%" step={1} />
              <InputField label="Maintenance/CapEx" value={s.capexRate} onChange={upd('capexRate')} prefix="" suffix="%" step={1} />
              <InputField label="Monthly Taxes" value={s.monthlyTaxes} onChange={upd('monthlyTaxes')} step={50} />
            </div>
            <InputField label="Monthly Insurance" value={s.monthlyInsurance} onChange={upd('monthlyInsurance')} step={25} />

            <div className="bg-slate-700/30 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-400"><span>Effective Rent</span><span>{fmt(effectiveRent)}/mo</span></div>
              <div className="flex justify-between text-slate-400"><span>Management</span><span>-{fmt(mgmtCost)}/mo</span></div>
              <div className="flex justify-between text-slate-400"><span>CapEx</span><span>-{fmt(capexCost)}/mo</span></div>
              <div className="flex justify-between text-slate-400"><span>Taxes</span><span>-{fmt(s.monthlyTaxes)}/mo</span></div>
              <div className="flex justify-between text-slate-400"><span>Insurance</span><span>-{fmt(s.monthlyInsurance)}/mo</span></div>
              <div className="flex justify-between font-semibold border-t border-slate-600/40 pt-1.5 text-blue-400">
                <span>NOI</span><span>{fmt(noi)}/mo</span>
              </div>
              <div className="flex justify-between text-rose-400"><span>New Mortgage</span><span>-{fmt(mortgage)}/mo</span></div>
              <div className={`flex justify-between font-bold text-base border-t border-slate-600/40 pt-1.5 ${monthlyCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span>Cash Flow</span><span>{fmt(monthlyCashFlow)}/mo</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Returns */}
        <SectionCard title="Return Metrics">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Annual Cash Flow', value: fmt(annualCashFlow), color: annualCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400' },
                { label: 'Cap Rate', value: fmtPct(capRate), color: capRate >= 6 ? 'text-emerald-400' : capRate >= 4 ? 'text-amber-400' : 'text-rose-400' },
                { label: 'Cash-on-Cash', value: cocReturn === Infinity ? '∞' : fmtPct(cocReturn), color: 'text-blue-400' },
                { label: 'Monthly Cash Flow', value: fmt(monthlyCashFlow), color: monthlyCashFlow >= 200 ? 'text-emerald-400' : monthlyCashFlow >= 0 ? 'text-amber-400' : 'text-rose-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center border border-slate-700/40">
                  <div className="text-xs text-slate-400 mb-1">{label}</div>
                  <div className={`text-xl font-bold ${color}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Equity Chart */}
            <div className="h-44">
              <p className="text-xs text-slate-400 mb-2">Equity / Debt / Cash Structure</p>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v as number)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Monthly Income/Expense Chart */}
      <SectionCard title="Monthly Income vs Expenses Breakdown">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `$${Math.abs(v / 100).toFixed(0) + 'h'}`} />
              <Tooltip formatter={(v: any) => fmt(v as number)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
