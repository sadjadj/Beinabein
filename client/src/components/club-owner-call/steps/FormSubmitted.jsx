import React from "react";
import BeinabeinLogo from "../BeinabeinLogo";

export default function FormSubmitted({ onRestart }) {
  return (
    <div className="max-w-[390px] mx-auto h-[100dvh] flex flex-col bg-[#0A0A0A] overflow-hidden">
      {/* Top bar */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
        <BeinabeinLogo className="invert" />
      </div>
      <div className="px-6 pb-4 flex-shrink-0">
        <div className="h-[2px] bg-[#2A2A2A] relative overflow-hidden">
          <div className="absolute top-0 right-0 h-full w-full bg-[#F4F4F4]" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-px bg-[#2A2A2A] mb-6" />
        <h2 className="text-[22px] font-bold leading-[1.3] text-[#F4F4F4] mb-5">
          درخواست شما ثبت شد
        </h2>
        <p className="text-[15px] leading-[1.8] text-[#9A9A9A] mb-12 max-w-[300px]">
          امیدواریم بینابین ما و شما همکاری شکل بگیرد.
        </p>
        <button
          onClick={onRestart}
          className="text-[12px] text-[#8C8C8C] hover:text-[#F4F4F4] transition-colors">
          بازگشت به ابتدا
        </button>
      </div>
    </div>
  );
}
