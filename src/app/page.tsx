'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx/xlsx.mjs';
import { useApp } from '@/context/language-context';
import { Header } from '@/components/layout/header';
import { HsCodeLibrary } from '@/components/tariff/hs-code-library';
import { ClearanceReadiness } from '@/components/invoice/clearance-readiness';
import { InvoiceUploader } from '@/components/invoice/invoice-uploader';
import { ClearanceSummaryCard } from '@/components/invoice/clearance-summary-card';
import { LineItemsTable } from '@/components/invoice/line-items-table';
import { CertificateInfoModal } from '@/components/regulatory/certificate-info-modal';
import { TariffCatalogModal } from '@/components/tariff/tariff-catalog-modal';
import { AuditTrailDrawer } from '@/components/audit/audit-trail-drawer';
import { InvoiceEntity } from '@/types/invoice';
import { safeFetchJson } from '@/lib/utils/api-client';
import {
  FileText,
  FileCheck,
  Building,
  Hash,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Share2,
  ShieldAlert,
  Loader2,
  UploadCloud,
  Scale,
  History,
  BookOpen,
  LayoutDashboard,
  Trash2
} from 'lucide-react';

export default function ClearanceDashboard() {
  const { t, language, role, activeTab, setActiveTab } = useApp();
  const [invoices, setInvoices] = useState<InvoiceEntity[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  // Modals state
  const [activeCertCode, setActiveCertCode] = useState<string | null>(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState<string | undefined>();
  const [reviewTarget, setReviewTarget] = useState<{invoiceId:string;lineNumber:number;nonce:number} | null>(null);

  const fetchInvoices = async (selectId?: string) => {
    try {
      const json = await safeFetchJson<InvoiceEntity[]>('/api/invoices');
      if (json.success && json.data) {
        setInvoices(json.data);
        if (selectId) {
          setSelectedInvoiceId(selectId);
        } else if (!selectedInvoiceId && json.data.length > 0) {
          setSelectedInvoiceId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  const handleInvoiceCreated = async (newId: string) => {
    await fetchInvoices(newId);
    setActiveTab('console');
  };

  const handleClearInvoice = async () => {
    if (!selectedInvoiceId) return;
    setIsClearing(true);
    try {
      const json = await safeFetchJson(`/api/invoices/${selectedInvoiceId}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: role === 'ADMIN' ? 'user-admin-01' : 'user-agent-01',
        }),
      });
      if (json.success) {
        await fetchInvoices(selectedInvoiceId);
      }
    } catch (err) {
      console.error('Clearance approval failed', err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف جميع الفواتير؟' : 'Are you sure you want to delete all invoices?')) return;
    setIsLoading(true);
    try {
      const json = await safeFetchJson('/api/invoices/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: role === 'ADMIN' ? 'user-admin-01' : 'user-agent-01' }),
      });
      if (json.success) {
        setInvoices([]);
        setSelectedInvoiceId(null);
      }
    } catch (err) {
      console.error('Bulk deletion failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportJson = () => {
    if (!selectedInvoice) return;
    const blob = new Blob([JSON.stringify(selectedInvoice, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `INVOICE_CLASSIFICATION_${selectedInvoice.invoiceNumber}.json`;
    a.click();
  };

  // Export current invoice as Excel file using SheetJS
  const handleExportExcel = () => {
    if (!selectedInvoice) return;
    // Convert line items to sheet data
    const sheetData = selectedInvoice.lineItems.map((li) => ({
      lineNumber: li.lineNumber,
      description: li.description,
      quantity: li.quantity,
      unitValue: li.unitValue,
      totalValue: li.totalValue,
      estimatedCustomsValue: li.classificationEvidence?.valuation?.customsValue ?? li.totalValue,
      allocatedInvoiceAdjustments: li.classificationEvidence?.valuation?.allocatedCharges ?? 0,
      countryOfOrigin: li.countryOfOrigin,
      declaredHsCode: li.declaredHsCode ?? '',
      matchedHsCode: li.matchedHsCode ?? 'Needs review',
      dutyRate: li.dutyRate ?? 'Needs review',
      estimatedDutyFee: li.calculatedDutyFee ?? 'Needs review',
      estimatedVatFee: li.calculatedVatFee ?? 'Needs review',
      currency: selectedInvoice.currency,
      regulatoryStatus: li.regulatoryStatus,
      regulatoryBasis: li.classificationEvidence?.regulationBasis ?? 'Requires recheck',
      matchReason: li.classificationEvidence?.matchReason ?? '',
      missingProductDetails: li.classificationEvidence?.missingDetails?.join(' ') ?? '',
      certificates: li.classificationEvidence?.certificateRequirements ?? 'Needs review',
      zatcaSource: li.classificationEvidence?.zatcaUrl ?? '',
      checkedAt: li.classificationEvidence?.checkedAt ?? '',
      warnings: li.classificationEvidence?.warnings.join(' ') ?? 'Legacy result without source evidence',
    }));
    // Add invoice meta as first row
    const meta = [
      { key: 'Invoice Number', value: selectedInvoice.invoiceNumber },
      { key: 'Exporter', value: selectedInvoice.exporterName },
      { key: 'Importer', value: selectedInvoice.importerName },
      { key: 'Currency', value: selectedInvoice.currency },
      { key: 'Total Amount', value: selectedInvoice.totalAmount },
      ...(selectedInvoice.charges ?? []).map(charge => ({ key: charge.label, value: charge.amount })),
    ];
    const ws = XLSX.utils.aoa_to_sheet(meta.map(m => [m.key, m.value]));
    // Write meta rows
    meta.forEach((m, idx) => {
      const r = idx + 1;
      ws[`A${r}`] = { t: 's', v: m.key };
      ws[`B${r}`] = { t: 's', v: m.value };
    });
    // Add a blank row before line items
    const startRow = meta.length + 2;
    XLSX.utils.sheet_add_json(ws, sheetData, { origin: startRow });
    const wb = { SheetNames: ['Invoice'], Sheets: { Invoice: ws } };
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `INVOICE_CLASSIFICATION_${selectedInvoice.invoiceNumber}.xlsx`;
    a.click();
  };

  return (
    <div className="app-shell min-h-screen text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
      {/* Top Navigation Header with Theme Toggle */}
      <Header
        onOpenCatalog={() => {setCatalogQuery(undefined);setIsCatalogOpen(true);}}
        onOpenAuditLogs={() => setIsAuditLogsOpen(true)}
      />

      {/* Main Container */}
      <main id="workspace" className="workspace-main flex-1 mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {activeTab !== 'ingestion' && <section className="workspace-hero" aria-label={language === 'ar' ? 'نظرة عامة' : 'Workspace overview'}>
          <div className="hero-copy">
            <p className="hero-eyebrow"><span />{language === 'ar' ? 'التجارة، بكل وضوح' : 'TRADE, WITH CLARITY'}</p>
            <h1>{activeTab === 'tariff' ? (language === 'ar' ? 'اكتشف التصنيف المناسب.' : 'Find the right classification.') : activeTab === 'audit' ? (language === 'ar' ? 'كل قرار له سجل.' : 'Every decision, documented.') : (language === 'ar' ? 'خطوتك التالية، أوضح.' : 'Your next move, made clearer.')}</h1>
            <p className="hero-description">{language === 'ar' ? 'الفواتير والتعرفة ومتطلبات الاستيراد. مساحة واحدة لمراجعة التفاصيل واتخاذ القرار.' : 'Invoices, tariffs, and import requirements. One focused space to review the details and move forward.'}</p>
            <div className="hero-tags"><span><ShieldAlert className="h-3.5 w-3.5" />ZATCA</span><span>{language === 'ar' ? 'التصنيف والتقديرات' : 'Classification & estimates'}</span></div>
          </div>
          <div className="hero-ledger">
            <div className="hero-ledger-heading"><LayoutDashboard className="h-4 w-4" /><span>{language === 'ar' ? 'في مساحة العمل' : 'IN YOUR WORKSPACE'}</span></div>
            <div className="hero-stat"><strong>{isLoading ? '—' : invoices.length.toString().padStart(2, '0')}</strong><span>{language === 'ar' ? 'فاتورة محفوظة' : 'saved invoices'}</span></div>
            <div className="hero-ledger-bottom"><span>{language === 'ar' ? 'الفاتورة المحددة' : 'Selected invoice'}</span><strong>{selectedInvoice?.invoiceNumber ?? '—'}</strong></div>
            <button type="button" onClick={()=>setActiveTab('ingestion')}><UploadCloud className="h-4 w-4" />{language === 'ar' ? 'إضافة فاتورة' : 'Add an invoice'}</button>
          </div>
        </section>}
        
        {/* Tab 1: Clearance Console */}
        {activeTab === 'console' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-end dark:border-slate-800 dark:bg-slate-900">
              <div className="min-w-0 flex-1"><label htmlFor="active-invoice" className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-400">{language === 'ar' ? 'الفاتورة الحالية' : 'CURRENT INVOICE'}</label><select id="active-invoice" value={selectedInvoiceId ?? ''} onChange={e=>setSelectedInvoiceId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"><option value="" disabled>{language === 'ar' ? 'اختر فاتورة' : 'Select an invoice'}</option>{invoices.map(inv=><option key={inv.id} value={inv.id}>{inv.invoiceNumber} · {inv.exporterName} · {new Date(inv.createdAt).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-GB')}</option>)}</select></div>
              <button type="button" onClick={()=>setActiveTab('ingestion')} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"><UploadCloud className="h-4 w-4" />{language === 'ar' ? 'رفع فاتورة' : 'Upload invoice'}</button>
              {role === 'ADMIN' && (
                <button type="button" onClick={handleBulkDelete} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700">
                  <Trash2 className="h-4 w-4" />
                  {language === 'ar' ? 'حذف الجميع' : 'Delete All'}
                </button>
              )}
            </div>

            {/* Selected Invoice Workspace */}
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
                <p className="text-xs">Loading customs clearance workspace...</p>
              </div>
            ) : selectedInvoice ? (
              <div className="space-y-6">
                {/* Meta Banner */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 dark:text-white text-sm">
                          {selectedInvoice.invoiceNumber}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-mono text-slate-500">
                          {selectedInvoice.currency} · {selectedInvoice.lineItems.length} {language === 'ar' ? 'بند' : 'items'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {language === 'ar' ? 'المصدّر الدولي:' : 'Exporter:'} {selectedInvoice.exporterName}
                      </p>
                    </div>
                  </div>

                  {/* Actions: FASAH Export */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleExportJson}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition shadow-2xs"
                      title="Export invoice classification and source evidence"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-500" />
                      <span>{t.exportFasah}</span>
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition shadow-2xs ml-2"
                      title="Export Invoice as Excel"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-500" />
                      <span>{t.exportFasah} Excel</span>
                    </button>
                  </div>
                </div>

                {/* Financial Summary & Readiness Card */}
                <ClearanceSummaryCard
                  invoice={selectedInvoice}
                  onClearInvoice={handleClearInvoice}
                  isClearing={isClearing}
                />

                {/* Line Items Table with TanStack, inline override, and Saber regulations */}
                <ClearanceReadiness invoice={selectedInvoice} onReview={lineNumber=>setReviewTarget({invoiceId:selectedInvoice.id,lineNumber,nonce:Date.now()})} />
                <LineItemsTable
                  reviewTarget={reviewTarget?.invoiceId === selectedInvoice.id ? reviewTarget : null}
                  currency={selectedInvoice.currency}
                  invoiceId={selectedInvoice.id}
                  items={selectedInvoice.lineItems}
                  onItemUpdated={() => fetchInvoices(selectedInvoice.id)}
                  onOpenCertModal={(cert) => setActiveCertCode(cert)}
                />
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-slate-400">
                No invoice selected. Please upload or load a preset sample invoice.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Document Ingestion Studio */}
        {activeTab === 'ingestion' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <InvoiceUploader onInvoiceCreated={handleInvoiceCreated} />
          </div>
        )}

        {activeTab === 'tariff' && <HsCodeLibrary invoices={invoices} onLookup={code=>{setCatalogQuery(code);setIsCatalogOpen(true);}} onOpenInvoice={id=>{setSelectedInvoiceId(id);setActiveTab('console');}} />}

        {/* Tab 5: Audit Trail */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                    {t.auditTrailTitle}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {t.auditTrailDesc}
                  </p>
                </div>
                <button
                  onClick={() => setIsAuditLogsOpen(true)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-700 transition"
                >
                  {language === 'ar' ? 'عرض السجل المباشر' : 'Open Audit Drawer'}
                </button>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setIsAuditLogsOpen(true)}
                  className="w-full py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:border-blue-500 hover:text-blue-600 transition text-xs font-semibold"
                >
                  {language === 'ar' ? 'انقر هنا لفتح السجل المشفر لعمليات التدقيق والمطابقة' : 'Click to launch the Cryptographic Audit Trail Viewer'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200/80 bg-white/70 py-4 text-center text-xs text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/70 transition-colors">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {language === 'ar'
              ? 'تصنيف الفواتير بالاعتماد على هيئة الزكاة والضريبة والجمارك (ZATCA) فقط'
              : 'Invoice classification using ZATCA only'}
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Product scope and customs valuation require review
          </span>
        </div>
      </footer>

      {/* Regulatory Certificate Details Modal */}
      <CertificateInfoModal
        certCode={activeCertCode}
        onClose={() => setActiveCertCode(null)}
      />

      {/* Official 12-Digit ZATCA Tariff Catalog Modal */}
      <TariffCatalogModal
        initialQuery={catalogQuery}
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
      />

      {/* Cryptographic Audit Trail Drawer */}
      <AuditTrailDrawer
        isOpen={isAuditLogsOpen}
        onClose={() => setIsAuditLogsOpen(false)}
      />
    </div>
  );
}
