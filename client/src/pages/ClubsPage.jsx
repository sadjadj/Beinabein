// All Clubs page, from the "All Clubs Handoff" mobile design.
import { useState } from 'react';
import { Link } from 'react-router-dom';

// Static until clubs come from the API: copied in from the "Beinabein Club
// Data" artifact (https://claude.ai/artifact/GpjygkTajec89vPtHjMEZo).
import data from '@/data/clubs.json';

export const allClubs = [...data].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
const featured = allClubs.filter((c) => c.featured);

// The hamburger and its drop-down card, same look as the panel's menu.
const SITE_LINKS = [['کارگاه‌ها', '/'], ['درباره ما', '/about'], ['تماس با ما', '/contact']];

function SiteMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)} aria-label="منو" aria-expanded={open} className="mt-[7px] w-[30px] h-fit flex flex-col gap-[5px] pt-[5px]">
        {[0, 1, 2].map((i) => <span key={i} className="h-[3px] bg-[#A7A7A7]" />)}
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-10 cursor-default" aria-label="بستن" onClick={() => setOpen(false)} />
          <nav className="anim-rise absolute left-3 top-full z-20 w-[186px] bg-[#F8F8F8] px-6 py-[50px] flex flex-col text-xl shadow-sm">
            {SITE_LINKS.map(([label, to]) => (
              <Link key={to} to={to} onClick={() => setOpen(false)} className="border-b border-[#8B8B8B] py-3 last:border-b-0">{label}</Link>
            ))}
          </nav>
        </>
      )}
    </>
  );
}

// children sit at the far (left) end of the bar; the panel passes its own
// buttons, every other page gets the site menu.
export function ClubsHeader({ children = <SiteMenu /> }) {
  return (
    <header className="relative h-[60px] bg-[#F7F7F7]">
      <div className="relative mx-auto max-w-[480px] h-full px-7 pt-[14px] flex justify-between">
        <Link to="/"><img src="/images/clubs/logo.svg" width="31" height="36" alt="بینابین" /></Link>
        {children}
      </div>
    </header>
  );
}

// The club's poster, filling its block; the color shows until a poster exists.
export function Poster({ club, className, children }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ backgroundColor: club.color }}>
      {club.image && <img src={club.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {children}
    </div>
  );
}

const ENAMAD_SEAL = `<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=8591917&Code=rrYGJNG9SIoe9ri0jOsKvytLoMqehosb'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=8591917&Code=rrYGJNG9SIoe9ri0jOsKvytLoMqehosb' alt='' style='cursor:pointer' code='rrYGJNG9SIoe9ri0jOsKvytLoMqehosb'></a>`;

const price = (n) => (n ? `ماهانه ${n.toLocaleString('fa-IR')} ت` : '');

// Sizes and spacing follow the Figma "All Clubs Handoff" frame (402px wide).
// Tag colors used across the workshop pages, panel and join flow.
export const TAG = {
  green: 'bg-[#E2F0E3] text-[#2F6B3A]', // open, active, paid
  amber: 'bg-[#FCEEC4] text-[#7A5200]', // needs renewal
  red: 'bg-[#F7E0DD] text-[#9C2F26]', // failed
  grey: 'bg-[#EDEDED] text-[#8B8B8B]', // ended
  blue: 'bg-[#DFEAF6] text-[#2A5582]', // online
  sand: 'bg-[#F2E4D3] text-[#74461C]', // in person
};
const modeTone = (mode) => (mode?.includes('آنلاین') ? TAG.blue : TAG.sand);

function ModePill({ className, children }) {
  return <span className={`absolute rounded-[50px] px-2 py-0.5 leading-[10px] ${modeTone(children)} ${className}`}>{children}</span>;
}

function FeaturedCard({ club }) {
  return (
    <Link to={`/clubs/${club.id}`} className="w-[160px] shrink-0">
      <Poster club={club} className="h-[200px]">
        <ModePill className="left-[11px] top-[13px] text-[10px]">{club.mode}</ModePill>
      </Poster>
      <div className="mt-[10px] px-2 flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-[8px] leading-[6px] text-[#2F6B3A]">ثبت‌نام باز</p>
          <div>
            <h3 className="font-display text-base text-[#221E1F]">{club.title}</h3>
            {club.facilitator_name && <p className="text-xs text-[#7A7879]">با {club.facilitator_name}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-[7px]">
          <p className="flex items-center gap-[5px] text-xs text-[#7A7879]">
            <img src="/images/clubs/calendar.svg" width="10" height="10" alt="" />
            {club.schedule}
          </p>
          <p className="text-sm font-bold text-[#221E1F]">{price(club.price)}</p>
        </div>
      </div>
    </Link>
  );
}

function ClubRow({ club }) {
  return (
    <Link to={`/clubs/${club.id}`} className="flex gap-[10px] h-[148px]">
      <Poster club={club} className="w-[118px] shrink-0">
        <ModePill className="left-[6px] top-[11px] text-[8px]">{club.mode}</ModePill>
      </Poster>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="text-[8px] text-[#2F6B3A]">ثبت‌نام باز</p>
          <div>
            <h3 className="font-display text-[22px] text-black">{club.title}</h3>
            {club.facilitator_name && <p className="text-xs text-[#7A7879]">با {club.facilitator_name}</p>}
          </div>
        </div>
        {/* First lines of the long text, cut with "…" to fit the card's fixed height. */}
        <p className="line-clamp-2 text-xs leading-[17px] text-black">{club.about || club.description}</p>
        <div className="flex h-[19px] items-center justify-between text-xs text-[#818181]">
          <span>{club.schedule}</span>
          <span className="flex items-center gap-0.5">
            <img src="/images/clubs/money.svg" width="12" height="12" alt="" />
            {price(club.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ClubsPage() {
  return (
    <div className="min-h-full bg-white">
      <ClubsHeader />
      <div className="anim-rise mx-auto max-w-[480px] px-3 pb-12">
        <h2 className="font-display text-[40px] leading-[1.2] text-[#221E1F] mt-8">کارگاه‌های پیشنهادی</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 mt-[23px]">
          {featured.map((c) => <FeaturedCard key={c.id} club={c} />)}
        </div>

        <h2 className="font-display text-[32px] leading-[1.2] text-[#1B1819] mt-[57px]">همه کارگاه‌ها</h2>
        <div className="flex flex-col gap-8 mt-[27px]">
          {allClubs.map((c) => <ClubRow key={c.id} club={c} />)}
        </div>
        {/* Enamad trust seal, exactly as Enamad gave it: no rel attribute, or it stops showing. */}
        <div className="mt-16 flex justify-center" dangerouslySetInnerHTML={{ __html: ENAMAD_SEAL }} />
      </div>
    </div>
  );
}
