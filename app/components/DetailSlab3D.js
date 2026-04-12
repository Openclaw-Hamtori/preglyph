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
  ctx.fillStyle = '#537099';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(220, 233, 252, 0.18)';
  ctx.lineWidth = 12;
  ctx.strokeRect(92, 92, canvas.width - 184, canvas.height - 184);

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
        ctx.fillStyle = 'rgba(17,24,34,0.34)';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(5, cellSize * 0.06), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(221, 234, 252, 0.28)';
        ctx.fillText(char, x, y - cellSize * 0.03);
        ctx.fillStyle = '#0f1723';
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
          roughness: 0.74,
          metalness: 0.08,
          color: '#ffffff',
        })
      ),
    [glyphTexture]
  );

  return (
    <group rotation={[-0.26, 0.5, -0.08]} position={[0, 0, 0]} scale={0.88}>
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
      <ambientLight intensity={1.22} color="#f2f6fd" />
      <directionalLight position={[3.2, 3.4, 5.8]} intensity={2.2} color="#ffffff" />
      <directionalLight position={[-2.8, -1.6, 3.8]} intensity={0.92} color="#c7d9f4" />
      <pointLight position={[0.2, 1.8, 4.2]} intensity={0.38} color="#edf5ff" />

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
