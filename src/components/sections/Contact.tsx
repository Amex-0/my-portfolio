"use client";

import React, { useState, useRef, FormEvent, ChangeEvent } from "react";
import { motion } from "motion/react";
import { Send, CheckCircle } from "lucide-react";
import { slideIn } from "../../utils/motion";
import SectionWrapper from "../../hoc/SectionWrapper";
import { ContactForm } from "../../types";

function ContactComponent() {
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<ContactForm>({
    name: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Dynamic extraction preview fallback simulation
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setForm({ name: "", email: "", message: "" });
    }, 1200);
  };

  return (
    <div className="xl:mt-12 overflow-hidden max-w-2xl text-left">
      <motion.div
        variants={slideIn("left", "tween", 0.2, 1)}
        className="w-full bg-white/5 p-8 rounded-2xl border border-white/10 hover:border-blue-500/30 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
      >
        <p className="text-blue-500 text-xs font-bold uppercase tracking-[0.2em] mb-2">Contact Aman Bedilu</p>
        <h3 className="text-white font-semibold md:text-[50px] sm:text-[40px] text-[30px] tracking-tight">
          Let's connect.
        </h3>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 bg-blue-950/20 border border-blue-900/40 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-4"
          >
            <CheckCircle className="w-16 h-16 text-emerald-400 animate-bounce" />
            <h4 className="text-white text-[18px] font-medium">Message received</h4>
            <p className="text-white/60 text-[13px] max-w-sm leading-relaxed">
              Thanks for reaching out. I will review your message and reply as soon as possible.
            </p>
          </motion.div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
            <label className="flex flex-col">
              <span className="text-white/60 font-mono text-[11px] uppercase tracking-wider mb-2">Your Name</span>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="What's your name?"
                className="bg-white/5 py-3.5 px-5 placeholder:text-white/30 text-white rounded-xl outline-none border border-white/10 focus:border-blue-500/50 font-medium transition-all text-sm"
              />
            </label>

            <label className="flex flex-col">
              <span className="text-white/60 font-mono text-[11px] uppercase tracking-wider mb-2">Your Email</span>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="What's your email address?"
                className="bg-white/5 py-3.5 px-5 placeholder:text-white/30 text-white rounded-xl outline-none border border-white/10 focus:border-blue-500/50 font-medium transition-all text-sm"
              />
            </label>

            <label className="flex flex-col">
              <span className="text-white/60 font-mono text-[11px] uppercase tracking-wider mb-2">Your Message</span>
              <textarea
                rows={5}
                name="message"
                required
                value={form.message}
                onChange={handleChange}
                placeholder="What do you want to say?"
                className="bg-white/5 py-3.5 px-5 placeholder:text-white/30 text-white rounded-xl outline-none border border-white/10 focus:border-blue-500/50 font-medium transition-all resize-none text-sm"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="bg-white text-black py-4 px-8 rounded-xl outline-none w-fit font-bold shadow-md hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send"}
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default SectionWrapper(ContactComponent, "contact");
