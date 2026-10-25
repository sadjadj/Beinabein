import React from "react";

// لوگوی بینابین — Artboard 1 (نسخه‌ی دو خطی) — کامل
export default function BeinabeinLogo({ className = "" }) {
  return (
    <img
      src="/images/club-owner-call/beinabein.png"
      alt="بینابین"
      className={`h-7 w-auto object-contain opacity-50 ${className}`}
    />
  );
}