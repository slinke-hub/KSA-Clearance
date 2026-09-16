'use client';

import React, { useEffect, useState } from 'react';
import { useApp, UserRole, NavigationTab } from '@/context/language-context';
import { ShieldCheck, Globe, Sun, Moon, LayoutDashboard, UploadCloud, BookOpen, History, ArrowUpRight, Palette } from 'lucide-react';

interface HeaderProps { onOpenAuditLogs: () => void; onOpenCatalog: () => void }
export function Header({ onOpenAuditLogs, onOpenCatalog }: HeaderProps) {
  const { language, setLanguage, role, setRole, theme, toggleTheme, activeTab, setActiveTab } = useApp();
  const [accent, setAccent] = useState('tide');
  const ar = language === 'ar';
  useEffect(() => {
    try { const saved = localStorage.getItem('ksa_accent'); if (saved && ['tide','orchid','copper'].includes(saved)) { setAccent(saved); document.documentElement.dataset.accent = saved; } } catch { /* Storage may be disabled. */ }
  }, []);
  const changeAccent = (value: string) => {
    setAccent(value); document.documentElement.dataset.accent = value;
    try { localStorage.setItem('ksa_accent', value); } catch { /* Keep the selection for this session. */ }
  };
  const navItems: {id: NavigationTab; en: string; ar: string; icon: any; adminOnly?: boolean}[] = [
    {id:'console',en:'Workspace',ar:'مساحة العمل',icon:LayoutDashboard},
    {id:'ingestion',en:'Upload invoice',ar:'رفع فاتورة',icon:UploadCloud},
    {id:'tariff',en:'HS library & search',ar:'مكتبة الرموز والبحث',icon:BookOpen},
    {id:'audit',en:'Activity & audit',ar:'النشاط والتدقيق',icon:History},
    {id:'admin',en:'Admin Console',ar:'لوحة الإدارة',icon:ShieldCheck,adminOnly:true},
  ];
  const nav = navItems.filter(item => !item.adminOnly || role === 'ADMIN');
  return <header className="app-navigation">
    <a href="#workspace" className="skip-link">{ar ? 'انتقل إلى المحتوى' : 'Skip to workspace'}</a>
    <div className="nav-brand"><span className="brand-mark"><ShieldCheck className="h-6 w-6" /></span><div><strong>{ar ? 'مسار التخليص' : 'Clearance'}</strong><span>{ar ? 'مساحة عمل الاستيراد' : 'THE IMPORT WORKSPACE'}</span></div></div>
    <p className="nav-caption">{ar ? 'إدارة الشحنات' : 'YOUR OPERATIONS'}</p>
    <nav aria-label={ar ? 'التنقل الرئيسي' : 'Main navigation'} className="nav-links">
      {nav.map((item,index)=><button key={item.id} type="button" aria-current={activeTab === item.id ? 'page' : undefined} onClick={()=>{setActiveTab(item.id);if(item.id==='audit')onOpenAuditLogs();}} className={activeTab === item.id ? 'nav-link is-active' : 'nav-link'}><item.icon className="h-4 w-4 shrink-0" /><span>{ar ? item.ar : item.en}</span><span className="nav-index">0{index+1}</span></button>)}
    </nav>
    <button type="button" onClick={onOpenCatalog} className="nav-source text-start"><BookOpen className="h-5 w-5" /><p><strong>{ar ? 'ابحث في تعرفة الهيئة' : 'Search ZATCA tariffs'}</strong><span>{ar ? 'التعرفة ومتطلبات الاستيراد من ZATCA' : 'Tariffs & import requirements from ZATCA.'}</span></p><ArrowUpRight className="h-4 w-4 opacity-50" /></button>
    <div className="nav-preferences">
      <div className="flex items-center gap-2"><Palette className="h-4 w-4" /><label htmlFor="accent-palette" className="text-xs">{ar ? 'لوحة الألوان' : 'Color palette'}</label><select id="accent-palette" value={accent} onChange={e=>changeAccent(e.target.value)} className="nav-select ms-auto"><option value="tide">{ar ? 'بحري' : 'Tide'}</option><option value="orchid">{ar ? 'أوركيد' : 'Orchid'}</option><option value="copper">{ar ? 'نحاسي' : 'Copper'}</option></select></div>
      <div className="flex items-center justify-between gap-2"><label htmlFor="workspace-role" className="text-xs">{ar ? 'الدور' : 'Workspace role'}</label><select id="workspace-role" className="nav-select" value={role} onChange={e=>setRole(e.target.value as UserRole)}><option value="AGENT">{ar ? 'مخلّص' : 'Agent'}</option><option value="ADMIN">{ar ? 'مدير' : 'Admin'}</option><option value="AUDITOR">{ar ? 'مدقق' : 'Auditor'}</option></select></div>
      <div className="flex gap-2"><button type="button" onClick={toggleTheme} className="nav-utility" aria-label={theme==='dark' ? 'Switch to light theme' : 'Switch to dark theme'}>{theme==='dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}<span>{theme==='dark' ? (ar ? 'نهاري' : 'Daylight') : (ar ? 'ليلي' : 'Midnight')}</span></button><button type="button" onClick={()=>setLanguage(ar?'en':'ar')} className="nav-utility"><Globe className="h-4 w-4" />{ar?'English':'العربية'}</button></div>
    </div>
  </header>;
}
