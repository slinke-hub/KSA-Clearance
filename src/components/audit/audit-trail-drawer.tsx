'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/language-context';
import { safeFetchJson } from '@/lib/utils/api-client';
import { History, X, ShieldAlert, FileText, CheckCircle, RefreshCw } from 'lucide-react';

interface AuditLogItem {
  id: string;
  userId: string;
  user?: {
    name: string;
    role: string;
    email: string;
  };
  action: string;
  entityType: string;
  entityId: string;
  details: any;
  ipAddress: string | null;
  timestamp: string;
}

interface AuditTrailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuditTrailDrawer({ isOpen, onClose }: AuditTrailDrawerProps) {
  const { language, t } = useApp();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const json = await safeFetchJson<AuditLogItem[]>('/api/audit-logs');
      if (json.success && json.data) {
        setLogs(json.data);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200 rtl:slide-in-from-left rtl:border-r rtl:border-l-0">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {t.auditTrailTitle}
              </h3>
              <p className="text-xs text-slate-500">
                {t.auditTrailDesc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="Refresh logs"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {logs.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              {isLoading ? 'Loading audit trail...' : 'No audit records found.'}
            </div>
          ) : (
            logs.map((log) => {
              const formattedDate = new Date(log.timestamp).toLocaleString(
                language === 'ar' ? 'ar-SA' : 'en-US',
                {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }
              );

              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-850 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[10px] border border-emerald-200 dark:border-emerald-800">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formattedDate}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">
                      {log.user?.name || log.userId}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      IP: {log.ipAddress || '127.0.0.1'}
                    </span>
                  </div>

                  {log.details && (
                    <div className="mt-2 rounded-lg bg-white dark:bg-slate-900 p-2.5 border border-slate-100 dark:border-slate-800 font-mono text-[11px] overflow-x-auto text-slate-600 dark:text-slate-300">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
