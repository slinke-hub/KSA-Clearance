'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { safeFetchJson } from '@/lib/utils/api-client';
import type { SourceEvidence } from '@/lib/services/official-classification';
import type { ProductDetails } from '@/lib/services/product-profile';
import { ProductDetailsFields } from './product-details-fields';
import { RankedCandidates } from './ranked-candidates';

export function TariffCatalogModal({ isOpen, onClose, initialQuery }: { isOpen: boolean; onClose: () => void; initialQuery?: string }) {
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<ProductDetails>({});
  const [result, setResult] = useState<{ matchedHsCode: string | null; dutyRate: number | null; regulatoryStatus: string; classificationEvidence: SourceEvidence } | null>(null);
  useEffect(()=>{if(isOpen){setDescription(initialQuery ?? '');setDetails({});setResult(null);setError('');}},[isOpen,initialQuery]);
  if (!isOpen || typeof document === 'undefined') return null;
  return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
    <section role="dialog" aria-modal="true" aria-label="Live tariff lookup" className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-6 text-slate-900 shadow-xl dark:bg-slate-900 dark:text-white">
      <div className="flex justify-between"><h2 className="text-lg font-bold">Live ZATCA lookup</h2><button onClick={onClose} aria-label="Close tariff lookup">Close</button></div>
      <form className="my-4 flex gap-2" onSubmit={async event => {
        event.preventDefault(); setBusy(true); setError(''); setResult(null);
        try {
          const response = await safeFetchJson('/api/classification/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description, productDetails: details, countryOfOrigin: 'ZZ', declaredHsCode: /^\d{6,12}$/.test(description) ? description : undefined }) });
          if (response.success) setResult(response.data); else setError(response.error || 'Lookup unavailable');
        } catch { setError('Unable to complete lookup. Try again.'); } finally { setBusy(false); }
      }}>
        <input required minLength={3} maxLength={2000} aria-label="Product description or 12-digit HS code" placeholder="Product description or 12-digit HS code" className="min-w-0 flex-1 rounded border p-2 dark:bg-slate-800" value={description} onChange={event => setDescription(event.target.value)} />
        <button disabled={busy} className="rounded bg-emerald-700 px-4 text-white">{busy ? 'Checking sources…' : 'Search'}</button>
        <div className="flex flex-col gap-1">
          <a href="https://eservices.zatca.gov.sa/sites/sc/en/tariff/Pages/TariffPages/TariffSearch.aspx" target="_blank" rel="noopener noreferrer" className="flex items-center whitespace-nowrap rounded border px-4 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">ZATCA Portal</a>
          <a href="https://saber.sa/Home/HSCodes?query=HPxiVlpYoUlXdk3Qw67Ge7vnHFk1166UizQ8gft7TcBwibkaCCiRkQxrTVWTCYtwDbc8eUwJ2S7+81vPghojL01SQuTjOKdHga3ww4h63gLycVWNHOew0A4OTSuSQGnGekGk72ru+EwFTIhVvKsiI3+diLKSec6N4tu4V4b3i3A0kyk/bhGtMqcUqMGhWfNe1e3GW47/jNPs6n6uS4r3qi7D+UCk+C1Gxr1nmUENeWjd/Fi4mVcvK2oQWeqfxboTAMzZ08opeuiRk6eZbgZg7bANmCCJD7i6Nsj28+Zd0liW+OP1KtvQGj3ED9g5txrWEaIdoS/8yjdYRpZBpImHoxe2WCbKMfzgV8AqlVKiSkc=" target="_blank" rel="noopener noreferrer" className="flex items-center whitespace-nowrap rounded border px-4 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">Saber Portal</a>
        </div>
      </form>
      <ProductDetailsFields value={details} onChange={setDetails} />
      {error && <p role="alert">{error}</p>}
      {result && <div className="space-y-3 text-sm">
        <p><strong>HS code:</strong> {result.matchedHsCode ?? 'Needs review'} · <strong>Duty:</strong> {result.dutyRate === null ? 'Needs review' : `${result.dutyRate}%`} · <strong>ZATCA controls:</strong> {result.regulatoryStatus === 'UNKNOWN' ? 'Needs review' : result.regulatoryStatus.replaceAll('_', ' ')}</p>
        <p>{result.classificationEvidence.tariffDescription}</p>
        <p>{result.classificationEvidence.regulation}</p>
        <p dir="auto">{result.classificationEvidence.certificateRequirements}</p>
        <p>{result.classificationEvidence.matchReason}</p>
        <RankedCandidates evidence={result.classificationEvidence} />
        <div className="flex gap-4">{[['ZATCA Result', result.classificationEvidence.zatcaUrl], ['ZATCA Search Portal', 'https://eservices.zatca.gov.sa/sites/sc/en/tariff/Pages/TariffPages/TariffSearch.aspx'], ['Saber Search Portal', 'https://saber.sa/Home/HSCodes?query=HPxiVlpYoUlXdk3Qw67Ge7vnHFk1166UizQ8gft7TcBwibkaCCiRkQxrTVWTCYtwDbc8eUwJ2S7+81vPghojL01SQuTjOKdHga3ww4h63gLycVWNHOew0A4OTSuSQGnGekGk72ru+EwFTIhVvKsiI3+diLKSec6N4tu4V4b3i3A0kyk/bhGtMqcUqMGhWfNe1e3GW47/jNPs6n6uS4r3qi7D+UCk+C1Gxr1nmUENeWjd/Fi4mVcvK2oQWeqfxboTAMzZ08opeuiRk6eZbgZg7bANmCCJD7i6Nsj28+Zd0liW+OP1KtvQGj3ED9g5txrWEaIdoS/8yjdYRpZBpImHoxe2WCbKMfzgV8AqlVKiSkc=']].map(([name, url]) => <a key={name} className="underline" href={url as string} target="_blank" rel="noopener noreferrer">{name}</a>)}</div>
        <p>Checked: {new Date(result.classificationEvidence.checkedAt).toLocaleString()}</p>
        {result.classificationEvidence.warnings.map(warning => <p key={warning} className="text-amber-700">{warning}</p>)}
      </div>}
    </section>
  </div>, document.body);
}
