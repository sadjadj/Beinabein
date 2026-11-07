import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { allClubs, ClubsHeader, Poster, TAG } from '@/pages/ClubsPage';

// One club's page, from the Figma "Clubs Detail Handoff" frame (402px wide).
// Section texts are placeholders until real club content exists.
const sections = [
  { title: 'جزییات' }, // body is the club's own details, see DetailRows
  { title: 'درباره این کارگاه', field: 'about' },
  { title: 'کارگاه چیست؟', body: 'کارگاه‌های بینابین جمع‌های کوچکی‌اند که هر هفته دور یک موضوع مشترک، از کتاب و موسیقی تا هنر و گفت‌وگو، کنار هم می‌نشینند. هر کارگاه یک تسهیل‌گر دارد که جلسه‌ها را پیش می‌برد، اما بیشتر از هر چیز، کارگاه جایی برای یاد گرفتن از هم و ساختن چیزی با هم است.\nلازم نیست از قبل چیزی بلد باشید؛ کنجکاوی کافی است.' },
  { title: 'قوانین کارگاه‌ها', body: 'هر عضویت شامل ۴ جلسه است و از اولین جلسه‌ای که در آن شرکت می‌کنید حساب می‌شود.\nاگر نتوانستید در جلسه‌ای شرکت کنید، لطفاً دست‌کم ۲۴ ساعت قبل به تسهیل‌گر خبر دهید.\nجلسه‌هایی که در آن‌ها غایب باشید به دوره‌ی بعد منتقل نمی‌شوند.\nبرای ادامه، پیش از پایان جلسه‌ی چهارم عضویت‌تان را تمدید کنید تا جای‌تان محفوظ بماند.\nلطفاً سر وقت برسید و به فضا و هم‌کارگاهی‌های‌تان احترام بگذارید.' },
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
          {typeof body === 'string' ? <p className="pb-4 whitespace-pre-line text-sm leading-6 text-[#221E1F]">{body}</p> : body}
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
    ['نحوه برگزاری', club.venue],
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
function JoinButton() {
  const [tip, setTip] = useState(false);
  return (
    <div className="relative">
      {tip && <span className="absolute bottom-full left-0 mb-2 whitespace-nowrap bg-[#221E1F] px-3 py-2 text-sm text-white">خرید در حال حاضر امکان‌پذیر نیست.</span>}
      <button onClick={() => { setTip(true); setTimeout(() => setTip(false), 2500); }} onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}
        className="bg-[#221E1F] px-6 py-2 text-base font-bold text-white">عضویت در این کارگاه</button>
    </div>
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
          <span className="text-[30px] leading-[1.2]">→</span>
          <span className="text-base">بازگشت</span>
        </Link>

        {!club ? (
          <p className="mt-10 text-base text-[#7A7879]">این کارگاه پیدا نشد.</p>
        ) : (
          <>
            <Poster club={club} className="mt-[9px] h-[473px]" />

            <div className="mt-8 flex flex-col items-start gap-4">
              <span className={`rounded-[50px] px-6 py-1 text-base ${TAG.green}`}>ثبت‌نام باز</span>
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-[9px] leading-[1.2]">
                  <h1 className="font-display text-[40px] text-[#221E1F]">{club.title}</h1>
                  {club.facilitator_name && <p className="text-xl text-[#7D7D7D]">با {club.facilitator_name}</p>}
                </div>
                <p className="text-xl text-[#221E1F]">{club.schedule}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-[10px]">
              {sections.map((s) => <Section key={s.title} title={s.title} body={s.field ? club[s.field] : s.body ?? <DetailRows club={club} />} />)}
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
          <JoinButton />
        </div>
      )}
    </div>
  );
}
