/**
 * The curled-corner "hold and flip" affordance shared by both flipbook
 * renderers (<hic-pageflip> and the CSS 3D fallback).
 *
 * It is a purely decorative overlay: `pointer-events-none`, `aria-hidden`, so
 * the real page surfaces keep receiving the pointer events that drive the
 * corner bend and the drag-to-turn gesture.
 */
import React from 'react';

/** The four sheet corners, matching the <hic-pageflip> core corner ids. */
export type CornerId = 'br' | 'tr' | 'bl' | 'tl';

/** Size of the curled-corner graphic in CSS pixels. */
export const CORNER_AFFORDANCE_SIZE = 96;

export interface CornerAffordanceProps {
  corner: CornerId;
  /** Corner position in pixels, relative to the positioned ancestor. */
  x: number;
  y: number;
  /** Optional label; defaults to "Hold & flip". */
  label?: string;
}

export const CornerAffordance: React.FC<CornerAffordanceProps> = ({
  corner,
  x,
  y,
  label = 'Hold & flip',
}) => {
  const isLeft = corner === 'bl' || corner === 'tl';
  const isTop = corner === 'tl' || corner === 'tr';
  const size = CORNER_AFFORDANCE_SIZE;

  return (
    <div
      className="pointer-events-none absolute z-10 motion-safe:animate-pulse"
      style={{ left: x - size, top: y - size, width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 96 96"
        style={{ transform: `scale(${isLeft ? -1 : 1}, ${isTop ? -1 : 1})` }}
      >
        {/* The lifted corner of the sheet. */}
        <path
          d="M96 96 H36 C66 92 90 66 96 36 Z"
          fill="#f4ead2"
          stroke="#b08d3e"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Crease shading so it reads as curled paper. */}
        <path d="M36 96 C66 92 90 66 96 36 C70 44 48 66 36 96 Z" fill="#e2d0a6" opacity="0.75" />
        {/* Curved "flip" arrow. */}
        <path
          d="M72 74 C56 70 44 56 42 40"
          fill="none"
          stroke="#7a5a1e"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M35 49 L42 36 L51 44"
          fill="none"
          stroke="#7a5a1e"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span
        className="absolute whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{
          // Keep the label inside the book, away from the curled edge.
          right: isLeft ? 0 : 'auto',
          left: isLeft ? 'auto' : 0,
          top: isTop ? 'auto' : 0,
          bottom: isTop ? 0 : 'auto',
          background: 'rgba(20,14,8,0.88)',
          color: '#e8d9a8',
          border: '1px solid rgba(212,175,55,0.5)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        {label}
      </span>
    </div>
  );
};

export default CornerAffordance;