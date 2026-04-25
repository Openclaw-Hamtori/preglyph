'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { MATRIX_SIZE, createGlyphTexture } from './inscriptionTexture';

function LoadingSlabMesh({ text, inscriptionMode = 'horizontal', fontVersion = 0 }) {
  const groupRef = useRef(null);
  const glyphTexture = useMemo(() => createGlyphTexture(text, MATRIX_SIZE, 'base', inscriptionMode), [text, inscriptionMode, fontVersion]);
  const glowTexture = useMemo(() => createGlyphTexture(text, MATRIX_SIZE, 'glow', inscriptionMode), [text, inscriptionMode, fontVersion]);
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

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const t = state.clock.elapsedTime;
    group.rotation.y += delta * 0.18;
    group.rotation.x = 0.26 + Math.sin(t * 0.38) * 0.025;
    group.rotation.z = Math.sin(t * 0.24) * 0.02;

    const target = 0.08 + ((Math.sin(t * 0.95) + 1) / 2) * 0.16;
    const blend = 1 - Math.exp(-4 * delta);
    materials.forEach((material) => {
      material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, target, blend);
    });
  });

  return (
    <group ref={groupRef} rotation={[0.24, 0, 0]} position={[0, 0, 0]} scale={0.8}>
      <mesh material={materials}>
        <boxGeometry args={[2.18, 2.18, 2.18]} />
      </mesh>
    </group>
  );
}

export default function WriteLoadingHex3D({ text = ' ', inscriptionMode = 'horizontal', fontVersion = 0 }) {
  return (
    <div className="write-loading-3d-stage" aria-hidden="true">
      <Canvas className="write-loading-3d-canvas" dpr={[1, 1.75]} camera={{ position: [0, 0, 7.1], fov: 22 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.92} color="#d7e1ef" />
        <directionalLight position={[2.8, 3.2, 5.4]} intensity={1.4} color="#f3f7fd" />
        <directionalLight position={[-2.2, -1.4, 3.2]} intensity={0.58} color="#aec1db" />
        <pointLight position={[0.2, 1.5, 4]} intensity={0.18} color="#dce8f7" />
        <LoadingSlabMesh text={text} inscriptionMode={inscriptionMode} fontVersion={fontVersion} />
      </Canvas>
    </div>
  );
}
