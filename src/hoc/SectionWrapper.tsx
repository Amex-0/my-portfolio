import React from "react";
import { motion } from "motion/react";
import { staggerContainer } from "../utils/motion";

export default function SectionWrapper(Component: React.ComponentType<any>, idName: string) {
  return function HOC() {
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
