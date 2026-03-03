"use client";
import Routes from "@/app/routes/routes";
import { motion } from "framer-motion";
import { MessageCircle, Zap, LogIn, Sun, Moon, X, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);
    const router = useRouter();

    // Dark/Light Mode Hook
    function useTheme() {
        const [theme, setTheme] = useState("dark");

        useEffect(() => {
            const saved = localStorage.getItem("theme") || "dark";
            setTheme(saved);
            document.documentElement.classList.toggle("dark", saved === "dark");
        }, []);

        const toggleTheme = () => {
            const next = theme === "dark" ? "light" : "dark";
            setTheme(next);
            localStorage.setItem("theme", next);
            document.documentElement.classList.toggle("dark", next === "dark");
        };

        return { theme, toggleTheme };
    }

    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const goLogin = () => router.push(Routes.Login);

    return (
        <motion.nav
            initial={{ y: -80 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6 }}
            className={`fixed top-0 w-full z-50 transition-all duration-300 backdrop-blur-xl border-b border-black/10 dark:border-white/10 ${scrolled ? "bg-white/70 dark:bg-black/50" : "bg-white/40 dark:bg-black/30"
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <h1 className="font-bold text-xl md:text-2xl flex items-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">
                    <MessageCircle className="w-6 h-6 text-sky-500" /> Messenger
                </h1>

                {/* Desktop */}
                <div className="hidden md:flex items-center gap-6">
                    <a
                        href="#features"
                        className="flex items-center gap-1 hover:text-sky-500 transition"
                    >
                        <Zap size={18} /> Features
                    </a>
                    <button className="flex items-center gap-2 px-5 py-2 rounded-full bg-sky-500 text-white hover:scale-105 transition"
                        onClick={goLogin}
                    >
                        <LogIn size={18} /> Login
                    </button>
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                    >
                        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>

                {/* Mobile Toggle */}
                <button className="md:hidden" onClick={() => setOpen(!open)}>
                    {open ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {open && (
                <div className="md:hidden backdrop-blur-xl bg-white/70 dark:bg-black/60 px-6 pb-6 space-y-4 border-t border-black/10 dark:border-white/10">
                    <a
                        href="#features"
                        className="flex items-center gap-1"
                    >
                        <Zap size={18} /> Features
                    </a>
                    <button className="flex items-center gap-2 w-1/4 py-2 px-2 rounded-full bg-sky-500 text-white"
                        onClick={goLogin}
                    >
                        <LogIn size={18} /> Login
                    </button>
                    <button onClick={toggleTheme} className="block">
                        { theme == "dark" ? "Light Theme" : "Dark Theme" }
                    </button>
                </div>
            )}
        </motion.nav>
    );
}
