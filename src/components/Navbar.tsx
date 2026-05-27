"use client";

import Link from "next/link";
import { motion } from "motion/react";

export default function Navbar() {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.8, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md md:max-w-xl px-4 pointer-events-none"
    >
      <div
        className="flex items-center justify-between w-full px-6 py-3 rounded-full bg-slate-950/70 backdrop-blur-lg shadow-2xl shadow-black/50 pointer-events-auto transition-all duration-300"
        style={{ borderBottom: "1px solid rgba(6, 78, 59, 0.3)" }}
      >
        <div className="text-white font-bold tracking-tight text-sm md:text-base">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            AB.
          </Link>
        </div>
        <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium text-slate-200">
          {[
            { name: "Skills", id: "skills" },
            { name: "Experience", id: "experience" },
            { name: "Contact", id: "contact" },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => handleScroll(e, item.id)}
              className="px-3 py-1.5 rounded-full duration-300 ease-out hover:bg-emerald-400/10 hover:text-[#6EE7B7] transition-all"
            >
              {item.name}
            </a>
          ))}
        </div>
      </div>
    </motion.nav>
  );
}
