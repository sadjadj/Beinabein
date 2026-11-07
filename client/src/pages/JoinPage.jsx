import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { allClubs, ClubsHeader, Poster } from '@/pages/ClubsPage';

// Join flow, from the Figma "Login-Signup-Separate Pages" wireframes:
// phone → code → name → review and pay. Steps live in state, so "بازگشت"
// walks back through them.
// ponytail: no SMS, accounts or gateway yet — any code is accepted, the name
// step always shows (a returning member would skip it), and paying lands on
// the success page. Wire to the API and Zarinpal once they exist.
const RESEND_SECONDS = 90;
const CODE_LENGTH = 5; // ponytail: set to the SMS provider's real code length

// Persian/Arabic digits → Latin, everything else dropped.
const digits = (s) => s.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '');
const faDigits = (s) => s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
const clock = (s) => faDigits(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);

// anim: the slide class for this step (forward and back come from opposite sides).
function Step({ title, hint, anim, children }) {
  return (
    <div className={`mt-[150px] ${anim}`}>
      <h1 className="text-[30px] leading-[1.2]">{title}</h1>
      <p className="mt-12 text-base">{hint}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

const inputClass = 'h-12 w-full border border-[#C5C3C3] px-4 text-base placeholder:text-[#C5C3C3] focus:border-black focus:outline-none';
const buttonClass = 'mt-[50px] h-12 w-full bg-black text-base text-white disabled:bg-[#A7A7A7]';

function CodeStep({ phone, anim, onDone, onEditPhone }) {
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(RESEND_SECONDS);
  useEffect(() => {
    if (!left) return;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <Step title="تایید شماره موبایل" hint={`کد تایید ارسال‌شده به ${faDigits(phone)} را وارد کنید.`} anim={anim}>
      <form onSubmit={(e) => { e.preventDefault(); onDone(); }}>
        {/* One real input stretched over the boxes, so typing, paste and SMS
            auto-fill all work; the boxes only display its digits. */}
        <div className="relative flex justify-center gap-2" dir="ltr">
          {Array.from({ length: CODE_LENGTH }, (_, i) => (
            <span key={i} className={`grid h-14 w-12 place-items-center border text-2xl ${i < code.length ? 'border-black' : i === code.length ? 'border-black/60' : 'border-[#C5C3C3]'}`}>
              {faDigits(code[i] || '')}
            </span>
          ))}
          <input
            className="absolute inset-0 w-full text-transparent caret-transparent bg-transparent outline-none" aria-label="کد تایید"
            inputMode="numeric" autoComplete="one-time-code" autoFocus value={code}
            onChange={(e) => { const c = digits(e.target.value).slice(0, CODE_LENGTH); setCode(c); if (c.length === CODE_LENGTH) onDone(); }}
          />
        </div>
        <button className={buttonClass} disabled={code.length < CODE_LENGTH}>تایید و ادامه</button>
      </form>
      <div className="mt-6 flex items-center justify-between text-sm text-[#959595]">
        {left
          ? <span>{clock(left)} تا درخواست مجدد کد</span>
          : <button onClick={() => setLeft(RESEND_SECONDS)} className="underline">ارسال مجدد کد</button>}
        <button onClick={onEditPhone} className="underline">اصلاح شماره موبایل</button>
      </div>
    </Step>
  );
}

function Review({ club, name, phone, anim }) {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const rows = [
    ['زمان', club.schedule],
    ['نحوه برگزاری', club.venue],
    ['اولین جلسه شما', club.first_session],
    ['نام و نام خانوادگی', name],
    ['شماره همراه', faDigits(phone)],
  ].filter(([, v]) => v);
  return (
    <div className="pb-40">
      <div className={anim}>
      <h1 className="mt-8 text-[30px] leading-[1.2]">تایید عضویت</h1>
      <div className="mt-8 flex gap-4">
        <Poster club={club} className="h-[167px] w-[133px] shrink-0" />
        <div className="min-w-0 flex flex-col gap-3">
          <h2 className="text-2xl">{club.title}</h2>
          {club.facilitator_name && <p className="text-base">با {club.facilitator_name}</p>}
        </div>
      </div>
      <div className="mt-6">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 border-b border-[#939393] py-3 text-sm last:border-b-0">
            <span className="shrink-0">{label}</span>
            <span className="min-w-0 text-left break-words">{value}</span>
          </div>
        ))}
      </div>

      </div>

      <div className="anim-bar fixed bottom-0 inset-x-0 mx-auto max-w-[480px] bg-white">
        <label className="flex items-center gap-2 px-3 pb-3 text-sm">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="size-4 accent-black" />
          {/* ponytail: terms page not written yet */}
          <span><a href="#" className="underline">قوانین و شرایط</a> را خوانده‌ام و می‌پذیرم.</span>
        </label>
        <div className="flex items-center justify-between border-t border-black px-3 py-[10px]">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[#828282]">ماهانه</p>
            <p className="text-base">{club.price ? `${club.price.toLocaleString('fa-IR')} تومان` : ''}</p>
          </div>
          <button disabled={!agreed} onClick={() => navigate('/result/success')} className="shrink-0 bg-black px-6 py-3 text-sm text-white disabled:bg-[#A7A7A7]">
            تایید و پرداخت
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  const { id } = useParams();
  const club = allClubs.find((c) => c.id === id);
  // A retry from the failed-payment page arrives logged in, with name and phone.
  // ponytail: passed in router state until there are real accounts.
  const retry = useLocation().state;
  const [step, setStep] = useState(retry ? 3 : 0); // 0 phone, 1 code, 2 name, 3 review
  const [anim, setAnim] = useState('anim-rise');
  const go = (n) => { setAnim(n > step ? 'anim-next' : 'anim-back'); setStep(n); };
  const [phone, setPhone] = useState(retry?.phone || '');
  const [name, setName] = useState(retry?.name || '');
  const phoneOk = /^09\d{9}$/.test(phone);

  const back = step && !retry
    ? <button onClick={() => go(step - 1)} className="contents">{'→ بازگشت'}</button>
    : <Link to={club ? `/clubs/${id}` : '/'}>{'→ بازگشت'}</Link>;

  return (
    <div className="min-h-full bg-white text-black">
      <ClubsHeader />
      <div className="mx-auto max-w-[480px] px-3">
        <div className="mt-[27px] text-base">{back}</div>

        {!club ? (
          <p className="mt-10 text-base text-[#7A7879]">این کارگاه پیدا نشد.</p>
        ) : step === 0 ? (
          <Step key={step} title="ورود یا ثبت نام" hint="برای ادامه، شماره موبایل خود را وارد کنید." anim={anim}>
            <form onSubmit={(e) => { e.preventDefault(); go(1); }}>
              <input
                className={inputClass} type="tel" inputMode="numeric" autoComplete="tel" autoFocus dir="ltr" style={{ textAlign: 'right' }}
                placeholder="۰۹۱۲۱۲۱۲۱۲" value={faDigits(phone)} onChange={(e) => setPhone(digits(e.target.value).slice(0, 11))}
              />
              <button className={buttonClass} disabled={!phoneOk}>دریافت کد تایید</button>
            </form>
          </Step>
        ) : step === 1 ? (
          <CodeStep key={step} anim={anim} phone={phone} onDone={() => go(2)} onEditPhone={() => go(0)} />
        ) : step === 2 ? (
          <Step key={step} title="تکمیل اطلاعات" hint="نام و نام خانوادگی خود را وارد کنید." anim={anim}>
            <form onSubmit={(e) => { e.preventDefault(); go(3); }}>
              <input className={inputClass} autoComplete="name" autoFocus placeholder="مثلاً علیرضا خمسه" value={name} onChange={(e) => setName(e.target.value)} />
              <button className={buttonClass} disabled={!name.trim()}>تکمیل ثبت‌نام</button>
            </form>
          </Step>
        ) : (
          <Review key={step} anim={anim} club={club} name={name.trim()} phone={phone} />
        )}
      </div>
    </div>
  );
}
