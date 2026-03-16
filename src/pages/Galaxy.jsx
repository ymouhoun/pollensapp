import React, { useRef, useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { HUE_RANGES } from '@/components/galaxy/HueFilter';
import ItemContextMenu from '@/components/memory/ItemContextMenu';

// ─── Item placement ───────────────────────────────────────────────
function hashId(id = '', idx) {
  let h = idx * 2654435761;
  for (let i = 0; i < id.length; i++) h = (h ^ id.charCodeAt(i)) * 2246822519;
  return (h >>> 0) / 4294967296;
}

function buildLayout(items) {
  return items.map((item, idx) => {
    const r1 = hashId(item.id, idx * 2);
    const r2 = hashId(item.id, idx * 2 + 1);
    const r3 = hashId(item.id, idx * 3 + 7);
    const angle = r1 * Math.PI * 2;
    const radius = 3 + r2 * 25;
    const x = Math.cos(angle) * radius + (r3 - 0.5) * 4;
    const y = Math.sin(angle) * radius + (hashId(item.id, idx + 99) - 0.5) * 4;
    const size = 1.2 + r3 * 1.2;
    return { ...item, x, y, size };
  });
}

// ─── Single image plane ───────────────────────────────────────────
const scaleVec = new THREE.Vector3();

function ImagePlane({ item, onClick, onContextMenu }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const texture = useTexture(item.file_url);

  // Fix texture encoding
  useEffect(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    }
  }, [texture]);

  const { w, h } = useMemo(() => {
    const img = texture?.image;
    const aspect = img?.width && img?.height ? img.width / img.height : 1;
    return {
      w: item.size * (aspect >= 1 ? 1 : aspect),
      h: item.size * (aspect >= 1 ? 1 / aspect : 1),
    };
  }, [texture, item.size]);

  useFrame(() => {
    if (!meshRef.current) return;
    const target = hovered ? 1.06 : 1;
    scaleVec.set(target, target, target);
    meshRef.current.scale.lerp(scaleVec, 0.12);
  });

  return (
    <mesh
      ref={meshRef}
      position={[item.x, item.y, 0]}
      onClick={(e) => { e.stopPropagation(); onClick(item); }}
      onContextMenu={(e) => { e.stopPropagation(); onContextMenu(e, item); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture ?? null} transparent toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Camera controller ────────────────────────────────────────────
function CameraController({ targetRef }) {
  const { camera, gl } = useThree();
  const dragRef = useRef({ active: false, startX: 0, startY: 0, camX: 0, camY: 0, vx: 0, vy: 0 });
  const pinchRef = useRef({ active: false, lastDist: 0 });

  useEffect(() => {
    camera.position.set(0, 0, 15);
    camera.near = 0.01;
    camera.far = 1000;
    camera.updateProjectionMatrix();
  }, [camera]);

  const getWorldDelta = useCallback((dxScreen, dyScreen) => {
    const fov = camera.fov * (Math.PI / 180);
    const height = 2 * Math.tan(fov / 2) * camera.position.z;
    const width = height * camera.aspect;
    const canvas = gl.domElement;
    return {
      dx: -(dxScreen / canvas.clientWidth) * width,
      dy: (dyScreen / canvas.clientHeight) * height,
    };
  }, [camera, gl]);

  useFrame(() => {
    const d = dragRef.current;
    if (!d.active) {
      if (Math.abs(d.vx) > 0.001 || Math.abs(d.vy) > 0.001) {
        camera.position.x += d.vx;
        camera.position.y += d.vy;
        d.vx *= 0.92;
        d.vy *= 0.92;
      }
    }
  });

  useEffect(() => {
    const canvas = gl.domElement;

    const onMouseDown = (e) => {
      const d = dragRef.current;
      d.active = true;
      d.startX = e.clientX;
      d.startY = e.clientY;
      d.camX = camera.position.x;
      d.camY = camera.position.y;
      d.vx = 0; d.vy = 0;
    };

    const onMouseMove = (e) => {
      const d = dragRef.current;
      if (!d.active) return;
      const { dx, dy } = getWorldDelta(e.clientX - d.startX, e.clientY - d.startY);
      const newX = d.camX + dx;
      const newY = d.camY + dy;
      d.vx = newX - camera.position.x;
      d.vy = newY - camera.position.y;
      camera.position.x = newX;
      camera.position.y = newY;
    };

    const onMouseUp = () => { dragRef.current.active = false; };

    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.08 : 0.93;
      const newZ = Math.max(1, Math.min(50, camera.position.z * factor));

      // Zoom toward mouse cursor in world space
      const rect = canvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const fov = camera.fov * (Math.PI / 180);
      const halfH = Math.tan(fov / 2) * camera.position.z;
      const halfW = halfH * camera.aspect;
      const worldX = camera.position.x + ndcX * halfW;
      const worldY = camera.position.y + ndcY * halfH;
      const ratio = (newZ - camera.position.z) / camera.position.z;
      camera.position.x += (camera.position.x - worldX) * ratio;
      camera.position.y += (camera.position.y - worldY) * ratio;
      camera.position.z = newZ;
    };

    // Touch
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        const d = dragRef.current;
        d.active = true;
        d.startX = e.touches[0].clientX;
        d.startY = e.touches[0].clientY;
        d.camX = camera.position.x;
        d.camY = camera.position.y;
        d.vx = 0; d.vy = 0;
      } else if (e.touches.length === 2) {
        dragRef.current.active = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchRef.current = { active: true, lastDist: Math.sqrt(dx * dx + dy * dy) };
      }
    };

    const onTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && dragRef.current.active) {
        const d = dragRef.current;
        const { dx, dy } = getWorldDelta(
          e.touches[0].clientX - d.startX,
          e.touches[0].clientY - d.startY
        );
        const newX = d.camX + dx;
        const newY = d.camY + dy;
        d.vx = newX - camera.position.x;
        d.vy = newY - camera.position.y;
        camera.position.x = newX;
        camera.position.y = newY;
      } else if (e.touches.length === 2 && pinchRef.current.active) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const factor = pinchRef.current.lastDist / dist;
        camera.position.z = Math.max(1, Math.min(50, camera.position.z * factor));
        pinchRef.current.lastDist = dist;
      }
    };

    const onTouchEnd = () => {
      dragRef.current.active = false;
      pinchRef.current.active = false;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [camera, gl, getWorldDelta]);

  return null;
}

