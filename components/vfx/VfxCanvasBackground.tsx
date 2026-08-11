import React, { useRef, useEffect } from 'react';
import { useVfx } from '../../vfx/VfxContext';

interface SceneParticle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
  type: 'ember' | 'petal' | 'leaf' | 'cosmic' | 'rain' | 'snow' | 'bubble';
  rotation: number;
  rotationSpeed: number;
  oscillationOffset: number;
  oscillationSpeed: number;
}

export const VfxCanvasBackground: React.FC = () => {
  const { vfx } = useVfx();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: SceneParticle[] = [];

    // Helper particle generators
    const createEmber = (): SceneParticle => ({
      x: Math.random() * width,
      y: height + Math.random() * 50,
      size: Math.random() * 3 + 1.2,
      speedX: (Math.random() - 0.5) * 1.2,
      speedY: -(Math.random() * 2 + 0.8),
      opacity: Math.random() * 0.8 + 0.2,
      color: Math.random() > 0.4 ? '#f97316' : '#eab308', // Warm orange/amber
      type: 'ember',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.05,
      oscillationOffset: Math.random() * Math.PI * 2,
      oscillationSpeed: Math.random() * 0.03 + 0.01,
    });

    const createPetal = (): SceneParticle => ({
      x: Math.random() * width,
      y: -20 - Math.random() * 50,
      size: Math.random() * 7 + 4,
      speedX: Math.random() * 1.5 + 0.5,
      speedY: Math.random() * 1.2 + 0.6,
      opacity: Math.random() * 0.7 + 0.3,
      color: Math.random() > 0.3 ? '#f472b6' : '#fbcfe8', // Sakura pink
      type: 'petal',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.04,
      oscillationOffset: Math.random() * Math.PI * 2,
      oscillationSpeed: Math.random() * 0.02 + 0.01,
    });

    const createLeaf = (): SceneParticle => ({
      x: Math.random() * width,
      y: -20 - Math.random() * 50,
      size: Math.random() * 8 + 5,
      speedX: (Math.random() - 0.3) * 1.5,
      speedY: Math.random() * 1.4 + 0.5,
      opacity: Math.random() * 0.6 + 0.3,
      color: Math.random() > 0.5 ? '#34d399' : '#a3e635', // Fresh green / gold leaf
      type: 'leaf',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.06,
      oscillationOffset: Math.random() * Math.PI * 2,
      oscillationSpeed: Math.random() * 0.03 + 0.01,
    });

    const createCosmic = (): SceneParticle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.5 + 0.8,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.8 + 0.2,
      color: Math.random() > 0.5 ? '#a855f7' : '#38bdf8', // Purple/Cyan stardust
      type: 'cosmic',
      rotation: 0,
      rotationSpeed: 0,
      oscillationOffset: Math.random() * Math.PI * 2,
      oscillationSpeed: Math.random() * 0.05 + 0.02,
    });

    const createRain = (): SceneParticle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speedX: Math.random() * 1 - 0.5,
      speedY: Math.random() * 12 + 12,
      opacity: Math.random() * 0.5 + 0.2,
      color: 'rgba(186, 230, 253, 0.7)',
      type: 'rain',
      rotation: 0,
      rotationSpeed: 0,
      oscillationOffset: 0,
      oscillationSpeed: 0,
    });

    const createSnow = (): SceneParticle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3.5 + 1.5,
      speedX: Math.sin(Math.random() * Math.PI) * 1.2 - 0.6,
      speedY: Math.random() * 1.2 + 0.6,
      opacity: Math.random() * 0.7 + 0.3,
      color: 'rgba(255, 255, 255, 0.85)',
      type: 'snow',
      rotation: 0,
      rotationSpeed: 0,
      oscillationOffset: Math.random() * Math.PI * 2,
      oscillationSpeed: 0.02,
    });

    // Populate particles based on situational story conditions & weather
    const isEmbersActive = vfx.showFireEmbers || vfx.tension === 'climax' || vfx.location === 'desert' || vfx.genre === 'action' || vfx.genre === 'horror' || vfx.genre === 'western';
    const isPetalsActive = vfx.showFlowerPetals && (vfx.genre === 'romance' || vfx.genre === 'fantasy' || vfx.genre === 'comedy' || vfx.emotion === 'in_love' || vfx.emotion === 'happy' || vfx.emotion === 'calm');
    const isLeavesActive = vfx.showLushPlants && (vfx.location === 'forest' || vfx.location === 'default' || vfx.weather === 'windy');
    const isCosmicActive = vfx.showCosmicDust || vfx.genre === 'sci-fi' || vfx.supernatural === 'cosmic' || vfx.supernatural === 'cyberpunk' || vfx.supernatural === 'magic';
    const isRainActive = vfx.weather === 'rainy' || vfx.weather === 'stormy';
    const isSnowActive = vfx.weather === 'snowy';

    if (isEmbersActive) {
      for (let i = 0; i < 40; i++) particles.push(createEmber());
    }
    if (isPetalsActive) {
      for (let i = 0; i < 35; i++) particles.push(createPetal());
    }
    if (isLeavesActive) {
      for (let i = 0; i < 25; i++) particles.push(createLeaf());
    }
    if (isCosmicActive) {
      for (let i = 0; i < 45; i++) particles.push(createCosmic());
    }
    if (isRainActive) {
      for (let i = 0; i < 80; i++) particles.push(createRain());
    }
    if (isSnowActive) {
      for (let i = 0; i < 60; i++) particles.push(createSnow());
    }

    // Gentle baseline dust if no intense weather active
    if (particles.length < 15) {
      for (let i = 0; i < 20; i++) particles.push(createCosmic());
    }

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.rotation += p.rotationSpeed;
        p.oscillationOffset += p.oscillationSpeed;

        // Custom particle movement physics
        if (p.type === 'ember') {
          p.x += p.speedX + Math.sin(p.oscillationOffset) * 0.8;
          p.y += p.speedY;
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
        } else if (p.type === 'petal' || p.type === 'leaf') {
          p.x += p.speedX + Math.sin(p.oscillationOffset) * 1.5;
          p.y += p.speedY;
          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }
        } else if (p.type === 'cosmic') {
          p.x += p.speedX + Math.cos(p.oscillationOffset) * 0.3;
          p.y += p.speedY + Math.sin(p.oscillationOffset) * 0.3;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        } else if (p.type === 'rain') {
          p.y += p.speedY;
          p.x += p.speedX;
          if (p.y > height) {
            p.y = -10;
            p.x = Math.random() * width;
          }
        } else if (p.type === 'snow') {
          p.y += p.speedY;
          p.x += Math.sin(p.oscillationOffset) * 0.8;
          if (p.y > height) {
            p.y = -10;
            p.x = Math.random() * width;
          }
        }

        // Render shapes with 2D transformations
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.type === 'petal') {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.beginPath();
          // Draw soft cherry blossom petal path
          ctx.ellipse(0, 0, p.size, p.size * 0.5, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'leaf') {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.quadraticCurveTo(p.size * 0.6, 0, 0, p.size);
          ctx.quadraticCurveTo(-p.size * 0.6, 0, 0, -p.size);
          ctx.fill();
        } else if (p.type === 'rain') {
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(p.speedX * 2, p.speedY * 1.5);
          ctx.stroke();
        } else if (p.type === 'ember') {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity * (0.6 + Math.sin(time * 5 + p.oscillationOffset) * 0.4);
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Cosmic dust & snow
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity * (0.8 + Math.sin(time * 3 + p.oscillationOffset) * 0.2);
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    vfx.showFireEmbers, 
    vfx.showFlowerPetals, 
    vfx.showLushPlants, 
    vfx.showCosmicDust, 
    vfx.weather, 
    vfx.genre
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-85"
    />
  );
};
