'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '@/context/language-context';
import { CERTIFICATE_DEFINITIONS } from '@/lib/constants/tariff-catalog';
import { Award, ShieldAlert, CheckCircle2, ExternalLink, X } from 'lucide-react';

interface CertificateInfoModalProps {
  certCode: string | null;
  onClose: () => void;
}

export function CertificateInfoModal({ certCode, onClose }: CertificateInfoModalProps) {
  const { language } = useApp();

  if (!certCode) return null;

  const def = CERTIFICATE_DEFINITIONS[certCode] || {
    code: certCode,
    nameEn: certCode,
    nameAr: certCode,
    issuer: 'Saudi Conformity Authority',
    descriptionEn: 'Mandatory technical conformity certificate required for customs clearance.',
    descriptionAr: 'شهادة مطابقة فنية إلزامية مطلوبة للفسح الجمركي.',
    badgeColor: 'bg-slate-100 text-slate-800'
  };

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {language === 'ar' ? 'تفاصيل الشهادة الرقابية' : 'Regulatory Certificate Details'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {language === 'ar' ? 'رمز المعيار' : 'Standard Code'}
            </span>
            <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
              {def.code}
            </span>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              {language === 'ar' ? def.nameAr : def.nameEn}
            </h4>
            <span className="text-xs text-slate-500 mt-0.5 block">
              {language === 'ar' ? `الجهة المصدرة: ${def.issuer}` : `Issuing Authority: ${def.issuer}`}
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-100 dark:border-slate-800 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            {language === 'ar' ? def.descriptionAr : def.descriptionEn}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              {language === 'ar'
                ? 'يتم التحقق آلياً عبر الربط الإلكتروني مع منصة سابر وهيئة المواصفات.'
                : 'Reference information only. Current requirements are retrieved from ZATCA.'}
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 transition"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;
}
