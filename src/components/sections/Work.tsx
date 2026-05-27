"use client";

import React from "react";
import { motion } from "motion/react";
import { Briefcase, Code, Smartphone, Cpu } from "lucide-react";
import { experiences } from "../../constants";
import { styles } from "../../styles";
import { textVariant, fadeIn } from "../../utils/motion";
import SectionWrapper from "../../hoc/SectionWrapper";
import { Experience } from "../../types";

const iconMap: Record<string, React.ComponentType<any>> = {
  Briefcase: Briefcase,
  Code: Code,
  Smartphone: Smartphone,
  Cpu: Cpu,
};

interface CardProps {
  experience: Experience;
  idx: number;
  key?: string | number;
}

function ExperienceCard({ experience, idx }: CardProps) {
  const IconComponent = iconMap[experience.iconName] || Briefcase;
  const isLeft = idx % 2 === 0;

  return (
    <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between w-full mb-12 last:mb-0">
      {/* Desktop Column Layout */}
      <div className="hidden md:block w-[45%] pr-8 text-right">
        {isLeft ? (
          <motion.div
            variants={fadeIn("right", "spring", idx * 0.3, 0.75)}
            className="group bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-[#10B981]/30 hover:bg-white/[0.07] transition-all duration-300 relative"
          >
            <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 rotate-45 bg-[#040507] border-t border-r border-white/10 group-hover:border-[#10B981]/30 group-hover:bg-[#07110d] transition-all hidden md:block"></div>
            
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-mono tracking-wider bg-[#10B981]/20 text-[#34D399] px-2.5 py-1 rounded font-semibold">
                {experience.date}
              </span>
              <h3 className="text-white text-[20px] font-medium mt-3">{experience.title}</h3>
              <p className="text-[#E2E8F0] font-semibold text-sm mt-0.5">
                {experience.companyName}
              </p>
            </div>

            <ul className="mt-5 list-disc ml-5 space-y-2 text-left">
              {experience.points.map((point, index) => (
                <li key={`point-${index}`} className="text-white/40 text-[13px] pl-1 tracking-wide leading-relaxed">
                  {point}
                </li>
              ))}
            </ul>
          </motion.div>
        ) : (
          <motion.p variants={textVariant(idx * 0.15)} className="text-white/40 text-[13px] font-mono pr-2">
            {experience.date}
          </motion.p>
        )}
      </div>

      {/* Central Timeline Badge Indicator */}
      <div className="absolute left-8 md:left-1/2 transform -translate-x-1/2 z-10 flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-[#040507] text-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.25)]">
        <IconComponent className="w-5 h-5 text-[#10B981]" />
      </div>

      {/* Right Column Layout */}
      <div className="w-full md:w-[45%] pl-20 md:pl-8 text-left">
        {!isLeft ? (
          <motion.div
            variants={fadeIn("left", "spring", idx * 0.3, 0.75)}
            className="group bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-[#10B981]/30 hover:bg-white/[0.07] transition-all duration-300 relative"
          >
            <div className="absolute top-1/2 -left-2 transform -translate-y-1/2 w-4 h-4 rotate-45 bg-[#040507] border-b border-l border-white/10 group-hover:border-[#10B981]/30 group-hover:bg-[#07110d] transition-all hidden md:block"></div>

            <div className="flex flex-col items-start">
              <span className="text-[11px] font-mono tracking-wider bg-[#10B981]/20 text-[#34D399] px-2.5 py-1 rounded font-semibold">
                {experience.date}
              </span>
              <h3 className="text-white text-[20px] font-medium mt-3">{experience.title}</h3>
              <p className="text-[#E2E8F0] font-semibold text-sm mt-0.5">
                {experience.companyName}
              </p>
            </div>

            <ul className="mt-5 list-disc ml-5 space-y-2">
              {experience.points.map((point, index) => (
                <li key={`point-${index}`} className="text-white/40 text-[13px] pl-1 tracking-wide leading-relaxed">
                  {point}
                </li>
              ))}
            </ul>
          </motion.div>
        ) : (
          <div className="hidden md:block">
            <motion.p variants={textVariant(idx * 0.15)} className="text-white/40 text-[13px] font-mono pl-8">
              {experience.date}
            </motion.p>
          </div>
        )}
      </div>
    </div>
  );
}

function ExperienceComponent() {
  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={`${styles.sectionSubText} text-left mb-2`}>
          Selected professional experience
        </p>
        <h2 className={`${styles.sectionHeadText} text-left mb-12`}>
          Experience.
        </h2>
      </motion.div>

      <div className="relative mt-12 flex flex-col items-center">
        {/* Central Vertical Timeline Divider */}
        <div className="absolute left-8 md:left-1/2 h-full w-px bg-linear-to-b from-[#10B981] via-[#34D399]/50 to-transparent transform -translate-x-1/2"></div>

        <div className="w-full flex flex-col">
          {experiences.map((experience, idx) => (
            <ExperienceCard
              key={`experience-${idx}`}
              experience={experience}
              idx={idx}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export default SectionWrapper(ExperienceComponent, "experience");
