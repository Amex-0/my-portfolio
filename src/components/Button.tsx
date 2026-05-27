import type { KeyTextField, LinkField } from "@prismicio/client";
import { PrismicNextLink } from "@prismicio/next";
import clsx from "clsx";
import { MdArrowOutward } from "react-icons/md";

type ButtonProps = {
  linkField: LinkField;
  label: KeyTextField;
  showIcon?: boolean;
  className?: string;
};

export default function Button({
  linkField,
  label,
  showIcon = true,
  className,
}: ButtonProps) {
  return (
    <PrismicNextLink
      field={linkField}
      className={clsx(
        "group relative flex w-fit items-center justify-center overflow-hidden rounded-md border border-black/20 bg-white px-4 py-2 font-bold text-black transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[#6EE7B7] hover:text-[#064E3B] hover:shadow-[0_0_24px_rgba(110,231,183,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6EE7B7]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        className,
      )}
    >
      <span className="relative flex items-center justify-center gap-2">
        {label} {showIcon && <MdArrowOutward className="inline-block" />}
      </span>
    </PrismicNextLink>
  );
}
