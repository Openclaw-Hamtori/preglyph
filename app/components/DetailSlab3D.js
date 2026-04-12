'use client';

import { Canvas, useFrame } from '@react-three/fiber';
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
        ctx.fillStyle = 'rgba(16,20,28,0.26)';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(4, cellSize * 0.05), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
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
  const slabRef = useRef(null);
  const shadowRef = useRef(null);
  const glyphTexture = useMemo(() => createGlyphTexture(text, 12), [text]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (slabRef.current) {
      slabRef.current.rotation.x = -0.58 + Math.sin(t * 0.55) * 0.035;
      slabRef.current.rotation.y = 0.72 + Math.cos(t * 0.45) * 0.05;
      slabRef.current.rotation.z = -0.14 + Math.sin(t * 0.35) * 0.018;
      slabRef.current.position.y = 0.08 + Math.sin(t * 0.5) * 0.03;
    }
    if (shadowRef.current) {
      shadowRef.current.scale.x = 1.08 + Math.sin(t * 0.5) * 0.015;
      shadowRef.current.scale.y = 1.02 + Math.cos(t * 0.5) * 0.015;
      shadowRef.current.material.opacity = 0.22 + Math.sin(t * 0.5) * 0.015;
    }
  });

  return (
    <group>
      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.85, 0]}>
        <circleGeometry args={[1.78, 48]} />
        <meshBasicMaterial color="#3a4656" transparent opacity={0.22} />
      </mesh>
      <group ref={slabRef}>
        <mesh castShadow receiveShadow>
          <RoundedSlabGeometry />
          <meshPhysicalMaterial
            color="#6d86ac"
            metalness={0.08}
            roughness={0.34}
            transmission={0.3}
            thickness={1.45}
            ior={1.24}
            clearcoat={0.62}
            clearcoatRoughness={0.3}
            reflectivity={0.42}
            sheen={0.26}
            sheenColor="#d7e5f7"
          />
        </mesh>

        <mesh castShadow receiveShadow position={[0, 0, 0.255]}>
          <planeGeometry args={[2.08, 2.08]} />
          <meshPhysicalMaterial
            color="#5b7088"
            roughness={0.58}
            metalness={0.04}
            transmission={0.08}
            clearcoat={0.18}
            clearcoatRoughness={0.72}
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
    </group>
  );
}

export default function DetailSlab3D({ text }) {
  return (
    <Canvas
      className="detail-canvas"
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.28, 4.0], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      shadows
    >
      <ambientLight intensity={1.12} color="#f7f0e6" />
      <directionalLight
        position={[3.2, 3.8, 3.8]}
        intensity={3.1}
        color="#fff8ec"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3.2, -1.8, 1.6]} intensity={0.84} color="#b3caf0" />
      <pointLight position={[0.4, 1.8, 2.6]} intensity={0.56} color="#edf5ff" />
      <pointLight position={[-1.4, 0.2, 2.1]} intensity={0.22} color="#b7cced" />
      <SlabMesh text={text} />
    </Canvas>
  );
}
