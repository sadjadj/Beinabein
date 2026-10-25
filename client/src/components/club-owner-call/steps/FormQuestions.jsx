import React, { useEffect } from "react";

export default function FormQuestions({ formData, updateField, setCanProceed }) {
  useEffect(() => {
    setCanProceed(!!(formData.bring_something && formData.two_unrelated));
  }, [formData.bring_something, formData.two_unrelated, setCanProceed]);

  return (
    <div className="py-6">
      <p dir="ltr" className="font-mono-lab text-[11px] uppercase tracking-lab text-[#8C8C8C] mb-2">09 Two Questions</p>
      <h2 className="text-[20px] font-bold text-[#0A0A0A] mb-3">دو سؤال کوتاه</h2>
      <p className="text-[13px] leading-[1.7] text-[#8C8C8C] mb-6">
        پاسخ‌ها لازم نیست درست یا رسمی باشند. آنچه برای ما اهمیت دارد، نوع نگاه، کیفیت مشاهده و شیوه‌ی نزدیک‌شدن به یک سؤال است؛ بهتر است تا حد ممکن با زبان و بیان خودتان نوشته شوند.
      </p>

      <div className="mb-8">
        <p className="text-[15px] font-semibold text-[#0A0A0A] mb-2">۱. چیزی برای آوردن</p>
        <p className="text-[14px] leading-[1.8] text-[#3A3A3A] mb-3">
          یک چیز، ایده، اثر، روایت، تجربه، داده یا محتوایی را معرفی کنید که در یک سال گذشته با آن مواجه شده‌اید و فکر می‌کنید ارزش داشت افراد بیشتری آن را ببینند یا درباره‌اش فکر کنند. چه چیزی در آن برای شما مهم یا جالب بود؟
        </p>
        <textarea
          value={formData.bring_something || ""}
          onChange={(e) => updateField("bring_something", e.target.value)}
          rows={5}
          placeholder="حداکثر ۱۵۰ کلمه"
          className="w-full bg-transparent border-b border-[#D1D1D1] focus:border-[#0A0A0A] outline-none py-2 text-[15px] leading-[1.7] text-[#0A0A0A] resize-none transition-colors placeholder:text-[#C0C0C0]"
        />
      </div>

      <div className="mb-8">
        <p className="text-[15px] font-semibold text-[#0A0A0A] mb-2">۲. دو چیز که به هم ربط ندارند</p>
        <p className="text-[14px] leading-[1.8] text-[#3A3A3A] mb-3">
          دو چیز را انتخاب کنید که در نگاه اول ارتباطی با هم ندارند. یک ارتباط میان آنها پیدا کنید که برایتان جالب یا معنادار است و در چند خط توضیح دهید این ارتباط چیست.
        </p>
        <textarea
          value={formData.two_unrelated || ""}
          onChange={(e) => updateField("two_unrelated", e.target.value)}
          rows={5}
          placeholder="حداکثر ۱۰۰ کلمه"
          className="w-full bg-transparent border-b border-[#D1D1D1] focus:border-[#0A0A0A] outline-none py-2 text-[15px] leading-[1.7] text-[#0A0A0A] resize-none transition-colors placeholder:text-[#C0C0C0]"
        />
      </div>
    </div>
  );
}