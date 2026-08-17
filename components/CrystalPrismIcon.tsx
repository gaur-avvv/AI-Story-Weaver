import React from 'react';

interface CrystalPrismIconProps extends React.SVGProps<SVGSVGElement> {
  animated?: boolean;
}

export const CrystalPrismIcon: React.FC<CrystalPrismIconProps> = ({ 
  className = "w-6 h-6", 
  ...props 
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} overflow-visible`}
      {...props}
    >
      <defs>
        {/* Soft Glow Effect */}
        <filter id="prismGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Facet Gradients matching the Novellaio purple crystal prism */}
        <linearGradient id="prismLeftFacet" x1="50" y1="12" x2="20" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f3e8ff" />
          <stop offset="30%" stopColor="#c084fc" />
          <stop offset="70%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>

        <linearGradient id="prismRightFacet" x1="50" y1="12" x2="80" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="25%" stopColor="#d8b4fe" />
          <stop offset="65%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#3b0764" />
        </linearGradient>

        <linearGradient id="prismBottomBase" x1="20" y1="82" x2="80" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b0764" />
          <stop offset="50%" stopColor="#7e22ce" />
          <stop offset="100%" stopColor="#2e1065" />
        </linearGradient>

        <linearGradient id="prismCenterHighlight" x1="50" y1="12" x2="50" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="45%" stopColor="#f0abfc" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.3" />
        </linearGradient>

        <radialGradient id="prismRadialGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.75" />
          <stop offset="50%" stopColor="#7e22ce" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Radial Backlight Aura */}
      <circle cx="50" cy="50" r="46" fill="url(#prismRadialGlow)" />

      {/* Light Lens Rays behind Prism */}
      <g opacity="0.5">
        <line x1="50" y1="0" x2="50" y2="100" stroke="#e9d5ff" strokeWidth="0.8" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#e9d5ff" strokeWidth="0.8" />
        <line x1="15" y1="15" x2="85" y2="85" stroke="#c084fc" strokeWidth="0.5" />
        <line x1="85" y1="15" x2="15" y2="85" stroke="#c084fc" strokeWidth="0.5" />
      </g>

      {/* 3D Crystal Pyramid Facets */}
      <g filter="url(#prismGlowFilter)">
        {/* Left Front Facet */}
        <polygon
          points="50,12 20,78 50,86"
          fill="url(#prismLeftFacet)"
          stroke="#f3e8ff"
          strokeWidth="0.5"
          strokeOpacity="0.7"
        />

        {/* Right Front Facet */}
        <polygon
          points="50,12 50,86 80,78"
          fill="url(#prismRightFacet)"
          stroke="#f3e8ff"
          strokeWidth="0.5"
          strokeOpacity="0.7"
        />

        {/* Base Facet */}
        <polygon
          points="20,78 50,86 80,78 50,73"
          fill="url(#prismBottomBase)"
          opacity="0.95"
        />

        {/* Internal Crystalline Refraction Lines */}
        <polyline points="50,12 36,48 50,86" stroke="#f0abfc" strokeWidth="0.6" opacity="0.6" />
        <polyline points="50,12 64,48 50,86" stroke="#e9d5ff" strokeWidth="0.6" opacity="0.6" />
        <line x1="36" y1="48" x2="64" y2="48" stroke="#ffffff" strokeWidth="0.6" opacity="0.75" />

        {/* Center Specular Edge Highlight */}
        <line x1="50" y1="12" x2="50" y2="86" stroke="url(#prismCenterHighlight)" strokeWidth="1.6" strokeLinecap="round" />

        {/* Outer Edge Specular Highlights */}
        <line x1="50" y1="12" x2="20" y2="78" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.85" />
        <line x1="50" y1="12" x2="80" y2="78" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.85" />

        {/* Apex Sparkle Flare */}
        <circle cx="50" cy="12" r="2.5" fill="#ffffff" />
        <circle cx="50" cy="12" r="5" fill="#f0abfc" opacity="0.6" />
      </g>
    </svg>
  );
};
