import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { allClubs, ClubsHeader, TAG } from '@/pages/ClubsPage';

// Member panel, from the Figma "Panel-Option1" wireframes. Static sample data
// until login and packages exist; add ?empty to the URL to see the empty states.
// ponytail: sample member/memberships/payments; replace with the API once
// phone login and 4-session packages are built.
const SESSIONS = 4; // every membership package is 4 sessions
const member = { name: 'مژده تستی‌زاده', phone: '۰۹۱۲۱۲۱۲۱۱' };
const club = (id) => allClubs.find((c) => c.id === id) || {};
const memberships = [
  { clubId: 'dsdxqymgkps8qxl42274', remaining: 1, ends: '۱۸ آبان', next: 'پنجشنبه، ۱۵ آبان، ۱۲:۳۰' },
  { clubId: '3tvnv8mq5zvvv3gc4gta', remaining: 2, ends: '۲۶ آبان', next: 'پنجشنبه، ۱۵ آبان، ۱۰:۰۰' },
  { clubId: 'i5hedk8bt41q42upxye0', remaining: 0, ends: '۲ مهر', next: null },
];
const payments = [
  { clubId: '3tvnv8mq5zvvv3gc4gta', date: '۱۷ آبان ۱۴۰۵', time: '۱۴:۲۲', amount: 5100000, ok: true, ref: '۲۰۱۴۸۸۳۷۱۹' },
  { clubId: 'dsdxqymgkps8qxl42274', date: '۱۰ آبان ۱۴۰۵', time: '۰۹:۰۵', amount: 4500000, ok: true, ref: '۲۰۱۳۹۲۰۴۴۶' },
  { clubId: 'i5hedk8bt41q42upxye0', date: '۱ مهر ۱۴۰۵', time: '۱۸:۴۰', amount: 2000000, ok: false },
];

// Status follows the sessions left: none = ended, the last one = renew now.
const statusOf = (m) => (m.remaining === 0 ? 'ended' : m.remaining === 1 ? 'renew' : 'active');
const STATUS_LABEL = { renew: 'نیازمند تمدید', active: 'فعال', ended: 'پایان یافته' };
const fa = (n) => n.toLocaleString('fa-IR');

const STATUS_TONE = { renew: TAG.amber, active: TAG.green, ended: TAG.grey };

function Pill({ status, children }) {
  return (
    <span className={`rounded-[50px] px-3 py-1 text-xs ${STATUS_TONE[status]}`}>
      {children}
    </span>
  );
}

// One bar per session; the filled ones are the sessions still left.
function SessionBars({ remaining, ended }) {
  return (
    <div className="flex gap-[6px]">
      {Array.from({ length: SESSIONS }, (_, i) => (
        <span key={i} className={`h-[5px] flex-1 border-[0.5px] ${ended ? 'border-[#8B8B8B]' : 'border-black'} ${i < remaining ? 'bg-black' : 'bg-[#EDEDED]'}`} />
      ))}
    </div>
  );
}

function MembershipCard({ m }) {
  const c = club(m.clubId);
  const status = statusOf(m);
  const ended = status === 'ended';
  const renewTo = `/test/clubs/${m.clubId}`; // ponytail: renewal flow not built yet; the workshop page stands in
  return (
    <div className={`border border-[#8B8B8B] bg-white px-[15px] pt-[23px] pb-[15px] ${ended ? 'text-[#8B8B8B]' : 'text-black'}`}>
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-xl">{c.title}</h2>
        <Pill status={status}>{STATUS_LABEL[status]}</Pill>
      </div>
      {c.facilitator_name && <p className="mt-1 text-xs">با {c.facilitator_name}</p>}

      <div className="mt-5 w-[144px] flex flex-col gap-[6px]">
        <SessionBars remaining={m.remaining} ended={ended} />
        <p className="text-xs">{m.remaining ? `${fa(m.remaining)} جلسه باقی‌مانده` : 'جلسه‌ای باقی نمانده'}</p>
      </div>

      <hr className={`mt-5 border-t ${ended ? 'border-[#8B8B8B]' : 'border-black'}`} />

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-[26px] text-xs">
          <div className="w-[120px] flex flex-col gap-1">
            <span>جلسه بعدی</span>
            <span>{m.next || '-'}</span>
          </div>
          <div className="w-[120px] flex flex-col gap-1">
            <span>پایان عضویت</span>
            <span>{m.ends}</span>
          </div>
        </div>
        {status !== 'renew' && (
          <Link to={renewTo} className="text-sm underline whitespace-nowrap">{ended ? 'تمدید ←' : 'تمدید زودهنگام ←'}</Link>
        )}
      </div>

      {status === 'renew' && (
        <Link to={renewTo} className="mt-5 block bg-black pt-1 pb-[7px] text-center text-xl text-white">تمدید</Link>
      )}
    </div>
  );
}

