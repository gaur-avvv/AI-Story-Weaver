import React from 'react';
import { motion } from 'framer-motion';

export const HeroIllustration: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <div className={`relative ${props.className}`}>
      {/* Dynamic magical glow behind */}
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
          rotate: [0, 90, 180, 270, 360]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 bg-gradient-to-tr from-fuchsia-500/40 via-purple-500/40 to-indigo-500/40 blur-3xl rounded-full"
      />
      
      <svg
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-2xl"
        {...props}
      >
        <g transform="translate(100 100)">
          {/* Animated Sparks/Particles */}
          {[...Array(8)].map((_, i) => (
            <motion.circle
              key={i}
              r={Math.random() * 2 + 1}
              fill="#c084fc"
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{
                x: (Math.random() - 0.5) * 120,
                y: -30 - Math.random() * 80,
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeOut"
              }}
            />
          ))}

          {/* Magical Book Base */}
          <motion.path
            d="M-60 40 Q -60 -20 -30 -30 Q 0 -40 0 -40 Q 0 -40 30 -30 Q 60 -20 60 40 L 50 40 Q 50 -15 25 -22 Q 0 -30 0 -30 Q 0 -30 -25 -22 Q -50 -15 -50 40 Z"
            fill="url(#book-gradient)"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />

          {/* Book Pages */}
          <motion.path
            d="M-50 35 Q -50 -15 -25 -22 Q 0 -30 0 -30 Q 0 -30 25 -22 Q 50 -15 50 35 L 45 35 Q 45 -10 22 -17 Q 0 -25 0 -25 Q 0 -25 -22 -17 Q -45 -10 -45 35 Z"
            fill="white"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            style={{ transformOrigin: "0px -30px" }}
          />

          {/* Glowing Bookmark */}
          <motion.path 
            d="M -8 -30 L -8 15 L 0 8 L 8 15 L 8 -30 Z" 
            fill="url(#bookmark-gradient)"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: [0, -5, 0], opacity: 1 }}
            transition={{ 
              y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 0.5, delay: 0.8 }
            }}
          />

          {/* Energy rings floating from the book */}
          <motion.ellipse
            cx="0" cy="-30" rx="40" ry="10"
            fill="none" stroke="#d8b4fe" strokeWidth="1"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: [0, 0.5, 0], y: -40 }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.ellipse
            cx="0" cy="-30" rx="40" ry="10"
            fill="none" stroke="#e879f9" strokeWidth="0.5"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 2, opacity: [0, 0.3, 0], y: -60 }}
            transition={{ duration: 3.5, repeat: Infinity, delay: 1, ease: "easeOut" }}
          />
        </g>
        
        <defs>
          <linearGradient id="book-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
          <linearGradient id="bookmark-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};
