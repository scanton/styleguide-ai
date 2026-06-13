"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { wikimediaThumb } from "@/lib/wikimedia";
import type { GalleryWork } from "@/components/museum/EditorialGallery";

interface Gallery3DProps {
  title: string;
  accentColor: string;
  works: GalleryWork[];
  onExit: () => void;
}

type Phase = "loading" | "ready" | "playing" | "paused";

// ── Procedural canvas textures ────────────────────────────────────────────────

function makeFloorTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  const plankH = 64;
  for (let row = 0; row < 8; row++) {
    const base = 96 + Math.floor(Math.random() * 18);
    g.fillStyle = `rgb(${base + 18}, ${base - 4}, ${base - 34})`;
    g.fillRect(0, row * plankH, 512, plankH);
    // grain
    for (let i = 0; i < 220; i++) {
      const a = 0.05 + Math.random() * 0.08;
      g.fillStyle = `rgba(40, 24, 10, ${a})`;
      g.fillRect(Math.random() * 512, row * plankH + Math.random() * plankH, 18 + Math.random() * 60, 1);
    }
    // plank seam
    g.fillStyle = "rgba(20, 12, 6, 0.55)";
    g.fillRect(0, row * plankH, 512, 2);
    // staggered end joints
    const joint = ((row * 197) % 512 + 512) % 512;
    g.fillRect(joint, row * plankH, 2, plankH);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeWallTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#efe9da";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = `rgba(120, 105, 80, ${Math.random() * 0.05})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePlaqueTexture(work: GalleryWork): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 352;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f7f3e8";
  g.fillRect(0, 0, 512, 352);
  g.strokeStyle = "#b9af98";
  g.lineWidth = 6;
  g.strokeRect(10, 10, 492, 332);

  const wrap = (text: string, x: number, y: number, maxW: number, lineH: number, maxLines: number) => {
    const words = text.split(" ");
    let line = "";
    let lines = 0;
    for (const word of words) {
      const probe = line ? `${line} ${word}` : word;
      if (g.measureText(probe).width > maxW && line) {
        g.fillText(line, x, y + lines * lineH);
        lines++;
        if (lines >= maxLines) return;
        line = word;
      } else {
        line = probe;
      }
    }
    if (lines < maxLines && line) g.fillText(line, x, y + lines * lineH);
  };

  g.fillStyle = "#2a2118";
  g.font = "bold 34px Georgia, serif";
  wrap(work.title, 36, 72, 440, 40, 2);
  g.font = "italic 26px Georgia, serif";
  g.fillStyle = "#5a4d3a";
  g.fillText(
    `${work.artistName ? work.artistName + ", " : ""}${work.year ?? "date unknown"}`,
    36,
    168
  );
  if (work.description) {
    g.font = "22px Georgia, serif";
    g.fillStyle = "#473d2e";
    wrap(work.description, 36, 214, 440, 30, 4);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeTitleWallTexture(title: string, count: number, accent: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#efe9da";
  g.fillRect(0, 0, 1024, 512);
  g.fillStyle = accent;
  g.fillRect(0, 388, 1024, 16);
  g.fillStyle = "#6e6248";
  g.font = "30px Georgia, serif";
  g.textAlign = "center";
  g.fillText("StyleGuideAI  Virtual  Museum", 512, 130);
  g.fillStyle = "#2a2118";
  let size = 92;
  g.font = `bold ${size}px Georgia, serif`;
  while (g.measureText(title).width > 920 && size > 36) {
    size -= 6;
    g.font = `bold ${size}px Georgia, serif`;
  }
  g.fillText(title, 512, 250);
  g.fillStyle = "#6e6248";
  g.font = "30px Georgia, serif";
  g.fillText(`${count} works`, 512, 330);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Gallery3D({ title, accentColor, works, onExit }: Gallery3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const exitingRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);
  const [nearWork, setNearWork] = useState<GalleryWork | null>(null);
  const [isTouch, setIsTouch] = useState(false);

  const phaseRef = useRef<Phase>("loading");
  phaseRef.current = phase;

  // Fade in from black on mount.
  useEffect(() => {
    if (rootRef.current && !prefersReducedMotion()) {
      gsap.fromTo(rootRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    }
  }, []);

  const fadeOutAndExit = () => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    if (document.pointerLockElement) document.exitPointerLock();
    const dur = prefersReducedMotion() ? 0 : 0.4;
    gsap.to(rootRef.current, { opacity: 0, duration: dur, onComplete: onExit });
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const touch = window.matchMedia("(pointer: coarse)").matches;
    setIsTouch(touch);
    const reduced = prefersReducedMotion();

    // ── Hall dimensions from collection size ──
    const SPACING = 4.6;
    const perWall = Math.max(1, Math.ceil(works.length / 2));
    const HALL_L = Math.max(16, perWall * SPACING + 8);
    const HALL_W = 8.4;
    const HALL_H = 4.6;
    const EYE = 1.62;

    // ── Renderer / scene / camera ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#171310");
    scene.fog = new THREE.Fog("#171310", HALL_L * 0.7, HALL_L * 1.6);

    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.1, 200);
    camera.position.set(0, EYE, HALL_L / 2 - 2);

    // ── Structure ──
    const floorTex = makeFloorTexture();
    floorTex.repeat.set(HALL_W / 4, HALL_L / 4);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(HALL_W, HALL_L),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.65, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const wallTex = makeWallTexture();
    wallTex.repeat.set(6, 3);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 });
    const mkWall = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      scene.add(m);
      return m;
    };
    mkWall(HALL_L, HALL_H, -HALL_W / 2, HALL_H / 2, 0, Math.PI / 2); // left
    mkWall(HALL_L, HALL_H, HALL_W / 2, HALL_H / 2, 0, -Math.PI / 2); // right
    mkWall(HALL_W, HALL_H, 0, HALL_H / 2, HALL_L / 2, Math.PI); // behind start

    // Feature title wall at the far end
    const titleTex = makeTitleWallTexture(title, works.length, accentColor);
    const endWall = new THREE.Mesh(
      new THREE.PlaneGeometry(HALL_W, HALL_H),
      new THREE.MeshStandardMaterial({ map: titleTex, roughness: 0.9 })
    );
    endWall.position.set(0, HALL_H / 2, -HALL_L / 2);
    scene.add(endWall);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(HALL_W, HALL_L),
      new THREE.MeshStandardMaterial({ color: "#241e18", roughness: 0.9 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = HALL_H;
    scene.add(ceiling);

    // Baseboards
    const baseMat = new THREE.MeshStandardMaterial({ color: "#3d3226", roughness: 0.6 });
    for (const side of [-1, 1]) {
      const bb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, HALL_L), baseMat);
      bb.position.set(side * (HALL_W / 2 - 0.03), 0.09, 0);
      scene.add(bb);
    }

    // ── Lighting ──
    scene.add(new THREE.HemisphereLight("#fff6e6", "#2a2118", 0.55));
    const entranceGlow = new THREE.PointLight("#ffe7bd", 14, 14, 2);
    entranceGlow.position.set(0, HALL_H - 0.4, HALL_L / 2 - 2.5);
    scene.add(entranceGlow);
    // Title wall wash
    const endSpot = new THREE.SpotLight("#fff1d6", 60, 18, 0.7, 0.5, 1.8);
    endSpot.position.set(0, HALL_H - 0.3, -HALL_L / 2 + 4);
    endSpot.target = endWall;
    scene.add(endSpot, endSpot.target);

    // ── Artworks ──
    const manager = new THREE.LoadingManager();
    const loader = new THREE.TextureLoader(manager);
    loader.setCrossOrigin("anonymous");
    manager.onProgress = (_url, loaded, total) => {
      setProgress(Math.round((loaded / total) * 100));
    };
    manager.onLoad = () => {
      if (phaseRef.current === "loading") setPhase("ready");
    };
    // Even if some textures fail, open the doors.
    const openAnyway = window.setTimeout(() => {
      if (phaseRef.current === "loading") setPhase("ready");
    }, 15000);

    const frameMat = new THREE.MeshStandardMaterial({ color: "#6d5320", roughness: 0.35, metalness: 0.55 });
    const matMat = new THREE.MeshStandardMaterial({ color: "#f4efe2", roughness: 0.9 });
    const artPositions: { work: GalleryWork; pos: THREE.Vector3 }[] = [];

    works.forEach((work, i) => {
      const side = i % 2 === 0 ? -1 : 1; // left, right, left…
      const slot = Math.floor(i / 2);
      const z = HALL_L / 2 - 6 - slot * SPACING - (side === 1 ? SPACING / 2 : 0);
      const wallX = side * (HALL_W / 2 - 0.001);

      // Size: fit within 3.1w × 2.25h, preserve aspect
      const aspect = work.width / work.height;
      let h = 2.0;
      let w = h * aspect;
      if (w > 3.1) {
        w = 3.1;
        h = w / aspect;
      }
      const cy = 1.72;

      const group = new THREE.Group();
      group.position.set(wallX, 0, z);
      group.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;

      // Frame + mat + canvas
      const FR = 0.11; // frame width
      const MAT = 0.09; // passe-partout
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(w + 2 * (FR + MAT), h + 2 * (FR + MAT), 0.09),
        frameMat
      );
      frame.position.set(0, cy, 0.05);
      group.add(frame);
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(w + 2 * MAT, h + 2 * MAT), matMat);
      mat.position.set(0, cy, 0.097);
      group.add(mat);

      const tex = loader.load(wikimediaThumb(work.imageUrl, 960, work.width));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const canvasMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 })
      );
      canvasMesh.position.set(0, cy, 0.1);
      group.add(canvasMesh);

      // Plaque
      const plaque = new THREE.Mesh(
        new THREE.PlaneGeometry(0.52, 0.36),
        new THREE.MeshStandardMaterial({ map: makePlaqueTexture(work), roughness: 0.8 })
      );
      plaque.position.set(w / 2 + (FR + MAT) + 0.42, 1.32, 0.02);
      group.add(plaque);

      scene.add(group);

      // Spotlight per artwork
      const spot = new THREE.SpotLight("#fff3da", 46, 12, 0.46, 0.55, 1.9);
      spot.position.set(side * (HALL_W / 2 - 2.1), HALL_H - 0.25, z);
      spot.target.position.set(wallX, cy, z);
      scene.add(spot, spot.target);
      // Fixture
      const fixture = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.1, 0.18, 12),
        new THREE.MeshStandardMaterial({ color: "#171310", emissive: "#ffdf9e", emissiveIntensity: 0.9 })
      );
      fixture.position.copy(spot.position);
      scene.add(fixture);

      artPositions.push({
        work,
        pos: new THREE.Vector3(wallX * 0.92, cy, z),
      });
    });

    // ── Benches ──
    const benchWood = new THREE.MeshStandardMaterial({ color: "#4a3a28", roughness: 0.5 });
    const benchCount = Math.max(1, Math.floor(HALL_L / 14));
    for (let b = 0; b < benchCount; b++) {
      const bz = HALL_L / 2 - 10 - b * 14;
      if (bz < -HALL_L / 2 + 6) break;
      const bench = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.55), benchWood);
      seat.position.y = 0.46;
      bench.add(seat);
      for (const lx of [-0.95, 0.95]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.5), benchWood);
        leg.position.set(lx, 0.21, 0);
        bench.add(leg);
      }
      bench.position.set(0, 0, bz);
      scene.add(bench);
    }

    // ── Controls state ──
    let yaw = Math.PI; // facing down the hall (-z)... camera at +z looking toward -z = yaw PI? compute: default camera looks -z with yaw 0. Start looking toward -z → yaw 0.
    yaw = 0;
    let pitch = 0;
    const keys = new Set<string>();
    const velocity = new THREE.Vector3();
    const SPEED = 3.4;

    const onKeyDown = (e: KeyboardEvent) => {
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        keys.add(e.code);
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      yaw -= e.movementX * 0.0023;
      pitch -= e.movementY * 0.0023;
      pitch = Math.max(-1.35, Math.min(1.35, pitch));
    };
    document.addEventListener("mousemove", onMouseMove);

    const onLockChange = () => {
      if (document.pointerLockElement === renderer.domElement) {
        setPhase("playing");
      } else if (phaseRef.current === "playing" && !exitingRef.current) {
        setPhase("paused");
      }
    };
    document.addEventListener("pointerlockchange", onLockChange);

    // While pointer-locked, a click pauses (the cursor is captured, so this
    // is the only way to reach the UI without Esc). Touch devices never hold
    // pointer lock, so taps are unaffected.
    const onCanvasClick = () => {
      if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock();
      }
    };
    renderer.domElement.addEventListener("click", onCanvasClick);

    // Touch: left zone joystick for movement, elsewhere drag to look.
    const joy = { active: false, id: -1, baseX: 0, baseY: 0, dx: 0, dy: 0 };
    const look = { active: false, id: -1, lastX: 0, lastY: 0 };
    const onTouchStart = (e: TouchEvent) => {
      if (phaseRef.current !== "playing") return;
      for (const t of Array.from(e.changedTouches)) {
        if (t.clientX < window.innerWidth * 0.4 && !joy.active) {
          joy.active = true;
          joy.id = t.identifier;
          joy.baseX = t.clientX;
          joy.baseY = t.clientY;
          joy.dx = joy.dy = 0;
        } else if (!look.active) {
          look.active = true;
          look.id = t.identifier;
          look.lastX = t.clientX;
          look.lastY = t.clientY;
        }
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (joy.active && t.identifier === joy.id) {
          joy.dx = Math.max(-60, Math.min(60, t.clientX - joy.baseX));
          joy.dy = Math.max(-60, Math.min(60, t.clientY - joy.baseY));
        } else if (look.active && t.identifier === look.id) {
          yaw -= (t.clientX - look.lastX) * 0.005;
          pitch -= (t.clientY - look.lastY) * 0.005;
          pitch = Math.max(-1.35, Math.min(1.35, pitch));
          look.lastX = t.clientX;
          look.lastY = t.clientY;
        }
      }
      if (phaseRef.current === "playing") e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joy.id) {
          joy.active = false;
          joy.dx = joy.dy = 0;
        }
        if (t.identifier === look.id) look.active = false;
      }
    };
    mount.addEventListener("touchstart", onTouchStart, { passive: true });
    mount.addEventListener("touchmove", onTouchMove, { passive: false });
    mount.addEventListener("touchend", onTouchEnd, { passive: true });

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // ── Animation loop ──
    const timer = new THREE.Timer();
    let bobT = 0;
    let nearId: string | null = null;
    let raf = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      timer.update();
      const dt = Math.min(timer.getDelta(), 0.05);
      const playing = phaseRef.current === "playing";

      // Input → desired velocity in camera space
      let fwd = 0;
      let strafe = 0;
      if (playing) {
        if (keys.has("KeyW") || keys.has("ArrowUp")) fwd += 1;
        if (keys.has("KeyS") || keys.has("ArrowDown")) fwd -= 1;
        if (keys.has("KeyA") || keys.has("ArrowLeft")) strafe -= 1;
        if (keys.has("KeyD") || keys.has("ArrowRight")) strafe += 1;
        if (joy.active) {
          fwd += -joy.dy / 60;
          strafe += joy.dx / 60;
        }
      }
      const len = Math.hypot(fwd, strafe) || 1;
      const target = new THREE.Vector3(
        (strafe / len) * SPEED * Math.min(1, Math.hypot(fwd, strafe)),
        0,
        (-fwd / len) * SPEED * Math.min(1, Math.hypot(fwd, strafe))
      ).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      velocity.lerp(target, 1 - Math.exp(-10 * dt));

      camera.position.x += velocity.x * dt;
      camera.position.z += velocity.z * dt;

      // Keep the walker inside the room (benches are walk-through set dressing)
      camera.position.x = Math.max(-HALL_W / 2 + 0.7, Math.min(HALL_W / 2 - 0.7, camera.position.x));
      camera.position.z = Math.max(-HALL_L / 2 + 0.8, Math.min(HALL_L / 2 - 0.8, camera.position.z));

      // Head bob
      const speed2 = velocity.lengthSq();
      if (!reduced && speed2 > 0.05) bobT += dt * Math.sqrt(speed2) * 2.4;
      camera.position.y = EYE + (reduced ? 0 : Math.sin(bobT) * 0.025);

      camera.rotation.set(0, 0, 0);
      camera.rotateY(yaw);
      camera.rotateX(pitch);

      // Proximity metadata
      let best: { work: GalleryWork; d: number } | null = null;
      for (const ap of artPositions) {
        const d = ap.pos.distanceTo(camera.position);
        if (d < 3.1 && (!best || d < best.d)) best = { work: ap.work, d };
      }
      const id = best?.work.id ?? null;
      if (id !== nearId) {
        nearId = id;
        setNearWork(best?.work ?? null);
      }

      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(openAnyway);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      renderer.domElement.removeEventListener("click", onCanvasClick);
      mount.removeEventListener("touchstart", onTouchStart);
      mount.removeEventListener("touchmove", onTouchMove);
      mount.removeEventListener("touchend", onTouchEnd);
      if (document.pointerLockElement) document.exitPointerLock();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            for (const v of Object.values(m)) {
              if (v instanceof THREE.Texture) v.dispose();
            }
            m.dispose();
          }
        }
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enter = () => {
    if (isTouch) {
      setPhase("playing");
    } else {
      mountRef.current?.querySelector("canvas")?.requestPointerLock();
    }
  };

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[60] bg-black"
      role="application"
      aria-label={`3D gallery: ${title}. A first-person walkable room. A text version of all artworks is available on the gallery page beneath.`}
    >
      <div ref={mountRef} className="absolute inset-0" />

      {/* Crosshair */}
      {phase === "playing" && !isTouch && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60"
          aria-hidden="true"
        />
      )}

      {/* Proximity metadata */}
      {phase === "playing" && nearWork && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 w-[min(92vw,540px)] -translate-x-1/2 rounded-lg bg-black/70 px-5 py-4 text-white backdrop-blur-sm">
          <p className="font-heading text-xl">{nearWork.title}</p>
          <p className="text-sm text-white/70">
            {nearWork.artistName && <>{nearWork.artistName} · </>}
            {nearWork.year ?? "date unknown"} · {nearWork.licenseType}
          </p>
        </div>
      )}

      {/* Exit button (always available, above every overlay) */}
      <button
        type="button"
        onClick={fadeOutAndExit}
        className="absolute right-4 top-4 z-30 rounded-md border border-white/30 bg-black/50 px-4 py-2.5 text-sm text-white backdrop-blur-sm transition-colors hover:bg-black/70 min-h-[44px]"
      >
        Exit Gallery ✕
      </button>

      {/* Touch joystick hint zone */}
      {phase === "playing" && isTouch && (
        <div
          className="pointer-events-none absolute bottom-8 left-8 h-24 w-24 rounded-full border border-white/25"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/15" />
        </div>
      )}

      {/* Loading / ready / paused overlays */}
      {phase !== "playing" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-black/80 px-6 text-center text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">The Virtual Museum</p>
          <h2 className="font-heading text-4xl md:text-5xl">{title}</h2>

          {phase === "loading" && (
            <>
              <p className="text-sm text-white/70">Hanging the artwork…</p>
              <div className="h-1 w-56 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full transition-[width] duration-300"
                  style={{ width: `${progress}%`, backgroundColor: accentColor }}
                />
              </div>
            </>
          )}

          {(phase === "ready" || phase === "paused") && (
            <>
              <button
                type="button"
                onClick={enter}
                className="rounded-md px-8 py-4 text-base font-medium text-white transition-opacity hover:opacity-90 min-h-[44px]"
                style={{ backgroundColor: accentColor }}
              >
                {phase === "paused" ? "Resume" : isTouch ? "Tap to Step Inside" : "Click to Step Inside"}
              </button>
              <p className="max-w-sm text-sm leading-relaxed text-white/60">
                {isTouch
                  ? "Left thumb to walk, right thumb to look around."
                  : "WASD or arrow keys to walk · mouse to look · click or Esc to pause"}
              </p>
              <button
                type="button"
                onClick={fadeOutAndExit}
                className="text-sm text-white/50 underline-offset-4 hover:underline min-h-[44px]"
              >
                Back to the Editorial Gallery
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
