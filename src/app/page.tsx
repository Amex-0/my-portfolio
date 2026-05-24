import type { Metadata } from "next";
import { SliceZone } from "@prismicio/react";
import { heroFallbackSlice } from "@/lib/heroFallbackSlice";
import { createClient } from "@/prismicio";
import { components } from "@/slices";
import Work from "@/components/sections/Work";
import Contact from "@/components/sections/Contact";
import PhysicsSandbox from "@/components/PhysicsSandbox";

export default async function Page() {
  const client = createClient();
  let slices = [heroFallbackSlice];
  try {
    const page = await client.getSingle("homepage");
    slices = page.data.slices;
  } catch {
    // fallback is already set
  }

  return (
    <div className="relative">
      <SliceZone slices={slices} components={components} />
      
      {/* Section boundary contrast separator */}
      <div className="w-full h-px bg-white/10" />

      {/* Skills Section */}
      <div id="skills" className="relative z-10 border-t border-white/5">
        <PhysicsSandbox />
      </div>

      {/* Experience Section */}
      <div className="bg-[#050508] relative z-10 border-t border-white/5">
        <Work />
      </div>

      {/* Contact Section */}
      <div className="bg-[#050508] relative z-10 border-t border-white/5">
        <Contact />
      </div>
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const client = createClient();

  try {
    const page = await client.getSingle("homepage");
    return {
      title: page.data.meta_title ?? "Aman Bedilu — Portfolio",
      description: page.data.meta_description ?? undefined,
    };
  } catch {
    return {
      title: "Aman Bedilu — Portfolio",
      description:
        "Frontend Developer, QA and Security Testing student, and community-focused builder based in Addis Ababa, Ethiopia.",
    };
  }
}
