import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/api/client";
import BeinabeinLogo from "../BeinabeinLogo";
import ProgressBar from "./ProgressBar";

import StepIntro from "../steps/StepIntro";
import StepText from "../steps/StepText";
import StepCTA from "../steps/StepCTA";
import FormBasic, { isValid as basicValid } from "../steps/FormBasic";
import FormQuestions, { isValid as questionsValid } from "../steps/FormQuestions";
import FormAttendance, { isValid as attendanceValid } from "../steps/FormAttendance";
import FormSubmitted from "../steps/FormSubmitted";

const text = (id, props) => ({ id, nextLabel: "ادامه", component: StepText, props });

export const steps = [
  { id: "intro", nextLabel: "شروع", component: StepIntro },
  text("problem", {
    title: "مسئله جمع‌های این روزها",
    paragraphs: [
      "جمع‌های این روزها، کمتر جمع‌اند. این یک اعتراف است. چرا که رنگ و لعاب اضافه، لزوما جمع نمی‌سازد. جمع حول چیزهای دیگری شکل می‌گیرد که لزوما اینستاگرامی نیستند؛ حتی شاید قابل نمایش هم نباشند.",
      "واقعیت این است که خود بینابین هم پایش در این مسئله گیر است و همین ما را به طراحی شکل جدیدی از کنار هم بودن سوق داد: جمع‌های ادامه‌دار و از لحاظ اقتصادی به‌صرفه که حول یک موضوع یا دغدغه شکل می‌گیرند و ما اسمشان را گذاشته‌ایم انجمن.",
      "انجمن برخلاف کارگاه، در مسیر خود ساختار صلبی ندارد و همه‌ی افراد در پیش‌برد آن سهیم هستند. در انجمن علاقه‌مان را با همراهی دیگری دنبال می‌کنیم و ارتباطات انسانی می‌سازیم.",
    ],
  }),
  text("who", {
    paragraphs: [
      "برای ایجاد چنین جمع‌هایی، بینابین طبق روال همیشگی‌اش، دست یاری دراز کرده است به سمت متخصصان و یا کسانی که درباره‌ی موضوعی کنجکاوند و دوست دارند راهبری یک جمع را به عهده بگیرند، اما به آن بیشتر به شکل یک دغدغه نگاه می‌کنند تا شغل.",
    ],
  }),
  text("gathering", {
    title: "دورهمی در بینابین",
    paragraphs: [
      "در مرحله اولِ تشکیل این انجمن‌ها، به یک دورهمی در بینابین دعوت می‌شوید. قرار است یک روز را در بینابین بگذرانیم و حول مسئله «جمع در این روزها» گفتگو کنیم. درباره اینکه چرا با وجود رویدادهای متعدد شهری هنوز تنهاییم؟ جمع خوب چه ویژگی‌هایی دارد؟ چطور می‌توان چنین جمعی ساخت؟",
      "بعد از این روز، اگر امکان‌های همکاری فراهم باشد، با هم برگزاری انجمنی به راهبری شما را پیش خواهیم گرفت.",
    ],
    footer: ["دورهمی بینابین", "تهران"],
  }),
  { id: "apply", nextLabel: "شروع فرم", component: StepCTA, bigButton: true, isDark: true },
  { id: "form-basic", nextLabel: "ادامه", component: FormBasic, valid: basicValid, isWhite: true },
  { id: "form-questions", nextLabel: "ادامه", component: FormQuestions, valid: questionsValid, isWhite: true },
  { id: "form-attend", nextLabel: "ارسال درخواست", component: FormAttendance, valid: attendanceValid, isLast: true, isWhite: true },
];
// Counter: the intro is unnumbered, every page after it counts 01, 02, …
const toFa = (s) => s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
export const pad = (n) => toFa(String(n).padStart(2, "0"));
export const TOTAL = pad(steps.length - 1);

