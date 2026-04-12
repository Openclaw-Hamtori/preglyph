'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

function sanitizeText(text) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[^\p{L}\p{N}\p{M} .,;:'"!?\-،。！？、，؛]/gu, '')
    .toLocaleUpperCase();
}

function buildMatrix(text, size = 9) {
  const cleaned = Array.from(sanitizeText(text)).slice(0, size * size);
  return [...cleaned, ...Array(size * size - cleaned.length).fill(' ')];
}

function createGlyphTexture(text, size = 9) {
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 1400;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGradient.addColorStop(0, '#495d78');
  bgGradient.addColorStop(0.54, '#3e5068');
  bgGradient.addColorStop(1, '#334255');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(202, 216, 238, 0.12)';
  ctx.lineWidth = 10;
  ctx.strokeRect(96, 96, canvas.width - 192, canvas.height - 192);

  const cells = buildMatrix(text, size);
  const inner = 168;
  const cellSize = (canvas.width - inner * 2) / size;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.floor(cellSize * 0.56)}px "JetBrains Mono", ui-monospace, monospace`;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const char = cells[row * size + col] || ' ';
      const x = inner + col * cellSize + cellSize / 2;
      const y = inner + row * cellSize + cellSize / 2;

      if (char === ' ') {
        ctx.shadowColor = 'rgba(132, 182, 255, 0.24)';
        ctx.shadowBlur = Math.max(14, cellSize * 0.22);
        ctx.fillStyle = 'rgba(122, 166, 230, 0.24)';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(5, cellSize * 0.06), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(14, 20, 29, 0.42)';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(4, cellSize * 0.045), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.shadowColor = 'rgba(134, 190, 255, 0.26)';
        ctx.shadowBlur = Math.max(16, cellSize * 0.24);
        ctx.fillStyle = 'rgba(184, 211, 248, 0.18)';
        ctx.fillText(char, x, y - cellSize * 0.05);
        ctx.shadowBlur = 0;
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

function SlabMesh({ text }) {
  const glyphTexture = useMemo(() => createGlyphTexture(text, 9), [text]);
  const materials = useMemo(
    () =>
      Array.from({ length: 6 }, () =>
        new THREE.MeshStandardMaterial({
          map: glyphTexture,
          emissiveMap: glyphTexture,
          emissive: '#7fa6d6',
          emissiveIntensity: 0.12,
          roughness: 0.56,
          metalness: 0.32,
          color: '#8d99aa',
        })
      ),
    [glyphTexture]
  );

  return (
    <group rotation={[0, 0, 0]} position={[0, 0, 0]} scale={0.88}>
      <mesh material={materials}>
        <boxGeometry args={[2.18, 2.18, 2.18]} />
      </mesh>
    </group>
  );
}

export default function DetailSlab3D({ text }) {
  return (
    <Canvas
      className="detail-canvas"
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6.4], fov: 22 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.92} color="#d7e1ef" />
      <directionalLight position={[2.8, 3.2, 5.4]} intensity={1.4} color="#f3f7fd" />
      <directionalLight position={[-2.2, -1.4, 3.2]} intensity={0.58} color="#aec1db" />
      <pointLight position={[0.2, 1.5, 4]} intensity={0.18} color="#dce8f7" />

      <SlabMesh text={text} />

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
      />
    </Canvas>
  );
}
