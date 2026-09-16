'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/language-context';
import { calculateSha256 } from '@/lib/services/invoice-parser';
import { parseInvoiceFile } from '@/lib/services/file-parsers';
import type { ParsedInvoiceDocument } from '@/lib/services/file-parsers';
import { ExtractionPreview } from './extraction-preview';
import { invoiceTotal } from '@/lib/services/invoice-valuation';
import { safeFetchJson } from '@/lib/utils/api-client';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Image,
  AlertCircle,
  X,
  ScanLine,
  ListChecks,
  Search
} from 'lucide-react';

interface InvoiceUploaderProps {
  onInvoiceCreated: (invoiceId: string) => void;
}

export function InvoiceUploader({ onInvoiceCreated }: InvoiceUploaderProps) {
  const { t, language } = useApp();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedInvoiceDocument | null>(null);
  const [pendingFile, setPendingFile] = useState<{ name: string; hash: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [selectedFile, setSelectedFile] = useState<{name: string; size: number} | null>(null);
  const ar = language === 'ar';
  const text = (en: string, arabic: string) => ar ? arabic : en;

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (busyRef.current) return;
    if (e.dataTransfer.files.length > 1) {
      setError(text('Choose one invoice at a time.', 'اختر فاتورة واحدة في كل مرة.')); return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const processUploadedFile = async (file: File) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsUploading(true);
    setError(null);
    setSelectedFile({name:file.name,size:file.size});
    setUploadStatus(text('Reading your invoice…', 'جارٍ قراءة الفاتورة…'));

    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Maximum invoice size is 20 MB.');
      if (!/\.(pdf|png|jpe?g|xlsx?|csv|json)$/i.test(file.name)) throw new Error(text('Choose a PDF, image, Excel, CSV or JSON file.', 'اختر ملف PDF أو صورة أو Excel أو CSV أو JSON.'));
      const buffer = await file.arrayBuffer();
      const fileHash = await calculateSha256(buffer);

      setUploadStatus(language === 'ar' ? 'جارٍ استخراج بنود الفاتورة...' : 'Extracting invoice line items...');

      // Parse the actual file to extract all line items
      const parsed = await parseInvoiceFile(file);
      setPreview(parsed);
      setPendingFile({ name: file.name, hash: fileHash });
    } catch (err: any) {
      setError(err.message || 'Unable to read invoice.');
    } finally {
      busyRef.current = false;
      setIsUploading(false);
      setUploadStatus(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const submitPreview = async () => {
    if (!preview || !pendingFile || busyRef.current) return;
    busyRef.current = true;
    setIsUploading(true);
    setError(null);
    const parsed = preview;
    try {

      setUploadStatus(language === 'ar' ? 'جارٍ مطابقة رموز الجمارك وحساب الرسوم...' : 'Matching ZATCA tariff codes & computing duties...');

      const payload = {
        invoiceNumber: parsed.invoiceNumber,
        exporterName:  parsed.exporterName,
        importerName:  parsed.importerName,
        currency:      parsed.currency,
        totalAmount:   invoiceTotal(parsed.lineItems, parsed.charges),
        charges: parsed.charges ?? [],
        storagePath:   `browser-extracted/${pendingFile.name}`,
        fileHash:      pendingFile.hash,
        lineItems:     parsed.lineItems.map((item, index) => ({ ...item, lineNumber: index + 1 })),
      };

      const json = await safeFetchJson('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (json.success && json.data) {
        setPreview(null);
        setPendingFile(null);
        onInvoiceCreated(json.data.id);
      } else {
        setError('Processing failed: ' + (json.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to classify invoice.');
    } finally {
      busyRef.current = false;
      setIsUploading(false);
      setUploadStatus(null);
    }
  };

  const stage = isUploading && preview ? 2 : preview ? 1 : 0;
  const steps = [
    {title:text('Choose a file', 'اختيار الملف'),detail:text('Your commercial invoice', 'الفاتورة التجارية'),icon:UploadCloud},
    {title:text('Review products', 'مراجعة المنتجات'),detail:text('Check the extracted details', 'تحقق من البيانات المستخرجة'),icon:ListChecks},
    {title:text('Check ZATCA', 'التحقق من الهيئة'),detail:text('Tariffs & import requirements', 'التعرفة ومتطلبات الاستيراد'),icon:Search},
  ];
  return (
    <section className="upload-studio" aria-labelledby="upload-heading">
      <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.json" className="hidden" aria-label={text('Choose commercial invoice', 'اختر الفاتورة التجارية')} disabled={isUploading} />
      <div className="upload-heading">
        <div><p className="upload-eyebrow">{text('DOCUMENT STUDIO', 'مساحة المستندات')}</p><h2 id="upload-heading">{t.uploadInvoice}</h2><p className="upload-subtitle">{text('Turn your invoice into a clear, reviewable customs workspace.', 'حوّل فاتورتك إلى مساحة واضحة لمراجعة البيانات الجمركية.')}</p></div>
        <span className="upload-source-tag"><ScanLine className="h-4 w-4" />{text('ZATCA tariff lookup', 'البحث في تعرفة الهيئة')}</span>
      </div>
      <ol className="upload-steps" aria-label={text('Invoice processing steps', 'خطوات معالجة الفاتورة')}>
        {steps.map((step,index)=><li key={step.title} aria-current={stage===index ? 'step' : undefined} className={stage===index?'is-current':stage>index?'is-complete':''}>
          <span className="upload-step-icon">{stage>index ? <CheckCircle2 className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}</span>
          <div><span className="upload-step-number">0{index+1}</span><strong>{step.title}</strong><p>{step.detail}</p></div>
        </li>)}
      </ol>
      {error && <div role="alert" className="upload-error"><AlertCircle className="h-5 w-5 shrink-0" /><div className="min-w-0 flex-1"><strong>{text('This invoice needs another look', 'تحتاج الفاتورة إلى مراجعة')}</strong><p className="mt-1 break-words">{error}</p></div><button type="button" onClick={()=>setError(null)} aria-label={text('Dismiss error', 'إغلاق رسالة الخطأ')}><X className="h-4 w-4" /></button></div>}
      {preview && !isUploading ? (
        <div className="upload-review">
          <div className="upload-file-strip"><FileSpreadsheet className="h-5 w-5 shrink-0" /><div className="min-w-0 flex-1"><strong className="block break-all">{pendingFile?.name}</strong><span>{preview.lineItems.length} {text('products extracted · Ready for your review', 'منتج مستخرج · جاهز للمراجعة')}</span></div><span className="upload-ready-tag"><CheckCircle2 className="h-3.5 w-3.5" />{text('File read', 'تمت القراءة')}</span></div>
          <ExtractionPreview invoice={preview} onChange={setPreview} onSubmit={submitPreview} onCancel={()=>{setPreview(null);setPendingFile(null);setSelectedFile(null);setError(null);}} />
        </div>
      ) : (
        <div className="upload-body">
          <div className="min-w-0">
            {isUploading ? <div className="upload-progress" role="status" aria-live="polite" aria-busy="true">
              <div className="upload-progress-icon"><Loader2 className="h-8 w-8 animate-spin" /></div>
              <p className="upload-eyebrow">{stage===2 ? text('LOOKING UP TARIFFS', 'جارٍ البحث في التعرفة') : text('READING YOUR DOCUMENT', 'جارٍ قراءة المستند')}</p>
              <h3>{uploadStatus || t.processing}</h3>
              <p>{stage===2 ? text('Retrieving tariff records and calculating estimated duties. Larger invoices may take a few minutes.', 'جارٍ استرجاع سجلات التعرفة وحساب الرسوم التقديرية. قد تستغرق الفواتير الكبيرة بضع دقائق.') : text('Extracting product descriptions, quantities and values. Scanned documents may take a little longer.', 'جارٍ استخراج وصف المنتجات والكميات والقيم. قد تستغرق المستندات الممسوحة وقتاً أطول.')}</p>
              {selectedFile && <div className="upload-working-file"><FileText className="h-4 w-4 shrink-0" /><span className="min-w-0 break-all">{selectedFile.name}</span></div>}
            </div> : <div className={isDragging?'upload-dropzone is-dragging':'upload-dropzone'} onDragOver={e=>{e.preventDefault();setIsDragging(true);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node | null))setIsDragging(false);}} onDrop={handleFileDrop}>
              <div className="upload-drop-icon"><UploadCloud className="h-8 w-8" /></div>
              <span className="upload-eyebrow">{text('YOUR NEXT SHIPMENT STARTS HERE', 'رحلتك القادمة تبدأ هنا')}</span>
              <h3>{isDragging ? text('Drop it here', 'أفلت الملف هنا') : text('Bring your invoice.', 'أضف فاتورتك.')}</h3>
              <p>{text('Drag a file into this space, or choose one from your device.', 'اسحب ملفاً إلى هذه المساحة أو اختر ملفاً من جهازك.')}</p>
              <button type="button" className="upload-choose" onClick={()=>fileInputRef.current?.click()}><UploadCloud className="h-4 w-4" />{text('Choose invoice', 'اختيار الفاتورة')}<ArrowRight className="h-4 w-4 rtl:rotate-180" /></button>
              <span className="upload-limit">{text('One invoice at a time · Maximum 20 MB', 'فاتورة واحدة في كل مرة · بحد أقصى 20 ميجابايت')}</span>
            </div>}
            <div className="upload-format-grid" aria-label={text('Supported file formats', 'تنسيقات الملفات المدعومة')}>
              {[{icon:FileText,title:'PDF',detail:text('Digital or scanned', 'رقمي أو ممسوح')},{icon:FileSpreadsheet,title:text('Spreadsheets', 'جداول البيانات'),detail:'XLSX · XLS · CSV'},{icon:Image,title:text('Images & data', 'الصور والبيانات'),detail:'PNG · JPG · JSON'}].map(format=><div key={format.title}><format.icon className="h-5 w-5" /><strong>{format.title}</strong><span>{format.detail}</span></div>)}
            </div>
          </div>
          <aside className="upload-guide">
            <span className="upload-eyebrow">{text('FROM DOCUMENT TO DECISION', 'من المستند إلى القرار')}</span>
            <h3>{text('A clearer picture of your import.', 'صورة أوضح لوارداتك.')}</h3>
            <p>{text('Review your products first. Then let the system search ZATCA for the relevant customs records.', 'راجع المنتجات أولاً، ثم دع النظام يبحث في سجلات الهيئة عن البيانات الجمركية المناسبة.')}</p>
            <ul>{[{title:text('12-digit HS codes', 'رموز جمركية من 12 رقماً'),desc:text('Suggested classifications with source evidence.', 'تصنيفات مقترحة مع أدلة المصدر.')},{title:text('Duty & VAT estimates', 'تقديرات الرسوم والضريبة'),desc:text('Rates and calculations shown alongside your products.', 'المعدلات والحسابات بجانب منتجاتك.')},{title:text('Import requirements', 'متطلبات الاستيراد'),desc:text('Customs controls and requirements listed by ZATCA.', 'المتطلبات والضوابط الجمركية المدرجة لدى الهيئة.')}].map((item,index)=><li key={item.title}><span>0{index+1}</span><div><strong>{item.title}</strong><p>{item.desc}</p></div></li>)}</ul>
            <div className="upload-tip"><ScanLine className="h-5 w-5 shrink-0" /><p><strong>{text('For the best results', 'للحصول على أفضل النتائج')}</strong>{text('Use a clear, complete invoice with readable product descriptions, quantities and prices.', 'استخدم فاتورة كاملة وواضحة تتضمن أوصاف المنتجات والكميات والأسعار المقروءة.')}</p></div>
          </aside>
        </div>
      )}
    </section>
  );
}
