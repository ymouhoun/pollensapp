import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import ItemContextMenu from '@/components/memory/ItemContextMenu';

// ─── Constants ────────────────────────────────────────────────────
const CHUNK_SIZE = 30;
const RENDER_RADIUS = 1; // chunks around camera to keep alive
const PLANES_PER_CHUNK = 6;

// ─── Seeded RNG ───────────────────────────────────────────────────
function seededRandom(seed) {
  const x = Math.sin(seed + 1) * 43758.5453123;
  return x - Math.floor(x);
}

function hashChunk(cx, cy) {
  return (cx * 73856093) ^ (cy * 19349663);
}

// ─── Chunk layout generator ───────────────────────────────────────
const chunkCache = new Map();
const MAX_CACHE = 128;

function generateChunkLayout(cx, cy, totalItems) {
  const key = `${cx},${cy}`;
  if (chunkCache.has(key)) {
    const v = chunkCache.get(key);
    chunkCache.delete(key);
    chunkCache.set(key, v);
    return v;
  }

  const seed = hashChunk(cx, cy);
  const planes = [];
  for (let i = 0; i < PLANES_PER_CHUNK; i++) {
    const s = seed + i * 997;
    const r = (n) => seededRandom(s + n);
    planes.push({
      id: `${cx}-${cy}-${i}`,
      lx: cx * CHUNK_SIZE + r(0) * CHUNK_SIZE,
      ly: cy * CHUNK_SIZE + r(1) * CHUNK_SIZE,
      size: 1.4 + r(2) * 2.2,
      mediaIndex: Math.abs(Math.floor(r(3) * 1_000_000)),
    });
  }

  chunkCache.set(key, planes);
  while (chunkCache.size > MAX_CACHE) {
    chunkCache.delete(chunkCache.keys().next().value);
  }
  return planes;
}

// ─── Texture loader & cache ───────────────────────────────────────
const loader = new THREE.TextureLoader();
const texCache = new Map();

function loadTexture(url, onLoaded) {
  if (texCache.has(url)) {
    onLoaded(texCache.get(url));
    return;
  }
  loader.load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    texCache.set(url, tex);
    onLoaded(tex);
  });
}

// ─── Image Plane ──────────────────────────────────────────────────
const scaleVec = new THREE.Vector3();

const EMPTY_MAT = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, toneMapped: false });

