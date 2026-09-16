'use client';
import type { SourceEvidence } from '@/lib/services/official-classification';
export function RankedCandidates({ evidence, onSelect }: { evidence: SourceEvidence; onSelect?: (code: string) => void }) {
  return <div className="space-y-3 text-xs">
    {!!evidence.referenceSuggestions?.length && <div className="rounded border border-blue-200 p-3 dark:border-blue-900">
      <strong>Matches from the official SABER HS reference</strong>
      <p className="mt-1">Reference suggestions only. Apply a code to check its current ZATCA record. PDF notices do not establish current duty or customs controls.</p>
      {evidence.referenceSuggestions.map(candidate=><div key={candidate.hsCode} className="mt-3">
        <p><strong>{candidate.hsCode}</strong> · {candidate.description}</p>
        <a href={candidate.url} target="_blank" rel="noopener noreferrer" className="underline">{candidate.source} · page {candidate.page}{candidate.endPage!==candidate.page ? `–${candidate.endPage}` : ''}</a>
        {onSelect && <button type="button" className="ms-3 rounded border px-2 py-1" onClick={()=>onSelect(candidate.hsCode)}>Review this code</button>}
      </div>)}
    </div>}
    {!!evidence.productInferences?.length && <div className="rounded bg-blue-50 p-3 text-blue-900 dark:bg-blue-950 dark:text-blue-200">
      <strong>Recognized from the invoice</strong>
      {evidence.productInferences.map(item=><p key={item.text} className="mt-1">{item.text} <a className="underline" href={item.reference} target="_blank" rel="noopener noreferrer">Product reference</a></p>)}
      <p className="mt-1">Correct the product details above if this interpretation is wrong. Tariff values come from ZATCA.</p>
    </div>}
    {!!evidence.missingDetails?.length && <div className="rounded bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-200"><strong>Details needed</strong>{evidence.missingDetails.map(text=><p key={text} className="mt-1">{text}</p>)}</div>}
    <p>Regulated / Non-regulated refers only to controls listed by ZATCA. It is not a SABER technical-regulation classification.</p>
    <details><summary className="cursor-pointer">Searches performed</summary>{evidence.searchAttempts?.map((attempt,index)=><p key={index}>{attempt.query}: {attempt.outcome}{attempt.retrievedAt ? ` · Retrieved ${new Date(attempt.retrievedAt).toLocaleString()}` : ''}</p>)}</details>
    {evidence.candidates.length > 0 && <p>Ranked tariff candidates · Scores compare product wording, not statistical confidence. {evidence.candidateCount && evidence.candidateCount > evidence.candidates.length ? `Showing ${evidence.candidates.length} of ${evidence.candidateCount}.` : ''}</p>}
    {evidence.candidates.map(candidate=><div key={candidate.hsCode} className="rounded border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2"><strong className="font-mono">{candidate.hsCode}</strong>{onSelect && <button type="button" className="rounded border px-2 py-1 text-emerald-700 dark:text-emerald-300" onClick={()=>onSelect(candidate.hsCode)}>Use this code</button>}</div>
      <p className="mt-1">{candidate.description}</p>{candidate.heading && <p className="mt-1 text-slate-500">Tariff context: {candidate.heading}</p>}
      <p className="mt-1">Duty: {candidate.dutyRate === null || candidate.dutyRate === undefined ? 'Requires assessment' : `${candidate.dutyRate}%`} · ZATCA controls: {(candidate.regulatoryStatus ?? 'UNKNOWN').replaceAll('_',' ')} · Match score: {candidate.score ?? '—'}/100</p>
      {candidate.reasons?.map(reason=><p className="mt-1 text-slate-500" key={reason}>{reason}</p>)}
      {candidate.requirements?.map(note=><p className="mt-1" dir="auto" key={note}>{note}</p>)}
    </div>)}
  </div>;
}
