"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { MessageCircle, Shield, Zap, Globe, Download, Menu, X, Sun, Moon } from "lucide-react";
import * as Separator from "@radix-ui/react-separator";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import { Navbar } from "@/app/components/navbar/navbar";

export default function MessengerLanding() {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);

  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <div ref={ref} className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      {/* Animated Background */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,#38bdf8,transparent_40%),radial-gradient(circle_at_80%_0%,#6366f1,transparent_35%)] opacity-30 dark:opacity-40"
      />

      <Navbar />

      {/* HERO */}
      <section className="px-6 md:px-12 pt-32 pb-24 grid md:grid-cols-2 gap-16 items-center">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            Messaging Reimagined for the Modern Web
          </h1>
          <p className="mt-6 text-slate-600 dark:text-slate-400 text-lg max-w-xl">
            Built with Next.js, NestJS, GraphQL and WebSockets — Messenger delivers
            lightning-fast, secure and scalable real-time communication.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button className="rounded-2xl px-6 py-6">Start Messaging</Button>
            <Button variant="outline" className="rounded-2xl px-6 py-6">Live Demo</Button>
          </div>
        </motion.div>

        {/* Animated Chat Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          className="bg-white/60 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-black/10 dark:border-slate-700"
        >
          <div className="space-y-4">
            {["Hello 👋", "Realtime works!", "Let's build something great."].map((text, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.3 }}
                className="p-4 rounded-2xl bg-sky-500/10 dark:bg-slate-700 w-fit"
              >
                {text}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-6 md:px-12 py-24">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent"
        >
          Powerful Features
        </motion.h2>

        <Separator.Root className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-sky-500 to-indigo-500" />

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          {[
            { icon: <Zap />, title: "Real-time", desc: "Instant delivery using WebSockets." },
            { icon: <Shield />, title: "Secure", desc: "JWT authentication & encryption." },
            { icon: <Globe />, title: "Scalable", desc: "Production-ready architecture." },
          ].map((f, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="p-8 rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-black/10 dark:border-slate-700 hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-300"
            >
              <div className="text-sky-500 mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold">{f.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 mt-2">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="security" className="text-center px-6 md:px-12 py-24">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}>
          <h2 className="text-3xl md:text-5xl font-bold"><span className="flex items-center justify-center gap-3"><MessageCircle className="text-sky-500" /> Ready to Experience It?</span></h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Start building your real-time future today.</p>

          <Button className="mt-8 px-8 py-6 rounded-2xl text-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20">
            <Download className="mr-2" /> Get Started
          </Button>
        </motion.div>
      </section>

      <footer className="border-t border-black/10 dark:border-slate-800 py-8 text-center text-slate-500">
        © {new Date().getFullYear()} Messenger. All rights reserved.
      </footer>
    </div>
  );
}