// ─── Scene ────────────────────────────────────────────────────────
function Scene({ items, onSelectItem, onContextMenu }) {
  return (
    <>
      <CameraController />
      <ambientLight intensity={1} />
      <Suspense fallback={null}>
        {items.map((item) => (
          <ImagePlane
            key={item.id}
            item={item}
            onClick={onSelectItem}
            onContextMenu={onContextMenu}
          />
        ))}
      </Suspense>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────
export default function Galaxy({ onSelectItem }) {
  const [contextMenu, setContextMenu] = useState(null);
  const [randomizeCount, setRandomizeCount] = useState(0);
  const [selectedHueRanges] = useState(['All']);

  const { data: mediaItems = [] } = useQuery({
    queryKey: ['galaxy-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 500),
  });

  const items = useMemo(() => {
    let filtered = mediaItems.filter(
      i => !i.is_forgotten && (i.content_type === 'image' || i.content_type === 'video')
    );
    if (!selectedHueRanges.includes('All')) {
      filtered = filtered.filter(item => {
        const tint = item.tint ?? 0;
        return selectedHueRanges.some(rangeName => {
          const range = HUE_RANGES.find(r => r.name === rangeName);
          if (!range) return false;
          if (range.name === 'Red') return tint >= range.min || tint <= 30;
          return tint >= range.min && tint < range.max;
        });
      });
    }
    return buildLayout(filtered);
  }, [mediaItems, selectedHueRanges, randomizeCount]);

  useEffect(() => {
    const handler = () => setRandomizeCount(c => c + 1);
    window.addEventListener('randomize-memory', handler);
    return () => window.removeEventListener('randomize-memory', handler);
  }, []);

  const handleContextMenu = useCallback((e, item) => {
    // e here is a Three.js event, get native event
    const native = e.nativeEvent || e;
    setContextMenu({ item, x: native.clientX, y: native.clientY });
  }, []);

  return (
    <div className="fixed inset-0 bg-background">
      {/* Close */}
      <button
        onClick={() => window.history.back()}
        className="fixed top-6 right-6 z-30 p-2 rounded-full bg-background/60 backdrop-blur-sm hover:bg-muted/70 transition-colors border border-border/30"
        style={{ pointerEvents: 'auto' }}
      >
        <X className="w-4 h-4" strokeWidth={1.5} />
      </button>

      {/* Hint */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-10 text-[10px] tracking-widest uppercase text-foreground/30 pointer-events-none">
        drag · scroll to zoom
      </div>

      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [0, 0, 15], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Scene
          items={items}
          onSelectItem={onSelectItem}
          onContextMenu={handleContextMenu}
        />
      </Canvas>

      {contextMenu && (
        <ItemContextMenu
          item={contextMenu.item}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}