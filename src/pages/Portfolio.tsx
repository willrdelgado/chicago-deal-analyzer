import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useApp } from '../store/AppContext';
import type { Deal } from '../types';
import { fmt, fmtPct, verdictColor, verdictLabel, marketLabel, marketColor } from '../utils';

type SortKey = 'netProfit' | 'arv' | 'purchasePrice' | 'roi' | 'createdAt';

const INSIGHTS = [
  {
    icon: '🧱',
    title: 'Brick vs Frame',
    color: 'blue',
    body: 'Brick = higher ARV, better buyer pool, easier financing. Frame in rough areas = investor-only market with a lower ceiling. Always note construction type in your comps.'
  },
  {
    icon: '🏢',
    title: '2-Flats Are Gold',
    color: 'emerald',
    body: 'Massive demand from house hackers. Strong resale. Can pivot to long-term rental or BRRRR. Chicago\'s sweet spot — if the numbers work, move fast.'
  },
  {
    icon: '⚠️',
    title: 'Basements Lie',
    color: 'amber',
    body: '"Unfinished basement" usually means water issues, foundation problems, or hidden costs. Budget extra in Chicago — frost lines and clay soil are unforgiving.'
  },
  {
    icon: '💸',
    title: 'Cook County Taxes',
    color: 'rose',
    body: 'Always pull Cook County tax records. High taxes can wipe out cash flow on rentals and compress margins on flips. They\'re not always reflected in the listing.'
  },
  {
    icon: '🎯',
    title: 'The Pro Rule',
    color: 'purple',
    body: '"If I wouldn\'t buy it, I don\'t wholesale it, flip it, or touch it." Bad deals always come back. Discipline is the only edge that compounds.'
  },
  {
    icon: '📊',
    title: 'Market by Block',
    color: 'cyan',
    body: 'Chicago is hyper-local. One block can move you from B to D area. Use 0.25–0.5 mile comp radius max. Never pull comps across natural barriers (expressways, parks, rail lines).'
  },
];

const colorMap: Record<string, string> = {
  blue: 'border-blue-500/30 bg-blue-500/5',
  emerald: 'border-emerald-500/30 bg-emerald-500/5',
  amber: 'border-amber-500/30 bg-amber-500/5',
  rose: 'border-rose-500/30 bg-rose-500/5',
  purple: 'border-purple-500/30 bg-purple-500/5',
  cyan: 'border-cyan-500/30 bg-cyan-500/5',
};

const iconColorMap: Record<string, string> = {
  blue: 'text-blue-400', emerald: 'text-emerald-400', amber: 'text-amber-400',
  rose: 'text-rose-400', purple: 'text-purple-400', cyan: 'text-cyan-400',
};