function ImagePlane({ lx, ly, size, url, onClick, onContextMenu }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [dims, setDims] = useState({ w: size, h: size });
  const [mat] = useState(() => EMPTY_MAT.clone());

  useEffect(() => {
    if (!url) return;
    loadTexture(url, (tex) => {
      mat.map = tex;
      mat.needsUpdate = true;
      const img = tex.image;
      if (img?.width && img?.height) {
        const a = img.width / img.height;
        setDims({ w: size * (a >= 1 ? 1 : a), h: size * (a >= 1 ? 1 / a : 1) });
      }
    });
  }, [url, size, mat]);

  useFrame(() => {
    if (!meshRef.current) return;
    const t = hovered ? 1.06 : 1;
    scaleVec.set(t, t, t);
    meshRef.current.scale.lerp(scaleVec, 0.1);
  });

  if (!url) return null;

  return (
    <mesh
      ref={meshRef}
      position={[lx, ly, 0]}
      material={mat}
      onClick={(e) => { e.stopPropagation(); onClick?.({ lx, ly, url }); }}
      onContextMenu={(e) => { e.stopPropagation(); onContextMenu?.(e, { lx, ly, url }); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      <planeGeometry key={`${dims.w.toFixed(3)}-${dims.h.toFixed(3)}`} args={[dims.w, dims.h]} />
    </mesh>
  );
}

// ─── Chunk ────────────────────────────────────────────────────────
function Chunk({ cx, cy, media, onClickItem, onContextMenu }) {
  const [planes, setPlanes] = useState([]);

  useEffect(() => {
    if (!media.length) return;
    const run = () => {
      const layout = generateChunkLayout(cx, cy, media.length);
      const resolved = layout.map((p) => ({
        ...p,
        url: media[p.mediaIndex % media.length]?.file_url,
        item: media[p.mediaIndex % media.length],
      }));
      setPlanes(resolved);
    };

    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(run, { timeout: 100 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(run, 0);
    return () => clearTimeout(id);
  }, [cx, cy, media]);

  return (
    <>
      {planes.map((p) => (
        <ImagePlane
          key={p.id}
          lx={p.lx}
          ly={p.ly}
          size={p.size}
          url={p.url}
          onClick={() => onClickItem?.(p.item)}
          onContextMenu={(e, _) => onContextMenu?.(e, p.item)}
        />
      ))}
    </>
  );
}

// ─── Camera controller ────────────────────────────────────────────
function CameraController({ onCameraChunkChange }) {
  const { camera, gl } = useThree();
  const dragRef = useRef({ active: false, startX: 0, startY: 0, camX: 0, camY: 0, vx: 0, vy: 0 });
  const pinchRef = useRef({ active: false, lastDist: 0 });
  const lastChunkRef = useRef({ cx: null, cy: null });

  useEffect(() => {
    camera.position.set(0, 0, 18);
    camera.near = 0.01;
    camera.far = 2000;
    camera.updateProjectionMatrix();
  }, [camera]);

  const worldDelta = useCallback((dxS, dyS) => {
    const fov = camera.fov * (Math.PI / 180);
    const h = 2 * Math.tan(fov / 2) * camera.position.z;
    const w = h * camera.aspect;
    const el = gl.domElement;
    return { dx: -(dxS / el.clientWidth) * w, dy: (dyS / el.clientHeight) * h };
  }, [camera, gl]);

  useFrame(() => {
    const d = dragRef.current;
    if (!d.active) {
      if (Math.abs(d.vx) > 0.001 || Math.abs(d.vy) > 0.001) {
        camera.position.x += d.vx;
        camera.position.y += d.vy;
        d.vx *= 0.9;
        d.vy *= 0.9;
      }
    }
    // Notify chunk change
    const cx = Math.floor(camera.position.x / CHUNK_SIZE);
    const cy = Math.floor(camera.position.y / CHUNK_SIZE);
    const last = lastChunkRef.current;
    if (cx !== last.cx || cy !== last.cy) {
      last.cx = cx; last.cy = cy;
      onCameraChunkChange(cx, cy);
    }
  });

  useEffect(() => {
    const el = gl.domElement;

    const down = (e) => {
      const d = dragRef.current;
      d.active = true; d.startX = e.clientX; d.startY = e.clientY;
      d.camX = camera.position.x; d.camY = camera.position.y;
      d.vx = 0; d.vy = 0;
    };
    const move = (e) => {
      const d = dragRef.current;
      if (!d.active) return;
      const { dx, dy } = worldDelta(e.clientX - d.startX, e.clientY - d.startY);
      const nx = d.camX + dx, ny = d.camY + dy;
      d.vx = nx - camera.position.x; d.vy = ny - camera.position.y;
      camera.position.x = nx; camera.position.y = ny;
    };
    const up = () => { dragRef.current.active = false; };
    const wheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.08 : 0.93;
      const newZ = Math.max(2, Math.min(80, camera.position.z * factor));
      const rect = el.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const fov = camera.fov * (Math.PI / 180);
      const halfH = Math.tan(fov / 2) * camera.position.z;
      const halfW = halfH * camera.aspect;
      const wx = camera.position.x + ndcX * halfW;
      const wy = camera.position.y + ndcY * halfH;
      const ratio = (newZ - camera.position.z) / camera.position.z;
      camera.position.x += (camera.position.x - wx) * ratio;
      camera.position.y += (camera.position.y - wy) * ratio;
      camera.position.z = newZ;
    };

    const tstart = (e) => {
      if (e.touches.length === 1) {
        const d = dragRef.current;
        d.active = true; d.startX = e.touches[0].clientX; d.startY = e.touches[0].clientY;
        d.camX = camera.position.x; d.camY = camera.position.y;
        d.vx = 0; d.vy = 0;
      } else if (e.touches.length === 2) {
        dragRef.current.active = false;
        const ddx = e.touches[0].clientX - e.touches[1].clientX;
        const ddy = e.touches[0].clientY - e.touches[1].clientY;
        pinchRef.current = { active: true, lastDist: Math.sqrt(ddx * ddx + ddy * ddy) };
      }
    };
    const tmove = (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && dragRef.current.active) {
        const d = dragRef.current;
        const { dx, dy } = worldDelta(e.touches[0].clientX - d.startX, e.touches[0].clientY - d.startY);
        const nx = d.camX + dx, ny = d.camY + dy;
        d.vx = nx - camera.position.x; d.vy = ny - camera.position.y;
        camera.position.x = nx; camera.position.y = ny;
      } else if (e.touches.length === 2 && pinchRef.current.active) {
        const ddx = e.touches[0].clientX - e.touches[1].clientX;
        const ddy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        camera.position.z = Math.max(2, Math.min(80, camera.position.z * (pinchRef.current.lastDist / dist)));
        pinchRef.current.lastDist = dist;
      }
    };
    const tend = () => { dragRef.current.active = false; pinchRef.current.active = false; };

    el.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('touchstart', tstart, { passive: false });
    el.addEventListener('touchmove', tmove, { passive: false });
    el.addEventListener('touchend', tend);
    return () => {
      el.removeEventListener('mousedown', down);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('touchstart', tstart);
      el.removeEventListener('touchmove', tmove);
      el.removeEventListener('touchend', tend);
    };
  }, [camera, gl, worldDelta]);

  return null;
}

// ─── Scene ────────────────────────────────────────────────────────
function Scene({ media, onClickItem, onContextMenu }) {
  const [camChunk, setCamChunk] = useState({ cx: 0, cy: 0 });

  const chunks = useMemo(() => {
    const list = [];
    for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
      for (let dy = -RENDER_RADIUS; dy <= RENDER_RADIUS; dy++) {
        const cx = camChunk.cx + dx;
        const cy = camChunk.cy + dy;
        list.push({ key: `${cx},${cy}`, cx, cy });
      }
    }
    return list;
  }, [camChunk]);

  const handleChunkChange = useCallback((cx, cy) => {
    setCamChunk(prev => (prev.cx === cx && prev.cy === cy ? prev : { cx, cy }));
  }, []);

  return (
    <>
      <CameraController onCameraChunkChange={handleChunkChange} />
      {chunks.map(({ key, cx, cy }) => (
        <Chunk
          key={key}
          cx={cx}
          cy={cy}
          media={media}
          onClickItem={onClickItem}
          onContextMenu={onContextMenu}
        />
      ))}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────
export default function Galaxy({ onSelectItem }) {
  const [contextMenu, setContextMenu] = useState(null);
  const [randomizeSeed, setRandomizeSeed] = useState(0);

  const { data: mediaItems = [] } = useQuery({
    queryKey: ['galaxy-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 500),
  });

  const media = useMemo(() =>
    mediaItems.filter(i => !i.is_forgotten && i.file_url && (i.content_type === 'image' || i.content_type === 'video')),
    [mediaItems]
  );

  useEffect(() => {
    const handler = () => {
      chunkCache.clear();
      setRandomizeSeed(s => s + 1);
    };
    window.addEventListener('randomize-memory', handler);
    return () => window.removeEventListener('randomize-memory', handler);
  }, []);

  const handleContextMenu = useCallback((e, item) => {
    if (!item) return;
    const native = e.nativeEvent || e;
    setContextMenu({ item, x: native.clientX, y: native.clientY });
  }, []);

  return (
    <div className="fixed inset-0 bg-background">
      <button
        onClick={() => window.history.back()}
        className="fixed top-6 right-6 z-30 p-2 rounded-full bg-background/60 backdrop-blur-sm hover:bg-muted/70 transition-colors border border-border/30"
      >
        <X className="w-4 h-4" strokeWidth={1.5} />
      </button>

      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-10 text-[10px] tracking-widest uppercase text-foreground/30 pointer-events-none select-none">
        drag · scroll to zoom
      </div>

      <Canvas
        key={randomizeSeed}
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [0, 0, 18], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Scene
          media={media}
          onClickItem={onSelectItem}
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