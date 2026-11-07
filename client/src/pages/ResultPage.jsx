import { Link, useParams } from 'react-router-dom';
import { allClubs, ClubsHeader, TAG } from '@/pages/ClubsPage';

// Payment result pages, where Zarinpal sends people back after paying:
// /test/result/success and /test/result/failed.
// ponytail: sample workshop, member and tracking code until the gateway is wired.
const sample = { club: allClubs.find((c) => c.id === 'dsdxqymgkps8qxl42274'), code: '۲۰۱۳۹۲۰۴۴۶', amount: 4500000, name: 'علیرضا خمسه', phone: '09121212121' };

function Rows({ rows }) {
  return (
    <div className="mt-8">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-4 border-b border-[#D9D9D9] py-3 text-sm last:border-b-0">
          <span className="shrink-0 text-[#7A7879]">{label}</span>
          <span className="min-w-0 text-left">{value}</span>
        </div>
      ))}
    </div>
  );
}

const fa = (n) => n.toLocaleString('fa-IR');
const primary = 'block h-12 w-full bg-black text-center text-base leading-[48px] text-white';
const when = (club) => `${club.first_session}، ${club.schedule.split('|')[1]?.trim() || ''}`;
const codeSpan = (code) => <span key="c" dir="ltr" className="select-all">{code}</span>;
const secondary = 'block h-12 w-full border border-black text-center text-base leading-[48px]';
const workshopRows = (club) => [['کارگاه', club.title], ['تسهیل‌گر', club.facilitator_name]].filter(([, v]) => v);

function Header({ tone, mark, title, children }) {
  return (
    <div className="anim-rise mt-14 flex flex-col items-center text-center">
      <div className={`grid size-14 place-items-center rounded-full text-2xl ${tone}`}>{mark}</div>
      <h1 className="mt-6 font-display text-[34px] leading-[1.25]">{title}</h1>
      {children}
    </div>
  );
}

function Success({ club, code, amount }) {
  return (
    <>
      <Header tone={TAG.green} mark="✓" title="پرداخت موفق بود">
        <p className="mt-2 text-base">جای شما رزرو شد. منتظر دیدن‌تان هستیم!</p>
      </Header>
      <Rows rows={[...workshopRows(club), ['اولین جلسه', when(club)], ['نحوه برگزاری', club.venue], ['مبلغ پرداخت‌شده', `${fa(amount)} تومان`], ['کد پیگیری', codeSpan(code)]]} />
      <div className="mt-10"><Link to="/test/panel" className={primary}>رفتن به کارگاه‌های من</Link></div>
    </>
  );
}

function Failed({ club, code, amount, name, phone }) {
  return (
    <>
      <Header tone={TAG.red} mark="!" title="پرداخت انجام نشد">
        <p className="mt-2 text-base leading-7">عضویت شما ثبت نشد و مبلغی از حساب‌تان کسر نشده است.</p>
        <p className="mt-1 text-sm text-[#7A7879]">اگر مبلغی کسر شده، تا ۷۲ ساعت به حساب‌تان برمی‌گردد.</p>
      </Header>
      <Rows rows={[...workshopRows(club), ['مبلغ', `${fa(amount)} تومان`], ['کد پیگیری', codeSpan(code)]]} />
      <div className="mt-10 flex flex-col gap-3">
        {/* Already logged in, so straight back to the review step. */}
        <Link to={`/test/join/${club.id}`} state={{ name, phone }} className={primary}>پرداخت دوباره</Link>
        {/* ponytail: support channel not decided yet */}
        <button className={secondary}>تماس با پشتیبانی</button>
      </div>
    </>
  );
}

export default function ResultPage() {
  const { kind } = useParams();
  const Body = kind === 'failed' ? Failed : Success;
  return (
    <div className="min-h-full bg-white text-black">
      <ClubsHeader />
      <main className="mx-auto max-w-[480px] px-4 pb-16">
        <Body {...sample} />
      </main>
    </div>
  );
}
