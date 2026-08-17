import React from 'react';
import { motion } from 'framer-motion';

export const HeroIllustration: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <div className={`relative flex items-center justify-center ${props.className}`}>
      {/* Radiant Background Aura and Purple Flare Rings */}
      <motion.div
        animate={{ 
          scale: [1, 1.15, 1],
          opacity: [0.4, 0.7, 0.4],
          rotate: [0, 180, 360]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 bg-gradient-to-tr from-fuchsia-600/50 via-purple-600/50 to-indigo-600/50 blur-3xl rounded-full"
      />
      
      {/* Outer Diamond Flare */}
      <motion.div
        animate={{ 
          scale: [0.9, 1.08, 0.9],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-44 h-44 rounded-full bg-purple-500/20 border border-purple-400/30 blur-sm"
      />

      <svg
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]"
        {...props}
      >
        <defs>
          <filter id="heroPrismGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <linearGradient id="heroLeftFacet" x1="100" y1="20" x2="40" y2="160">
            <stop offset="0%" stopColor="#f3e8ff" />
            <stop offset="30%" stopColor="#d8b4fe" />
            <stop offset="70%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>

          <linearGradient id="heroRightFacet" x1="100" y1="20" x2="160" y2="160">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#e9d5ff" />
            <stop offset="65%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#3b0764" />
          </linearGradient>

          <linearGradient id="heroBase" x1="40" y1="160" x2="160" y2="160">
            <stop offset="0%" stopColor="#2e1065" />
            <stop offset="50%" stopColor="#7e22ce" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>

          <linearGradient id="heroEdgeLine" x1="100" y1="20" x2="100" y2="170">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f0abfc" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.4" />
          </linearGradient>

          <radialGradient id="heroRadialFlare" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#7e22ce" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Central Flare Disc */}
        <circle cx="100" cy="100" r="85" fill="url(#heroRadialFlare)" />

        {/* Animated Light Rays */}
        <g opacity="0.65">
          <motion.line 
            x1="100" y1="0" x2="100" y2="200" 
            stroke="#e9d5ff" strokeWidth="1.2" 
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.line 
            x1="0" y1="100" x2="200" y2="100" 
            stroke="#e9d5ff" strokeWidth="1.2"
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5, ease: "easeInOut" }}
          />
          <line x1="30" y1="30" x2="170" y2="170" stroke="#c084fc" strokeWidth="0.8" opacity="0.5" />
          <line x1="170" y1="30" x2="30" y2="170" stroke="#c084fc" strokeWidth="0.8" opacity="0.5" />
        </g>

        {/* Animated Floating Sparks */}
        {[...Array(12)].map((_, i) => (
          <motion.circle
            key={i}
            r={Math.random() * 2.5 + 1}
            fill={i % 2 === 0 ? "#ffffff" : "#f0abfc"}
            initial={{ x: 100, y: 100, opacity: 0 }}
            animate={{
              x: 100 + (Math.random() - 0.5) * 150,
              y: 100 + (Math.random() - 0.5) * 150,
              opacity: [0, 0.9, 0],
              scale: [0, 1.6, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2.5,
              ease: "easeOut"
            }}
          />
        ))}

        {/* Geometric Pyramid Facets matching reference */}
        <g>
          {/* Outer Pyramid Base Shape */}
          <polygon
            points="100,30 35,140 165,140"
            fill="#c084fc"
            opacity="0.2"
          />

          {/* Left Light Facet */}
          <polygon
            points="100,30 35,140 100,155"
            fill="#d8b4fe"
            opacity="0.9"
          />

          {/* Right Light Facet */}
          <polygon
            points="100,30 165,140 100,155"
            fill="#e9d5ff"
            opacity="0.95"
          />

          {/* Center Dark Diamond Facet */}
          <polygon
            points="100,72 70,112 100,155 130,112"
            fill="#3b0764"
            opacity="0.9"
          />

          {/* Bottom Dark Base Facet */}
          <polygon
            points="35,140 100,155 165,140 100,126"
            fill="#2e1065"
            opacity="0.95"
          />

          {/* Apex Glowing Dot Feature */}
          <circle cx="100" cy="30" r="10" fill="#c084fc" opacity="0.4" />
          <circle cx="100" cy="30" r="6" fill="#f0abfc" />
          <circle cx="100" cy="30" r="3.5" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
};

