import React from "react";
import { motion } from "motion/react";
import { staggerContainer } from "../utils/motion";

export default function SectionWrapper(Component: React.ComponentType<any>, idName: string) {
  return function HOC() {
    if (idName === "contact") {
      const sectionHeights: Record<string, string> = {
        contact: "min-h-[680px]",
      };
      const heightClass = sectionHeights[idName] || "";

      return (
        <motion.section
          variants={staggerContainer()}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          className={`w-full relative z-0 ${heightClass}`}
        >
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(2,6,23,0.15), rgba(2,6,23,0.15)), url('/Contact-Background-image.png')`,
              backgroundBlendMode: "overlay",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center right",
            }}
          />
          <span className="hash-span" id={idName}>
            &nbsp;
          </span>
          <div className="relative z-10 w-full px-0 py-0 sm:py-0">
            <Component />
          </div>
        </motion.section>
      );
    }

    return (
      <motion.section
        variants={staggerContainer()}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        className="max-w-7xl mx-auto px-6 sm:px-16 py-10 sm:py-16 relative z-0"
      >
        <span className="hash-span" id={idName}>
          &nbsp;
        </span>
        <Component />
      </motion.section>
    );
  };
}
