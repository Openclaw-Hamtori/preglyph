'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function sanitizeText(text) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[^\p{L}\p{N}\p{M} .,;:'"!?\-،。！？、，؛]/gu, '')
    .toLocaleUpperCase();
}

function buildMatrix(text, size = 12) {
  const cleaned = Array.from(sanitizeText(text)).slice(0, size * size);
  return [...cleaned, ...Array(size * size - cleaned.length).fill(' ')];
}

function createGlyphTexture(text, size = 12) {
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

function RoundedSlabGeometry() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const width = 2.62;
    const height = 2.62;
    const radius = 0.18;
    const x = -width / 2;
    const y = -height / 2;

    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelSegments: 10,
      steps: 1,
      bevelSize: 0.045,
      bevelThickness: 0.05,
      curveSegments: 28,
    });
    geom.center();
    return geom;
  }, []);

  return <primitive object={geometry} />;
}

function SlabMesh({ text }) {
  const glyphTexture = useMemo(() => createGlyphTexture(text, 12), [text]);
  const shadowRef = useRef(null);

  return (
    <group rotation={[-0.58, 0.72, -0.14]} position={[0, 0.02, 0]} scale={0.72}>
      <mesh ref={shadowRef} rotation={[-Math.PI / 2 + 0.4, 0.15, 0]} position={[0, -1.7, -0.14]}>
        <circleGeometry args={[1.68, 48]} />
        <meshBasicMaterial color="#3a4656" transparent opacity={0.18} />
      </mesh>

      <mesh castShadow receiveShadow>
        <RoundedSlabGeometry />
        <meshPhysicalMaterial
          color="#6d86ac"
          metalness={0.06}
          roughness={0.28}
          transmission={0.38}
          thickness={1.55}
          ior={1.26}
          clearcoat={0.74}
          clearcoatRoughness={0.22}
          reflectivity={0.48}
          sheen={0.3}
          sheenColor="#dce8f8"
        />
      </mesh>

      <mesh castShadow receiveShadow position={[0, 0, 0.255]}>
        <planeGeometry args={[2.08, 2.08]} />
        <meshPhysicalMaterial
          color="#5b7088"
          roughness={0.5}
          metalness={0.03}
          transmission={0.1}
          clearcoat={0.22}
          clearcoatRoughness={0.6}
        />
      </mesh>

      <mesh position={[0, 0, 0.262]}>
        <planeGeometry args={[2.06, 2.06]} />
        <meshStandardMaterial
          map={glyphTexture}
          alphaMap={glyphTexture}
          transparent
          alphaTest={0.02}
          color="#141b23"
          roughness={0.98}
          metalness={0.01}
        />
      </mesh>

      <mesh position={[0, 0, -0.22]} receiveShadow>
        <planeGeometry args={[2.24, 2.24]} />
        <meshStandardMaterial color="#273342" roughness={1} metalness={0.02} />
      </mesh>
    </group>
  );
}

export default function DetailSlab3D({ text }) {
  return (
    <Canvas
      className="detail-canvas"
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.18, 5.6], fov: 24 }}
      gl={{ antialias: true, alpha: true }}
      shadows
    >
      <ambientLight intensity={1.12} color="#f7f0e6" />
      <directionalLight
        position={[3.2, 3.8, 3.8]}
        intensity={3.2}
        color="#fff8ec"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3.2, -1.8, 1.6]} intensity={0.9} color="#bdd2f0" />
      <pointLight position={[0.4, 1.8, 2.6]} intensity={0.62} color="#edf5ff" />
      <pointLight position={[-1.4, 0.2, 2.1]} intensity={0.24} color="#c5d7ef" />

      <SlabMesh text={text} />

      <OrbitControls
        enablePan={false}
        enableZoom
        enableRotate
        minDistance={4.4}
        maxDistance={7.8}
        minPolarAngle={0.7}
        maxPolarAngle={2.15}
        rotateSpeed={0.7}
        zoomSpeed={0.8}
      />
    </Canvas>
  );
}
