"use client";
import { useState } from "react";
import VerdictApp from "../components/VerdictApp";

export default function VerdictPage() {
  const [lang, setLang] = useState<string>(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("themis_lang") || "en";
  });

  const handleSetLang = (l: string) => {
    setLang(l);
    localStorage.setItem("themis_lang", l);
  };

  return <VerdictApp onBack={() => window.location.href = "/dashboard"} lang={lang} setLang={handleSetLang} />;
}
