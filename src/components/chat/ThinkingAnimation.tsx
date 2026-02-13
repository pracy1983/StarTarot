'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export const ThinkingAnimation = () => {
    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="relative">
                {/* Glow effect */}
                <motion.div
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-neon-purple blur-3xl rounded-full"
                />

                {/* Animated icon */}
                <motion.div
                    animate={{
                        rotate: 360,
                        y: [0, -10, 0]
                    }}
                    transition={{
                        rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                        y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="relative z-10 text-neon-purple"
                >
                    <Sparkles size={48} />
                </motion.div>
            </div>

            <div className="text-center space-y-2">
                <motion.p
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-neon-cyan font-bold tracking-[0.2em] text-xs uppercase"
                >
                    Consultando os Arcanos...
                </motion.p>
                <p className="text-slate-500 text-[10px] italic">
                    As cartas estão sendo reveladas para o seu destino.
                </p>
            </div>

            {/* Pulsing Dots */}
            <div className="flex space-x-1.5">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        className="w-1.5 h-1.5 bg-neon-purple rounded-full"
                    />
                ))}
            </div>
        </div>
    )
}
