'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/language-context';
import { LineItemEntity } from '@/types/invoice';
import { ProductDetailsFields } from '@/components/tariff/product-details-fields';
import { RankedCandidates } from '@/components/tariff/ranked-candidates';
import type { ProductDetails } from '@/lib/services/product-profile';
import { formatHsCode } from '@/lib/services/classifier';
import { safeFetchJson } from '@/lib/utils/api-client';
import { Check, Search, ChevronDown, RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';

interface LineItemsTableProps {
  reviewTarget?: { lineNumber: number; nonce: number } | null;
  currency: string;
  invoiceId: string;
  items: LineItemEntity[];
  onItemUpdated: () => void;
  onOpenCertModal: (certCode: string) => void;
}

export function LineItemsTable({
  reviewTarget,
  currency,
  invoiceId,
  items,
  onItemUpdated,
  onOpenCertModal,
}: LineItemsTableProps) {
  const { t, language, role } = useApp();
  const [selectedItemForOverride, setSelectedItemForOverride] = useState<LineItemEntity | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [overrideHs, setOverrideHs] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [productDetails, setProductDetails] = useState<ProductDetails>({});
  const [page, setPage] = useState(1);
  const [retryProgress, setRetryProgress] = useState<string | null>(null);
  useEffect(()=>{
    if(!reviewTarget || role === 'AUDITOR') return;
    const item = items.find(row=>row.lineNumber === reviewTarget.lineNumber);
    if(item){setSelectedItemForOverride(item);setOverrideHs(item.matchedHsCode ?? '');setProductDetails(item.classificationEvidence?.productDetails ?? {});}
    // The request is an explicit user action; routine invoice refreshes must not reopen the dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[reviewTarget]);

  const retryUnmatched = async () => {
    const pending = items.filter(item => !item.matchedHsCode && !item.verifiedByUser);
    let failures = 0;
    try {
      for (let i = 0; i < pending.length; i++) {
        setRetryProgress(`${i + 1} / ${pending.length}`);
        try {
          const response = await safeFetchJson(`/api/invoices/${invoiceId}/line-items/${pending[i].lineNumber}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshSources: true }),
          });
          if (!response.success) failures++;
        } catch { failures++; }
      }
      onItemUpdated();
      if (failures) alert(`${failures} items could not be refreshed. Please try again.`);
    } finally { setRetryProgress(null); }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (item.matchedHsCode && item.matchedHsCode.includes(searchFilter)) ||
      (item.declaredHsCode && item.declaredHsCode.includes(searchFilter));

    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'UNMATCHED') return matchesSearch && !item.matchedHsCode;
    if (statusFilter === 'MATCHED') return matchesSearch && !!item.matchedHsCode;
    if (statusFilter === 'VERIFIED') return matchesSearch && item.verifiedByUser;
    if (statusFilter === 'PENDING') return matchesSearch && !item.verifiedByUser;
    if (statusFilter === 'REGULATED') return matchesSearch && item.regulatoryStatus === 'REGULATED';
    if (statusFilter === 'NON_REGULATED' || statusFilter === 'UNKNOWN') return matchesSearch && item.regulatoryStatus === statusFilter;
    return matchesSearch;
  });

  const toggleVerification = async (lineNumber: number, currentStatus: boolean) => {
    if (role === 'AUDITOR' || !invoiceId) return;
    try {
      const response = await safeFetchJson(`/api/invoices/${invoiceId}/line-items/${lineNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedByUser: !currentStatus,
          userId: role === 'ADMIN' ? 'user-admin-01' : 'user-agent-01',
        }),
      });
      if (!response.success) { alert(response.error); return; }
      onItemUpdated();
    } catch (err) {
      console.error('Failed to toggle verification', err);
    }
  };

  const handleApplyOverride = async () => {
    if (!selectedItemForOverride || !overrideHs || !invoiceId) return;
    setIsUpdating(true);
    try {
      const response = await safeFetchJson(`/api/invoices/${invoiceId}/line-items/${selectedItemForOverride.lineNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchedHsCode: overrideHs,
          productDetails,
          verifiedByUser: false,
          userId: role === 'ADMIN' ? 'user-admin-01' : 'user-agent-01',
        }),
      });
      if (!response.success) { alert(response.error); return; }
      setSelectedItemForOverride(null);
      setOverrideHs('');
      onItemUpdated();
    } catch (err) {
      console.error('Failed to apply HS override', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatSAR = (amount: number | null) => {
    if (amount === null) return language === 'ar' ? 'قيد المراجعة' : 'Needs review';
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / 15));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = filteredItems.slice((currentPage - 1) * 15, currentPage * 15);
  const ar = language === 'ar';
  const label = (en: string, arabic: string) => ar ? arabic : en;
  const matched = items.filter(item => !!item.matchedHsCode).length;
  const reviewed = items.filter(item => item.verifiedByUser).length;
  const buttonStyle = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800';

  return (
    <section aria-label={t.lineItems} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="space-y-5 border-b border-slate-200 p-5 sm:p-6 dark:border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">{label('Invoice review', 'مراجعة الفاتورة')}</p>
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{t.lineItems}</h3>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">{label('Review each product, its tariff classification and estimated import charges. Customs controls are based on ZATCA records.', 'راجع كل منتج وتصنيفه الجمركي ورسوم الاستيراد التقديرية. تستند المتطلبات الجمركية إلى سجلات هيئة الزكاة والضريبة والجمارك.')}</p>
          </div>
          {role !== 'AUDITOR' && matched < items.length && <button type="button" disabled={retryProgress !== null || isUpdating} onClick={retryUnmatched} className={buttonStyle}>
            <RefreshCw className={retryProgress ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            <span aria-live="polite">{retryProgress ? label('Checking ', 'جارٍ الفحص ') + retryProgress : label('Retry unmatched', 'إعادة فحص غير المطابق')}</span>
          </button>}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            {name: label('All items', 'كل البنود'), count: items.length, filter: 'ALL'},
            {name: label('HS code found', 'رمز جمركي متاح'), count: matched, filter: 'MATCHED'},
            {name: label('Unmatched', 'غير مطابق'), count: items.length - matched, filter: 'UNMATCHED'},
            {name: label('Reviewed', 'تمت المراجعة'), count: reviewed, filter: 'VERIFIED'},
          ].map(stat=><button type="button" key={stat.filter} aria-pressed={statusFilter === stat.filter} onClick={()=>{setStatusFilter(stat.filter);setPage(1);}}
            className={`rounded-xl border p-3 text-start transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 ${statusFilter === stat.filter ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'border-slate-200 bg-slate-50 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/40'}`}>
            <span className="block text-xl font-bold tabular-nums text-slate-900 dark:text-white">{stat.count}</span><span className="mt-1 block text-xs text-slate-600 dark:text-slate-400">{stat.name}</span>
          </button>)}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search aria-hidden="true" className="absolute start-3 top-3 h-4 w-4 text-slate-400" />
            <input aria-label={label('Search products or HS codes', 'البحث بالمنتج أو الرمز الجمركي')} placeholder={label('Search products or HS codes…', 'ابحث بالمنتج أو الرمز الجمركي…')} value={searchFilter} onChange={e=>{setSearchFilter(e.target.value);setPage(1);}} className="w-full rounded-lg border border-slate-200 bg-white py-2.5 ps-9 pe-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          </div>
          <select aria-label={label('Filter items', 'تصفية البنود')} value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <option value="ALL">{t.all}</option><option value="MATCHED">{label('HS code found', 'رمز جمركي متاح')}</option><option value="UNMATCHED">{label('Unmatched', 'غير مطابق')}</option>
            <option value="PENDING">{label('Awaiting review', 'بانتظار المراجعة')}</option><option value="VERIFIED">{label('Reviewed', 'تمت المراجعة')}</option>
            <option value="REGULATED">{t.regulated}</option><option value="NON_REGULATED">{t.nonRegulated}</option><option value="UNKNOWN">{label('Controls unknown', 'متطلبات غير محددة')}</option>
          </select>
        </div>
      </div>
      <div className="space-y-4 bg-slate-50/70 p-3 sm:p-5 dark:bg-slate-950/30">
        {visibleItems.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="font-semibold text-slate-700 dark:text-slate-200">{label('No items match your search', 'لا توجد بنود مطابقة للبحث')}</p>
          <button className="mt-3 text-sm text-emerald-700 dark:text-emerald-400" onClick={()=>{setSearchFilter('');setStatusFilter('ALL');setPage(1);}}>{label('Clear filters', 'مسح عوامل التصفية')}</button>
        </div>}
        {visibleItems.map(item=>{
          const evidence = item.classificationEvidence;
          const liveSuggestions = evidence?.candidates.filter(candidate => (candidate.score ?? 0) > 0) ?? [];
          const suggestions = [...liveSuggestions.map(candidate=>({...candidate, sourceLabel:'ZATCA'})),
            ...(evidence?.referenceSuggestions ?? []).filter(candidate=>!liveSuggestions.some(live=>live.hsCode===candidate.hsCode))
              .map(candidate=>({...candidate, heading:'', sourceLabel:`SABER · p. ${candidate.page} · requires ZATCA check`}))];
          const status = item.regulatoryStatus === 'REGULATED' ? t.regulated : item.regulatoryStatus === 'NON_REGULATED' ? t.nonRegulated : item.regulatoryStatus === 'RESTRICTED' ? t.restricted : item.regulatoryStatus === 'PROHIBITED' ? label('Prohibited', 'ممنوع') : label('Needs review', 'تحتاج إلى مراجعة');
          const statusStyle = item.regulatoryStatus === 'PROHIBITED' || item.regulatoryStatus === 'RESTRICTED' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : item.regulatoryStatus === 'UNKNOWN' ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
          const canVerify = role !== 'AUDITOR' && evidence?.engineVersion === 2 && evidence.tariffConfirmed && evidence.regulationConfirmed && item.dutyRate !== null && !['PROHIBITED','RESTRICTED'].includes(item.regulatoryStatus);
          return <article key={item.id} aria-label={label('Invoice item ', 'بند الفاتورة ') + item.lineNumber} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start gap-3 p-4 sm:p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.lineNumber}</span>
              <div className="min-w-0 flex-1">
                <h4 className="break-words text-sm font-semibold leading-relaxed text-slate-900 dark:text-white">{item.description}</h4>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400"><span>{t.origin}: <strong>{item.countryOfOrigin}</strong></span><span>{t.qty}: <strong className="tabular-nums">{item.quantity}</strong></span><span>{t.totalVal}: <strong className="tabular-nums text-slate-700 dark:text-slate-200">{formatSAR(item.totalValue)}</strong></span>{item.declaredHsCode && <span>{t.declaredHs}: <span dir="ltr" className="font-mono">{item.declaredHsCode}</span></span>}</div>
              </div>
              {item.verifiedByUser && <Check aria-label={label('Reviewed', 'تمت المراجعة')} className="h-5 w-5 shrink-0 text-emerald-600" />}
            </div>
            <dl className="mx-4 mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:mx-5 sm:grid-cols-4 dark:border-slate-700 dark:bg-slate-700">
              <div className="col-span-2 bg-slate-50 p-3 sm:col-span-1 dark:bg-slate-800/90"><dt className="text-xs text-slate-500 dark:text-slate-400">{label('ZATCA HS code', 'الرمز الجمركي من الهيئة')}</dt><dd className="mt-1.5 break-words font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400" dir="ltr">{item.matchedHsCode ? formatHsCode(item.matchedHsCode) : '—'}</dd><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{item.matchedHsCode ? label('Product scope requires review', 'نطاق المنتج يحتاج إلى مراجعة') : evidence?.selectionStatus === 'SOURCE_UNAVAILABLE' ? label('Source unavailable · Retry', 'المصدر غير متاح · أعد المحاولة') : label('Product details needed', 'تفاصيل المنتج مطلوبة')}</p></div>
              <div className="bg-slate-50 p-3 dark:bg-slate-800/90"><dt className="text-xs text-slate-500 dark:text-slate-400">{label('Customs duty', 'الرسوم الجمركية')}</dt><dd className="mt-1.5 break-words text-sm font-bold tabular-nums text-slate-900 dark:text-white">{formatSAR(item.calculatedDutyFee)}</dd><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t.dutyRate}: {item.dutyRate === null ? '—' : item.dutyRate + '%'}</p></div>
              <div className="bg-slate-50 p-3 dark:bg-slate-800/90"><dt className="text-xs text-slate-500 dark:text-slate-400">{label('VAT', 'ضريبة القيمة المضافة')} ({item.vatRate}%)</dt><dd className="mt-1.5 break-words text-sm font-bold tabular-nums text-slate-900 dark:text-white">{formatSAR(item.calculatedVatFee)}</dd><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{label('Estimated amount', 'مبلغ تقديري')}</p></div>
              <div className="col-span-2 bg-slate-50 p-3 sm:col-span-1 dark:bg-slate-800/90"><dt className="text-xs text-slate-500 dark:text-slate-400">{label('ZATCA customs controls', 'المتطلبات الجمركية')}</dt><dd className="mt-2"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle}`}>{status}</span></dd></div>
            </dl>
            <div className="mx-4 mb-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 sm:mx-5 dark:border-emerald-900 dark:bg-emerald-950/20">
              {evidence?.normalizedDescription && <p className="mb-2 text-xs text-slate-600 dark:text-slate-300"><strong>{label('Recognized description: ', 'الوصف المستخلص: ')}</strong><span dir="auto">{evidence.normalizedDescription}</span></p>}
              <label htmlFor={`suggested-hs-${item.id}`} className="mb-2 block text-xs font-semibold text-slate-800 dark:text-slate-200">{label('Suggested HS codes · ZATCA & SABER', 'الرموز المقترحة · الهيئة وسابر')} ({suggestions.length})</label>
              <select id={`suggested-hs-${item.id}`} value="" disabled={role === 'AUDITOR' || isUpdating || retryProgress !== null || !suggestions.length}
                onChange={event=>{
                  const val = event.target.value;
                  if(!val) return;
                  import('react').then(({startTransition}) => {
                    startTransition(() => {
                      setSelectedItemForOverride(item);
                      setOverrideHs(val);
                      setProductDetails(evidence?.productDetails ?? {});
                    });
                  });
                }}
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                <option value="">{suggestions.length ? label('Choose a suggestion to review…', 'اختر اقتراحاً للمراجعة…') : label('No suitable suggestions — recheck or add product details', 'لا توجد اقتراحات مناسبة — أعد الفحص أو أضف تفاصيل المنتج')}</option>
                {suggestions.map(candidate=><option key={candidate.hsCode} value={candidate.hsCode}>{candidate.hsCode} — {candidate.description} [{candidate.sourceLabel}]{candidate.heading ? ` (${candidate.heading})` : ''}</option>)}
              </select>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{label('Compare the ZATCA product name before applying. Selecting an option opens its review; applying it rechecks the code and charges.', 'قارن اسم المنتج في الهيئة قبل التطبيق. يفتح الاختيار المراجعة ويعيد التطبيق التحقق من الرمز والرسوم.')}</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5 dark:border-slate-800">
              <details className="w-full text-xs text-slate-600 dark:text-slate-300">
                <summary className="flex w-fit cursor-pointer list-none items-center gap-2 rounded py-1 font-semibold text-slate-600 dark:text-slate-300"><ChevronDown className="h-4 w-4" />{label('Requirements & source details', 'المتطلبات وتفاصيل المصدر')}</summary>
                <div className="mt-3 grid gap-5 rounded-lg bg-slate-50 p-4 leading-relaxed sm:grid-cols-2 dark:bg-slate-800/50">
                  <div><h5 className="mb-2 font-bold">{t.certificates}</h5><p dir="auto">{evidence?.certificateRequirements || (item.regulatoryStatus === 'NON_REGULATED' && evidence?.regulationConfirmed ? label('None listed by ZATCA', 'لا توجد متطلبات مدرجة') : label('Needs review', 'تحتاج إلى مراجعة'))}</p>{!evidence?.certificateRequirements && item.requiredCertificates.map(cert=><button key={cert} onClick={()=>onOpenCertModal(cert)} className="mt-2 block text-start underline">{cert}</button>)}<p className="mt-3">{evidence?.regulation}</p><p>{evidence?.importStatus}</p></div>
                  <div><h5 className="mb-2 font-bold">{label('Classification evidence', 'أدلة التصنيف')}</h5><p>{evidence?.matchReason}</p><p className="mt-2">{evidence?.tariffDescription}</p><p className="mt-2">{evidence?.dutyExplanation}</p><p className="mt-1 font-mono" dir="ltr">{evidence?.feeFormula}</p>{evidence?.missingDetails?.map(detail=><p key={detail} className="mt-2 text-amber-700 dark:text-amber-300">{detail}</p>)}{evidence?.productInferences?.map(inference=><p key={inference.text} className="mt-2">{inference.text} <a className="underline" href={inference.reference} target="_blank" rel="noopener noreferrer">{label('Product reference', 'مرجع المنتج')}</a></p>)}{evidence && <p className="mt-3"><a className="font-semibold text-emerald-700 underline dark:text-emerald-400" href={evidence.zatcaUrl} target="_blank" rel="noopener noreferrer">ZATCA</a> · {new Date(evidence.checkedAt).toLocaleString(ar ? 'ar-SA' : 'en-SA')}</p>}</div>
                  {evidence && <div className="space-y-2 border-t border-slate-200 pt-3 sm:col-span-2 dark:border-slate-700">{evidence.warnings.map(warning=><p key={warning}>{warning}</p>)}<details><summary className="cursor-pointer font-semibold">{label('Tariff candidates', 'الرموز المرشحة')} ({evidence.candidates.length})</summary>{evidence.candidates.map(candidate=><p className="mt-2" key={candidate.hsCode}><span className="font-mono" dir="ltr">{candidate.hsCode}</span> · {candidate.description}</p>)}</details></div>}
                </div>
              </details>
              <span className="text-xs text-slate-500 dark:text-slate-400">{item.verifiedByUser ? label('Reviewed', 'تمت المراجعة') : label('Awaiting classification review', 'بانتظار مراجعة التصنيف')}</span>
              {role !== 'AUDITOR' && <div className="flex flex-wrap gap-2">
                <button type="button" className={buttonStyle} disabled={isUpdating || retryProgress !== null} onClick={async()=>{setIsUpdating(true);try{const result=await safeFetchJson(`/api/invoices/${invoiceId}/line-items/${item.lineNumber}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshSources:true})});if(!result.success)alert(result.error);else onItemUpdated();}finally{setIsUpdating(false);}}}><RefreshCw className="h-3.5 w-3.5" />{label('Recheck', 'إعادة الفحص')}</button>
                <button type="button" className={buttonStyle} disabled={!canVerify || isUpdating || retryProgress !== null} onClick={()=>toggleVerification(item.lineNumber,item.verifiedByUser)} aria-pressed={item.verifiedByUser} title={!canVerify ? label('Resolve tariff and customs-control details first', 'استكمل بيانات التصنيف والمتطلبات أولاً') : undefined}><Check className="h-3.5 w-3.5" />{item.verifiedByUser ? label('Undo review', 'إلغاء المراجعة') : label('Mark reviewed', 'اعتماد المراجعة')}</button>
                <button type="button" disabled={isUpdating || retryProgress !== null} onClick={()=>{
                  import('react').then(({startTransition}) => {
                    startTransition(() => {
                      setSelectedItemForOverride(item);
                      setOverrideHs(item.matchedHsCode || '');
                      setProductDetails(evidence?.productDetails ?? {});
                    });
                  });
                }} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-40">{label('Review match', 'مراجعة المطابقة')}</button>
              </div>}
            </div>
          </article>;
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <p aria-live="polite">{filteredItems.length ? `${(currentPage - 1) * 15 + 1}–${Math.min(currentPage * 15, filteredItems.length)} / ${filteredItems.length}` : '0'} {label('items', 'بند')}</p>
        <nav aria-label={label('Item pages', 'صفحات البنود')} className="flex items-center gap-3"><button type="button" aria-label={label('Previous page', 'الصفحة السابقة')} className={buttonStyle} disabled={currentPage <= 1} onClick={()=>setPage(currentPage - 1)}><ArrowLeft className="h-4 w-4 rtl:rotate-180" /></button><span className="tabular-nums">{currentPage} / {pageCount}</span><button type="button" aria-label={label('Next page', 'الصفحة التالية')} className={buttonStyle} disabled={currentPage >= pageCount} onClick={()=>setPage(currentPage + 1)}><ArrowRight className="h-4 w-4 rtl:rotate-180" /></button></nav>
      </div>

      {/* Override HS Code Modal */}
      {selectedItemForOverride && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-xs p-4 pt-12 pb-12">
          <div role="dialog" aria-modal="true" aria-label="Review tariff match" className="max-h-[85vh] overflow-y-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {language === 'ar' ? 'مراجعة تصنيف البند' : 'Review product details and tariff matches'}
              </h3>
              <button
                onClick={() => import('react').then(({startTransition}) => startTransition(() => setSelectedItemForOverride(null)))}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-xs text-slate-500 block">{t.description}:</span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedItemForOverride.description}
                </p>
              </div>

              <ProductDetailsFields value={productDetails} onChange={setProductDetails} />
              <button type="button" disabled={isUpdating} className="rounded bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50" onClick={async()=>{
                setIsUpdating(true);
                try {
                  const response = await safeFetchJson(`/api/invoices/${invoiceId}/line-items/${selectedItemForOverride.lineNumber}`, {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshSources:true,productDetails})});
                  if (!response.success) { alert(response.error); return; }
                  setSelectedItemForOverride({...selectedItemForOverride, classificationEvidence:response.data.item.classificationEvidence, matchedHsCode:response.data.item.matchedHsCode});
                  setOverrideHs(response.data.item.matchedHsCode ?? ''); onItemUpdated();
                } finally { setIsUpdating(false); }
              }}>{isUpdating ? 'Searching ZATCA…' : 'Search with these details'}</button>
              {selectedItemForOverride.classificationEvidence && <RankedCandidates evidence={selectedItemForOverride.classificationEvidence} onSelect={setOverrideHs} />}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'ar' ? 'اختر من دليل التعرفة المعتمد أو أدخل رمزاً:' : 'Select official tariff code or enter 12-digit code:'}
                </label>
                <select
                  value={overrideHs}
                  onChange={(e) => setOverrideHs(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">-- Select from ZATCA Tariff Catalog --</option>
                  {(selectedItemForOverride.classificationEvidence?.candidates ?? []).map((cat) => (
                    <option key={cat.hsCode} value={cat.hsCode}>
                      {formatHsCode(cat.hsCode)} - {cat.description.slice(0, 70)}
                    </option>
                  ))}
                  {(selectedItemForOverride.classificationEvidence?.referenceSuggestions ?? []).filter(candidate=>!selectedItemForOverride.classificationEvidence?.candidates.some(live=>live.hsCode===candidate.hsCode)).map(candidate=><option key={candidate.hsCode} value={candidate.hsCode}>{candidate.hsCode} — {candidate.description} [SABER · p. {candidate.page}]</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'ar' ? 'الرمز اليدوي (12 رقم):' : 'Direct 12-Digit Entry:'}
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={overrideHs}
                  onChange={(e) => setOverrideHs(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="e.g. 847130000000"
                />
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg">
                {language === 'ar'
                  ? 'سيتم تحديث الرسوم ومتطلبات الاستيراد من ZATCA فقط وتسجيل التغيير في سجل التدقيق.'
                  : 'ZATCA duty rates and import requirements will refresh, and the change will be recorded.'}
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => import('react').then(({startTransition}) => startTransition(() => setSelectedItemForOverride(null)))}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleApplyOverride}
                disabled={isUpdating || overrideHs.length !== 12}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isUpdating ? 'Applying...' : t.saveChanges}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

