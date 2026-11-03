// All Clubs page, from the "All Clubs Handoff" mobile design.
import { Link } from 'react-router-dom';

// Static until clubs come from the API: copied in from the "Beinabein Club
// Data" artifact (https://claude.ai/artifact/GpjygkTajec89vPtHjMEZo).
import data from '@/data/clubs.json';

export const allClubs = [...data].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
const featured = allClubs.filter((c) => c.featured);

export function ClubsHeader() {
  return (
    <header className="h-[60px] bg-[#F7F7F7]">
      <div className="mx-auto max-w-[480px] h-full px-7 pt-[14px]">
        <Link to="/test/clubs"><img src="/images/clubs/logo.svg" width="31" height="36" alt="بینابین" /></Link>
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

const price = (n) => (n ? `ماهانه ${n.toLocaleString('fa-IR')} ت` : '');

// Sizes and spacing follow the Figma "All Clubs Handoff" frame (402px wide).
function ModePill({ className, children }) {
  return <span className={`absolute rounded-[50px] bg-[#E6E6E6] px-2 py-0.5 leading-[10px] text-[#221E1F] ${className}`}>{children}</span>;
}

function FeaturedCard({ club }) {
  return (
    <Link to={`/test/clubs/${club.id}`} className="w-[160px] shrink-0">
      <Poster club={club} className="h-[200px]">
        <ModePill className="left-[11px] top-[13px] text-[10px]">{club.mode}</ModePill>
      </Poster>
      <div className="mt-[10px] px-2 flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-[8px] leading-[6px] text-[#7A7879]">ثبت‌نام باز</p>
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
    <Link to={`/test/clubs/${club.id}`} className="flex gap-[10px] h-[148px]">
      <Poster club={club} className="w-[118px] shrink-0">
        <ModePill className="left-[6px] top-[11px] text-[8px]">{club.mode}</ModePill>
      </Poster>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="text-[8px] text-black/50">ثبت‌نام باز</p>
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
      <div className="mx-auto max-w-[480px] px-3 pb-32">
        <h2 className="font-display text-[40px] leading-[1.2] text-[#221E1F] mt-8">کارگاه‌های پیشنهادی</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 mt-[23px]">
          {featured.map((c) => <FeaturedCard key={c.id} club={c} />)}
        </div>

        <h2 className="font-display text-[32px] leading-[1.2] text-[#1B1819] mt-[57px]">همه کارگاه‌ها</h2>
        <div className="flex flex-col gap-8 mt-[27px]">
          {allClubs.map((c) => <ClubRow key={c.id} club={c} />)}
        </div>
      </div>
    </div>
  );
}
