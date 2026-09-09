import { useState } from 'react';

// Only step 1 (name/phone) is built — steps 2 (OTP) and 3 (payment) have no
// backend/design yet respectively, see the conversation for what's needed
// before they can be built for real rather than faked.
export default function RegistrationPage({ workshop, onBack }) {
  const [form, setForm] = useState({ full_name: '', phone: '' });

  return (
    <div>
      <div className="fixed top-20 inset-x-0 z-20 mx-auto max-w-[480px] w-full bg-[#F5F1EA] px-6 py-4 flex items-center justify-center gap-3">
        <span className="font-display text-base text-[#211E1F] font-bold">ثبت‌نام</span>
        <span className="w-6 border-t border-dashed border-[#C9BFB0]" />
        <span className="font-display text-base text-[#211E1F]/40">احراز هویت</span>
        <span className="w-6 border-t border-dashed border-[#C9BFB0]" />
        <span className="font-display text-base text-[#211E1F]/40">تایید و پرداخت</span>
      </div>

      <div className="px-6 pt-36 pb-28">
        <div className="step-card">
          <p className="font-body text-base text-[#211E1F] mt-20">
            اطلاعات خود را برای «{workshop.title}» وارد کنید.
          </p>
          <div className="mt-6 divide-y divide-[#DDD3C7] border-y border-[#DDD3C7]">
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="نام و نام‌خانوادگی"
              className="w-full bg-transparent py-4 font-body text-base text-[#211E1F] placeholder:text-[#117446] focus:outline-none"
            />
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="شماره تلفن همراه"
              className="w-full bg-transparent py-4 font-body text-base text-[#211E1F] placeholder:text-[#9C9488] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-20 inset-x-0 z-20 mx-auto max-w-[480px] w-full p-4 bg-[#F5F1EA] flex gap-3">
        <button onClick={onBack} className="chevron-right w-24 h-[60px] bg-[#DDD3C7]" />
        {/* Disabled on purpose: step 2 (phone verification) has no backend yet
            — wiring "next" further would mean writing an unverified Person,
            skipping the security step the design calls for. */}
        <button
          disabled
          title="در انتظار طراحی/پیاده‌سازی احراز هویت"
          className="chevron-left flex-1 h-[60px] px-6 bg-[#DDD3C7] font-display text-[#211E1F] opacity-40"
        >
          بعدی
        </button>
      </div>
    </div>
  );
}
