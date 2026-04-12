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

  const cells = buildMatrix(text, size);
  const inner = 132;
  const cellSize = (canvas.width - inner * 2) / size;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.floor(cellSize * 0.55)}px "JetBrains Mono", ui-monospace, monospace`;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const char = cells[row * size + col] || ' ';
      const x = inner + col * cellSize + cellSize / 2;
      const y = inner + row * cellSize + cellSize / 2;

      if (char === ' ') {
        ctx.fillStyle = 'rgba(16,20,28,0.24)';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(4, cellSize * 0.05), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fillText(char, x, y - cellSize * 0.03);
        ctx.fillStyle = 'rgba(14,18,24,1)';
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

  return (
    <group rotation={[0, 0, 0]} position={[0, 0, 0]} scale={0.76}>
      <mesh>
        <boxGeometry args={[2.44, 2.44, 0.34]} />
        <meshPhysicalMaterial
          color="#40597b"
          metalness={0.08}
          roughness={0.34}
          transmission={0.26}
          thickness={1.3}
          ior={1.22}
          clearcoat={0.6}
          clearcoatRoughness={0.28}
          reflectivity={0.34}
          sheen={0.18}
          sheenColor="#b8cde6"
        />
      </mesh>

      <mesh position={[0, 0, 0.176]}>
        <planeGeometry args={[2.16, 2.16]} />
        <meshPhysicalMaterial
          color="#537099"
          roughness={0.46}
          metalness={0.03}
          transmission={0.06}
          clearcoat={0.16}
          clearcoatRoughness={0.62}
        />
      </mesh>

      <mesh position={[0, 0, 0.182]}>
        <planeGeometry args={[2.02, 2.02]} />
        <meshStandardMaterial
          map={glyphTexture}
          alphaMap={glyphTexture}
          transparent
          alphaTest={0.02}
          color="#121822"
          roughness={0.98}
          metalness={0.01}
        />
      </mesh>
    </group>
  );
}

export default function DetailSlab3D({ text }) {
  return (
    <Canvas
      className="detail-canvas"
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 5.8], fov: 22 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={1.18} color="#f7f0e6" />
      <directionalLight position={[2.8, 3.2, 5.2]} intensity={2.4} color="#fff8ec" />
      <directionalLight position={[-2.4, -1.2, 3.4]} intensity={0.75} color="#bdd2f0" />
      <pointLight position={[0.2, 1.2, 3.8]} intensity={0.42} color="#edf5ff" />

      <SlabMesh text={text} />

      <OrbitControls
        enablePan={false}
        enableZoom
        enableRotate
        target={[0, 0, 0.18]}
        minDistance={4.8}
        maxDistance={7.8}
        minPolarAngle={1.2}
        maxPolarAngle={1.95}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />
    </Canvas>
  );
}