export default function Portfolio() {
  const { deals, removeDeal } = useApp();
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...deals].sort((a, b) => {
    const av = a[sortKey as keyof Deal] as any;
    const bv = b[sortKey as keyof Deal] as any;
    return sortDir === 'desc' ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  // Summary stats
  const totalDeals = deals.length;
  const totalProfit = deals.reduce((s, d) => s + d.netProfit, 0);
  const avgProfit = totalDeals > 0 ? totalProfit / totalDeals : 0;
  const avgRoi = totalDeals > 0 ? deals.reduce((s, d) => s + d.roi, 0) / totalDeals : 0;
  const buyDeals = deals.filter(d => d.verdict === 'buy').length;

  // Market distribution
  const marketDist = [
    { name: 'Cool (65%)', value: deals.filter(d => d.market === 'cool').length, fill: '#3b82f6' },
    { name: 'Moderate (70%)', value: deals.filter(d => d.market === 'moderate').length, fill: '#f59e0b' },
    { name: 'Hot (75%)', value: deals.filter(d => d.market === 'hot').length, fill: '#f43f5e' },
  ].filter(d => d.value > 0);

  // Comparison chart (top 6 by arv)
  const chartDeals = [...deals].sort((a, b) => b.arv - a.arv).slice(0, 6).map(d => ({
    name: d.address.split(',')[0].slice(0, 18),
    ARV: d.arv,
    Purchase: d.purchasePrice,
    Rehab: d.rehabCost,
    Profit: d.netProfit,
  }));

  const SortBtn = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      onClick={() => handleSort(k)}
      className={`text-xs font-medium px-2 py-1 rounded transition-colors ${sortKey === k ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
    >
      {label} {sortKey === k ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </button>
  );

  const strategyLabel = (s: string) => {
    if (s === 'brrrr') return 'BRRRR';
    if (s === 'flip') return 'Flip';
    return 'Hold';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Portfolio Dashboard</h2>
        <p className="text-slate-400 text-sm mt-0.5">{totalDeals} deal{totalDeals !== 1 ? 's' : ''} analyzed</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Deals Analyzed', value: totalDeals.toString(), color: 'text-blue-400', sub: `${buyDeals} BUY` },
          { label: 'Avg Net Profit', value: fmt(avgProfit), color: avgProfit >= 40000 ? 'text-emerald-400' : avgProfit >= 20000 ? 'text-amber-400' : 'text-rose-400', sub: 'per deal' },
          { label: 'Total Potential', value: fmt(totalProfit), color: 'text-blue-400', sub: 'across all deals' },
          { label: 'Avg ROI', value: fmtPct(avgRoi), color: avgRoi >= 20 ? 'text-emerald-400' : avgRoi >= 10 ? 'text-amber-400' : 'text-rose-400', sub: 'on capital deployed' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</div>
            <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Market Distribution */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4">Market Distribution</h3>
          {marketDist.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={marketDist} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {marketDist.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-500 text-sm">No deals yet</div>
          )}
        </div>

        {/* Profit by Deal */}
        <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4">Deal Comparison</h3>
          {chartDeals.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDeals} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                  <Bar dataKey="ARV" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Purchase" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Rehab" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Profit" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-500 text-sm">Add deals to see comparison</div>
          )}
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Active Deals</h3>
          <div className="flex gap-1 items-center">
            <span className="text-xs text-slate-500 mr-2">Sort:</span>
            <SortBtn label="Profit" k="netProfit" />
            <SortBtn label="ARV" k="arv" />
            <SortBtn label="ROI" k="roi" />
            <SortBtn label="Date" k="createdAt" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                {['Address', 'Market', 'ARV', 'Purchase', 'Rehab', 'Net Profit', 'ROI', 'Strategy', 'Verdict', ''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-400 px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center text-slate-500 py-8 text-sm">No deals yet — analyze a deal and add it to your portfolio</td>
                </tr>
              ) : sorted.map((deal, i) => (
                <tr key={deal.id} className={`border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}>
                  <td className="px-4 py-3 text-white max-w-[180px]">
                    <div className="truncate" title={deal.address}>{deal.address}</div>
                    <div className="text-xs text-slate-500">{deal.createdAt}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${marketColor(deal.market)}`}>
                      {deal.market.charAt(0).toUpperCase() + deal.market.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-blue-400 font-medium whitespace-nowrap">{fmt(deal.arv)}</td>
                  <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{fmt(deal.purchasePrice)}</td>
                  <td className="px-4 py-3 text-amber-400 whitespace-nowrap">{fmt(deal.rehabCost)}</td>
                  <td className={`px-4 py-3 font-semibold whitespace-nowrap ${verdictColor(deal.verdict)}`}>{fmt(deal.netProfit)}</td>
                  <td className={`px-4 py-3 whitespace-nowrap ${deal.roi >= 20 ? 'text-emerald-400' : deal.roi >= 10 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {deal.roi >= 999 ? '∞' : fmtPct(deal.roi)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      deal.strategy === 'flip' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                      deal.strategy === 'brrrr' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                      'bg-purple-500/10 border-purple-500/30 text-purple-400'
                    }`}>{strategyLabel(deal.strategy)}</span>
                  </td>
                  <td className={`px-4 py-3 font-semibold text-xs whitespace-nowrap ${verdictColor(deal.verdict)}`}>
                    {verdictLabel(deal.verdict)}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => removeDeal(deal.id)} className="text-slate-500 hover:text-rose-400 transition-colors text-base leading-none">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chicago Insights */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4">Chicago Street Smarts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {INSIGHTS.map(({ icon, title, color, body }) => (
            <div key={title} className={`rounded-xl border p-4 ${colorMap[color]}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{icon}</span>
                <span className={`font-semibold text-sm ${iconColorMap[color]}`}>{title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
