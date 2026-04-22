'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function HexArtifact() {
  const meshRef = useRef(null);
  const material = useMemo(
    () => new THREE.MeshPhysicalMaterial({
      color: '#8b97aa',
      roughness: 0.38,
      metalness: 0.22,
      clearcoat: 0.82,
      clearcoatRoughness: 0.36,
      reflectivity: 0.46,
      emissive: new THREE.Color('#d9f1ff'),
      emissiveIntensity: 0.08,
    }),
    []
  );

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const t = state.clock.elapsedTime;
    mesh.rotation.y += delta * 0.24;
    mesh.rotation.x = 0.42 + Math.sin(t * 0.42) * 0.045;
    mesh.rotation.z = Math.sin(t * 0.27) * 0.05;
    mesh.position.y = Math.sin(t * 0.5) * 0.035;
    material.emissiveIntensity = 0.08 + ((Math.sin(t * 1.15) + 1) / 2) * 0.24;
  });

  return (
    <mesh ref={meshRef} material={material}>
      <cylinderGeometry args={[1.08, 1.08, 1.24, 6, 1, false]} />
    </mesh>
  );
}

export default function WriteLoadingHex3D() {
  return (
    <div className="write-loading-3d-stage" aria-hidden="true">
      <Canvas className="write-loading-3d-canvas" dpr={[1, 1.75]} camera={{ position: [0, 0, 4.6], fov: 24 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.7} color="#d7e3f7" />
        <directionalLight position={[2.2, 3.2, 4.8]} intensity={1.5} color="#f6fbff" />
        <directionalLight position={[-2.4, -1.6, 3.5]} intensity={0.58} color="#9db7d9" />
        <pointLight position={[0, 0.3, 2.7]} intensity={0.48} color="#dff4ff" />
        <pointLight position={[0, 1.8, -1.8]} intensity={0.18} color="#89b6ff" />
        <HexArtifact />
      </Canvas>
    </div>
  );
}
