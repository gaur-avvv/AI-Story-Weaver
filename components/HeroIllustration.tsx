import React from 'react';

export const HeroIllustration: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 200 200"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g transform="translate(100 100)">
      {/* Sparks */}
      <path d="M-40 -60 Q -35 -70 -30 -60" fill="currentColor" opacity="0.8">
         <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M-55 -45 Q -60 -55 -50 -55" fill="currentColor" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2.5s" repeatCount="indefinite" />
      </path>
      <path d="M-30 -80 Q -25 -90 -20 -80" fill="currentColor" opacity="0.9">
         <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.8s" repeatCount="indefinite" />
      </path>
       <path d="M30 -65 Q 35 -75 40 -65" fill="currentColor" opacity="0.85">
         <animate attributeName="opacity" values="0.85;0.25;0.85" dur="2.2s" repeatCount="indefinite" />
      </path>
       <path d="M50 -50 Q 55 -60 60 -50" fill="currentColor" opacity="0.7">
         <animate attributeName="opacity" values="0.7;0.15;0.7" dur="2.8s" repeatCount="indefinite" />
      </path>


      {/* Book */}
      <path
        d="M-80 80 Q -80 0 -50 -30 L 50 -30 Q 80 0 80 80 L 70 80 Q 70 10 45 -20 L -45 -20 Q -70 10 -70 80 Z"
        fill="#60a5fa" 
      />
      <path
        d="M-75 75 Q -75 5 -45 -25 L 45 -25 Q 75 5 75 75 L 65 75 Q 65 15 40 -15 L -40 -15 Q -65 15 -65 75 Z"
        fill="#f0f9ff"
      />
      <rect x="-40" y="-15" width="20" height="4" rx="2" fill="#93c5fd" />
       <rect x="-40" y="-5" width="30" height="4" rx="2" fill="#93c5fd" />
       <rect x="5" y="-15" width="30" height="4" rx="2" fill="#93c5fd" />
       <rect x="5" y="-5" width="25" height="4" rx="2" fill="#93c5fd" />


       {/* Bookmark */}
       <path d="M 0 -30 L 0 20 L 10 10 L 20 20 L 20 -30 Z" fill="#fbbf24" />
    </g>
  </svg>
);
