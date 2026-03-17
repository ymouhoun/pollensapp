import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import * as THREE from 'three';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import ItemContextMenu from '@/components/memory/ItemContextMenu';

// ─── Constants ────────────────────────────────────────────────────
const BASE_CHUNK_SIZE = 400;     // world units per chunk at zoom level 0
const RENDER_RADIUS = 3;         // chunks in each direction
const PLANES_PER_CHUNK = 8;
const MIN_ZOOM = 0.005;
const MAX_ZOOM = 80;             // allow deep zoom

// Zoom level: each integer step doubles detail density
// zoom < 0.25  → level 0 (coarse)
// zoom < 1     → level 1
// zoom < 4     → level 2
// zoom < 16    → level 3
// zoom >= 16   → level 4
function getZoomLevel(zoom) {
  if (zoom < 0.25) return 0;
  if (zoom < 1)    return 1;
  if (zoom < 4)    return 2;
  if (zoom < 16)   return 3;
  return 4;
}

// At deeper zoom levels, chunk size shrinks so more chunks fill the same world area
function getChunkSize(zoomLevel) {
  return BASE_CHUNK_SIZE / Math.pow(2, zoomLevel);
}

// Image size also scales down so things look naturally denser when zoomed in
function getPlaneSize(zoomLevel) {
  return (60 + Math.random() * 80) / Math.pow(1.6, zoomLevel);
}

// ─── Seeded RNG ───────────────────────────────────────────────────
function seededRandom(seed) {
  const x = Math.sin(seed + 1) * 43758.5453123;
  return x - Math.floor(x);
}

function hashChunk(cx, cy) {
  return Math.abs((cx * 73856093) ^ (cy * 19349663));
}

// ─── Chunk layout cache (LRU) ─────────────────────────────────────
const MAX_CACHE = 512;
const planeCache = new Map();

function generateChunkPlanes(cx, cy, zoomLevel) {
  const key = `${zoomLevel}:${cx},${cy}`;
  if (planeCache.has(key)) {
    const v = planeCache.get(key);
    planeCache.delete(key); planeCache.set(key, v);
    return v;
  }
  const chunkSize = getChunkSize(zoomLevel);
  // Mix zoom level into seed so each zoom level has unique placement
  const seed = hashChunk(cx + zoomLevel * 999983, cy + zoomLevel * 999979);
  const baseSize = 30 + 60 / Math.pow(1.6, zoomLevel);
  const planes = [];
  for (let i = 0; i < PLANES_PER_CHUNK; i++) {
    const s = seed + i * 997;
    const r = (n) => seededRandom(s + n);
    const size = baseSize * (0.6 + r(4) * 0.8);
    planes.push({
      id: `${zoomLevel}-${cx}-${cy}-${i}`,
      x: cx * chunkSize + r(0) * chunkSize,
      y: cy * chunkSize + r(1) * chunkSize,
      size,
      mediaIndex: Math.abs(Math.floor(r(3) * 1_000_000)),
    });
  }
  planeCache.set(key, planes);
  while (planeCache.size > MAX_CACHE) planeCache.delete(planeCache.keys().next().value);
  return planes;
}

// ─── Texture loader & cache ───────────────────────────────────────
const loader = new THREE.TextureLoader();
const texCache = new Map();

function loadTexture(url, cb) {
  if (texCache.has(url)) { cb(texCache.get(url)); return; }
  loader.load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    texCache.set(url, tex);
    cb(tex);
  });
}