function MyWorkshops({ empty }) {
  if (empty) {
    return (
      <div className="mx-auto mt-[125px] max-w-[296px] flex flex-col items-center gap-10 text-center">
        <p className="text-3xl">هنوز عضو هیچ کارگاهی نیستید!</p>
        <p className="text-xl">کارگاه‌ها را ببینید و به هرکدام که دوست داشتید بپیوندید.</p>
        <Link to="/test/clubs" className="text-xl underline">مشاهده همه‌ی کارگاه‌ها ←</Link>
      </div>
    );
  }
  const order = { renew: 0, active: 1, ended: 2 };
  const sorted = [...memberships].sort((a, b) => order[statusOf(a)] - order[statusOf(b)]);
  return (
    <div className="mt-8 flex flex-col gap-[31px]">
      {sorted.map((m, i) => <div key={m.clubId} className="anim-rise" style={{ animationDelay: `${i * 70}ms` }}><MembershipCard m={m} /></div>)}
    </div>
  );
}

// One receipt per payment; Zarinpal gives a tracking code (ref_id) for paid ones.
function Payments({ empty }) {
  if (empty) return <p className="mt-[175px] text-center text-2xl">هنوز پرداختی ثبت نشده است.</p>;
  return (
    <div className="mt-8 flex flex-col gap-4">
      {payments.map((p, i) => (
        <div key={p.clubId + p.date} className="anim-rise border border-[#8B8B8B] px-[15px] py-4 flex flex-col gap-3" style={{ animationDelay: `${i * 70}ms` }}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xl">{club(p.clubId).title}</span>
            <span className={`shrink-0 rounded-[50px] px-3 py-1 text-xs ${p.ok ? TAG.green : TAG.red}`}>{p.ok ? 'موفق' : 'ناموفق'}</span>
          </div>
          <div className="flex items-center justify-between text-base text-[#8B8B8B]">
            <span>{p.date}، ساعت {p.time}</span>
            <span className="text-black">{fa(p.amount)} تومان</span>
          </div>
          <div className="flex items-center justify-between text-sm text-[#8B8B8B]">
            {p.ok ? <><span>کد پیگیری</span><span className="select-all" dir="ltr">{p.ref}</span></> : <span>پرداخت انجام نشد و مبلغی کسر نشد.</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// The two small cards that drop from the top bar: the section menu and the profile.
function MenuCard({ onPick, onProfile }) {
  const items = [['کارگاه‌های من', '/test/panel'], ['پرداخت‌ها', '/test/panel/payments']];
  return (
    <nav className="w-[186px] bg-[#F8F8F8] px-6 py-[50px] flex flex-col text-xl">
      {items.map(([label, to]) => (
        <button key={to} onClick={() => onPick(to)} className="border-b border-[#8B8B8B] py-3 text-right">{label}</button>
      ))}
      <button onClick={onProfile} className="py-3 text-right">پروفایل</button>
    </nav>
  );
}

function ProfileCard({ onLogout }) {
  return (
    <div className="w-[206px] bg-[#F8F8F8] px-6 py-8 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-base text-[#8B8B8B]">نام و نام خانوادگی</span>
        <span className="text-xl">{member.name}</span>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-base text-[#8B8B8B]">شماره همراه</span>
        <span className="text-lg">{member.phone}</span>
      </div>
      <div className="mt-6 flex flex-col items-start gap-3 text-lg">
        {/* ponytail: no support channel decided yet (phone, Telegram, …) */}
        <button className="underline">تماس با پشتیبانی</button>
        <button onClick={onLogout} className="underline">خروج از حساب کاربری</button>
      </div>
    </div>
  );
}

export default function PanelPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const empty = params.has('empty');
  const [open, setOpen] = useState(null); // 'menu' | 'profile' | null
  const onPayments = pathname.endsWith('/payments');
  const toggle = (which) => setOpen(open === which ? null : which);
  const keep = empty ? '?empty' : '';

  return (
    <div className="min-h-full bg-white text-black">
      <ClubsHeader>
        <div className="flex items-start gap-3 pt-[7px]">
          <button onClick={() => toggle('profile')} aria-label="پروفایل" aria-expanded={open === 'profile'}>
            <img src="/images/clubs/user.svg" width="24" height="24" alt="" />
          </button>
          <button onClick={() => toggle('menu')} aria-label="منو" aria-expanded={open === 'menu'} className="w-[30px] flex flex-col gap-[5px] pt-[5px]">
            {[0, 1, 2].map((i) => <span key={i} className="h-[3px] bg-[#A7A7A7]" />)}
          </button>
        </div>
      </ClubsHeader>

      {open && (
        <>
          <button className="fixed inset-0 z-10 cursor-default" aria-label="بستن" onClick={() => setOpen(null)} />
          <div className="relative z-20 mx-auto max-w-[480px]">
            <div className="anim-rise absolute left-3 top-0 shadow-sm">
              {open === 'menu'
                ? <MenuCard onPick={(to) => { setOpen(null); navigate(to + keep); }} onProfile={() => setOpen('profile')} />
                : <ProfileCard onLogout={() => navigate('/test/clubs')} />}
            </div>
          </div>
        </>
      )}

      {/* key: the content rises in again when switching sections */}
      <main key={pathname} className="anim-rise mx-auto max-w-[480px] px-3 pb-20">
        <h1 className="mt-11 text-[36px] leading-[1.2]">{onPayments ? 'پرداخت‌ها' : 'کارگاه‌های من'}</h1>
        {onPayments ? <Payments empty={empty} /> : <MyWorkshops empty={empty} />}
      </main>
    </div>
  );
}
