import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, Coffee, GraduationCap, UserCheck, Tag, Palette, Calendar, Wallet, ClipboardCheck, RotateCcw } from 'lucide-react';

const navItems = [
  { path: '/', label: 'داشبورد', icon: LayoutDashboard },
  { path: '/people', label: 'افراد', icon: Users },
  { path: '/facilitators', label: 'تسهیلگرها', icon: UserCheck },
  { path: '/brands', label: 'برندها', icon: Tag },
  { path: '/artists', label: 'آرتیست‌ها', icon: Palette },
  { path: '/workspace', label: 'فضای کار', icon: Briefcase },
  { path: '/cafe', label: 'کافه', icon: Coffee },
  { path: '/workshops', label: 'کارگاه‌ها', icon: GraduationCap },
  { path: '/attendance', label: 'حضور غیاب', icon: ClipboardCheck },
  { path: '/calendar', label: 'تقویم', icon: Calendar },
  { path: '/accounting', label: 'حسابداری', icon: Wallet },
  { path: '/returns', label: 'مرجوعی', icon: RotateCcw },
];

export default function Layout() {
  const location = useLocation();
  return (
    <div className="flex flex-col md:flex-row bg-muted/30">
      <aside className="md:w-64 bg-white border-l border-border flex md:flex-col flex-row overflow-x-auto md:overflow-y-auto md:overflow-x-visible flex-shrink-0 md:sticky md:top-0 md:h-screen">
        <div className="p-4 md:p-6 border-b border-border hidden md:block flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#B74B40] flex items-center justify-center">
              <span className="text-white font-bold text-lg leading-none" style={{ fontFamily: 'Azar, Ravagh, sans-serif' }}>ب</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-none" style={{ fontFamily: 'Azar, Ravagh, sans-serif' }}>بینابین</h1>
              <p className="text-[11px] text-muted-foreground mt-1.5">داشبورد سنجه‌ها</p>
            </div>
          </div>
        </div>
        <div className="md:hidden p-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#B74B40] flex items-center justify-center">
              <span className="text-white font-bold text-sm leading-none" style={{ fontFamily: 'Azar, Ravagh, sans-serif' }}>ب</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 leading-none" style={{ fontFamily: 'Azar, Ravagh, sans-serif' }}>بینابین</h1>
          </div>
        </div>
        <nav className="flex md:flex-col gap-1 p-2 md:p-3 flex-1">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${active ? 'bg-[#FDF2F1] text-[#B74B40]' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}