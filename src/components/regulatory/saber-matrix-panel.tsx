'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/language-context';
import { CERTIFICATE_DEFINITIONS, SAUDI_TARIFF_CATALOG } from '@/lib/constants/tariff-catalog';
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  FileCheck2,
  AlertTriangle,
  Building2,
  ExternalLink,
  Search,
  Sparkles
} from 'lucide-react';

export function SaberMatrixPanel({ onSelectCert }: { onSelectCert: (code: string) => void }) {
  const { language } = useApp();
  const [filterQuery, setFilterQuery] = useState('');

  const certList = Object.values(CERTIFICATE_DEFINITIONS);

  const filteredCerts = certList.filter(
    (c) =>
      c.code.toLowerCase().includes(filterQuery.toLowerCase()) ||
      c.nameEn.toLowerCase().includes(filterQuery.toLowerCase()) ||
      c.nameAr.includes(filterQuery) ||
      c.issuer.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Workflow Banner */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-900/30 via-slate-900 to-teal-950/40 p-6 text-white shadow-lg relative overflow-hidden backdrop-blur-md">
        <div className="absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="h-4 w-4" />
            <span>
              {language === 'ar'
                ? 'منظومة المطابقة الرقابية الموحدة في المملكة'
                : 'Unified Saudi Regulatory Compliance Framework'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
            {language === 'ar'
              ? 'بوابة الربط التقني: سابر • هيئة المواصفات • هيئة الغذاء والدواء • فسح'
                  : 'Conformity certificate reference guide'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {language === 'ar'
              ? 'يتم فحص كل بند في الفاتورة التجارية للتحقق من مطابقة المنتج للوائح الفنية السعودية الصادرة عن الهيئة السعودية للمواصفات والمقاييس (SASO) ومنصة سابر الإلكترونية، لضمان الفسح الجمركي الفوري وتفادي احتجاز الشحنات في المنافذ.'
              : 'This reference explains certificate names. Product-specific requirements come from the live SABER result attached to each invoice item. FASAH submission is not connected.'}
          </p>
        </div>

        {/* 4 Steps Architecture */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <span className="text-xs font-mono font-bold text-emerald-400">01. INGESTION</span>
            <p className="text-xs font-semibold text-white mt-1">Invoice Parsing & SHA-256</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Automated document OCR</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <span className="text-xs font-mono font-bold text-emerald-400">02. ZATCA 12-DIGIT</span>
            <p className="text-xs font-semibold text-white mt-1">National Tariff Match</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Duty & 15% VAT base calculation</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <span className="text-xs font-mono font-bold text-emerald-400">03. SABER / SASO</span>
            <p className="text-xs font-semibold text-white mt-1">Conformity Assessment</p>
            <p className="text-[11px] text-slate-400 mt-0.5">PCoC, SCoC, G-Mark, IECEE</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <span className="text-xs font-mono font-bold text-emerald-400">04. FASAH CLEARANCE</span>
            <p className="text-xs font-semibold text-white mt-1">Customs Release Permit</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Automated release declaration</p>
          </div>
        </div>
      </div>

      {/* Conformity Badges Directory */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              {language === 'ar' ? 'دليل الشهادات والمطابقة الرقابية' : 'Regulatory Certifications & Technical Standards'}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'ar'
                ? 'متطلبات المطابقة الصادرة عن هيئة المواصفات، هيئة الغذاء والدواء، وهيئة الاتصالات'
                : 'Conformity assessment marks required by SASO, SFDA, GSO, and CST'}
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 rtl:right-2.5 rtl:left-auto" />
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث في الشهادات...' : 'Search standards...'}
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-8 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {filteredCerts.map((cert) => (
            <div
              key={cert.code}
              onClick={() => onSelectCert(cert.code)}
              className="group cursor-pointer rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:border-emerald-500 hover:bg-emerald-50/20 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-850 dark:hover:border-emerald-700 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-black rounded-md px-2 py-0.5 bg-white border border-slate-200 text-emerald-800 dark:bg-slate-800 dark:border-slate-700 dark:text-emerald-300">
                    {cert.code}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate max-w-[130px]">
                    {cert.issuer}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 dark:text-white text-xs mt-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                  {language === 'ar' ? cert.nameAr : cert.nameEn}
                </h4>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-3 leading-relaxed">
                  {language === 'ar' ? cert.descriptionAr : cert.descriptionEn}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span>{language === 'ar' ? 'عرض التفاصيل الكاملة' : 'View Requirements'}</span>
                <span className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">&rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
