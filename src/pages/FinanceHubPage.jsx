import React, { useState } from 'react';
import { Wallet, BarChart3, RotateCcw, Receipt } from 'lucide-react';
import AccountingPage from '@/pages/AccountingPage';
import FinancialReport from '@/pages/FinancialReport';
import ReturnsPage from '@/pages/ReturnsPage';
import ExpensesPage from '@/pages/ExpensesPage';

const tabs = [
  { key: 'income', label: 'درآمدها', icon: Wallet, Component: AccountingPage },
  { key: 'financial-report', label: 'گزارش مالی', icon: BarChart3, Component: FinancialReport },
  { key: 'returns', label: 'مرجوعی', icon: RotateCcw, Component: ReturnsPage },
  { key: 'expenses', label: 'هزینه‌کرد', icon: Receipt, Component: ExpensesPage },
];

export default function FinanceHubPage() {
  const [tab, setTab] = useState('income');
  const active = tabs.find(t => t.key === tab) || tabs[0];
  const ActiveComponent = active.Component;

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-4">
        <h1 className="text-2xl font-bold">مالی</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت درآمدها، هزینه‌ها، مرجوعی و گزارش‌های مالی</p>
      </div>
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-1 overflow-x-auto">
            {tabs.map(t => {
              const isActive = t.key === tab;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-[#B74B40] text-[#B74B40]'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <t.icon className="w-4 h-4 flex-shrink-0" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <ActiveComponent embedded />
    </div>
  );
}