'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

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

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelSegments: 10,
      steps: 1,
      bevelSize: 0.045,
      bevelThickness: 0.05,
      curveSegments: 28,
    });
  }, []);

  return <primitive object={geometry} />;
}

function SlabMesh() {
  const slabRef = useRef(null);
  const frontRef = useRef(null);
  const shadowRef = useRef(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (slabRef.current) {
      slabRef.current.rotation.x = -0.58 + Math.sin(t * 0.55) * 0.035;
      slabRef.current.rotation.y = 0.72 + Math.cos(t * 0.45) * 0.05;
      slabRef.current.rotation.z = -0.14 + Math.sin(t * 0.35) * 0.018;
      slabRef.current.position.y = 0.08 + Math.sin(t * 0.5) * 0.03;
    }
    if (frontRef.current) {
      frontRef.current.position.z = 0.255;
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
            color="#6980a0"
            metalness={0.16}
            roughness={0.5}
            transmission={0.14}
            thickness={1.1}
            ior={1.2}
            clearcoat={0.24}
            clearcoatRoughness={0.7}
            reflectivity={0.3}
          />
        </mesh>
        <mesh ref={frontRef} castShadow receiveShadow>
          <planeGeometry args={[2.08, 2.08]} />
          <meshStandardMaterial color="#506276" roughness={0.93} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0, -0.22]} receiveShadow>
          <planeGeometry args={[2.24, 2.24]} />
          <meshStandardMaterial color="#273342" roughness={1} metalness={0.02} />
        </mesh>
      </group>
    </group>
  );
}

export default function DetailSlab3D() {
  return (
    <Canvas
      className="detail-canvas"
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.28, 4.0], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      shadows
    >
      <ambientLight intensity={1.08} color="#f4efe5" />
      <directionalLight
        position={[3.2, 3.8, 3.8]}
        intensity={2.7}
        color="#fff7e9"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3.2, -1.8, 1.6]} intensity={0.62} color="#9ab0d4" />
      <pointLight position={[0.4, 1.8, 2.6]} intensity={0.42} color="#dbe7ff" />
      <SlabMesh />
    </Canvas>
  );
}
