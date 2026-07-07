import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, Coffee, GraduationCap, PartyPopper, UserCheck, Tag, Palette, Calendar, Wallet } from 'lucide-react';

const navItems = [
  { path: '/', label: 'داشبورد', icon: LayoutDashboard },
  { path: '/people', label: 'افراد', icon: Users },
  { path: '/facilitators', label: 'تسهیلگرها', icon: UserCheck },
  { path: '/brands', label: 'برندها', icon: Tag },
  { path: '/artists', label: 'آرتیست‌ها', icon: Palette },
  { path: '/workspace', label: 'فضای کار', icon: Briefcase },
  { path: '/cafe', label: 'کافه', icon: Coffee },
  { path: '/workshops', label: 'کارگاه‌ها', icon: GraduationCap },
  { path: '/events', label: 'رویدادها', icon: PartyPopper },
  { path: '/calendar', label: 'تقویم', icon: Calendar },
  { path: '/accounting', label: 'حسابداری', icon: Wallet },
];

export default function Layout() {
  const location = useLocation();
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-muted/30">
      <aside className="md:w-64 bg-white border-l border-border flex md:flex-col flex-row overflow-x-auto md:overflow-visible flex-shrink-0">
        <div className="p-4 md:p-6 border-b border-border hidden md:block">
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Azar, Ravagh, sans-serif' }}>بینابین</h1>
          <p className="text-xs text-muted-foreground mt-1">داشبورد سنجه‌ها</p>
        </div>
        <div className="md:hidden p-3 border-b border-border flex-shrink-0">
          <h1 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Azar, Ravagh, sans-serif' }}>بینابین</h1>
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
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}