import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, Coffee, GraduationCap, Calendar, Wallet, MapPin, Menu, X, ChevronDown, FileText } from 'lucide-react';

const standaloneItems = [
  { path: '/', label: 'داشبورد', icon: LayoutDashboard },
  { path: '/people', label: 'افراد', icon: Users },
  { path: '/workspace', label: 'فضای کار', icon: Briefcase },
  { path: '/cafe', label: 'کافه', icon: Coffee },
  { path: '/workshops', label: 'کارگاه‌ها', icon: GraduationCap },
  { path: '/finance', label: 'مالی', icon: Wallet },
];

const navGroups = [];

const bottomItems = [
  { path: '/spaces', label: 'فضاها', icon: MapPin },
  { path: '/calendar', label: 'تقویم', icon: Calendar },
  { path: '/daily-report', label: 'گزارش روز', icon: FileText },
];

export default function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isGroupActive = (group) => group.children.some(c => location.pathname === c.path || location.pathname.startsWith(c.path + '/'));
  const toggleGroup = (label) => {
    const group = navGroups.find(g => g.label === label);
    const currentlyOpen = openGroups[label] !== undefined ? openGroups[label] : !!(group && isGroupActive(group));
    setOpenGroups(prev => ({ ...prev, [label]: !currentlyOpen }));
  };

  const Brand = ({ size = 'lg' }) => (
    <div className="flex items-center gap-2.5">
      <div className={`${size === 'lg' ? 'w-9 h-9' : 'w-7 h-7'} rounded-xl bg-[#B74B40] flex items-center justify-center`}>
        <span className="text-white font-bold leading-none" style={{ fontFamily: 'Azar, Ravagh, sans-serif', fontSize: size === 'lg' ? '1.1rem' : '0.9rem' }}>ب</span>
      </div>
      <div>
        <h1 className={`${size === 'lg' ? 'text-xl' : 'text-lg'} font-bold text-gray-900 leading-none`} style={{ fontFamily: 'Azar, Ravagh, sans-serif' }}>بینابین</h1>
        {size === 'lg' && <p className="text-[11px] text-muted-foreground mt-1.5">داشبورد سنجه‌ها</p>}
      </div>
    </div>
  );

  const renderNav = () => (
    <nav className="flex flex-col gap-1 p-3">
      {standaloneItems.map(item => {
        const active = location.pathname === item.path;
        return (
          <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${active ? 'bg-[#FDF2F1] text-[#B74B40]' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
      {navGroups.map(group => {
        const childActive = isGroupActive(group);
        const isOpen = openGroups[group.label] !== undefined ? openGroups[group.label] : childActive;
        return (
          <div key={group.label}>
            <button onClick={() => toggleGroup(group.label)} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-right ${childActive ? 'text-[#B74B40]' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <group.icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 text-right">{group.label}</span>
              <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="mr-4 mt-0.5 mb-1 space-y-0.5 border-r border-border pr-2">
                {group.children.map(item => {
                  const active = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${active ? 'bg-[#FDF2F1] text-[#B74B40]' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <div className="my-1 border-t border-border" />
      {bottomItems.map(item => {
        const active = location.pathname === item.path;
        return (
          <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${active ? 'bg-[#FDF2F1] text-[#B74B40]' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-l border-border flex-col flex-shrink-0 sticky top-0 h-screen">
        <div className="p-6 border-b border-border flex-shrink-0">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto">
          {renderNav()}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-border">
        <div className="flex items-center justify-between p-3">
          <Brand size="sm" />
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-gray-700 hover:bg-muted"
            aria-label="منو"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer — always mounted for instant open + smooth exit */}
      <div className={`md:hidden fixed inset-0 z-50 transition-opacity duration-200 ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
        <div className={`absolute right-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col transition-transform duration-200 ease-out ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
            <Brand size="sm" />
            <button
              onClick={() => setMobileOpen(false)}
              className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center text-gray-700"
              aria-label="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {renderNav()}
          </div>
        </div>
      </div>

      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}