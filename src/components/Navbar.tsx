"use client";

import Link from "next/link";

export default function Navbar() {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md md:max-w-xl px-4 pointer-events-none">
      <div className="flex items-center justify-between w-full px-6 py-3 rounded-full border border-white/10 bg-slate-900/40 backdrop-blur-lg shadow-2xl shadow-black/50 pointer-events-auto transition-all duration-300">
        <div className="text-white font-bold tracking-tight text-sm md:text-base">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            AB.
          </Link>
        </div>
        <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium text-slate-300">
          {[
            { name: "Skills", id: "skills" },
            { name: "Experience", id: "experience" },
            { name: "Contact", id: "contact" },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => handleScroll(e, item.id)}
              className="px-3 py-1.5 rounded-full duration-300 ease-out hover:bg-white/10 hover:text-white transition-all"
            >
              {item.name}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
