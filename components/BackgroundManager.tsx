import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useVfx } from '../vfx/VfxContext';
import { VfxCanvasBackground } from './vfx/VfxCanvasBackground';

interface BackgroundManagerProps {
  isGenerating: boolean;
}

export const BackgroundManager: React.FC<BackgroundManagerProps> = ({ isGenerating }) => {
  const { vfx, theme } = useVfx();
  const [isHovering, setIsHovering] = useState(false);
  
  const mouseX = useMotionValue(-400);
  const mouseY = useMotionValue(-400);
  
  const springX = useSpring(mouseX, { damping: 25, stiffness: 120 });
  const springY = useSpring(mouseY, { damping: 25, stiffness: 120 });

  const sentiment = vfx.sentiment;
  const activeAura = sentiment?.palette?.auraGlow || theme.auraGlow;
  const moodGradient = sentiment?.palette 
    ? `${sentiment.palette.bgFrom} ${sentiment.palette.bgVia} ${sentiment.palette.bgTo}`
    : theme.bgGradient;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - 400);
      mouseY.set(e.clientY - 400);
      if (!isHovering) setIsHovering(true);
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
    };
  }, [mouseX, mouseY, isHovering]);

  return (
    <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none bg-slate-950">
      {/* Genre & Sentiment Theme Dynamic Background Gradient */}
      <div 
        className={`absolute inset-0 transition-all duration-1000 bg-gradient-to-br ${moodGradient} ${
          isGenerating ? 'opacity-100 scale-105 animate-pulse' : 'opacity-90'
        }`}
      />

      {/* Dynamic Sentiment Mood Ambient Glow Overlay */}
      {sentiment?.palette?.accent && (
        <motion.div
          key={`bg-sentiment-${sentiment.tone}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 transition-colors duration-1000"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${sentiment.palette.accent}22 0%, transparent 70%)`
          }}
        />
      )}

      {/* Particle Canvas Layer */}
      <VfxCanvasBackground />
      
      {/* Mouse tracking glow tailored to theme aura & sentiment */}
      <motion.div 
        className="absolute w-[800px] h-[800px] rounded-full blur-[140px] pointer-events-none mix-blend-screen transition-all duration-700"
        style={{
          x: springX,
          y: springY,
          background: `radial-gradient(circle, ${activeAura} 0%, transparent 70%)`,
        }}
        animate={{
          opacity: isHovering || isGenerating ? 1 : 0.45,
        }}
        transition={{ opacity: { duration: 0.7 } }}
      />
      
      {/* Vignette effect for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.7)_100%)] pointer-events-none" />
    </div>
  );
};
