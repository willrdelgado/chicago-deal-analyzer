import { useState } from 'react';
import type { MarketType, PropertyType } from '../types';

const RAPI_BASE = 'https://zillow.realtyapi.io';
const RAPI_KEY = import.meta.env.VITE_REALTYAPI_KEY ?? '';

async function rapi(path: string, params: Record<string, string>) {
  const url = new URL(`${RAPI_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString(), {
    headers: { 'x-realtyapi-key': RAPI_KEY, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export interface LookupResult {
  address: string;
  beds: number;
  baths: number;
  sqft: number;
  zestimate: number;
  rentEstimate: number;
  monthlyTaxes: number;
  market: MarketType;
  propertyType: PropertyType;
  medianDom: number | null;
  city: string;
  state: string;
  zip: string;
}

function deriveMarket(medianDom: number | null): MarketType {
  if (medianDom === null) return 'moderate';
  if (medianDom < 15) return 'hot';
  if (medianDom > 45) return 'cool';
  return 'moderate';
}

function derivePropertyType(raw: string | undefined): PropertyType {
  if (!raw) return 'single-family';
  const t = raw.toLowerCase();
  if (t.includes('multi') || t.includes('duplex') || t.includes('2-flat') || t.includes('two')) return 'multi-unit';
  if (t.includes('apartment') || t.includes('condo') || t.includes('apt')) return 'apartment';
  return 'single-family';
}

export function usePropertyLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const hasKey = Boolean(RAPI_KEY);

  async function lookup(address: string) {
    if (!RAPI_KEY) { setError('No API key — add VITE_REALTYAPI_KEY to .env.local'); return; }
    if (!address.trim()) { setError('Enter a property address'); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const addrStr = address.trim();
      const cityState = addrStr.replace(/^[^,]+,\s*/, '').replace(/\s*\d{5}.*$/, '').trim() || addrStr;

      const [propR, mktR, rentalMktR] = await Promise.allSettled([
        rapi('/pro/byaddress', { propertyaddress: addrStr }),
        rapi('/housing_market', { search_query: cityState }),
        rapi('/rental_market', { search_query: cityState }),
      ]);

      const ok = <T,>(r: PromiseSettledResult<T>): T | null =>
        r.status === 'fulfilled' ? r.value : null;

      const propRaw = ok(propR);
      const mktRaw = ok(mktR);
      const rentalMkt = ok(rentalMktR);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pd: Record<string, any> = (propRaw as any)?.propertyDetails ?? {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mktOv: Record<string, any> = (mktRaw as any)?.market_overview ?? {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rentalTrend: Record<string, any> = (rentalMkt as any)?.rental_market_trend ?? {};

      if (!pd.streetAddress && !pd.zestimate) {
        throw new Error('Property not found — try including the full address with city and state');
      }

      const medianDom: number | null = mktOv.median_days_to_pending ?? null;
      const annualTax = pd.taxHistory?.[0]?.taxPaid ?? 0;
      const rentEst = pd.rentZestimate ?? rentalTrend.medianRent ?? 0;

      setResult({
        address: [pd.streetAddress, pd.city, pd.state, pd.zipcode].filter(Boolean).join(', '),
        beds: pd.bedrooms ?? 0,
        baths: pd.bathrooms ?? 0,
        sqft: Math.round(pd.livingArea ?? 0),
        zestimate: pd.zestimate ?? pd.price ?? 0,
        rentEstimate: Math.round(rentEst),
        monthlyTaxes: annualTax ? Math.round(annualTax / 12) : 0,
        market: deriveMarket(medianDom),
        propertyType: derivePropertyType(pd.homeType),
        medianDom,
        city: pd.city ?? '',
        state: pd.state ?? '',
        zip: pd.zipcode ?? '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  }

  return { lookup, loading, error, result, hasKey };
}