// ─── Galaxy Component ─────────────────────────────────────────────
export default function Galaxy({ onSelectItem }) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const chunkMeshesRef = useRef(new Map());
  const [contextMenu, setContextMenu] = React.useState(null);

  // Viewport state — pan (world coords) + zoom (scalar)
  const vpRef = useRef({ x: 0, y: 0, zoom: 1 });
  const mediaRef = useRef([]);

  const { data: mediaItems = [] } = useQuery({
    queryKey: ['galaxy-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 500),
  });

  const media = useMemo(() =>
    mediaItems.filter(i => !i.is_forgotten && i.file_url &&
      (i.content_type === 'image' || i.content_type === 'video')),
    [mediaItems]
  );

  useEffect(() => { mediaRef.current = media; }, [media]);

  // ── Chunk management ───────────────────────────────────────────
  const spawnChunk = useCallback((cx, cy, zoomLevel) => {
    const key = `${zoomLevel}:${cx},${cy}`;
    if (chunkMeshesRef.current.has(key)) return;
    const scene = sceneRef.current;
    if (!scene || !mediaRef.current.length) return;

    const planes = generateChunkPlanes(cx, cy, zoomLevel);
    const meshes = [];

    planes.forEach((p) => {
      const item = mediaRef.current[p.mediaIndex % mediaRef.current.length];
      if (!item?.file_url) return;

      const geo = new THREE.PlaneGeometry(p.size, p.size);
      const mat = new THREE.MeshBasicMaterial({
        transparent: true, opacity: 0,
        side: THREE.DoubleSide, toneMapped: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x, p.y, 0);
      mesh.userData.item = item;
      mesh.userData.baseSize = p.size;
      scene.add(mesh);
      meshes.push(mesh);

      loadTexture(item.file_url, (tex) => {
        if (!mesh.parent) return; // destroyed before load
        const img = tex.image;
        if (img?.width && img?.height) {
          const a = img.width / img.height;
          const w = a >= 1 ? p.size : p.size * a;
          const h = a >= 1 ? p.size / a : p.size;
          mesh.geometry.dispose();
          mesh.geometry = new THREE.PlaneGeometry(w, h);
        }
        mat.map = tex;
        mat.needsUpdate = true;
        mesh.userData.fadeIn = true;
      });
    });

    chunkMeshesRef.current.set(key, meshes);
  }, []);

  const destroyChunk = useCallback((key) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const meshes = chunkMeshesRef.current.get(key);
    if (!meshes) return;
    meshes.forEach((m) => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
    chunkMeshesRef.current.delete(key);
  }, []);

  const syncChunks = useCallback((worldX, worldY, zoom) => {
    const zoomLevel = getZoomLevel(zoom);
    const chunkSize = getChunkSize(zoomLevel);
    const cx = Math.floor(worldX / chunkSize);
    const cy = Math.floor(worldY / chunkSize);
    const needed = new Set();
    for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++)
      for (let dy = -RENDER_RADIUS; dy <= RENDER_RADIUS; dy++)
        needed.add(`${zoomLevel}:${cx + dx},${cy + dy}`);

    needed.forEach((key) => {
      if (!chunkMeshesRef.current.has(key)) {
        const [zl, coords] = key.split(':');
        const [kcx, kcy] = coords.split(',').map(Number);
        spawnChunk(kcx, kcy, parseInt(zl));
      }
    });
    chunkMeshesRef.current.forEach((_, key) => {
      if (!needed.has(key)) destroyChunk(key);
    });
  }, [spawnChunk, destroyChunk]);

  // ── Three.js setup ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = canvas.clientWidth, H = canvas.clientHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Orthographic camera — perfect for 2D infinite canvas
    // We'll manually update it each frame based on vpRef
    const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 0.1, 1000);
    camera.position.z = 10;
    cameraRef.current = camera;

    const updateCamera = () => {
      const { x, y, zoom } = vpRef.current;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const hw = w / 2 / zoom, hh = h / 2 / zoom;
      camera.left   = x - hw;
      camera.right  = x + hw;
      camera.top    = y + hh;
      camera.bottom = y - hh;
      camera.updateProjectionMatrix();
    };
    updateCamera();

    // ── Pointer / input state ──
    const drag = { active: false, startX: 0, startY: 0, camX: 0, camY: 0, vx: 0, vy: 0, moved: false };
    const pinch = { active: false, lastDist: 0, midX: 0, midY: 0 };
    const last = { cx: null, cy: null, zoomChunk: null };

    // Screen px → world coords
    const screenToWorld = (sx, sy) => {
      const { x, y, zoom } = vpRef.current;
      const rect = canvas.getBoundingClientRect();
      const ndcX = (sx - rect.left - rect.width / 2) / zoom;
      const ndcY = -(sy - rect.top - rect.height / 2) / zoom;
      return { wx: x + ndcX, wy: y + ndcY };
    };

    const zoomAround = (pivotSX, pivotSY, factor) => {
      const { wx: pwx, wy: pwy } = screenToWorld(pivotSX, pivotSY);
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, vpRef.current.zoom * factor));
      // Adjust pan so pivot stays fixed
      const ratio = newZoom / vpRef.current.zoom;
      vpRef.current.x = pwx + (vpRef.current.x - pwx) / ratio;
      vpRef.current.y = pwy + (vpRef.current.y - pwy) / ratio;
      vpRef.current.zoom = newZoom;
    };

    const onMouseDown = (e) => {
      drag.active = true; drag.moved = false;
      drag.startX = e.clientX; drag.startY = e.clientY;
      drag.camX = vpRef.current.x; drag.camY = vpRef.current.y;
      drag.vx = 0; drag.vy = 0;
      canvas.style.cursor = 'grabbing';
    };

    const onMouseMove = (e) => {
      if (!drag.active) return;
      const { zoom } = vpRef.current;
      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;
      const nx = drag.camX - dx, ny = drag.camY + dy;
      drag.vx = nx - vpRef.current.x;
      drag.vy = ny - vpRef.current.y;
      vpRef.current.x = nx;
      vpRef.current.y = ny;
      drag.moved = true;
    };

    const onMouseUp = (e) => {
      canvas.style.cursor = 'grab';
      if (!drag.moved) {
        const hit = raycast(e.clientX, e.clientY);
        if (hit?.userData.item) onSelectItem?.(hit.userData.item);
      }
      drag.active = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      zoomAround(e.clientX, e.clientY, factor);
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        drag.active = true; drag.moved = false;
        drag.startX = e.touches[0].clientX; drag.startY = e.touches[0].clientY;
        drag.camX = vpRef.current.x; drag.camY = vpRef.current.y;
        drag.vx = 0; drag.vy = 0;
      } else if (e.touches.length === 2) {
        drag.active = false;
        const ddx = e.touches[0].clientX - e.touches[1].clientX;
        const ddy = e.touches[0].clientY - e.touches[1].clientY;
        pinch.active = true;
        pinch.lastDist = Math.sqrt(ddx * ddx + ddy * ddy);
        pinch.midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        pinch.midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    };

    const onTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && drag.active) {
        const { zoom } = vpRef.current;
        const dx = (e.touches[0].clientX - drag.startX) / zoom;
        const dy = (e.touches[0].clientY - drag.startY) / zoom;
        const nx = drag.camX - dx, ny = drag.camY + dy;
        drag.vx = nx - vpRef.current.x; drag.vy = ny - vpRef.current.y;
        vpRef.current.x = nx; vpRef.current.y = ny;
        drag.moved = true;
      } else if (e.touches.length === 2 && pinch.active) {
        const ddx = e.touches[0].clientX - e.touches[1].clientX;
        const ddy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        zoomAround(midX, midY, dist / pinch.lastDist);
        pinch.lastDist = dist; pinch.midX = midX; pinch.midY = midY;
      }
    };

    const onTouchEnd = () => { drag.active = false; pinch.active = false; };

    const onContextMenu = (e) => {
      e.preventDefault();
      const hit = raycast(e.clientX, e.clientY);
      if (hit?.userData.item) setContextMenu({ item: hit.userData.item, x: e.clientX, y: e.clientY });
    };

    const raycast = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      const rc = new THREE.Raycaster();
      rc.setFromCamera(ndc, camera);
      const hits = rc.intersectObjects(scene.children, false);
      return hits.find(h => h.object.userData.item)?.object ?? null;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('contextmenu', onContextMenu);

    const onResize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);

    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);

      // Inertia
      if (!drag.active && (Math.abs(drag.vx) > 0.01 || Math.abs(drag.vy) > 0.01)) {
        vpRef.current.x += drag.vx;
        vpRef.current.y += drag.vy;
        drag.vx *= 0.88;
        drag.vy *= 0.88;
      }

      // Chunk sync on pan or zoom change
      const { x: vx, y: vy, zoom: vz } = vpRef.current;
      const zl = getZoomLevel(vz);
      const cs = getChunkSize(zl);
      const cx = Math.floor(vx / cs);
      const cy = Math.floor(vy / cs);
      if (cx !== last.cx || cy !== last.cy || zl !== last.zoomChunk) {
        last.cx = cx; last.cy = cy; last.zoomChunk = zl;
        syncChunks(vx, vy, vz);
      }

      // Fade in
      scene.children.forEach((m) => {
        if (m.userData.fadeIn) {
          m.material.opacity = Math.min(1, m.material.opacity + 0.05);
          if (m.material.opacity >= 1) m.userData.fadeIn = false;
        }
      });

      updateCamera();
      renderer.render(scene, camera);
    };
    animate();

    syncChunks(0, 0, 1);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('contextmenu', onContextMenu);
      chunkMeshesRef.current.forEach((meshes) => {
        meshes.forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
      });
      chunkMeshesRef.current.clear();
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-sync when media loads
  useEffect(() => {
    if (!media.length || !sceneRef.current) return;
    chunkMeshesRef.current.forEach((meshes) => {
      const scene = sceneRef.current;
      meshes.forEach((m) => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
    });
    chunkMeshesRef.current.clear();
    syncChunks(vpRef.current.x, vpRef.current.y);
  }, [media, syncChunks]);

  // Randomize event
  useEffect(() => {
    const handler = () => {
      planeCache.clear();
      if (!sceneRef.current) return;
      chunkMeshesRef.current.forEach((meshes) => {
        const scene = sceneRef.current;
        meshes.forEach((m) => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
      });
      chunkMeshesRef.current.clear();
      syncChunks(vpRef.current.x, vpRef.current.y);
    };
    window.addEventListener('randomize-memory', handler);
    return () => window.removeEventListener('randomize-memory', handler);
  }, [syncChunks]);

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

      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
      />

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