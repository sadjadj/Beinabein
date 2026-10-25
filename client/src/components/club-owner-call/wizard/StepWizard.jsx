import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/api/client";
import BeinabeinLogo from "../BeinabeinLogo";
import BorjLogo from "../BorjLogo";
import ProgressBar from "./ProgressBar";

import StepIntro from "../steps/StepIntro";
import StepOverview from "../steps/StepOverview";
import StepWhy from "../steps/StepWhy";
import StepOil from "../steps/StepOil";
import StepWho from "../steps/StepWho";
import StepChallengeDay from "../steps/StepChallengeDay";
import StepCollaboration from "../steps/StepCollaboration";
import StepCTA from "../steps/StepCTA";
import FormBasic from "../steps/FormBasic";
import FormQuestions from "../steps/FormQuestions";
import FormAttendance from "../steps/FormAttendance";
import FormSubmitted from "../steps/FormSubmitted";

const steps = [
  { id: "intro", num: "", nextLabel: "شروع", component: StepIntro, isForm: false },
  { id: "overview", num: "01", nextLabel: "ادامه", component: StepOverview, isForm: false },
  { id: "why", num: "02", nextLabel: "ادامه", component: StepWhy, isForm: false },
  { id: "oil", num: "03", nextLabel: "ادامه", component: StepOil, isForm: false },
  { id: "who", num: "04", nextLabel: "ادامه", component: StepWho, isForm: false },
  { id: "challenge", num: "05", nextLabel: "ادامه", component: StepChallengeDay, isForm: false },
  { id: "collab", num: "06", nextLabel: "ادامه", component: StepCollaboration, isForm: false },
  { id: "apply", num: "07", nextLabel: "شروع فرم", component: StepCTA, isForm: false, bigButton: true, isDark: true },
  { id: "form-basic", num: "08", nextLabel: "ادامه", component: FormBasic, isForm: true, isWhite: true },
  { id: "form-questions", num: "09", nextLabel: "ادامه", component: FormQuestions, isForm: true, isWhite: true },
  { id: "form-attend", num: "10", nextLabel: "ارسال درخواست", component: FormAttendance, isForm: true, isLast: true, isWhite: true },
];

export default function StepWizard() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [canProceed, setCanProceed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const contentRef = useRef(null);

  useEffect(() => {
    if (!steps[step].isForm) setCanProceed(true);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [step]);

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));
  const updateField = (field, value) => setFormData((d) => ({ ...d, [field]: value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      await api.createApplication(formData);
      setSubmitted(true);
    } catch (err) {
      setSubmitError("خطا در ثبت درخواست. لطفاً دوباره تلاش کنید.");
    }
    setSubmitting(false);
  };

  const restart = () => {
    setStep(0);
    setFormData({});
    setSubmitted(false);
  };

  if (submitted) return <FormSubmitted onRestart={restart} />;

  const StepComponent = steps[step].component;
  const isLast = steps[step].isLast;
  const isWhite = steps[step].isWhite;
  const isDark = !!steps[step].isDark;
  const bigButton = steps[step].bigButton;

  const bg = isDark ? "bg-[#0A0A0A]" : isWhite ? "bg-white" : "bg-[#F0F0F0]";
  const borderColor = isDark ? "border-[#2A2A2A]" : isWhite ? "border-[#E2E2E2]" : "border-[#D1D1D1]";
  const mutedColor = "text-[#8C8C8C]";

  return (
    <div className={`max-w-[390px] mx-auto h-[100dvh] flex flex-col ${bg} overflow-hidden transition-colors duration-300`}>
      {/* Top bar */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <BeinabeinLogo className={isDark ? "invert" : ""} />
          <span className={`font-mono-lab text-xs ${mutedColor}`}>×</span>
          <BorjLogo className={isDark ? "invert" : ""} />
        </div>
        <span className={`font-mono-lab text-[10px] tracking-lab uppercase ${mutedColor}`}>
          {steps[step].num ? `${steps[step].num} / 10` : ""}
        </span>
      </div>

      <ProgressBar current={step} total={steps.length} isDark={isDark} isWhite={isWhite} />

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        <div ref={contentRef} className="h-full overflow-y-auto px-6 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <StepComponent
                formData={formData}
                updateField={updateField}
                setCanProceed={setCanProceed}
                onNext={next}
                onSubmit={handleSubmit}
                submitting={submitting}
                isDark={isDark}
              />
            </motion.div>
          </AnimatePresence>
        </div>
        {/* Scroll indicator gradient for step 05 */}
        {step === 4 && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#F0F0F0] to-transparent" />
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
  );
}