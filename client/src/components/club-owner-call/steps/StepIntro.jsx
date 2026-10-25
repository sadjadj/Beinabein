import React from "react";

export default function StepIntro() {
  return (
    <div className="flex flex-col justify-center min-h-[70vh] py-4">
      <div className="flex items-center justify-between mb-10 text-[12px] text-[#8C8C8C]">
        <span>فراخوان ۰۱</span>
      </div>
      <h1 className="text-[38px] font-black leading-[1.2] text-[#0A0A0A] mb-6">
        فراخوان!
      </h1>
      <div className="divider-rule mb-6" />
      <p className="text-[23px] font-bold leading-[1.4] text-[#0A0A0A]">
        برسد به آنانی که «جمع» می‌سازند.
      </p>
    </div>
  );
}
