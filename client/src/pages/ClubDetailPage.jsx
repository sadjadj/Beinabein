import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/api/client';
import { Link, useParams } from 'react-router-dom';
import { allClubs, ClubsHeader, Poster, TAG } from '@/pages/ClubsPage';

// One club's page, from the Figma "Clubs Detail Handoff" frame (402px wide).
// "field" sections read the club's own text from clubs.json; the rest are shared.
const sections = [
  { title: 'جزییات' }, // body is the club's own details, see DetailRows
  { title: 'درباره این انجمن', field: 'about' },
  { title: 'شرایط عضویت', field: 'conditions' },
  { title: 'درباره‌ی راهبر', field: 'facilitator_bio' },
  { title: 'انجمن چیست؟', body: 'انجمن از تخیل بینابین درباره‌ی یک جمع واقعی بیرون آمد. یک جمع برای جمع شدن نیاز دارد ادامه‌دار، اقتصادی و مشارکتی باشد. در انجمن‌های طراحی شده، تلاش شده این سه ویژگی تا جای ممکن پررنگ باشد.\nانجمن‌ها برای دغدغه‌هایی شکل گرفته‌اند که زیر فرش مانده‌اند. دغدغه‌هایی که برای زنده ماندن و تداوم یافتن، باید به شکل جمعی در بیایند. انجمن‌ها برای دوباره حس تعلق کردن در جمع و حساب کردن رویش است.\nعضویت در آن‌ها به صورت ماهانه تمدید می‌شود و برای ممکن شدن این موضوع بهاشان تا جایی که مجموعه به بقایش ادامه دهد، پایین نگه داشته شده است تا آدم‌های بیشتری بتوانند از موهبت جمع استفاده کنند.' },
  { title: 'قوانین انجمن‌ها', body: 'هر عضویت شامل ۴ جلسه است و از اولین جلسه‌ای که در آن شرکت می‌کنید حساب می‌شود.\nاگر نتوانستید در جلسه‌ای شرکت کنید، لطفاً دست‌کم ۲۴ ساعت قبل به راهبر خبر دهید.\nجلسه‌هایی که در آن‌ها غایب باشید به دوره‌ی بعد منتقل نمی‌شوند.\nبرای ادامه، پیش از پایان جلسه‌ی چهارم عضویت‌تان را تمدید کنید تا جای‌تان محفوظ بماند.\nلطفاً سر وقت برسید و به فضا و هم‌انجمنی‌های‌تان احترام بگذارید.' },
];

// Animating grid rows 0fr → 1fr opens to the content's real height; <details>
// can't animate its close in Safari.
function Section({ title, body }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#C3C3C3]">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-[10px] text-lg text-[#221E1F]"
      >
        {title}
        <img src="/images/clubs/chevron.svg" width="24" height="24" alt="" className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          {typeof body === 'string' ? <p className="pb-4 whitespace-pre-line text-sm leading-6 text-[#221E1F]">{body}</p>
            : Array.isArray(body) ? <ol className="pb-4 list-decimal ps-5 text-sm leading-6 text-[#221E1F]">{body.map((b) => <li key={b}>{b}</li>)}</ol>
            : body}
        </div>
      </div>
    </div>
  );
}

function DetailRows({ club }) {
  const rows = [
    ['زمان', club.schedule],
    ['جلسه اول', club.first_session],
    ['ظرفیت', club.capacity && `${club.capacity.toLocaleString('fa-IR')} نفر`],
    // Hidden while every club is in person; bring back when one goes online.
    // ['نحوه برگزاری', club.venue],
  ].filter(([, value]) => value);
  return (
    <div className="pb-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4 py-4 border-b border-[#9E9E9E] last:border-b-0 text-[#221E1F]">
          <span className="text-base">{label}</span>
          <span className="text-lg">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ponytail: buying is off until Zarinpal is wired; the join flow stays at
// /join/:id. Swap back to <Link to={`/join/${club.id}`}> then.
// Opens the join flow once the API says it can take registrations (SMS and
// Zarinpal configured, or fake mode locally); until then a dialog pointing to Instagram.
function JoinButton({ id }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(false);
  useEffect(() => { api.joinConfig().then((c) => setOpen(c.open)).catch(() => {}); }, []);
  if (open) return <Link to={`/join/${id}`} className="bg-[#221E1F] px-6 py-2 text-base font-bold text-white">عضویت در این انجمن</Link>;
  return (
    <>
      <button onClick={() => setDialog(true)} className="bg-[#221E1F] px-6 py-2 text-base font-bold text-white">عضویت در این انجمن</button>
      {/* Portal: the bottom bar is animated (transformed), which would trap a fixed child inside it. */}
      {dialog && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6" onClick={() => setDialog(false)}>
          <div role="dialog" aria-modal="true" className="anim-rise w-full max-w-[360px] rounded-lg bg-white p-6 flex flex-col gap-5 text-center text-[#221E1F] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-base leading-7">ثبت‌نام آنلاین به‌زودی فعال می‌شه. برای ثبت‌نام فعلا به دایرکت اینستاگرام پیام بدید.</p>
            <a href="https://ig.me/m/beinabein.space" target="_blank" rel="noreferrer" className="text-base font-bold underline">ارتباط با ما در اینستاگرام</a>
            <button onClick={() => setDialog(false)} className="text-sm text-[#7A7879]">بستن</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export default function ClubDetailPage() {
  const { id } = useParams();
  const club = allClubs.find((c) => c.id === id);

  return (
    <div className="min-h-full bg-white">
      <ClubsHeader />
      <div className="anim-rise mx-auto max-w-[480px] px-3 pb-40">
        <Link to="/" className="mt-3 inline-flex items-center gap-1 text-[#7A7879]">
          <img src="/images/clubs/chevron.svg" width="24" height="24" alt="" className="-rotate-90 opacity-60" />
          <span className="text-base">بازگشت</span>
        </Link>

        {!club ? (
          <p className="mt-10 text-base text-[#7A7879]">این انجمن پیدا نشد.</p>
        ) : (
          <>
            <Poster club={club} className="mt-[9px]" />

            <div className="mt-8 flex flex-col items-start gap-4">
              {/* <span className={`rounded-[50px] px-6 py-1 text-base ${TAG.green}`}>ثبت‌نام باز</span> */}
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-[9px] leading-[1.2]">
                  <h1 className="font-display text-[40px] text-[#221E1F]">{club.title}</h1>
                  {club.facilitator_name && <p className="text-xl text-[#7D7D7D]">با {club.facilitator_name}</p>}
                </div>
                <p className="text-xl text-[#221E1F]">{club.schedule}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-[10px]">
              {sections.filter((s) => !s.field || club[s.field]?.length).map((s) =><Section key={s.title} title={s.title} body={s.field ? club[s.field] : s.body ?? <DetailRows club={club} />} />)}
            </div>
          </>
        )}
      </div>

      {club && (
        <div className="anim-bar fixed bottom-0 inset-x-0 mx-auto max-w-[480px] bg-white border-t border-[#221E1F] px-3 py-[10px] flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[#828282]">ماهانه</p>
            <p className="text-base text-[#221E1F]">{club.price ? `${club.price.toLocaleString('fa-IR')} تومان` : ''}</p>
          </div>
          <JoinButton id={club.id} />
        </div>
      )}
    </div>
  );
}
