'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

function sanitizeText(text) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[^\p{L}\p{N}\p{M} .,;:'"!?\-،。！？、，؛]/gu, '')
    .toLocaleUpperCase();
}

const MATRIX_SIZE = 10;

function buildMatrix(text, size = MATRIX_SIZE) {
  const cleaned = Array.from(sanitizeText(text)).slice(0, size * size);
  return [...cleaned, ...Array(size * size - cleaned.length).fill(' ')];
}

function createGlyphTexture(text, size = MATRIX_SIZE, mode = 'base') {
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 1400;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (mode === 'base') {
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, '#42556f');
    bgGradient.addColorStop(0.54, '#37475d');
    bgGradient.addColorStop(1, '#2b3747');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const cells = buildMatrix(text, size);
  const inner = 148;
  const cellSize = (canvas.width - inner * 2) / size;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.floor(cellSize * 0.66)}px "JetBrains Mono", ui-monospace, monospace`;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const char = cells[row * size + col] || ' ';
      const x = inner + col * cellSize + cellSize / 2;
      const y = inner + row * cellSize + cellSize / 2;

      if (mode === 'glow') {
        if (char === ' ') {
          ctx.shadowColor = 'rgba(188, 225, 255, 0.68)';
          ctx.shadowBlur = Math.max(18, cellSize * 0.28);
          ctx.fillStyle = 'rgba(184, 220, 255, 0.3)';
          ctx.beginPath();
          ctx.arc(x, y, Math.max(4, cellSize * 0.045), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.shadowColor = 'rgba(210, 236, 255, 0.78)';
          ctx.shadowBlur = Math.max(22, cellSize * 0.34);
          ctx.fillStyle = 'rgba(206, 232, 255, 0.62)';
          ctx.fillText(char, x, y);
          ctx.shadowBlur = 0;
        }
        continue;
      }

      if (char === ' ') {
        ctx.fillStyle = 'rgba(14, 20, 29, 0.42)';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(4, cellSize * 0.045), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(209, 222, 244, 0.18)';
        ctx.fillText(char, x, y - cellSize * 0.03);
        ctx.fillStyle = '#0b121c';
        ctx.fillText(char, x, y + cellSize * 0.03);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function SlabMesh({ text, interacting = false }) {
  const glyphTexture = useMemo(() => createGlyphTexture(text, MATRIX_SIZE, 'base'), [text]);
  const glowTexture = useMemo(() => createGlyphTexture(text, MATRIX_SIZE, 'glow'), [text]);
  const materials = useMemo(
    () =>
      Array.from({ length: 6 }, () =>
        new THREE.MeshStandardMaterial({
          map: glyphTexture,
          emissiveMap: glowTexture,
          emissive: '#d8f0ff',
          emissiveIntensity: 0,
          roughness: 0.56,
          metalness: 0.32,
          color: '#8d99aa',
        })
      ),
    [glyphTexture, glowTexture]
  );

  useFrame((_, delta) => {
    const target = interacting ? 0.24 : 0;
    const blend = 1 - Math.exp(-6 * delta);
    materials.forEach((material) => {
      material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, target, blend);
    });
  });

  return (
    <group rotation={[0, 0, 0]} position={[0, 0, 0]} scale={0.88}>
      <mesh material={materials}>
        <boxGeometry args={[2.18, 2.18, 2.18]} />
      </mesh>
    </group>
  );
}

export default function DetailSlab3D({ text }) {
  const [interacting, setInteracting] = useState(false);
  const releaseTimerRef = useRef(null);

  const clearReleaseTimer = () => {
    if (releaseTimerRef.current) {
      clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
  };

  const beginInteraction = () => {
    clearReleaseTimer();
    setInteracting(true);
  };

  const endInteraction = () => {
    clearReleaseTimer();
    releaseTimerRef.current = setTimeout(() => {
      setInteracting(false);
      releaseTimerRef.current = null;
    }, 120);
  };

  return (
    <Canvas
      className="detail-canvas"
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6.4], fov: 22 }}
      gl={{ antialias: true, alpha: true }}
      onPointerDown={beginInteraction}
      onPointerUp={endInteraction}
      onPointerLeave={endInteraction}
      onPointerCancel={endInteraction}
    >
      <ambientLight intensity={0.92} color="#d7e1ef" />
      <directionalLight position={[2.8, 3.2, 5.4]} intensity={1.4} color="#f3f7fd" />
      <directionalLight position={[-2.2, -1.4, 3.2]} intensity={0.58} color="#aec1db" />
      <pointLight position={[0.2, 1.5, 4]} intensity={0.18} color="#dce8f7" />

      <SlabMesh text={text} interacting={interacting} />

      <OrbitControls
        enablePan={false}
        enableZoom
        enableRotate
        target={[0, 0, 0]}
        minDistance={5.2}
        maxDistance={8.4}
        minPolarAngle={1.05}
        maxPolarAngle={2.05}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        onStart={beginInteraction}
        onEnd={endInteraction}
      />
    </Canvas>
  );
}
