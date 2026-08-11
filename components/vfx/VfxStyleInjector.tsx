import React, { useEffect } from 'react';
import { useVfx } from '../../vfx/VfxContext';

export const VfxStyleInjector: React.FC = () => {
  const { vfx, theme } = useVfx();

  useEffect(() => {
    // Inject dynamic CSS variables into document root
    const root = document.documentElement;
    root.style.setProperty('--vfx-primary', theme.primaryColor);
    root.style.setProperty('--vfx-secondary', theme.secondaryColor);
    root.style.setProperty('--vfx-accent', theme.accentColor);
    root.style.setProperty('--vfx-aura-glow', theme.auraGlow);

    // Apply cursor
    document.body.className = `${theme.cursorStyle} bg-slate-950 text-slate-100 overflow-x-hidden transition-colors duration-700`;

    return () => {
      document.body.className = '';
    };
  }, [theme, vfx.genre]);

  return null;
};
