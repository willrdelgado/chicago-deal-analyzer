import { useState } from 'react';
import { usePropertyLookup } from '../hooks/usePropertyLookup';
import { useApp } from '../store/AppContext';
import { fmt } from '../utils';

export default function LiveLookup({ onApplied }: { onApplied?: () => void }) {
  const [address, setAddress] = useState('');
  const [applied, setApplied] = useState(false);
  const { lookup, loading, error, result, hasKey } = usePropertyLookup();
  const { setAnalyzer, setBrrrr, setHardMoney } = useApp();

  function handleFetch() {
    setApplied(false);
    lookup(address);
  }

  function handleApply() {
    if (!result) return;

    setAnalyzer(prev => ({
      ...prev,
      address: result.address,
      sqft: result.sqft || prev.sqft,
      beds: result.beds || prev.beds,
      baths: result.baths || prev.baths,
      zillowArv: result.zestimate || prev.zillowArv,
      monthlyTaxes: result.monthlyTaxes || prev.monthlyTaxes,
      market: result.market,
      propertyType: result.propertyType,
    }));

    setBrrrr(prev => ({
      ...prev,
      arv: result.zestimate || prev.arv,
      monthlyRent: result.rentEstimate || prev.monthlyRent,
      monthlyTaxes: result.monthlyTaxes || prev.monthlyTaxes,
    }));

    setHardMoney(prev => ({
      ...prev,
      arv: result.zestimate || prev.arv,
      market: result.market,
    }));

    setApplied(true);
    onApplied?.();
  }

  const marketLabel: Record<string, string> = {
    cool: '❄️ Cool',
    moderate: '🌤 Moderate',
    hot: '🔥 Hot',
  };

  const marketColor: Record<string, string> = {
    cool: 'text-blue-400',
    moderate: 'text-yellow-400',
    hot: 'text-orange-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Live Property Lookup</h2>
          <p className="text-sm text-slate-400 mt-0.5">Search any address to auto-fill all calculators with real market data</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
          hasKey
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${hasKey ? 'bg-green-400' : 'bg-red-400'}`} />
          {hasKey ? 'RealtyAPI Connected' : 'No API Key'}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">📍</span>
            <input
              type="text"
              value={address}
              onChange={e => { setAddress(e.target.value); setApplied(false); }}
              onKeyDown={e => e.key === 'Enter' && handleFetch()}
              placeholder="e.g. 1842 S Millard Ave, Chicago IL 60623"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
            />
          </div>
          <button
            onClick={handleFetch}
            disabled={loading || !address.trim()}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Fetching…
              </span>
            ) : 'Fetch Live Data'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Property card */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/50">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Property Found</p>
              <p className="text-white font-semibold text-sm mt-0.5">{result.address}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-800">
              <Stat label="Beds" value={result.beds || '—'} />
              <Stat label="Baths" value={result.baths || '—'} />
              <Stat label="Sq Ft" value={result.sqft ? result.sqft.toLocaleString() : '—'} />
              <Stat label="Market" value={marketLabel[result.market]} className={marketColor[result.market]} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 border-t border-slate-800">
              <BigStat
                label="Zillow Zestimate (ARV)"
                value={result.zestimate ? fmt(result.zestimate) : '—'}
                color="text-blue-400"
              />
              <BigStat
                label="Est. Monthly Rent"
                value={result.rentEstimate ? fmt(result.rentEstimate) + '/mo' : '—'}
                color="text-green-400"
              />
              <BigStat
                label="Est. Monthly Taxes"
                value={result.monthlyTaxes ? fmt(result.monthlyTaxes) + '/mo' : '—'}
                color="text-slate-300"
              />
            </div>

            {result.medianDom !== null && (
              <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-800/30">
                <p className="text-xs text-slate-500">
                  Market: median {result.medianDom} days to pending in {result.city || 'this area'}
                </p>
              </div>
            )}
          </div>

          {/* Apply button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleApply}
              className="flex-1 sm:flex-none px-6 py-3 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Apply to All Calculators →
            </button>
            {applied && (
              <span className="text-sm text-green-400 font-medium">
                ✓ Deal Analyzer, BRRRR &amp; Hard Money updated
              </span>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-slate-400 text-sm">
            Enter any property address above to pull live Zillow data, rent estimates, and market stats.
          </p>
          <p className="text-slate-600 text-xs mt-2">
            Data auto-fills the Deal Analyzer, BRRRR, and Hard Money calculators.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, className = 'text-white' }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="px-5 py-3">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${className}`}>{value}</p>
    </div>
  );
}

function BigStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
