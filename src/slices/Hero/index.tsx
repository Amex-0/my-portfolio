"use client";

import { useEffect, useRef } from "react";
import type { Content } from "@prismicio/client";
import type { SliceComponentProps } from "@prismicio/react";
import gsap from "gsap";

import FluidBackground from "@/components/Hero/FluidBackground";
import Bounded from "@/components/Bounded";
import { AnimatedText } from "@/components/AnimatedText";
import Button from "@/components/Button";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";
import { splitName } from "@/lib/splitName";

export type HeroProps = SliceComponentProps<Content.HeroSlice>;

const Hero = ({ slice }: HeroProps) => {
  const component = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const fullName = slice.primary.name ?? "";
  const { firstName, lastName } = splitName(fullName);

  useEffect(() => {
    if (prefersReducedMotion) {
      gsap.set(
        [".name-animation", ".job-title", ".hero-subtitle", ".hero-cta"],
        { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 },
      );
      return;
    }

    const ctx = gsap.context(() => {
      gsap
        .timeline()
        .fromTo(
          ".name-animation",
          { y: 48, opacity: 0, scale: 0.92 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            ease: "elastic.out(1,0.3)",
            duration: 1,
            transformOrigin: "center bottom",
            stagger: { each: 0.1, from: "random" },
          },
        )
        .fromTo(
          ".job-title",
          { y: 20, opacity: 0, scale: 1.2 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            scale: 1,
            ease: "elastic.out(1,0.3)",
          },
        )
        .fromTo(
          ".hero-subtitle",
          { y: 20, opacity: 0 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
          },
          "-=0.4",
        )
        .fromTo(
          ".hero-cta",
          { y: 20, opacity: 0 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
          },
          "-=0.5",
        );
    }, component);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  const handleScrollClick = () => {
    const skillsSection = document.getElementById("skills");
    if (skillsSection) {
      skillsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative isolate">
      <FluidBackground />
      <Bounded
        data-slice-type={slice.slice_type}
        data-slice-variation={slice.variation}
        ref={component}
        className="relative z-10"
      >
        <div className="flex min-h-[85vh] flex-col items-center justify-center text-center">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center">
            <h1
              className="mb-8 text-[clamp(3rem,16vmin,14rem)] font-extrabold leading-none tracking-tighter"
              aria-label={fullName}
            >
              <span className="block text-slate-300">
                <AnimatedText text={firstName} animationKey="first" />
              </span>
              {lastName ? (
                <span className="-mt-[0.2em] block text-slate-500">
                  <AnimatedText text={lastName} animationKey="last" />
                </span>
              ) : null}
            </h1>

            <span className="job-title mb-6 block bg-gradient-to-tr from-yellow-500 via-yellow-200 to-yellow-500 bg-clip-text text-2xl font-bold uppercase tracking-[0.2em] text-transparent opacity-0 md:text-4xl">
              {slice.primary.title}
            </span>

            {slice.primary.subtitle ? (
              <p className="hero-subtitle mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-slate-400 opacity-0 md:text-xl">
                {slice.primary.subtitle}
              </p>
            ) : null}

            {slice.primary.cta_text && slice.primary.cta_link ? (
              <div className="hero-cta flex justify-center opacity-0">
                <Button
                  linkField={slice.primary.cta_link}
                  label={slice.primary.cta_text}
                />
              </div>
            ) : null}
          </div>
        </div>
      </Bounded>
      
      <button
        onClick={handleScrollClick}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-xs font-semibold tracking-[0.2em] text-slate-500 hover:text-slate-300 transition-colors duration-300 cursor-pointer pointer-events-auto select-none bg-transparent border-0 outline-none"
      >
        <span>SCROLL</span>
        <svg
          className="h-4 w-4 animate-bounce"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
};

export default Hero;
