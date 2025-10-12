import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { CoordinateProjection } from '@/lib/coordinateUtils';

interface BoundaryOutlineProps {
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  projection: CoordinateProjection;
}

export function BoundaryOutline({ bounds, projection }: BoundaryOutlineProps) {
  const points = useMemo(() => {
    // Create rectangle outline from bounds
    const corners = [
      [bounds.minLng, bounds.minLat],
      [bounds.maxLng, bounds.minLat],
      [bounds.maxLng, bounds.maxLat],
      [bounds.minLng, bounds.maxLat],
      [bounds.minLng, bounds.minLat], // Close the loop
    ];

    return corners.map(([lng, lat]) => {
      const { x, y } = projection.latLngToXY(lat, lng);
      return new THREE.Vector3(x, 0.5, y);
    });
  }, [bounds, projection]);

  console.log('🔲 Boundary outline points:', points.slice(0, 2).map(p => 
    `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`
  ));

  return (
    <Line
      points={points}
      color="#ff0000"
      lineWidth={3}
      dashed={false}
    />
  );
}
