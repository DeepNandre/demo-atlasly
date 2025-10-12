import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface NorthArrowProps {
  position?: [number, number, number];
  size?: number;
}

export function NorthArrow({ position = [0, 0, 0], size = 20 }: NorthArrowProps) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;

    // Create north arrow geometry
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, size);
    arrowShape.lineTo(-size * 0.3, 0);
    arrowShape.lineTo(0, size * 0.2);
    arrowShape.lineTo(size * 0.3, 0);
    arrowShape.lineTo(0, size);

    const geometry = new THREE.ShapeGeometry(arrowShape);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, 
      side: THREE.DoubleSide 
    });

    const arrow = new THREE.Mesh(geometry, material);
    arrow.rotation.x = -Math.PI / 2; // Lay flat on ground
    
    groupRef.current.add(arrow);

    // Add "N" text indicator
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(size * 0.5, size * 0.5, 1);
    sprite.position.set(0, size * 1.3, 0);
    
    groupRef.current.add(sprite);

    return () => {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    };
  }, [size]);

  return (
    <group ref={groupRef} position={position}>
      {/* Invisible marker for positioning */}
    </group>
  );
}
