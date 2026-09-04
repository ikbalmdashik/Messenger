"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Phone,
  Play,
  Send,
  Sparkles,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { Navbar } from "@/app/components/navbar/navbar";
import { Button } from "@radix-ui/themes";

const features = [
  {
    icon: MessageCircle,
    title: "Instant messaging",
    description:
      "Send messages instantly and stay connected with the people who matter.",
  },
  {
    icon: Users,
    title: "Groups that feel alive",
    description:
      "Create group conversations, share moments, and keep everyone together.",
  },
  {
    icon: Video,
    title: "Calls & video",
    description:
      "Jump into crystal-clear voice and video conversations whenever you want.",
  },
  {
    icon: Zap,
    title: "Fast by design",
    description:
      "A lightweight messaging experience designed to feel instant everywhere.",
  },
];

export default function MessengerLanding() {
  const [message, setMessage] = useState("");

  const isMessageEmpty = message.trim().length === 0;

  return (
    <div className="min-h-screen overflow-hidden">
      <Navbar />

      <main className="pt-0">
        {/* =========================================
            HERO
        ========================================= */}
        <section className="relative isolate min-h-[90dvh] flex items-center">
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute left-1/2 top-[-180px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[140px] dark:bg-blue-500/15" />

            <div className="absolute right-[-150px] top-[250px] h-[400px] w-[400px] rounded-full bg-violet-500/15 blur-[130px]" />

            <div className="absolute left-[-150px] top-[500px] h-[350px] w-[350px] rounded-full bg-cyan-400/10 blur-[120px]" />
          </div>

          <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
            <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-10">
              {/* Left */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="max-w-2xl"
              >
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15, duration: 0.5 }}
                  className="mb-7 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  <span>Messaging, reimagined.</span>
                </motion.div>

                {/* Heading */}
                <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                  Talk to the
                  <span className="block bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400 bg-clip-text text-transparent">
                    people you love.
                  </span>
                </h1>

                <p className="mt-7 max-w-xl text-lg leading-8 text-gray-600 dark:text-gray-400 sm:text-xl">
                  A simple, fast, and beautiful way to connect with friends,
                  family, and communities — wherever they are.
                </p>

                {/* CTA */}
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Button className="group" size="3">
                    Get started
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>

                  <Button className="" size="3" variant="outline">
                    <Play className="h-4 w-4 fill-current" />
                    See how it works
                  </Button>
                </div>

                {/* Trust */}
                <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-500 dark:text-gray-500">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Free to use
                  </div>

                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Private conversations
                  </div>

                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    No complicated setup
                  </div>
                </div>
              </motion.div>

              {/* Right - Messenger UI */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
                className="relative mx-auto w-full max-w-[560px]"
              >
                {/* Main glow */}
                <div className="absolute inset-10 rounded-[40px] bg-blue-500/20 blur-[80px] dark:bg-blue-500/10" />

                {/* Main card */}
                <div className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-white/80 shadow-2xl shadow-gray-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-[#111111]/90 dark:shadow-black/40">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-sm font-semibold text-white">
                          AJ
                        </div>

                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-[#111111]" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold">Alex Johnson</p>
                        <p className="text-xs text-green-500">Active now</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-gray-400">
                      <button className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-white/5">
                        <Phone className="h-4 w-4" />
                      </button>

                      <button className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-white/5">
                        <Video className="h-4 w-4" />
                      </button>

                      <button className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-white/5">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="space-y-5 p-5 sm:p-7">
                    <div className="flex justify-center">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium text-gray-500 dark:bg-white/5">
                        Today
                      </span>
                    </div>

                    {/* Incoming */}
                    <div className="flex items-end gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-[10px] font-semibold text-white">
                        AJ
                      </div>

                      <div>
                        <div className="max-w-[270px] rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 text-sm leading-6 dark:bg-white/[0.08]">
                          Hey! Are you free this evening? 👋
                        </div>

                        <p className="mt-1 px-1 text-[10px] text-gray-400">
                          7:24 PM
                        </p>
                      </div>
                    </div>

                    {/* Outgoing */}
                    <div className="flex justify-end">
                      <div className="max-w-[290px]">
                        <div className="rounded-2xl rounded-br-md bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-sm leading-6 text-white shadow-lg shadow-blue-500/10">
                          Absolutely! Let's grab some coffee ☕
                        </div>

                        <div className="mt-1 flex items-center justify-end gap-1 px-1 text-[10px] text-gray-400">
                          7:25 PM
                          <Check className="h-3 w-3 text-blue-500" />
                        </div>
                      </div>
                    </div>

                    {/* Incoming */}
                    <div className="flex items-end gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-[10px] font-semibold text-white">
                        AJ
                      </div>

                      <div className="max-w-[270px] rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 text-sm leading-6 dark:bg-white/[0.08]">
                        Sounds perfect. I'll send you the location.
                      </div>
                    </div>

                    {/* Typing */}
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-[10px] font-semibold text-white">
                        AJ
                      </div>

                      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 dark:bg-white/[0.08]">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Input */}
                  <div className="border-t border-gray-100 p-4 dark:border-white/10">
                    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
                      <button className="rounded-lg p-1.5 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200">
                        <Paperclip className="h-4 w-4" />
                      </button>

                      <input
                        type="text"
                        placeholder="Write a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none dark:text-white"
                      />
                      <button
                        className={`rounded-full p-2 duration-200 ${isMessageEmpty
                          ? "hover:bg-gray-100 dark:hover:bg-white/5"
                          : "hover:bg-gray-200 dark:hover:bg-gray-700"
                          }`}
                      >
                        <Send
                          className={`h-4 w-4 transition-colors ${isMessageEmpty
                            ? "text-gray-400 dark:text-gray-600"
                            : "text-gray-700 dark:text-gray-200"
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Floating notification */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute -right-4 top-16 hidden rounded-2xl border border-gray-200 bg-white/90 p-3 shadow-xl backdrop-blur-xl sm:block dark:border-white/10 dark:bg-[#151515]/90"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                      <MessageCircle className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold">New message</p>
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        Alex sent you a message
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Floating online card */}
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{
                    duration: 4.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-gray-200 bg-white/90 p-3 shadow-xl backdrop-blur-xl sm:block dark:border-white/10 dark:bg-[#151515]/90"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-pink-400 text-[8px] font-bold text-white dark:border-[#151515]">
                        M
                      </div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-violet-400 text-[8px] font-bold text-white dark:border-[#151515]">
                        S
                      </div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-cyan-400 text-[8px] font-bold text-white dark:border-[#151515]">
                        J
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold">24 friends</p>
                      <p className="text-[10px] text-green-500">
                        are online now
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* =========================================
            FEATURES
        ========================================= */}
        <section className="border-t border-gray-100 bg-gray-50/70 dark:border-white/[0.06] dark:bg-white/[0.015]">
          <div className="mx-auto max-w-7xl px-6 py-24 sm:px-8 lg:px-12 lg:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-semibold text-blue-500">
                Everything you need
              </span>

              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                More than just messages.
              </h2>

              <p className="mt-4 text-gray-500 dark:text-gray-400">
                Everything you need to stay connected, without getting in the
                way of the conversation.
              </p>
            </div>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.08,
                    }}
                    className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-900/5 dark:border-white/[0.08] dark:bg-white/[0.025] dark:hover:bg-white/[0.04]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>

                    <h3 className="mt-5 font-semibold">{feature.title}</h3>

                    <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================
            CTA
        ========================================= */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white to-gray-50 dark:from-[#080808] dark:to-[#0d0d0d]" />

          <div className="mx-auto max-w-5xl px-6 py-24 text-center sm:px-8 lg:py-32">
            <div className="relative overflow-hidden rounded-[32px] border border-gray-200 bg-white/80 px-6 py-16 shadow-2xl shadow-gray-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-[#111111]/90 dark:shadow-black/40 sm:px-12">
              <div className="absolute left-1/2 top-[-200px] h-[400px] w-[500px] -translate-x-1/2 rounded-full bg-blue-500/30 blur-[100px] dark:bg-blue-500/20" />

              <div className="relative">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 dark:bg-white/10 dark:text-white">
                  <MessageCircle className="h-7 w-7" />
                </div>

                <h2 className="mx-auto mt-7 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-4xl">
                  Your conversations are waiting.
                </h2>

                <p className="mx-auto mt-4 max-w-lg text-gray-600 dark:text-gray-400 mb-6">
                  Create your account and start connecting with the people who
                  matter most.
                </p>

                <Button className="group" size={"3"} variant="soft">
                  <span className="py-2 text-md">Create account</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            FOOTER
        ========================================= */}
        <footer className="border-t border-gray-100 dark:border-white/[0.06]">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-gray-500 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
            <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500 text-white">
                <MessageCircle className="h-4 w-4" />
              </div>

              Messenger
            </div>

            <p>
              © {new Date().getFullYear()} Messenger. All rights reserved.
            </p>

            <div className="flex gap-5">
              <a
                href="#"
                className="transition-colors hover:text-gray-900 dark:hover:text-white"
              >
                Privacy
              </a>

              <a
                href="#"
                className="transition-colors hover:text-gray-900 dark:hover:text-white"
              >
                Terms
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}