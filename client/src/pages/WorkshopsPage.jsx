import { useEffect, useState } from 'react';
import { api } from '@/api/client';

// Ported from SignupFlow.html's card markup. Two things the mockup showed that
// real Workshop data can't provide yet (flagged, not faked):
// - poster image: Workshop has no image field at all (no upload capability
//   exists anywhere in this system yet) — using a plain color block instead of
//   the mockup's sample-poster-*.webp, which were just placeholder art.
// - instructor name: Workshop only stores facilitator_ids, and Facilitator
//   isn't a public route (signup flow is anonymous) — omitted for now rather
//   than show a raw id.
function WorkshopCard({ workshop, onOpen }) {
  return (
    <div
      onClick={() => onOpen(workshop)}
      className="w-[240px] h-[520px] bg-[#117446] flex flex-col relative items-start cursor-pointer shrink-0"
    >
      <div className="w-full h-[260px] bg-[#0d5a37]" />
      <div
        className="absolute -top-2 left-3 h-4 w-[260px] shrink-0"
        style={{ backgroundImage: 'radial-gradient(circle, #F5F1EA 8px, transparent 8px)', backgroundSize: '35px 100%', backgroundRepeat: 'repeat-x' }}
      />
      <div className="w-full h-6 relative">
        <div className="absolute -top-3 w-full h-6 flex justify-between">
          <div className="absolute -right-3 w-6 h-6 bg-[#F5F1EA] rounded-full" />
          <div className="absolute -left-3 w-6 h-6 bg-[#F5F1EA] rounded-full" />
        </div>
      </div>
      <div className="w-full flex flex-wrap justify-center">
        <p className="w-full font-display text-center text-[22px] text-[#F5F1EA]">{workshop.title}</p>
        <p className="w-full font-body text-sm text-center text-[#F5F1EA] opacity-75 my-2">
          {[workshop.day_of_week, workshop.start_time && workshop.end_time ? `${workshop.start_time} تا ${workshop.end_time}` : null]
            .filter(Boolean)
            .join(' | ')}
        </p>
        <div
          className="w-[260px] h-4 mt-2 relative right-2 shrink-0"
          style={{ backgroundImage: 'radial-gradient(circle, #F5F1EA 8px, transparent 8px)', backgroundSize: '35px 100%', backgroundRepeat: 'repeat-x' }}
        />
        <p className="w-full font-display text-center text-[22px] text-[#F5F1EA] mt-2">
          {workshop.price ? `${workshop.price.toLocaleString('fa-IR')} تومان` : 'رایگان'}
        </p>
        <div
          className="w-[260px] h-4 mt-2 relative right-2 shrink-0 top-2"
          style={{ backgroundImage: 'radial-gradient(circle, #F5F1EA 8px, transparent 8px)', backgroundSize: '35px 100%', backgroundRepeat: 'repeat-x' }}
        />
      </div>
    </div>
  );
}

function BottomSheet({ workshop, onClose, onRegister }) {
  const open = !!workshop;
  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
      <div
        className={`fixed bottom-0 inset-x-0 z-50 mx-auto max-w-[480px] bg-[#DDD3C7] rounded-t-3xl transition-transform duration-300 max-h-[85vh] overflow-y-auto shadow-md ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {workshop && (
          <>
            <div className="relative">
              <div className="w-full h-56 bg-[#0d5a37] rounded-t-3xl" />
              <div className="absolute -bottom-4 left-8 w-8 h-8 rounded-full bg-[#DDD3C7]" />
              <div className="absolute -bottom-4 right-8 w-8 h-8 rounded-full bg-[#DDD3C7]" />
            </div>
            <div className="p-6">
              <h2 className="font-display text-[28px] text-[#211E1F] leading-tight">{workshop.title}</h2>
              <p className="font-body text-sm text-[#211E1F] opacity-80 leading-7 mt-4">{workshop.description}</p>
              <p className="font-body text-sm font-bold text-[#211E1F] text-center mt-6">
                {[workshop.day_of_week, workshop.start_time && workshop.end_time ? `${workshop.start_time} تا ${workshop.end_time}` : null, workshop.space]
                  .filter(Boolean)
                  .join('  ★  ')}
              </p>
              <button
                onClick={() => onRegister(workshop)}
                className="relative h-[60px] w-full mt-4 bg-[#A94334] overflow-hidden"
              >
                <div className="absolute inset-y-0 right-0 w-full flex items-center justify-center">
                  <span className="font-display text-lg text-[#F5F1EA]">شـــرکت در این کـارگـاه</span>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function WorkshopsPage({ onSelectWorkshop }) {
  const [workshops, setWorkshops] = useState([]);
  const [sheetWorkshop, setSheetWorkshop] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listWorkshops().then(setWorkshops).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="h-full w-full pr-6 flex flex-col">
      <h1 className="font-display text-[#211E1F] text-5xl mt-40 mb-6">کـارگاه‌هـا</h1>

      {error && <p className="font-body text-sm text-red-700 pl-6">{error}</p>}
      {!error && workshops.length === 0 && (
        <p className="font-body text-sm text-[#211E1F]/60 pl-6">فعلاً کارگاهی ثبت نشده.</p>
      )}

      <div className="w-full flex gap-8 overflow-x-scroll no-scrollbar pl-6 h-[540px]">
        {workshops.map((w) => (
          <WorkshopCard key={w.id} workshop={w} onOpen={setSheetWorkshop} />
        ))}
      </div>

      <BottomSheet
        workshop={sheetWorkshop}
        onClose={() => setSheetWorkshop(null)}
        onRegister={(w) => { setSheetWorkshop(null); onSelectWorkshop(w); }}
      />
    </div>
  );
}
