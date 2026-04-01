import { useState } from 'react';
import { AppProvider } from './store/AppContext';
import DealAnalyzer from './pages/DealAnalyzer';
import BRRRRCalc from './pages/BRRRRCalc';
import HardMoneyCalc from './pages/HardMoneyCalc';
import Portfolio from './pages/Portfolio';

type Tab = 'analyzer' | 'brrrr' | 'hardmoney' | 'portfolio';

const TABS: { id: Tab; label: string; short: string }[] = [
  { id: 'analyzer', label: 'Deal Analyzer', short: 'Analyzer' },
  { id: 'brrrr', label: 'BRRRR Calculator', short: 'BRRRR' },
  { id: 'hardmoney', label: 'Hard Money', short: 'Hard $' },
  { id: 'portfolio', label: 'Portfolio', short: 'Portfolio' },
];

function AppInner() {
  const [tab, setTab] = useState<Tab>('analyzer');

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-black text-white">
                C
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-tight">Chicago Deal Analyzer</div>
                <div className="text-xs text-slate-500 leading-tight hidden sm:block">Real Estate Investment Platform</div>
              </div>
            </div>

            {/* Nav Tabs */}
            <nav className="flex items-center gap-0.5">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    tab === t.id
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.short}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {tab === 'analyzer' && <DealAnalyzer />}
        {tab === 'brrrr' && <BRRRRCalc />}
        {tab === 'hardmoney' && <HardMoneyCalc />}
        {tab === 'portfolio' && <Portfolio />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-12 py-4 text-center">
        <p className="text-xs text-slate-600">
          Chicago Deal Analyzer · For educational purposes · Always verify with licensed professionals
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