export default function StepWizard() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const contentRef = useRef(null);
  const [moreBelow, setMoreBelow] = useState(false);
  // Fade at the bottom while there's still content below, so it's clear the page scrolls.
  const checkMore = () => {
    const el = contentRef.current;
    setMoreBelow(!!el && el.scrollHeight - el.scrollTop - el.clientHeight > 8);
  };

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
    checkMore();
  }, [step]);

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));
  const updateField = (field, value) => setFormData((d) => ({ ...d, [field]: value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const { resume_uploading, ...application } = formData; // UI-only flag, not stored
      await api.createApplication(application);
      setSubmitted(true);
    } catch (err) {
      // The API's own messages (e.g. too many submissions) are Persian and worth showing as-is.
      setSubmitError(/[\u0600-\u06FF]/.test(err.message) ? err.message : "خطا در ثبت درخواست. لطفاً دوباره تلاش کنید.");
    }
    setSubmitting(false);
  };

  const restart = () => {
    setStep(0);
    setFormData({});
    setSubmitted(false);
  };

  const StepComponent = steps[step].component;
  // Derived from formData here, not reported by the form, so it is never a keystroke behind.
  const canProceed = !steps[step].valid || steps[step].valid(formData);
  const isLast = steps[step].isLast;
  const isWhite = steps[step].isWhite;
  const isDark = !!steps[step].isDark;
  const bigButton = steps[step].bigButton;

  const bg = isDark ? "bg-[#0A0A0A]" : isWhite ? "bg-white" : "bg-[#F0F0F0]";
  const fadeFrom = isDark ? "from-[#0A0A0A]" : isWhite ? "from-white" : "from-[#F0F0F0]";
  const borderColor = isDark ? "border-[#2A2A2A]" : isWhite ? "border-[#E2E2E2]" : "border-[#D1D1D1]";
  const mutedColor = "text-[#8C8C8C]";

  // The full-width backdrop takes the page's color too, so wide screens don't show
  // a light band around the dark pages.
  return (
    <div className={`min-h-[100dvh] ${submitted ? "bg-[#0A0A0A]" : bg} transition-colors duration-300`}>
    {submitted ? (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
        <FormSubmitted onRestart={restart} />
      </motion.div>
    ) : (
    <div className={`max-w-[390px] mx-auto h-[100dvh] flex flex-col ${bg} overflow-hidden transition-colors duration-300`}>
      {/* Top bar */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
        <BeinabeinLogo className={isDark ? "invert" : ""} />
        <span className={`text-[12px] ${mutedColor}`}>
          {step > 0 ? `${pad(step)} / ${TOTAL}` : ""}
        </span>
      </div>

      <ProgressBar current={step} total={steps.length} isDark={isDark} isWhite={isWhite} />

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        <div ref={contentRef} onScroll={checkMore} className="h-full overflow-y-auto px-6 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onAnimationComplete={checkMore}
            >
              <StepComponent
                {...steps[step].props}
                formData={formData}
                updateField={updateField}
                onNext={next}
                onSubmit={handleSubmit}
                submitting={submitting}
                isDark={isDark}
              />
            </motion.div>
          </AnimatePresence>
        </div>
        {moreBelow && (
          <div className={`pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t ${fadeFrom} to-transparent`} />
        )}
      </div>

      {/* Nav */}
      <div className={`flex-shrink-0 px-6 py-4 border-t ${borderColor}`}>
        {isLast && submitError && <p className="mb-3 text-[12px] text-[#B00]">{submitError}</p>}
        {bigButton ? (
          <div className="space-y-3">
            {step > 0 && (
              <button
                onClick={prev}
                className={`text-[13px] font-semibold ${mutedColor} ${isDark ? "hover:text-[#F4F4F4]" : "hover:text-[#0A0A0A]"} transition-colors block`}
              >
                برگشت
              </button>
            )}
            <button
              onClick={next}
              className={`w-full py-3 text-[16px] font-bold transition-colors ${isDark ? "bg-[#F4F4F4] text-[#0A0A0A] hover:bg-[#D1D1D1]" : "bg-[#0A0A0A] text-[#F4F4F4] hover:bg-[#2A2A2A]"}`}
            >
              {steps[step].nextLabel}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            {step > 0 ? (
              <button
                onClick={prev}
                className={`text-[13px] font-semibold ${mutedColor} hover:text-[#0A0A0A] transition-colors`}
              >
                برگشت
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={isLast ? handleSubmit : next}
              disabled={!canProceed || submitting}
              className={`text-[15px] font-bold transition-colors flex items-center gap-2 disabled:opacity-100 disabled:text-[#C0C0C0] disabled:cursor-not-allowed ${
                isDark ? "text-[#F4F4F4]" : "text-[#0A0A0A]"
              }`}
            >
              {submitting ? "در حال ارسال..." : steps[step].nextLabel}
              {!submitting && <span className="text-[18px] leading-none">←</span>}
            </button>
          </div>
        )}
      </div>
    </div>
    )}
    </div>
  );
}
