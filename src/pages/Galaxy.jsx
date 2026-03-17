import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import ItemContextMenu from '@/components/memory/ItemContextMenu';

// ─── Constants ────────────────────────────────────────────────────
let GLOBAL_SEED_OFFSET = 0;

const CHUNK_SIZE = 120;
const RENDER_RADIUS = 2;
const RENDER_DEPTH = 3;
const PLANES_PER_CHUNK = 5;
const DEPTH_FADE_START = 180;
const DEPTH_FADE_END = 320;
const CHUNK_FADE_MARGIN = 1.5;
const RENDER_DISTANCE = RENDER_RADIUS;
const OPACITY_THRESHOLD = 0.005; // skip lerp when close enough

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

// ─── Chunk plane generation ───────────────────────────────────────
const MAX_PLANE_CACHE = 256;
const planeCache = new Map();

function generateChunkPlanes(cx, cy, cz) {
  const key = `${cx},${cy},${cz},${GLOBAL_SEED_OFFSET}`;
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
    const minSize = 8 + seededRandom(GLOBAL_SEED_OFFSET + i) * 8;
    const maxSize = 14 + seededRandom(GLOBAL_SEED_OFFSET + i + 500) * 28;
    const size = minSize + r(4) * (maxSize - minSize);
    const scatter = 0.55 + seededRandom(GLOBAL_SEED_OFFSET + i + 200) * 0.45;
    planes.push({
      id: `${cx}-${cy}-${cz}-${i}`,
      position: new THREE.Vector3(
        cx * CHUNK_SIZE + (r(0) - 0.5) * CHUNK_SIZE * scatter * 2,
        cy * CHUNK_SIZE + (r(1) - 0.5) * CHUNK_SIZE * scatter * 2,
        cz * CHUNK_SIZE + (r(2) - 0.5) * CHUNK_SIZE * scatter * 2,
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
const MAX_TEX_CACHE = 150;
const texLoader = new THREE.TextureLoader();
const texCache = new Map();

function loadTexture(url, cb) {
  if (texCache.has(url)) {
    cb(texCache.get(url)); return;
  }
  texLoader.load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    // Reduce memory: use smaller mipmaps
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    texCache.set(url, tex);
    while (texCache.size > MAX_TEX_CACHE) {
      const first = texCache.keys().next().value;
      texCache.get(first).dispose();
      texCache.delete(first);
    }
    cb(tex);
  });
}

// Reusable raycaster (avoid allocating on every click)
const sharedRaycaster = new THREE.Raycaster();
const sharedNDC = new THREE.Vector2();

// ─── Main Component ───────────────────────────────────────────────
export default function Galaxy({ onSelectItem, filteredMedia }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    basePos: new THREE.Vector3(0, 0, 0),
    chunks: new Map(),
    activeMeshes: [],
    drag: { active: false, startX: 0, startY: 0, bx: 0, by: 0, vx: 0, vy: 0, moved: false },
    pinch: { active: false, lastDist: 0 },
    scene: null, camera: null, renderer: null,
    rafId: null,
    media: [],
  });
  const [contextMenu, setContextMenu] = useState(null);

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
    s.activeMeshes = [];
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
        transparent: true, opacity: 0,
        side: THREE.FrontSide, // FrontSide only — halves fragment work
        toneMapped: false,
        depthWrite: false, // transparent planes don't need depth writes
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(p.position);
      mesh.userData = { item, chunkCx: cx, chunkCy: cy, chunkCz: cz, targetOpacity: 0 };
      s.scene.add(mesh);
      meshes.push(mesh);
      s.activeMeshes.push(mesh);

      if (item.content_type === 'video') {
        const vid = document.createElement('video');
        vid.src = item.file_url;
        vid.muted = true;
        vid.loop = true;
        vid.playsInline = true;
        vid.autoplay = true;
        vid.play().catch(() => {});
        const tex = new THREE.VideoTexture(vid);
        tex.colorSpace = THREE.SRGBColorSpace;
        mesh.userData.videoEl = vid;
        // Set geometry once video metadata is loaded
        vid.addEventListener('loadedmetadata', () => {
          if (!mesh.parent) return;
          const a = vid.videoWidth / vid.videoHeight;
          const w = a >= 1 ? p.size : p.size * a;
          const h = a >= 1 ? p.size / a : p.size;
          mesh.geometry.dispose();
          mesh.geometry = new THREE.PlaneGeometry(w, h);
        }, { once: true });
        mat.map = tex;
        mat.needsUpdate = true;
      } else {
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
      }
    });

    s.chunks.set(key, { meshes, cx, cy, cz });
  }

  function destroyChunk(s, key) {
    const chunk = s.chunks.get(key);
    if (!chunk) return;
    chunk.meshes.forEach(m => {
      s.scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
      // Remove from activeMeshes
      const idx = s.activeMeshes.indexOf(m);
      if (idx !== -1) s.activeMeshes.splice(idx, 1);
    });
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

    // antialias: false — big perf gain on high-DPI displays
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // cap at 1.5x
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    s.renderer = renderer;

    const scene = new THREE.Scene();
    s.scene = scene;

    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 2000);
    camera.position.set(0, 0, 200);
    s.camera = camera;
    s.basePos.set(0, 0, 0);

    const screenToWorldDelta = (dx, dy) => {
      const fovRad = (camera.fov * Math.PI) / 180;
      const depth = Math.abs(camera.position.z - 0);
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
      if (!drag.moved && e.target === canvas) {
        const hit = raycast(e.clientX, e.clientY);
        if (hit?.userData.item) onSelectItem?.(hit.userData.item);
      }
      drag.active = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      s.basePos.z += e.deltaY * 0.05;
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
        s.basePos.z += (pinch.lastDist - dist) * 0.3;
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
      sharedNDC.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      sharedRaycaster.setFromCamera(sharedNDC, camera);
      const hits = sharedRaycaster.intersectObjects(s.activeMeshes, false);
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

      // Inertia
      if (!drag.active && (Math.abs(drag.vx) > 0.001 || Math.abs(drag.vy) > 0.001)) {
        s.basePos.x += drag.vx;
        s.basePos.y += drag.vy;
        drag.vx *= 0.88;
        drag.vy *= 0.88;
      }

      camera.position.set(s.basePos.x, s.basePos.y, s.basePos.z + 200);
      camera.lookAt(s.basePos.x, s.basePos.y, s.basePos.z);

      const ccx = Math.floor(s.basePos.x / CHUNK_SIZE);
      const ccy = Math.floor(s.basePos.y / CHUNK_SIZE);
      const ccz = Math.floor(s.basePos.z / CHUNK_SIZE);
      if (ccx !== lastCx || ccy !== lastCy || ccz !== lastCz) {
        lastCx = ccx; lastCy = ccy; lastCz = ccz;
        syncChunks(s);
      }

      // Per-mesh fade — iterate activeMeshes (our own list, not scene.children)
      const camZ = s.basePos.z;
      const meshes = s.activeMeshes || [];
      for (let i = 0; i < meshes.length; i++) {
        const m = meshes[i];
        const ud = m.userData;

        const dist = Math.max(
          Math.abs(ud.chunkCx - ccx),
          Math.abs(ud.chunkCy - ccy),
          Math.abs(ud.chunkCz - ccz),
        );
        const gridFade = dist <= RENDER_DISTANCE
          ? 1
          : Math.max(0, 1 - (dist - RENDER_DISTANCE) / CHUNK_FADE_MARGIN);

        const absDepth = Math.abs(m.position.z - camZ);
        const depthFade = absDepth <= DEPTH_FADE_START
          ? 1
          : Math.max(0, 1 - (absDepth - DEPTH_FADE_START) / (DEPTH_FADE_END - DEPTH_FADE_START));

        const target = m.material.map ? gridFade * depthFade : 0;

        // Skip lerp if already settled
        const diff = target - m.material.opacity;
        if (Math.abs(diff) > OPACITY_THRESHOLD) {
          m.material.opacity += diff * 0.06;
        } else if (m.material.opacity !== target) {
          m.material.opacity = target;
        }
      }

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
      GLOBAL_SEED_OFFSET = Math.floor(Math.random() * 999983) + 1;
      planeCache.clear();
      const s = stateRef.current;
      if (!s.scene) return;
      destroyAllChunks(s);
      syncChunks(s);
    };
    const keyHandler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener('randomize-memory', handler);
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('randomize-memory', handler);
      window.removeEventListener('keydown', keyHandler);
    };
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