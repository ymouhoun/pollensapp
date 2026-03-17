import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import * as THREE from 'three';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import ItemContextMenu from '@/components/memory/ItemContextMenu';

// ─── Constants ────────────────────────────────────────────────────
let GLOBAL_SEED_OFFSET = 0; // incremented on each randomize

const CHUNK_SIZE = 120;         // world units per chunk
const RENDER_RADIUS = 2;        // chunks radius in X/Y
const RENDER_DEPTH = 3;         // chunks depth in Z
const PLANES_PER_CHUNK = 5;
const DEPTH_FADE_START = 180;
const DEPTH_FADE_END = 320;
const CHUNK_FADE_MARGIN = 1.5;
const RENDER_DISTANCE = RENDER_RADIUS;

// chunk offsets: 5x5 grid × 7 depth layers = 175 chunks max
const CHUNK_OFFSETS = [];
for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++)
  for (let dy = -RENDER_RADIUS; dy <= RENDER_RADIUS; dy++)
    for (let dz = -RENDER_DEPTH; dz <= RENDER_DEPTH; dz++)
      CHUNK_OFFSETS.push({ dx, dy, dz });

// ─── Seeded RNG ───────────────────────────────────────────────────
function seededRandom(seed) {
  const x = Math.sin(seed + 1) * 43758.5453123;
  return x - Math.floor(x);
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

// ─── Chunk plane generation (deterministic + LRU cached) ──────────
const MAX_PLANE_CACHE = 256;
const planeCache = new Map();

function generateChunkPlanes(cx, cy, cz) {
  const key = `${cx},${cy},${cz}`;
  if (planeCache.has(key)) {
    const v = planeCache.get(key);
    planeCache.delete(key); planeCache.set(key, v);
    return v;
  }
  const seed = hashString(key);
  const planes = [];
  for (let i = 0; i < PLANES_PER_CHUNK; i++) {
    const s = seed + i * 1000;
    const r = (n) => seededRandom(s + n);
    const size = 12 + r(4) * 10;
    planes.push({
      id: `${cx}-${cy}-${cz}-${i}`,
      position: new THREE.Vector3(
        cx * CHUNK_SIZE + r(0) * CHUNK_SIZE - CHUNK_SIZE / 2,
        cy * CHUNK_SIZE + r(1) * CHUNK_SIZE - CHUNK_SIZE / 2,
        cz * CHUNK_SIZE + r(2) * CHUNK_SIZE - CHUNK_SIZE / 2,
      ),
      size,
      mediaIndex: Math.abs(Math.floor(r(5) * 1_000_000)),
    });
  }
  planeCache.set(key, planes);
  while (planeCache.size > MAX_PLANE_CACHE) planeCache.delete(planeCache.keys().next().value);
  return planes;
}

// ─── Texture loader & LRU cache ───────────────────────────────────
const MAX_TEX_CACHE = 200;
const texLoader = new THREE.TextureLoader();
const texCache = new Map();

function loadTexture(url, cb) {
  if (texCache.has(url)) {
    cb(texCache.get(url)); return;
  }
  texLoader.load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    texCache.set(url, tex);
    while (texCache.size > MAX_TEX_CACHE) {
      const first = texCache.keys().next().value;
      texCache.get(first).dispose();
      texCache.delete(first);
    }
    cb(tex);
  });
}

