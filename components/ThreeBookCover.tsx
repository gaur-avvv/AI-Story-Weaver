import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { BookOpen, Sparkles, ChevronRight, Eye } from 'lucide-react';
import { playPageTurnSound } from '../utils/pageTurnSound';

export interface ThreeBookCoverProps {
  storyTitle: string;
  genre?: string;
  targetAudience?: string;
  coverImageUrl?: string;
  theme?: 'antique' | 'ivory' | 'midnight' | 'obsidian';
  onOpenBook: () => void;
  className?: string;
}

// Procedural texture generator for high-resolution leather cover
function createLeatherTexture(theme: string, title: string, genre: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1440;
  const ctx = canvas.getContext('2d')!;

  // Base theme colors
  const palette: Record<string, { bg1: string; bg2: string; foil: string; border: string }> = {
    antique: { bg1: '#3d1e11', bg2: '#1f0d07', foil: '#fcd34d', border: '#b45309' },
    ivory: { bg1: '#2b2622', bg2: '#141210', foil: '#fef08a', border: '#94a3b8' },
    midnight: { bg1: '#0f172a', bg2: '#060a16', foil: '#c084fc', border: '#7c3aed' },
    obsidian: { bg1: '#111317', bg2: '#050608', foil: '#fbbf24', border: '#78350f' },
  };

  const colors = palette[theme] || palette.antique;

  // Leather background gradient
  const grad = ctx.createRadialGradient(512, 720, 100, 512, 720, 900);
  grad.addColorStop(0, colors.bg1);
  grad.addColorStop(1, colors.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1440);

  // Micro-noise leather pores
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let i = 0; i < 45000; i++) {
    const rx = Math.random() * 1024;
    const ry = Math.random() * 1440;
    const rad = Math.random() * 1.5 + 0.5;
    ctx.beginPath();
    ctx.arc(rx, ry, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Embossed gold foil border frames
  ctx.strokeStyle = colors.foil;
  ctx.lineWidth = 6;
  ctx.strokeRect(50, 50, 924, 1340);

  ctx.lineWidth = 2;
  ctx.strokeRect(70, 70, 884, 1300);

  // Corner decorative flourishes
  const cornerSize = 80;
  const corners = [
    [50, 50],
    [974, 50],
    [50, 1390],
    [974, 1390],
  ];
  ctx.strokeStyle = colors.foil;
  ctx.lineWidth = 3;
  corners.forEach(([cx, cy]) => {
    ctx.save();
    ctx.translate(cx, cy);
    const signX = cx < 500 ? 1 : -1;
    const signY = cy < 700 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(0, signY * cornerSize);
    ctx.lineTo(signX * cornerSize, 0);
    ctx.stroke();
    ctx.restore();
  });

  // Header Genre Stamp
  ctx.fillStyle = colors.foil;
  ctx.font = 'bold 30px "Cinzel", "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '6px';
  ctx.fillText(`• ${genre.toUpperCase()} EDITION •`, 512, 220);

  // Center Ornament Emblem
  ctx.strokeStyle = colors.foil;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(512, 420, 110, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(512, 420, 125, 0, Math.PI * 2);
  ctx.stroke();

  // Emblem inner star
  ctx.save();
  ctx.translate(512, 420);
  for (let s = 0; s < 8; s++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, -90);
    ctx.lineTo(15, -30);
    ctx.lineTo(0, 0);
    ctx.lineTo(-15, -30);
    ctx.closePath();
    ctx.fillStyle = colors.foil;
    ctx.fill();
  }
  ctx.restore();

  // Story Title (Wrapped & Scaled)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px "Cinzel", "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 12;

  const words = (title || 'An Untold Novella').split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((w) => {
    const testLine = currentLine ? `${currentLine} ${w}` : w;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 780 && currentLine) {
      lines.push(currentLine);
      currentLine = w;
    } else {
      currentLine = testLine;
    }
  });
  if (currentLine) lines.push(currentLine);

  let startY = 680;
  lines.slice(0, 3).forEach((line) => {
    ctx.fillText(line, 512, startY);
    startY += 80;
  });

  // Subtitle / Imprint
  ctx.shadowBlur = 0;
  ctx.fillStyle = colors.foil;
  ctx.font = 'italic 28px "Lora", Georgia, serif';
  ctx.fillText('Interactive Branching Edition', 512, 1150);

  ctx.font = '22px monospace';
  ctx.letterSpacing = '4px';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('AI STORYTELLER STUDIO', 512, 1240);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural paper block edge texture
function createPageBlockTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f4eedb';
  ctx.fillRect(0, 0, 512, 128);

  // Micro horizontal lines representing paper leaves
  for (let y = 0; y < 128; y += 2) {
    const alpha = Math.random() * 0.15 + 0.05;
    ctx.fillStyle = `rgba(120, 90, 60, ${alpha})`;
    ctx.fillRect(0, y, 512, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const ThreeBookCover: React.FC<ThreeBookCoverProps> = ({
  storyTitle,
  genre = 'Fantasy',
  targetAudience = 'All Readers',
  theme = 'antique',
  onOpenBook,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isOpening, setIsOpening] = useState(false);
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const openProgressRef = useRef(0);
  const isOpeningRef = useRef(false);

  const handleStartOpen = useCallback(() => {
    if (isOpeningRef.current) return;
    isOpeningRef.current = true;
    setIsOpening(true);
    playPageTurnSound(0.24);
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 650;

    // Three.js Scene, Camera & Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Studio Lighting Rig
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffeedd, 1.8);
    keyLight.position.set(4, 5, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xddeeff, 0.8);
    fillLight.position.set(-4, 2, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfef08a, 1.2);
    rimLight.position.set(0, -4, -3);
    scene.add(rimLight);

    // Master Book Group (Composite 3D Model)
    const bookGroup = new THREE.Group();
    scene.add(bookGroup);

    // Dimensions
    const bookWidth = 2.4;
    const bookHeight = 3.3;
    const bookThickness = 0.42;
    const coverThickness = 0.05;

    // Textures
    const leatherTex = createLeatherTexture(theme, storyTitle, genre);
    const pageBlockTex = createPageBlockTexture();

    // Materials
    const leatherMat = new THREE.MeshStandardMaterial({
      map: leatherTex,
      roughness: 0.4,
      metalness: 0.15,
    });

    const plainLeatherMat = new THREE.MeshStandardMaterial({
      color: theme === 'midnight' ? 0x060a16 : theme === 'ivory' ? 0x141210 : 0x1f0d07,
      roughness: 0.5,
      metalness: 0.1,
    });

    const pageBlockMat = new THREE.MeshStandardMaterial({
      map: pageBlockTex,
      roughness: 0.8,
      metalness: 0.05,
    });

    const goldFoilMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2,
    });

    // 1. Back Cover
    const backCoverGeo = new THREE.BoxGeometry(bookWidth, bookHeight, coverThickness);
    const backCover = new THREE.Mesh(backCoverGeo, plainLeatherMat);
    backCover.position.set(0, 0, -bookThickness / 2);
    backCover.castShadow = true;
    backCover.receiveShadow = true;
    bookGroup.add(backCover);

    // 2. Paper Block
    const pageBlockGeo = new THREE.BoxGeometry(bookWidth * 0.95, bookHeight * 0.96, bookThickness - coverThickness);
    const pageBlock = new THREE.Mesh(pageBlockGeo, pageBlockMat);
    pageBlock.position.set(0.04, 0, 0);
    pageBlock.castShadow = true;
    pageBlock.receiveShadow = true;
    bookGroup.add(pageBlock);

    // 3. Spine
    const spineGeo = new THREE.CylinderGeometry(
      bookThickness / 2,
      bookThickness / 2,
      bookHeight,
      24,
      1,
      false,
      Math.PI / 2,
      Math.PI
    );
    const spine = new THREE.Mesh(spineGeo, plainLeatherMat);
    spine.rotation.y = Math.PI / 2;
    spine.position.set(-bookWidth / 2, 0, 0);
    spine.castShadow = true;
    bookGroup.add(spine);

    // 4. Front Cover Pivot Group (Rotates along left hinge)
    const frontCoverPivot = new THREE.Group();
    frontCoverPivot.position.set(-bookWidth / 2, 0, bookThickness / 2);
    bookGroup.add(frontCoverPivot);

    const frontCoverGeo = new THREE.BoxGeometry(bookWidth, bookHeight, coverThickness);
    // Multi-material to display artwork texture on front face
    const frontCoverMaterials = [
      plainLeatherMat, // right edge
      plainLeatherMat, // left edge
      plainLeatherMat, // top edge
      plainLeatherMat, // bottom edge
      leatherMat,      // FRONT FACE
      plainLeatherMat, // inner cover
    ];
    const frontCover = new THREE.Mesh(frontCoverGeo, frontCoverMaterials);
    frontCover.position.set(bookWidth / 2, 0, 0);
    frontCover.castShadow = true;
    frontCover.receiveShadow = true;
    frontCoverPivot.add(frontCover);

    // 5. Corner Gold Brackets on Front Cover
    const bracketSize = 0.22;
    const bracketGeo = new THREE.BoxGeometry(bracketSize, bracketSize, coverThickness * 1.2);
    const cornerOffsets = [
      [bookWidth - bracketSize / 2, bookHeight / 2 - bracketSize / 2],
      [bracketSize / 2, bookHeight / 2 - bracketSize / 2],
      [bookWidth - bracketSize / 2, -bookHeight / 2 + bracketSize / 2],
      [bracketSize / 2, -bookHeight / 2 + bracketSize / 2],
    ];
    cornerOffsets.forEach(([cx, cy]) => {
      const bracket = new THREE.Mesh(bracketGeo, goldFoilMat);
      bracket.position.set(cx, cy, 0.005);
      frontCoverPivot.add(bracket);
    });

    // 6. Soft Contact Shadow Plane underneath Book
    const shadowGeo = new THREE.PlaneGeometry(5.2, 5.2);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const shadowCtx = shadowCanvas.getContext('2d')!;
    const shadowGrad = shadowCtx.createRadialGradient(128, 128, 20, 128, 128, 120);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    shadowGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.2)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    shadowCtx.fillStyle = shadowGrad;
    shadowCtx.fillRect(0, 0, 256, 256);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);

    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.position.set(0, 0, -bookThickness / 2 - 0.05);
    bookGroup.add(shadowPlane);

    // Pointer Interactivity (Subtle 3D Parallax Tilt)
    const handlePointerMove = (e: MouseEvent) => {
      if (isOpeningRef.current) return;
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotationRef.current = {
        x: normY * 0.25,
        y: normX * 0.35,
      };
    };

    container.addEventListener('mousemove', handlePointerMove);

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Opening Animation: Rotate Front Cover around Hinge
      if (isOpeningRef.current) {
        openProgressRef.current = Math.min(1, openProgressRef.current + delta * 1.5);
        // Hinge rotates from 0 to -Math.PI * 0.95
        const targetAngle = -Math.PI * 0.95 * openProgressRef.current;
        frontCoverPivot.rotation.y = THREE.MathUtils.lerp(frontCoverPivot.rotation.y, targetAngle, 0.15);

        // Center book group slightly as cover swings open
        bookGroup.position.x = THREE.MathUtils.lerp(bookGroup.position.x, 0.6 * openProgressRef.current, 0.1);
        bookGroup.rotation.y = THREE.MathUtils.lerp(bookGroup.rotation.y, 0, 0.1);
        bookGroup.rotation.x = THREE.MathUtils.lerp(bookGroup.rotation.x, 0, 0.1);

        if (openProgressRef.current >= 0.96) {
          // Finished opening -> trigger transition to dual-page reading mode
          onOpenBook();
        }
      } else {
        // Idle Gentle Damped Parallax Rotation
        bookGroup.rotation.x = THREE.MathUtils.damp(bookGroup.rotation.x, targetRotationRef.current.x, 5, delta);
        bookGroup.rotation.y = THREE.MathUtils.damp(bookGroup.rotation.y, targetRotationRef.current.y, 5, delta);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handlePointerMove);
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      // Cleanup Geometries & Materials
      backCoverGeo.dispose();
      pageBlockGeo.dispose();
      spineGeo.dispose();
      frontCoverGeo.dispose();
      bracketGeo.dispose();
      shadowGeo.dispose();
      leatherTex.dispose();
      pageBlockTex.dispose();
      shadowTex.dispose();
      leatherMat.dispose();
      plainLeatherMat.dispose();
      pageBlockMat.dispose();
      goldFoilMat.dispose();
      shadowMat.dispose();
      renderer.dispose();
    };
  }, [theme, storyTitle, genre, onOpenBook]);

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center select-none ${className}`}>
      {/* 3D WebGL Canvas Container */}
      <div 
        ref={mountRef} 
        onClick={handleStartOpen}
        className="w-full h-[540px] sm:h-[620px] md:h-[680px] cursor-pointer relative"
        title="Click to open book"
      />

      {/* Floating Prompt & CTA beneath 3D Book */}
      <div className="absolute bottom-6 z-20 flex flex-col items-center gap-2">
        <button
          onClick={handleStartOpen}
          disabled={isOpening}
          className="group px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-serif font-bold text-sm flex items-center gap-2 shadow-[0_10px_30px_rgba(245,158,11,0.4)] transition-all active:scale-95 disabled:opacity-50"
        >
          <BookOpen className="w-4 h-4 text-slate-900 group-hover:scale-110 transition-transform" />
          <span>{isOpening ? 'Opening Book...' : 'Open Storybook'}</span>
          <ChevronRight className="w-4 h-4 text-slate-900 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <p className="text-[11px] font-mono tracking-wider text-amber-200/70 uppercase">
          Curated for {targetAudience} • Move mouse to inspect 3D cover
        </p>
      </div>
    </div>
  );
};
