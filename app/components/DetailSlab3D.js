'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { MATRIX_SIZE, createGlyphTexture } from './inscriptionTexture';

function SlabMesh({ text, interacting = false, fontVersion = 0 }) {
  const glyphTexture = useMemo(() => createGlyphTexture(text, MATRIX_SIZE, 'base'), [text, fontVersion]);
  const glowTexture = useMemo(() => createGlyphTexture(text, MATRIX_SIZE, 'glow'), [text, fontVersion]);
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
    <group rotation={[0, 0, 0]} position={[0, 0, 0]} scale={0.8}>
      <mesh material={materials}>
        <boxGeometry args={[2.18, 2.18, 2.18]} />
      </mesh>
    </group>
  );
}

export default function DetailSlab3D({ text, fontVersion = 0 }) {
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
      camera={{ position: [0, 0, 7.1], fov: 22 }}
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

      <SlabMesh text={text} interacting={interacting} fontVersion={fontVersion} />

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