// ─── Main Component ───────────────────────────────────────────────
export default function Galaxy({ onSelectItem, filteredMedia }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    // Camera base position in world space (moves with pan/zoom)
    basePos: new THREE.Vector3(0, 0, 0),
    // Current chunk the camera is in
    cx: 0, cy: 0, cz: 0,
    // Active meshes: key → { meshes[], chunkCx, chunkCy, chunkCz }
    chunks: new Map(),
    // Input state
    drag: { active: false, startX: 0, startY: 0, bx: 0, by: 0, vx: 0, vy: 0, moved: false },
    pinch: { active: false, lastDist: 0 },
    // THREE objects (set after init)
    scene: null, camera: null, renderer: null,
    rafId: null,
    media: [],
  });
  const [contextMenu, setContextMenu] = React.useState(null);

  const { data: mediaItems = [] } = useQuery({
    queryKey: ['galaxy-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 500),
  });

  const media = useMemo(() =>
    filteredMedia ?? mediaItems.filter(i => !i.is_forgotten && i.file_url &&
      (i.content_type === 'image' || i.content_type === 'video')),
    [mediaItems, filteredMedia]
  );

  // Keep media ref in sync
  useEffect(() => {
    stateRef.current.media = media;
    // Rebuild chunks with real media
    const s = stateRef.current;
    if (!s.scene || !media.length) return;
    destroyAllChunks(s);
    syncChunks(s);
  }, [media]);

  // ── Chunk management ──────────────────────────────────────────
  function destroyAllChunks(s) {
    s.chunks.forEach(({ meshes }) => {
      meshes.forEach(m => { s.scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
    });
    s.chunks.clear();
  }

  function spawnChunk(s, cx, cy, cz) {
    const key = `${cx},${cy},${cz}`;
    if (s.chunks.has(key) || !s.media.length) return;

    const planes = generateChunkPlanes(cx, cy, cz);
    const meshes = [];

    planes.forEach(p => {
      const item = s.media[p.mediaIndex % s.media.length];
      if (!item?.file_url) return;

      const geo = new THREE.PlaneGeometry(p.size, p.size);
      const mat = new THREE.MeshBasicMaterial({
        transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(p.position);
      mesh.userData = { item, chunkCx: cx, chunkCy: cy, chunkCz: cz };
      s.scene.add(mesh);
      meshes.push(mesh);

      loadTexture(item.file_url, (tex) => {
        if (!mesh.parent) return;
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
      });
    });

    s.chunks.set(key, { meshes, cx, cy, cz });
  }

  function destroyChunk(s, key) {
    const chunk = s.chunks.get(key);
    if (!chunk) return;
    chunk.meshes.forEach(m => { s.scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
    s.chunks.delete(key);
  }

  function syncChunks(s) {
    const camCx = Math.floor(s.basePos.x / CHUNK_SIZE);
    const camCy = Math.floor(s.basePos.y / CHUNK_SIZE);
    const camCz = Math.floor(s.basePos.z / CHUNK_SIZE);

    const needed = new Set();
    CHUNK_OFFSETS.forEach(({ dx, dy, dz }) => {
      const key = `${camCx + dx},${camCy + dy},${camCz + dz}`;
      needed.add(key);
      if (!s.chunks.has(key)) spawnChunk(s, camCx + dx, camCy + dy, camCz + dz);
    });

    s.chunks.forEach((_, key) => {
      if (!needed.has(key)) destroyChunk(s, key);
    });
  }

  // ── Three.js setup ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    s.renderer = renderer;

    const scene = new THREE.Scene();
    s.scene = scene;

    // Perspective camera — gives true 3D depth
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 2000);
    camera.position.set(0, 0, 200); // start pulled back on Z
    s.camera = camera;
    s.basePos.set(0, 0, 0);

    // ── Input handlers ──
    const screenToWorldDelta = (dx, dy) => {
      // Convert screen delta to world units at current depth
      const fovRad = (camera.fov * Math.PI) / 180;
      const depth = Math.abs(camera.position.z - 0); // approximate world plane depth
      const heightAtDepth = 2 * Math.tan(fovRad / 2) * depth;
      const scale = heightAtDepth / canvas.clientHeight;
      return { wx: -dx * scale, wy: dy * scale };
    };

    const drag = s.drag;
    const pinch = s.pinch;

    const onMouseDown = (e) => {
      drag.active = true; drag.moved = false;
      drag.startX = e.clientX; drag.startY = e.clientY;
      drag.bx = s.basePos.x; drag.by = s.basePos.y;
      drag.vx = 0; drag.vy = 0;
      canvas.style.cursor = 'grabbing';
    };

    const onMouseMove = (e) => {
      if (!drag.active) return;
      const { wx, wy } = screenToWorldDelta(e.clientX - drag.startX, e.clientY - drag.startY);
      const nx = drag.bx + wx, ny = drag.by + wy;
      drag.vx = nx - s.basePos.x; drag.vy = ny - s.basePos.y;
      s.basePos.x = nx; s.basePos.y = ny;
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
      // Scroll moves camera forward/backward in Z (true depth)
      const speed = 0.5;
      s.basePos.z += e.deltaY * speed * 0.1;
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        drag.active = true; drag.moved = false;
        drag.startX = e.touches[0].clientX; drag.startY = e.touches[0].clientY;
        drag.bx = s.basePos.x; drag.by = s.basePos.y;
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
        const { wx, wy } = screenToWorldDelta(
          e.touches[0].clientX - drag.startX,
          e.touches[0].clientY - drag.startY
        );
        const nx = drag.bx + wx, ny = drag.by + wy;
        drag.vx = nx - s.basePos.x; drag.vy = ny - s.basePos.y;
        s.basePos.x = nx; s.basePos.y = ny;
        drag.moved = true;
      } else if (e.touches.length === 2 && pinch.active) {
        const ddx = e.touches[0].clientX - e.touches[1].clientX;
        const ddy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        const delta = pinch.lastDist - dist;
        s.basePos.z += delta * 0.3;
        pinch.lastDist = dist;
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

    const ro = new ResizeObserver(() => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(canvas);

    // ── Render loop ──
    let lastCx = null, lastCy = null, lastCz = null;

    const animate = () => {
      s.rafId = requestAnimationFrame(animate);

      // Inertia (pan only)
      if (!drag.active) {
        if (Math.abs(drag.vx) > 0.001 || Math.abs(drag.vy) > 0.001) {
          s.basePos.x += drag.vx;
          s.basePos.y += drag.vy;
          drag.vx *= 0.88;
          drag.vy *= 0.88;
        }
      }

      // Move camera to track basePos
      camera.position.set(s.basePos.x, s.basePos.y, s.basePos.z + 200);
      camera.lookAt(s.basePos.x, s.basePos.y, s.basePos.z);

      // Sync chunks when camera crosses chunk boundary
      const ccx = Math.floor(s.basePos.x / CHUNK_SIZE);
      const ccy = Math.floor(s.basePos.y / CHUNK_SIZE);
      const ccz = Math.floor(s.basePos.z / CHUNK_SIZE);
      if (ccx !== lastCx || ccy !== lastCy || ccz !== lastCz) {
        lastCx = ccx; lastCy = ccy; lastCz = ccz;
        syncChunks(s);
      }

      // Fade per mesh
      const camZ = s.basePos.z;
      const camCx = ccx, camCy = ccy, camCz = ccz;

      scene.children.forEach(m => {
        if (!m.userData.item) return;

        // Distance-based fade (chunk grid distance)
        const dist = Math.max(
          Math.abs(m.userData.chunkCx - camCx),
          Math.abs(m.userData.chunkCy - camCy),
          Math.abs(m.userData.chunkCz - camCz),
        );
        const gridFade = dist <= RENDER_DISTANCE
          ? 1
          : Math.max(0, 1 - (dist - RENDER_DISTANCE) / Math.max(CHUNK_FADE_MARGIN, 0.001));

        // Depth fade (too far behind or ahead)
        const absDepth = Math.abs(m.position.z - camZ);
        const depthFade = absDepth <= DEPTH_FADE_START
          ? 1
          : Math.max(0, 1 - (absDepth - DEPTH_FADE_START) / Math.max(DEPTH_FADE_END - DEPTH_FADE_START, 0.001));

        // Target opacity: 0 until texture loaded, then spatial fades apply
        const hasTexture = !!m.material.map;
        const targetOpacity = hasTexture ? gridFade * depthFade : 0;

        // Smooth lerp — same rate for fade-in and fade-out, no flag needed
        m.material.opacity += (targetOpacity - m.material.opacity) * 0.06;
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(s.rafId);
      ro.disconnect();
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('contextmenu', onContextMenu);
      destroyAllChunks(s);
      renderer.dispose();
      s.scene = null; s.camera = null; s.renderer = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Randomize event
  useEffect(() => {
    const handler = () => {
      const s = stateRef.current;
      planeCache.clear();
      if (!s.scene) return;
      destroyAllChunks(s);
      syncChunks(s);
    };
    window.addEventListener('randomize-memory', handler);
    return () => window.removeEventListener('randomize-memory', handler);
  }, []);

  return (
    <div className="fixed inset-0 bg-background">
      <button
        onClick={() => window.history.back()}
        className="fixed top-6 right-6 z-30 p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors border border-white/15"
      >
        <X className="w-4 h-4 text-white/70" strokeWidth={1.5} />
      </button>

      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-10 text-[10px] tracking-widest uppercase text-white/20 pointer-events-none select-none">
        drag · scroll to explore depth
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