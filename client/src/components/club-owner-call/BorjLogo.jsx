import React from "react";

// لوگوی برج — کامل
export default function BorjLogo({ className = "" }) {
  return (
    <img
      src="/images/club-owner-call/borj.png"
      alt="برج"
      className={`h-7 w-auto object-contain ${className}`}
    />
  );
}