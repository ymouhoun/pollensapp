import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import ItemContextMenu from '@/components/memory/ItemContextMenu';

// ─── Constants ────────────────────────────────────────────────────
const CHUNK_SIZE = 40;
const RENDER_RADIUS = 1;        // chunks around camera (3×3 = 9 chunks)
const PLANES_PER_CHUNK = 5;
const MIN_Z = 4;
const MAX_Z = 120;

// ─── Seeded RNG ───────────────────────────────────────────────────
function seededRandom(seed) {
  const x = Math.sin(seed + 1) * 43758.5453123;
  return x - Math.floor(x);
}

function hashChunk(cx, cy) {
  return (cx * 73856093) ^ (cy * 19349663);
}

// ─── Chunk layout cache (LRU) ─────────────────────────────────────
const MAX_CACHE = 256;
const planeCache = new Map();

function generateChunkPlanes(cx, cy, totalItems) {
  const key = `${cx},${cy}`;
  if (planeCache.has(key)) {
    const v = planeCache.get(key);
    planeCache.delete(key);
    planeCache.set(key, v);
    return v;
  }

  const seed = hashChunk(cx, cy);
  const planes = [];
  for (let i = 0; i < PLANES_PER_CHUNK; i++) {
    const s = seed + i * 997;
    const r = (n) => seededRandom(s + n);
    const size = 10 + r(4) * 10;
    planes.push({
      id: `${cx}-${cy}-${i}`,
      x: cx * CHUNK_SIZE + r(0) * CHUNK_SIZE,
      y: cy * CHUNK_SIZE + r(1) * CHUNK_SIZE,
      size,
      mediaIndex: Math.abs(Math.floor(r(3) * 1_000_000)),
    });
  }

  planeCache.set(key, planes);
  while (planeCache.size > MAX_CACHE) {
    planeCache.delete(planeCache.keys().next().value);
  }
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

// ─── Main Galaxy Component ────────────────────────────────────────
export default function Galaxy({ onSelectItem }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null); // holds all Three.js state
  const [contextMenu, setContextMenu] = React.useState(null);
  const chunkMeshesRef = useRef(new Map()); // key -> [meshes]
  const activeChunksRef = useRef(new Set());

  const { data: mediaItems = [] } = useQuery({
    queryKey: ['galaxy-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 500),
  });

  const media = useMemo(() =>
    mediaItems.filter(i => !i.is_forgotten && i.file_url && (i.content_type === 'image' || i.content_type === 'video')),
    [mediaItems]
  );
  const mediaRef = useRef(media);
  useEffect(() => { mediaRef.current = media; }, [media]);

  // ── Chunk management ────────────────────────────────────────────
  const spawnChunk = useCallback((cx, cy) => {
    const key = `${cx},${cy}`;
    if (chunkMeshesRef.current.has(key)) return;

    const st = stateRef.current;
    if (!st || !mediaRef.current.length) return;

    const planes = generateChunkPlanes(cx, cy, mediaRef.current.length);
    const meshes = [];

    planes.forEach((p) => {
      const item = mediaRef.current[p.mediaIndex % mediaRef.current.length];
      if (!item?.file_url) return;

      const geo = new THREE.PlaneGeometry(p.size, p.size);
      const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x, p.y, 0);
      mesh.userData.item = item;
      st.scene.add(mesh);
      meshes.push(mesh);

      loadTexture(item.file_url, (tex) => {
        const img = tex.image;
        if (img?.width && img?.height) {
          const a = img.width / img.height;
          const w = p.size * (a >= 1 ? 1 : a);
          const h = p.size * (a >= 1 ? 1 / a : 1);
          geo.dispose();
          mesh.geometry = new THREE.PlaneGeometry(w, h);
        }
        mat.map = tex;
        mat.needsUpdate = true;
        // Fade in
        mat.opacity = 0;
        mesh.userData.fadeIn = true;
      });
    });

    chunkMeshesRef.current.set(key, meshes);
  }, []);

  const destroyChunk = useCallback((key) => {
    const st = stateRef.current;
    if (!st) return;
    const meshes = chunkMeshesRef.current.get(key);
    if (!meshes) return;
    meshes.forEach((m) => {
      st.scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    });
    chunkMeshesRef.current.delete(key);
  }, []);

  const syncChunks = useCallback((camX, camY) => {
    const cx = Math.floor(camX / CHUNK_SIZE);
    const cy = Math.floor(camY / CHUNK_SIZE);
    const needed = new Set();

    for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
      for (let dy = -RENDER_RADIUS; dy <= RENDER_RADIUS; dy++) {
        needed.add(`${cx + dx},${cy + dy}`);
      }
    }

    // Spawn new
    needed.forEach((key) => {
      if (!chunkMeshesRef.current.has(key)) {
        const [kcx, kcy] = key.split(',').map(Number);
        spawnChunk(kcx, kcy);
      }
    });

    // Destroy old
    chunkMeshesRef.current.forEach((_, key) => {
      if (!needed.has(key)) destroyChunk(key);
    });

    activeChunksRef.current = needed;
  }, [spawnChunk, destroyChunk]);

  // ── Three.js init ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 5000);
    camera.position.set(0, 0, 60);

    stateRef.current = { renderer, scene, camera };

    // ── Input state ──
    const drag = { active: false, startX: 0, startY: 0, camX: 0, camY: 0, vx: 0, vy: 0 };
    const pinch = { active: false, lastDist: 0 };
    let lastChunkCX = null, lastChunkCY = null;

    const worldDelta = (dxS, dyS) => {
      const fov = camera.fov * (Math.PI / 180);
      const h = 2 * Math.tan(fov / 2) * camera.position.z;
      const w = h * camera.aspect;
      return { dx: -(dxS / canvas.clientWidth) * w, dy: (dyS / canvas.clientHeight) * h };
    };

    // ── Event handlers ──
    const onMouseDown = (e) => {
      drag.active = true;
      drag.startX = e.clientX; drag.startY = e.clientY;
      drag.camX = camera.position.x; drag.camY = camera.position.y;
      drag.vx = 0; drag.vy = 0;
      drag.moved = false;
    };
    const onMouseMove = (e) => {
      if (!drag.active) return;
      const { dx, dy } = worldDelta(e.clientX - drag.startX, e.clientY - drag.startY);
      const nx = drag.camX + dx, ny = drag.camY + dy;
      drag.vx = nx - camera.position.x;
      drag.vy = ny - camera.position.y;
      camera.position.x = nx;
      camera.position.y = ny;
      drag.moved = true;
    };
    const onMouseUp = (e) => {
      if (!drag.moved) {
        // treat as click — raycast
        handleClick(e.clientX, e.clientY);
      }
      drag.active = false;
    };
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.08 : 0.93;
      const newZ = Math.max(MIN_Z, Math.min(MAX_Z, camera.position.z * factor));
      const rect = canvas.getBoundingClientRect();
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

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        drag.active = true; drag.moved = false;
        drag.startX = e.touches[0].clientX; drag.startY = e.touches[0].clientY;
        drag.camX = camera.position.x; drag.camY = camera.position.y;
        drag.vx = 0; drag.vy = 0;
      } else if (e.touches.length === 2) {
        drag.active = false;
        const ddx = e.touches[0].clientX - e.touches[1].clientX;
        const ddy = e.touches[0].clientY - e.touches[1].clientY;
        pinch.active = true;
        pinch.lastDist = Math.sqrt(ddx * ddx + ddy * ddy);
      }
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && drag.active) {
        const { dx, dy } = worldDelta(e.touches[0].clientX - drag.startX, e.touches[0].clientY - drag.startY);
        const nx = drag.camX + dx, ny = drag.camY + dy;
        drag.vx = nx - camera.position.x; drag.vy = ny - camera.position.y;
        camera.position.x = nx; camera.position.y = ny;
        drag.moved = true;
      } else if (e.touches.length === 2 && pinch.active) {
        const ddx = e.touches[0].clientX - e.touches[1].clientX;
        const ddy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        camera.position.z = Math.max(MIN_Z, Math.min(MAX_Z, camera.position.z * (pinch.lastDist / dist)));
        pinch.lastDist = dist;
      }
    };
    const onTouchEnd = () => { drag.active = false; pinch.active = false; };

    // ── Context menu ──
    const onContextMenu = (e) => {
      e.preventDefault();
      const hit = raycast(e.clientX, e.clientY);
      if (hit) setContextMenu({ item: hit.userData.item, x: e.clientX, y: e.clientY });
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

    const handleClick = (clientX, clientY) => {
      const hit = raycast(clientX, clientY);
      if (hit?.userData.item) onSelectItem?.(hit.userData.item);
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('contextmenu', onContextMenu);

    // ── Resize ──
    const onResize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);

    // ── Animation loop ──
    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);

      // Inertia
      if (!drag.active && (Math.abs(drag.vx) > 0.001 || Math.abs(drag.vy) > 0.001)) {
        camera.position.x += drag.vx;
        camera.position.y += drag.vy;
        drag.vx *= 0.9;
        drag.vy *= 0.9;
      }

      // Chunk sync
      const cx = Math.floor(camera.position.x / CHUNK_SIZE);
      const cy = Math.floor(camera.position.y / CHUNK_SIZE);
      if (cx !== lastChunkCX || cy !== lastChunkCY) {
        lastChunkCX = cx; lastChunkCY = cy;
        syncChunks(camera.position.x, camera.position.y);
      }

      // Fade in meshes
      scene.children.forEach((m) => {
        if (m.userData.fadeIn) {
          m.material.opacity = Math.min(1, m.material.opacity + 0.04);
          if (m.material.opacity >= 1) m.userData.fadeIn = false;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Initial chunks
    syncChunks(0, 0);

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
      // cleanup all meshes
      chunkMeshesRef.current.forEach((meshes) => {
        meshes.forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
      });
      chunkMeshesRef.current.clear();
      renderer.dispose();
      stateRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-sync chunks when media loads
  useEffect(() => {
    if (!media.length || !stateRef.current) return;
    // Destroy existing chunks so they respawn with real images
    chunkMeshesRef.current.forEach((meshes, key) => {
      const st = stateRef.current;
      meshes.forEach((m) => { st.scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
    });
    chunkMeshesRef.current.clear();
    const cam = stateRef.current.camera;
    syncChunks(cam.position.x, cam.position.y);
  }, [media, syncChunks]);

  // Randomize
  useEffect(() => {
    const handler = () => {
      planeCache.clear();
      if (!stateRef.current) return;
      chunkMeshesRef.current.forEach((meshes) => {
        const st = stateRef.current;
        meshes.forEach((m) => { st.scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
      });
      chunkMeshesRef.current.clear();
      const cam = stateRef.current.camera;
      syncChunks(cam.position.x, cam.position.y);
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