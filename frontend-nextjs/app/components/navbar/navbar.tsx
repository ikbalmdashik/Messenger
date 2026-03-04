"use client";
import Routes from "@/app/routes/routes";
import { Spinner } from "@/components/ui/spinner";
import { motion } from "framer-motion";
import { MessageCircle, Zap, LogIn, Sun, Moon, X, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
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

    const goLogin = () => {
        setLoading(true);
        router.push(Routes.Login);
    }

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

                    <button
                        onClick={goLogin}
                        disabled={loading}
                        className="relative flex items-center justify-center px-5 py-2 rounded-3xl bg-sky-500 text-white hover:scale-105 transition disabled:opacity-70"
                    >
                        {/* Content (always keeps layout) */}
                        <span
                            className={`flex items-center gap-2 ${loading ? "opacity-0" : "opacity-100"}`}
                        >
                            <LogIn size={18} />
                            Login
                        </span>

                        {/* Spinner */}
                        {loading && (
                            <span className="absolute flex items-center justify-center">
                                <Spinner size={20} />
                            </span>
                        )}
                    </button>
                    <button
                        onClick={toggleTheme}
                        className="relative w-12 h-12 flex items-center justify-center 
                                    rounded-full 
                                     
                                    hover:bg-black/10 dark:hover:bg-white/20
                                    transition-colors duration-300"
                    >
                        {/* Sun Icon */}
                        <Sun
                            size={20}
                            className={`absolute transition-all duration-500 transform ${theme === "dark"
                                    ? "opacity-100 rotate-0 scale-100"
                                    : "opacity-0 -rotate-90 scale-50"
                                }`}
                        />

                        {/* Moon Icon */}
                        <Moon
                            size={20}
                            className={`absolute transition-all duration-500 transform ${theme === "dark"
                                    ? "opacity-0 rotate-90 scale-50"
                                    : "opacity-100 rotate-0 scale-100"
                                }`}
                        />
                    </button>
                </div>

                {/* Mobile Toggle */}
                <button className="md:hidden" onClick={() => setOpen(!open)}>
                    {open ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {open && (
                <div className="md:hidden backdrop-blur-xl bg-white/5 dark:bg-black/5 px-6 pb-6 space-y-4 border-t border-black/10 dark:border-white/10">
                    <a
                        href="#features"
                        className="flex items-center w-24 gap-1 mt-4 hover:text-sky-500 transition"
                    >
                        <Zap size={18} /> Features
                    </a>
                    <button
                        onClick={goLogin}
                        disabled={loading}
                        className="relative flex items-center justify-center px-5 py-2 rounded-3xl bg-sky-500 text-white hover:scale-105 transition disabled:opacity-70"
                    >
                        {/* Content (always keeps layout) */}
                        <span
                            className={`flex items-center gap-2 ${loading ? "opacity-0" : "opacity-100"}`}
                        >
                            <LogIn size={18} />
                            Login
                        </span>

                        {/* Spinner */}
                        {loading && (
                            <span className="absolute flex items-center justify-center">
                                <Spinner size={20} />
                            </span>
                        )}
                    </button>
                    <button
                        onClick={toggleTheme}
                        className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-300"
                    >
                        <span className="inline-flex items-center gap-2 px-4 relative">

                            <Sun
                                size={18}
                                className={`absolute transition-all duration-500 ${theme === "dark"
                                    ? "opacity-100 rotate-0 scale-100"
                                    : "opacity-0 -rotate-90 scale-50"
                                    }`}
                            />

                            <Moon
                                size={18}
                                className={`absolute transition-all duration-500 ${theme === "dark"
                                    ? "opacity-0 rotate-90 scale-50"
                                    : "opacity-100 rotate-0 scale-100"
                                    }`}
                            />

                            <span className="ml-6">
                                {theme === "dark" ? "Light" : "Dark"}
                            </span>
                        </span>
                    </button>
                </div>
            )}
        </motion.nav>
    );
}
