import "./globals.css";

import clsx from "clsx";
import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import { PrismicPreview } from "@prismicio/next";

import { repositoryName } from "@/prismicio";
import Navbar from "@/components/Navbar";

const urbanist = Urbanist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aman Bedilu — Portfolio",
  description:
    "Frontend Developer, QA and Security Testing student, and community-focused builder based in Addis Ababa, Ethiopia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#040507] scroll-smooth">
      <body
        className={clsx(urbanist.className, "relative min-h-screen bg-[#040507] text-[#E2E8F0]")}
      >
        <Navbar />
        {children}
        <PrismicPreview repositoryName={repositoryName} />
      </body>
    </html>
  );
}
