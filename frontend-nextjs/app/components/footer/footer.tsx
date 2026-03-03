import { motion } from "framer-motion"

export function Footer() {
    return (
        <footer className="relative snap-start py-20 px-6 border-t border-zinc-200 dark:border-zinc-800">

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="max-w-7xl mx-auto grid md:grid-cols-3 gap-10"
            >
                {/* Brand */}
                <div>
                    <h3 className="text-xl font-bold mb-4">Messenger</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Modern real-time messaging built for speed,
                        privacy, and seamless communication.
                    </p>
                </div>

                {/* Links */}
                <div>
                    <h4 className="font-semibold mb-4">Product</h4>
                    <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <li><a href="#">Features</a></li>
                        <li><a href="#">Security</a></li>
                        <li><a href="#">Pricing</a></li>
                    </ul>
                </div>

                {/* Contact */}
                <div>
                    <h4 className="font-semibold mb-4">Contact</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        support@messenger.com
                    </p>
                </div>
            </motion.div>

            <div className="mt-16 text-center text-xs text-zinc-500">
                © {new Date().getFullYear()} Messenger. All rights reserved.
            </div>
        </footer>
    )
}