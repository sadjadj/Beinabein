import React from "react";

export default function StepIntro() {
  return (
    <div className="flex flex-col min-h-[78vh] py-4">
      {/* Meta strip */}
      <div className="flex items-center justify-between mb-8">
        <span className="font-mono-lab text-[10px] uppercase tracking-lab text-[#8C8C8C]">open call 01</span>
        <span className="font-mono-lab text-[10px] uppercase tracking-lab text-[#8C8C8C]">summer 05</span>
      </div>

      {/* Main title */}
      <div className="flex items-start gap-3">
        <h1 dir="ltr" className="font-mono-lab font-bold text-[38px] leading-[1.02] tracking-[-0.02em] text-[#0A0A0A] uppercase">
          Research<br />Creation<br />Lab 01
        </h1>
      </div>

      <p className="font-mono-lab text-[13px] uppercase tracking-lab text-[#8C8C8C] mt-4 mb-8">a working laboratory

      </p>

      <div className="divider-rule mb-6" />

      <h2 className="text-[23px] font-bold leading-[1.3] text-[#0A0A0A] mb-3">
        فراخوان برای یک ماه پژوهش و خلق
      </h2>
      <p className="text-[17px] font-semibold text-[#0A0A0A] mb-8">
        پروژه اول: نفت
      </p>

      {/* Bottom meta */}
      <div className="divider-rule mb-4" />
      <div className="space-y-2 font-mono-lab text-[10px] uppercase tracking-lab text-[#8C8C8C]">
        <div className="flex justify-between">
          <span>STATUS</span>
          <span className="text-[#999999]">OPEN</span>
        </div>
        <div className="flex justify-between">
          
          
        </div>
        <div className="flex justify-between">
          <span>location</span>
          <span>tehran</span>
        </div>
        <div className="flex justify-between hidden">
          <span>duration</span>
          <span>1 month</span>
        </div>
      </div>
    </div>);

}