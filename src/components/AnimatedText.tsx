import type { KeyTextField } from "@prismicio/client";
import clsx from "clsx";

type AnimatedTextProps = {
  text: KeyTextField;
  animationKey: string;
  className?: string;
};

/**
 * Renders each character in its own span for GSAP letter stagger animations.
 */
export function AnimatedText({
  text,
  animationKey,
  className,
}: AnimatedTextProps) {
  if (!text) return null;

  return text.split("").map((letter, index) => (
    <span
      key={`${animationKey}-${index}`}
      className={clsx(
        "name-animation inline-block opacity-0",
        letter === " " && "w-[0.25em]",
        className,
      )}
    >
      {letter === " " ? "\u00A0" : letter}
    </span>
  ));
}
