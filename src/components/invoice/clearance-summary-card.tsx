'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/language-context';
import { InvoiceEntity } from '@/types/invoice';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Send,
  Building,
  FileCheck,
  Coins,
  Receipt,
  Scale
} from 'lucide-react';

interface ClearanceSummaryCardProps {
  invoice: InvoiceEntity;
  onClearInvoice: () => Promise<void>;
  isClearing?: boolean;
}

export function ClearanceSummaryCard({
  invoice,
  onClearInvoice,
  isClearing = false,
}: ClearanceSummaryCardProps) {
  const { t, language, role } = useApp();

  const totalCif = Number(invoice.totalAmount);
  const totalDuty = invoice.lineItems.reduce((acc, it) => acc + Number(it.calculatedDutyFee), 0);
  const totalVat = invoice.lineItems.reduce((acc, it) => acc + Number(it.calculatedVatFee), 0);
  const grandTotal = totalCif + totalDuty + totalVat;
  const hasUnknownFees = invoice.lineItems.some(item => item.calculatedDutyFee === null || item.calculatedVatFee === null || !item.classificationEvidence?.tariffConfirmed);

  const verifiedCount = invoice.lineItems.filter((it) => it.verifiedByUser).length;
  const totalCount = invoice.lineItems.length;
  const isAllVerified = totalCount > 0 && verifiedCount === totalCount;
  const isCleared = invoice.status === 'CLEARED';

  // Count certificates required
  const allCerts = Array.from(
    new Set(invoice.lineItems.flatMap((it) => it.requiredCertificates))
  );

  const formatSAR = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'currency',
      currency: invoice.currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.clearanceStatus}
            </h2>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isCleared
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : isAllVerified
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {isCleared ? t.cleared : isAllVerified ? t.verified : t.pending}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {invoice.exporterName} &rarr; {invoice.importerName}
          </p>
        </div>

        {/* Verification Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="w-44 bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                isAllVerified ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
            {verifiedCount} / {totalCount} {language === 'ar' ? 'بند معتمد' : 'Verified'}
          </span>
        </div>
      </div>

      {/* 4 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-5">
        {/* Total CIF Value */}
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-3.5 dark:border-emerald-800 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
              {language === 'ar' ? 'قيمة الفاتورة' : 'Invoice value'}
            </span>
            <Receipt className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-black text-emerald-800 dark:text-emerald-200">
            {formatSAR(totalCif)}
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400">Invoice currency; includes recorded adjustments</span>
          {invoice.charges?.map((charge, index) => <p key={index} className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">{charge.label}: {formatSAR(charge.amount)}</p>)}
        </div>

        {/* Total Customs Duties */}
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-3.5 dark:border-emerald-800 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
              {t.totalDuty}
            </span>
            <Coins className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-black text-emerald-800 dark:text-emerald-200">
            {hasUnknownFees ? 'Needs review' : formatSAR(totalDuty)}
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400">Estimate using live ZATCA rates</span>
        </div>

        {/* Total 15% VAT */}
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-3.5 dark:border-emerald-800 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
              {t.totalVat}
            </span>
            <Calculator className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-black text-emerald-800 dark:text-emerald-200">
            {hasUnknownFees ? 'Needs review' : formatSAR(totalVat)}
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400">Standard VAT estimate; exemptions not assessed</span>
        </div>

        {/* Grand Total Landed Cost */}
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-3.5 dark:border-emerald-800 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
              {language === 'ar' ? 'الإجمالي التقديري' : 'Estimated total'}
            </span>
            <Scale className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-black text-emerald-800 dark:text-emerald-200">
            {hasUnknownFees ? 'Needs review' : formatSAR(grandTotal)}
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
            {language === 'ar' ? 'قيمة الفاتورة + الرسوم والضريبة التقديرية' : 'Invoice value + estimated duty + estimated VAT'}
          </span>
        </div>
      </div>

      {/* Regulatory Certification & Submission Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-3 bg-slate-50 dark:bg-slate-800/40 -mx-5 -mb-5 px-5 py-3.5 rounded-b-2xl border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {language === 'ar' ? 'الشهادات الرقابية المطلوبة للإرسالية:' : 'ZATCA Import Requirements:'}
          </span>
          {allCerts.map((cert) => (
            <span
              key={cert}
              className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-slate-800 border border-slate-200 shadow-2xs dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"
            >
              {cert}
            </span>
          ))}
        </div>

        <div>
          {isCleared ? (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>{language === 'ar' ? 'تم الفسح الجمركي بنجاح (FASAH)' : 'Consignment Cleared & Dispatched'}</span>
            </div>
          ) : (
            <button
              onClick={onClearInvoice}
              disabled={true}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-all ${
                isAllVerified && role !== 'AUDITOR'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-98 cursor-pointer shadow-emerald-700/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
              }`}
              title={
                role === 'AUDITOR'
                  ? (language === 'ar' ? 'المدقق يملك صلاحية القراءة والتدقيق فقط' : 'Auditors have read-only audit permissions')
                  : !isAllVerified
                  ? (language === 'ar' ? 'يرجى مراجعة واعتماد جميع البنود أولاً' : 'Please verify all line items first')
                  : ''
              }
            >
              <Send className="h-3.5 w-3.5" />
              <span>
                {isClearing
                  ? (language === 'ar' ? 'جارٍ إصدار البيان...' : 'Transmitting to FASAH...')
                  : 'FASAH submission not connected'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
