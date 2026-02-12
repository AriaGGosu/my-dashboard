"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeepSymbol } from "./KeepSymbol";
import { cn } from "@/lib/utils";
import { KPR_LABEL, KPR_MONO } from "@/lib/kpr-design-tokens";
import { Menu, X } from "lucide-react";

const navItems = [
  { id: "works", label: "Works" },
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
];

export function KPRNav() {
  const [open, setOpen] = useState(false);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 sm:px-10 bg-black/90 backdrop-blur-md border-b border-white/5">
      <div className="flex items-center gap-4">
        <KeepSymbol size={22} className="text-white" />
        <span className={cn(KPR_MONO, KPR_LABEL, "text-white/70 hidden sm:inline")}>Portfolio</span>
      </div>
      <ul className="hidden md:flex items-center gap-8">
        {navItems.map(({ id, label }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => scrollTo(id)}
              className={cn(KPR_MONO, KPR_LABEL, "text-white/70 hover:text-white transition-colors")}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="md:hidden p-2 text-white/80 hover:text-white"
        aria-label="Menu"
      >
        {open ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 top-[60px] bg-black/95 backdrop-blur-lg md:hidden flex flex-col pt-8 px-6"
          >
            {navItems.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                className={cn(KPR_MONO, KPR_LABEL, "text-white py-4 text-left border-b border-white/10")}
              >
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
