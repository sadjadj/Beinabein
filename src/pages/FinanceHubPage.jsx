import React, { useState } from 'react';
import { Wallet, BarChart3, RotateCcw, Receipt } from 'lucide-react';
import PillTabs from '@/components/PillTabs';
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
  return <PillTabs tabs={tabs} value={tab} onValueChange={setTab} />;
}