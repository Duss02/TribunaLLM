"use client";

import { Billboard, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { type RefObject, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Side } from "@/lib/side";
import { C, type Shape } from "./palette";

const damp = THREE.MathUtils.damp;
const sign = (side: Side) => (side === "PRO" ? -1 : 1);

/** Where a counsel sits and where it stands to speak. On a narrow screen both move toward the middle. */
export const seatOf = (side: Side, narrow: boolean): [number, number] => [
  sign(side) * (narrow ? 3.4 : 4.6),
  1.2,
];
export const spotOf = (side: Side, narrow: boolean): [number, number] => [
  sign(side) * (narrow ? 1.1 : 1.6),
  3.3,
];

function dampAngle(current: number, target: number, lambda: number, dt: number) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * (1 - Math.exp(-lambda * dt));
}

// Grey noise used as a bump map, so the plush reads as felt rather than plastic. Drawn once, in code.
let fuzz: THREE.CanvasTexture | null = null;
function fuzzTexture() {
  if (fuzz) return fuzz;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, size, size);
    // Thousands of short fibres in random directions: the bump map reads them as a felt pile.
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const a = Math.random() * Math.PI * 2;
      const l = 2 + Math.random() * 5;
      const v = Math.random() < 0.5 ? 40 + Math.random() * 50 : 170 + Math.random() * 85;
      ctx.strokeStyle = `rgb(${v},${v},${v})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }
  }
  fuzz = new THREE.CanvasTexture(canvas);
  fuzz.wrapS = fuzz.wrapT = THREE.RepeatWrapping;
  fuzz.repeat.set(2, 2);
  return fuzz;
}

/** The plush material: matte, with a pale sheen at the edges like felt under light. */
function Plush({ color }: { color: string }) {
  const map = useMemo(fuzzTexture, []);
  const sheen = useMemo(() => new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.6), [color]);
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={1}
      sheen={0.7}
      sheenRoughness={0.75}
      sheenColor={sheen}
      bumpMap={map}
      bumpScale={2.2}
    />
  );
}

function Ink() {
  return <meshStandardMaterial color={C.ink} roughness={0.35} />;
}

const FACE: Record<Shape, { y: number; z: number; spread: number; top: number }> = {
  cloud: { y: 0.84, z: 0.7, spread: 0.22, top: 1.66 },
  heart: { y: 0.92, z: 0.5, spread: 0.22, top: 1.66 },
  frog: { y: 1.2, z: 0.56, spread: 0.4, top: 1.5 },
  bean: { y: 1.02, z: 0.56, spread: 0.2, top: 1.72 },
};

function Body({ shape, color }: { shape: Shape; color: string }) {
  const ball = (
    key: string,
    p: [number, number, number],
    r: number,
    s: [number, number, number] = [1, 1, 1],
  ) => (
    <mesh key={key} position={p} scale={s} castShadow>
      <sphereGeometry args={[r, 32, 24]} />
      <Plush color={color} />
    </mesh>
  );
  switch (shape) {
    case "cloud":
      return (
        <>
          {ball("c", [0, 0.72, 0], 0.72)}
          {ball("l", [-0.6, 0.55, 0.05], 0.5)}
          {ball("r", [0.6, 0.55, 0.05], 0.5)}
          {ball("tl", [-0.28, 1.2, 0], 0.5)}
          {ball("tr", [0.3, 1.16, -0.02], 0.48)}
        </>
      );
    case "heart":
      return <HeartBody color={color} />;
    case "frog":
      return (
        <>
          {ball("b", [0, 0.64, 0], 0.78, [1.2, 0.82, 0.92])}
          {ball("l", [-0.4, 1.14, 0.12], 0.32)}
          {ball("r", [0.4, 1.14, 0.12], 0.32)}
        </>
      );
    case "bean":
      return (
        <mesh position={[0, 0.88, 0]} castShadow>
          <capsuleGeometry args={[0.56, 0.62, 12, 28]} />
          <Plush color={color} />
        </mesh>
      );
  }
}

/** A plush heart: two round lobes over a rounded point, all closed shapes so no seams show. */
function HeartBody({ color }: { color: string }) {
  return (
    <group>
      {[-1, 1].map((d) => (
        <mesh key={d} position={[d * 0.38, 1.16, 0]} scale={[1, 1, 0.86]} castShadow>
          <sphereGeometry args={[0.52, 32, 24]} />
          <Plush color={color} />
        </mesh>
      ))}
      <mesh position={[0, 0.82, 0]} scale={[1.18, 0.9, 0.82]} castShadow>
        <sphereGeometry args={[0.6, 32, 24]} />
        <Plush color={color} />
      </mesh>
      <mesh position={[0, 0.36, 0]} rotation={[Math.PI, 0, 0]} scale={[1, 1, 0.72]} castShadow>
        <coneGeometry args={[0.56, 0.7, 32, 1]} />
        <Plush color={color} />
      </mesh>
      <mesh position={[0, 0.03, 0]} castShadow>
        <sphereGeometry args={[0.1, 16, 12]} />
        <Plush color={color} />
      </mesh>
    </group>
  );
}

function Face({
  shape,
  glasses,
  mouth,
}: {
  shape: Shape;
  glasses: boolean;
  mouth: RefObject<THREE.Mesh | null>;
}) {
  const f = FACE[shape];
  return (
    <group>
      {[-1, 1].map((d) =>
        shape === "frog" ? (
          <group key={d} position={[d * f.spread, f.y, f.z - 0.12]}>
            <mesh>
              <sphereGeometry args={[0.2, 20, 16]} />
              <meshStandardMaterial color={C.white} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, 0.16]}>
              <sphereGeometry args={[0.1, 16, 12]} />
              <Ink />
            </mesh>
          </group>
        ) : (
          <mesh key={d} position={[d * f.spread, f.y, f.z]} scale={[1, 1.55, 0.6]}>
            <sphereGeometry args={[0.075, 16, 12]} />
            <Ink />
          </mesh>
        ),
      )}
      {glasses && (
        <group position={[0, f.y, (shape === "frog" ? f.z + 0.12 : f.z) + 0.04]}>
          {[-1, 1].map((d) => (
            <mesh key={d} position={[d * f.spread, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.05, 28]} />
              <Ink />
            </mesh>
          ))}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, f.spread * 2, 8]} />
            <Ink />
          </mesh>
        </group>
      )}
      <mesh
        ref={mouth}
        position={[0, shape === "frog" ? 0.56 : f.y - 0.24, shape === "frog" ? 0.78 : f.z - 0.02]}
        scale={[1, 0.3, 0.5]}
      >
        <sphereGeometry args={[0.08, 16, 12]} />
        <Ink />
      </mesh>
    </group>
  );
}

/** A map pin over a character, carrying its maker's mark. It goes red when the character is retracted. */
export function Pin({
  medal,
  height,
  bob,
  alertUntil,
}: {
  medal: THREE.Texture;
  height: number;
  bob: boolean;
  /** Clock time until which the pin stays red; set by the owner when a sentence is struck. */
  alertUntil: RefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const point = useRef<THREE.MeshBasicMaterial>(null);
  const blue = useMemo(() => new THREE.Color(C.blue), []);
  const red = useMemo(() => new THREE.Color(C.signal), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const alert = t < (alertUntil.current ?? 0);
    if (group.current) group.current.position.y = height + (bob ? Math.abs(Math.sin(t * 3)) * 0.25 : 0);
    if (group.current) group.current.scale.setScalar(alert ? 1.25 : 1);
    ring.current?.color.copy(alert ? red : blue);
    point.current?.color.copy(alert ? red : blue);
  });
  return (
    <group ref={group} position={[0, height, 0]}>
      <Billboard>
        <mesh>
          <circleGeometry args={[0.54, 40]} />
          <meshBasicMaterial ref={ring} color={C.blue} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.58, -0.01]} rotation={[0, 0, Math.PI]}>
          <circleGeometry args={[0.32, 3]} />
          <meshBasicMaterial ref={point} color={C.blue} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <circleGeometry args={[0.36, 40]} />
          <meshBasicMaterial map={medal} toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

/** Three dots that rise and fall over a counsel that has the floor but has not said anything yet. */
function ThoughtDots({ height, calm }: { height: number; calm: boolean }) {
  const dots = useRef<THREE.Group>(null);
  useFrame((state) => {
    dots.current?.children.forEach((dot, i) => {
      dot.position.y = calm ? 0 : Math.max(0, Math.sin(state.clock.elapsedTime * 5 - i * 0.7)) * 0.18;
    });
  });
  return (
    <Billboard position={[1.3, height, 0]}>
      <mesh scale={[1.25, 0.8, 1]}>
        <circleGeometry args={[0.5, 40]} />
        <meshBasicMaterial color={C.white} toneMapped={false} />
      </mesh>
      <mesh position={[-0.42, -0.5, 0]}>
        <circleGeometry args={[0.12, 20]} />
        <meshBasicMaterial color={C.white} toneMapped={false} />
      </mesh>
      <group ref={dots} position={[0, 0, 0.01]}>
        {[-0.25, 0, 0.25].map((x) => (
          <mesh key={x} position={[x, 0, 0]}>
            <circleGeometry args={[0.08, 16]} />
            <meshBasicMaterial color={C.ink} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </Billboard>
  );
}

export type Mood = "neutral" | "won" | "lost";

/**
 * A plush counsel. It sits on its chair until it is the speaker, walks its lane to the bay, talks,
 * flinches when a sentence is struck, and cheers or slumps at the verdict. With `calm` set it changes
 * place and state without walking, hopping, flinching or flapping.
 */
export function Toy({
  side,
  shape,
  color,
  medal,
  atSpot,
  talking,
  thinking,
  mood,
  hitKey,
  narrow,
  calm,
}: {
  side: Side;
  shape: Shape;
  color: string;
  medal: THREE.Texture;
  atSpot: boolean;
  talking: boolean;
  /** Has the floor but no words yet: a slow model is still thinking. */
  thinking: boolean;
  mood: Mood;
  hitKey: number;
  narrow: boolean;
  calm: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const feet = useRef<THREE.Group>(null);
  const seat = seatOf(side, narrow);
  const spot = spotOf(side, narrow);
  const s = useRef({
    x: seat[0],
    z: seat[1],
    sit: 1,
    yaw: 0,
    t: Math.random() * 6,
    shake: 0,
    poke: 0,
    hit: hitKey,
  });
  const poked = useRef(false);
  const alertUntil = useRef(0);

  useFrame((state, dt) => {
    const k = s.current;
    k.t += dt;
    if (k.hit !== hitKey) {
      k.hit = hitKey;
      k.shake = calm ? 0 : 1;
      alertUntil.current = state.clock.elapsedTime + 2.8;
    }
    if (poked.current) {
      k.poke = calm ? 0 : 1;
      poked.current = false;
    }
    const target = atSpot ? spot : seat;
    const dx = target[0] - k.x;
    const dz = target[1] - k.z;
    const dist = Math.hypot(dx, dz);
    const moving = !calm && dist > 0.04;
    if (calm) {
      k.x = target[0];
      k.z = target[1];
    } else if (moving) {
      const step = Math.min(dist, 4.6 * dt);
      k.x += (dx / dist) * step;
      k.z += (dz / dist) * step;
    }
    const sitting = !atSpot && !moving && mood !== "won";
    const yawTarget = moving ? Math.atan2(dx, dz) : 0;
    k.yaw = calm ? yawTarget : dampAngle(k.yaw, yawTarget, 9, dt);
    k.sit = calm ? (sitting ? 1 : 0) : damp(k.sit, sitting ? 1 : 0, 8, dt);
    k.shake = Math.max(0, k.shake - dt * 1.5);
    k.poke = Math.max(0, k.poke - dt * 1.8);

    const hop = moving ? Math.abs(Math.sin(k.t * 10)) * 0.22 : 0;
    const cheer = mood === "won" && !calm ? Math.abs(Math.sin(k.t * 6)) * 0.45 : 0;
    const pokeHop = Math.sin(k.poke * Math.PI) * 0.5;
    if (root.current) {
      root.current.position.set(k.x, hop + cheer + pokeHop + k.sit * 0.5, k.z);
      root.current.rotation.y = k.yaw;
      root.current.rotation.z = Math.sin(k.shake * 26) * 0.14 * k.shake;
    }
    if (body.current) {
      // Squash on landing, a sad droop when the verdict goes against it, a little sway while talking.
      const squash = moving ? 1 - Math.abs(Math.cos(k.t * 10)) * 0.06 : 1;
      const droop = mood === "lost" ? 0.86 : 1;
      body.current.scale.set(1 / Math.sqrt(squash * droop), squash * droop, 1 / Math.sqrt(squash * droop));
      body.current.rotation.y = calm || !talking ? 0 : Math.sin(k.t * 2.4) * 0.12;
      body.current.rotation.x = mood === "lost" ? 0.18 : 0;
      const look = calm || atSpot ? 0 : state.pointer.x * 0.35;
      body.current.rotation.y += look;
    }
    if (feet.current) feet.current.visible = k.sit < 0.7;
    if (mouth.current) {
      const flap = 0.4 + Math.abs(Math.sin(k.t * 14 + Math.sin(k.t * 3))) * 1.1;
      const open = talking && !moving ? (calm ? 0.9 : flap) : mood === "won" ? 1.4 : 0.3;
      mouth.current.scale.y = calm ? open : damp(mouth.current.scale.y, open, 25, dt);
    }
  });

  const f = FACE[shape];
  return (
    <group ref={root} scale={1.6} onPointerDown={() => (poked.current = true)}>
      <group ref={body}>
        <Body shape={shape} color={color} />
        <Face shape={shape} glasses={side === "CON"} mouth={mouth} />
      </group>
      <group ref={feet}>
        {[-1, 1].map((d) => (
          <mesh key={d} position={[d * 0.28, 0.07, 0.18]} scale={[1, 0.5, 1.3]} castShadow>
            <sphereGeometry args={[0.18, 16, 12]} />
            <Plush color={color} />
          </mesh>
        ))}
      </group>
      <Pin medal={medal} height={f.top + 1.15} bob={atSpot && talking && !calm} alertUntil={alertUntil} />
      {thinking && <ThoughtDots height={f.top + 0.15} calm={calm} />}
    </group>
  );
}

/** Jev: a pale yellow pear in round glasses and a curly white wig, eyes closed in judgement. */
export function JudgeToy({
  lookAt,
  speaking,
  onPoke,
  calm,
}: {
  lookAt: Side | null;
  speaking: boolean;
  onPoke: () => void;
  calm: boolean;
}) {
  const head = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const profile = useMemo(
    () =>
      [
        [0, 0],
        [0.62, 0.04],
        [0.92, 0.36],
        [0.98, 0.74],
        [0.84, 1.12],
        [0.64, 1.52],
        [0.42, 1.86],
        [0, 1.98],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    [],
  );

  useFrame((state, dt) => {
    t.current += dt;
    const yaw = lookAt === "PRO" ? -0.35 : lookAt === "CON" ? 0.35 : calm ? 0 : state.pointer.x * 0.2;
    if (head.current) {
      head.current.rotation.y = calm ? yaw : damp(head.current.rotation.y, yaw, 4, dt);
      head.current.position.y = calm ? 0 : Math.sin(t.current * 1.6) * 0.02;
    }
    if (mouth.current) {
      const flap = 0.4 + Math.abs(Math.sin(t.current * 12 + Math.sin(t.current * 2.7))) * 1.1;
      const open = speaking ? (calm ? 0.9 : flap) : 0.3;
      mouth.current.scale.y = calm ? open : damp(mouth.current.scale.y, open, 25, dt);
    }
  });

  const curls = [
    ...Array.from({ length: 7 }, (_, i) => {
      const a = Math.PI * (0.12 + (i / 6) * 0.76);
      return [Math.cos(a) * 0.62, 1.62 + Math.sin(a) * 0.38, -0.08] as const;
    }),
    ...[0, 1, 2].flatMap((row) => [
      [-0.86 + row * 0.02, 1.28 - row * 0.3, 0.05] as const,
      [0.86 - row * 0.02, 1.28 - row * 0.3, 0.05] as const,
    ]),
  ];

  return (
    <group position={[0, 1.0, -6.05]} scale={1.45} onClick={onPoke}>
      <group ref={head}>
        <mesh castShadow>
          <latheGeometry args={[profile, 40]} />
          <Plush color={C.jev} />
        </mesh>
        {curls.map((p, i) => (
          <mesh key={i} position={p} castShadow>
            <sphereGeometry args={[0.24, 20, 16]} />
            <Plush color={C.wig} />
          </mesh>
        ))}
        <group position={[0, 1.18, 0.86]}>
          {[-1, 1].map((d) => (
            <group key={d} position={[d * 0.24, 0, 0]}>
              <mesh>
                <torusGeometry args={[0.19, 0.03, 10, 32]} />
                <Ink />
              </mesh>
              <mesh position={[0, 0.02, 0]} rotation={[0, 0, Math.PI]}>
                <torusGeometry args={[0.08, 0.022, 8, 20, Math.PI]} />
                <Ink />
              </mesh>
            </group>
          ))}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 0.12, 8]} />
            <Ink />
          </mesh>
        </group>
        <mesh ref={mouth} position={[0, 0.9, 0.9]} scale={[1.2, 0.3, 0.5]}>
          <sphereGeometry args={[0.08, 16, 12]} />
          <Ink />
        </mesh>
      </group>
    </group>
  );
}

/** The gavel and its block on the bench: up while a strike is in the air, then down. */
export function Gavel({ strikeKey, calm }: { strikeKey: number; calm: boolean }) {
  const mallet = useRef<THREE.Group>(null);
  const s = useRef({ seen: strikeKey, t: 0 });
  useFrame((_, dt) => {
    const k = s.current;
    if (k.seen !== strikeKey) {
      k.seen = strikeKey;
      k.t = calm ? 0 : 1;
    }
    k.t = Math.max(0, k.t - dt * 2.2);
    if (mallet.current) mallet.current.rotation.z = k.t > 0.4 ? 1.3 : 1.3 * (k.t / 0.4);
  });
  return (
    <group position={[2.4, 2.42, -4.1]} scale={1.4}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.36, 0.4, 0.16, 28]} />
        <meshStandardMaterial color={C.tanDark} roughness={0.7} />
      </mesh>
      <group ref={mallet} position={[-0.05, 0.12, 0]}>
        <mesh position={[0.55, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1.1, 10]} />
          <meshStandardMaterial color={C.tan} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.5, 20]} />
          <meshStandardMaterial color={C.tanDark} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

/** The scales on the dais. The beam leans toward the side ahead and jolts when the gavel falls. */
export function Scales3D({
  margin,
  colors,
  pans,
  jolt,
  calm,
}: {
  margin: number;
  colors: Record<Side, string>;
  pans: Record<Side, RefObject<THREE.Group | null>>;
  jolt: number;
  calm: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const bump = useRef({ seen: jolt, t: 0 });
  const arm = 1.25;

  useFrame((_, dt) => {
    const goal = Math.max(-1, Math.min(1, margin / 8)) * 0.32;
    angle.current = calm ? goal : damp(angle.current, goal, 3, dt);
    const a = angle.current;
    if (beam.current) beam.current.rotation.z = a;
    pans.PRO.current?.position.set(-arm * Math.cos(a), -arm * Math.sin(a), 0);
    pans.CON.current?.position.set(arm * Math.cos(a), arm * Math.sin(a), 0);
    const b = bump.current;
    if (b.seen !== jolt) {
      b.seen = jolt;
      b.t = calm ? 0 : 1;
    }
    b.t = Math.max(0, b.t - dt * 3);
    if (root.current) root.current.position.y = 0.5 + Math.sin(b.t * Math.PI) * 0.3;
  });

  const pan = (ref: RefObject<THREE.Group | null>, color: string) => (
    <group ref={ref}>
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.8, 6]} />
        <meshStandardMaterial color={C.ink} />
      </mesh>
      <mesh position={[0, -0.85, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.42, 0.16, 28]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </group>
  );

  return (
    <group ref={root} position={[-5.6, 0.5, -5.2]} scale={1.7}>
      <RoundedBox args={[1.3, 0.24, 1.0]} radius={0.06} position={[0, 0.12, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={C.blueDark} roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 2.3, 14]} />
        <meshStandardMaterial color={C.blue} roughness={0.5} />
      </mesh>
      <group position={[0, 2.5, 0]}>
        <group ref={beam}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, arm * 2, 12]} />
            <meshStandardMaterial color={C.blue} roughness={0.5} />
          </mesh>
        </group>
        <mesh>
          <sphereGeometry args={[0.16, 16, 12]} />
          <meshStandardMaterial color={C.yellow} roughness={0.5} />
        </mesh>
        {pan(pans.PRO, colors.PRO)}
        {pan(pans.CON, colors.CON)}
      </group>
    </group>
  );
}

/** A little gallery spectator that jumps at every retraction. */
function Spectator({
  x,
  z,
  lift = 0,
  color,
  jumpKey,
  calm,
}: {
  x: number;
  z: number;
  lift?: number;
  color: string;
  jumpKey: number;
  calm: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const s = useRef({ seen: jumpKey, t: 0, delay: Math.random() * 0.25 });
  useFrame((_, dt) => {
    const k = s.current;
    if (k.seen !== jumpKey) {
      k.seen = jumpKey;
      k.t = calm ? 0 : 1 + k.delay;
    }
    k.t = Math.max(0, k.t - dt * 2.2);
    if (ref.current) ref.current.position.y = 0.72 + lift + Math.sin(Math.min(1, k.t) * Math.PI) * 0.4;
  });
  return (
    <group ref={ref} position={[x, 0.72 + lift, z]}>
      <mesh castShadow>
        <sphereGeometry args={[0.42, 24, 18]} />
        <Plush color={color} />
      </mesh>
      {[-1, 1].map((d) => (
        <mesh key={d} position={[d * 0.13, 0.08, 0.4]} scale={[1, 1.5, 0.6]}>
          <sphereGeometry args={[0.05, 12, 10]} />
          <Ink />
        </mesh>
      ))}
    </group>
  );
}

function Tree({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, -0.3, z]} scale={s}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 1.4, 10]} />
        <meshStandardMaterial color={C.trunk} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.9, 0]} scale={[1, 1.15, 1]} castShadow>
        <sphereGeometry args={[0.8, 24, 18]} />
        <meshStandardMaterial color={C.leaf} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Table({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[2.6, 0.14, 1.1]} radius={0.05} position={[0, 0.8, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={C.tanDark} roughness={0.7} />
      </RoundedBox>
      <RoundedBox args={[2.4, 0.74, 0.95]} radius={0.06} position={[0, 0.37, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={C.tan} roughness={0.85} />
      </RoundedBox>
    </group>
  );
}

function Chair({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[1.5, 0.5, 1.2]} radius={0.08} position={[0, 0.25, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={C.blue} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[1.5, 1.7, 0.22]} radius={0.08} position={[0, 0.85, -0.55]} castShadow>
        <meshStandardMaterial color={C.blue} roughness={0.6} />
      </RoundedBox>
    </group>
  );
}

/** A courtroom wall: oak wainscot with panel insets, pale plaster above, a blue cornice. */
function CourtWall({
  length,
  position,
  rotation = 0,
  windows = [],
}: {
  length: number;
  position: [number, number, number];
  rotation?: number;
  windows?: number[];
}) {
  const panels = Array.from(
    { length: Math.floor((length - 0.8) / 1.6) },
    (_, i) => -length / 2 + 1.2 + i * 1.6,
  );
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 2.6, 0]} receiveShadow>
        <boxGeometry args={[length, 5.2, 0.3]} />
        <meshStandardMaterial color={C.plaster} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.7, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[length - 0.7, 1.4, 0.32]} />
        <meshStandardMaterial color={C.tan} roughness={0.8} />
      </mesh>
      {panels.map((x) => (
        <mesh key={x} position={[x, 0.7, 0.22]}>
          <boxGeometry args={[1.2, 0.9, 0.04]} />
          <meshStandardMaterial color={C.tanDark} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 1.44, 0.24]}>
        <boxGeometry args={[length - 0.7, 0.1, 0.12]} />
        <meshStandardMaterial color={C.tanDark} roughness={0.7} />
      </mesh>
      <mesh position={[0, 5.25, 0.04]} castShadow>
        <boxGeometry args={[length + 0.1, 0.22, 0.46]} />
        <meshStandardMaterial color={C.blue} roughness={0.6} />
      </mesh>
      {windows.map((x) => (
        <group key={x} position={[x, 2.75, 0.17]}>
          <mesh>
            <boxGeometry args={[1.3, 1.9, 0.06]} />
            <meshStandardMaterial color={C.white} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.95, 0]}>
            <cylinderGeometry args={[0.65, 0.65, 0.06, 32, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color={C.white} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <boxGeometry args={[1.05, 1.7, 0.02]} />
            <meshStandardMaterial
              color={C.glass}
              emissive={C.glass}
              emissiveIntensity={0.35}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0, 0.95, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.52, 0.52, 0.02, 32, 1, false, -Math.PI / 2, Math.PI]} />
            <meshStandardMaterial
              color={C.glass}
              emissive={C.glass}
              emissiveIntensity={0.35}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0, 0.2, 0.06]}>
            <boxGeometry args={[0.06, 2.4, 0.02]} />
            <meshStandardMaterial color={C.white} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// The court's seal over the judge's chair: the TribunaLLM mark (components/brand/logo.tsx), painted in code.
let seal: THREE.CanvasTexture | null = null;
function sealTexture() {
  if (seal) return seal;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = C.blue;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(32, 32);
    ctx.scale(6, 6);
    ctx.strokeStyle = "#ffffff";
    ctx.lineCap = "round";
    ctx.lineWidth = 2;
    ctx.stroke(new Path2D("M16 8.5V24M11 24.5h10M6.5 11h19"));
    ctx.lineWidth = 1.2;
    ctx.stroke(new Path2D("M8 11.4 5.2 15M8 11.4l2.8 3.6M24 11.4 21.2 15M24 11.4l2.8 3.6"));
    ctx.fillStyle = C.yellow;
    ctx.beginPath();
    ctx.arc(16, 8, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fill(new Path2D("M5.5 15h5a2.5 2.5 0 0 1 0 5H8l-1.8 1.7.2-1.7h-.9a2.5 2.5 0 0 1 0-5Z"));
    ctx.fill(new Path2D("M21.5 15h5a2.5 2.5 0 0 1 0 5h-.9l.2 1.7L24 20h-2.5a2.5 2.5 0 0 1 0-5Z"));
  }
  seal = new THREE.CanvasTexture(canvas);
  seal.colorSpace = THREE.SRGBColorSpace;
  seal.anisotropy = 4;
  return seal;
}

function Seal({ position }: { position: [number, number, number] }) {
  const map = useMemo(sealTexture, []);
  return (
    <group position={position}>
      <mesh position={[0, 0, -0.02]}>
        <circleGeometry args={[0.86, 48]} />
        <meshStandardMaterial color={C.white} roughness={0.6} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.76, 48]} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** The jury box: an oak pen with a blue rail and six plush jurors who jump at a retraction. */
function JuryBox({ jumpKey, calm }: { jumpKey: number; calm: boolean }) {
  const jurors = ["#ffd0dc", "#cfe0ff", "#d6f2dc", "#fff0b8", "#e3d6ff", "#ffdcc4"];
  return (
    <group position={[10.4, 0, -3.2]} rotation={[0, -Math.PI / 2, 0]}>
      <RoundedBox args={[4.4, 0.35, 2.6]} radius={0.06} position={[0, 0.17, -0.3]} receiveShadow>
        <meshStandardMaterial color={C.tanDark} roughness={0.8} />
      </RoundedBox>
      {jurors.map((color, i) => (
        <Spectator
          key={i}
          x={-1.5 + (i % 3) * 1.5}
          z={i < 3 ? 0.1 : -0.9}
          lift={i < 3 ? 0 : 0.4}
          color={color}
          jumpKey={jumpKey}
          calm={calm}
        />
      ))}
      <RoundedBox args={[4.6, 1.0, 0.3]} radius={0.06} position={[0, 0.5, 0.95]} castShadow receiveShadow>
        <meshStandardMaterial color={C.tan} roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[4.7, 0.12, 0.42]} radius={0.04} position={[0, 1.04, 0.95]} castShadow>
        <meshStandardMaterial color={C.blue} roughness={0.6} />
      </RoundedBox>
    </group>
  );
}

/** The witness stand beside the bench, with its little microphone. */
function WitnessStand() {
  return (
    <group position={[-10, 0, -4.6]} rotation={[0, Math.PI / 4, 0]}>
      <RoundedBox args={[1.6, 0.35, 1.6]} radius={0.06} position={[0, 0.17, 0]} receiveShadow>
        <meshStandardMaterial color={C.tanDark} roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[1.6, 1.1, 0.25]} radius={0.06} position={[0, 0.9, 0.7]} castShadow>
        <meshStandardMaterial color={C.tan} roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[1.7, 0.1, 0.4]} radius={0.04} position={[0, 1.48, 0.7]} castShadow>
        <meshStandardMaterial color={C.blue} roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 1.75, 0.65]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.5, 8]} />
        <meshStandardMaterial color={C.ink} />
      </mesh>
      <mesh position={[0, 1.98, 0.55]}>
        <sphereGeometry args={[0.09, 14, 10]} />
        <meshStandardMaterial color={C.ink} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** A potted plant: a round plush bush in a blue pot. */
function Plant({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.32, 0.8, 24]} />
        <meshStandardMaterial color={C.blue} roughness={0.6} />
      </mesh>
      {[
        [0, 1.25, 0, 0.62],
        [-0.35, 1.0, 0.1, 0.42],
        [0.35, 1.05, -0.05, 0.45],
        [0.05, 1.7, 0, 0.4],
      ].map(([px, py, pz, r], i) => (
        <mesh key={i} position={[px, py, pz]} castShadow>
          <sphereGeometry args={[r, 20, 16]} />
          <Plush color={C.leaf} />
        </mesh>
      ))}
    </group>
  );
}

/** A soft rug in front of the bench where counsel stand to speak, and the aisle runner. */
function Rugs() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 3.3]} receiveShadow>
        <circleGeometry args={[2.6, 64]} />
        <meshStandardMaterial color={C.blueSoft} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 3.3]}>
        <ringGeometry args={[2.35, 2.5, 64]} />
        <meshStandardMaterial color={C.yellow} roughness={1} />
      </mesh>
    </group>
  );
}

const SPECTATORS = ["#9fb6ff", "#ffb3c7", "#bfe8c9", "#ffe08a", "#c9b8ff", "#ffc9a3"];

/** The diorama: ground, platform, cut-away walls, bench, chairs, tables, lanes, gallery, crates and trees. */
export function Diorama({ narrow, jumpKey, calm }: { narrow: boolean; jumpKey: number; calm: boolean }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color={C.ground} roughness={1} />
      </mesh>
      <RoundedBox args={[28, 0.3, 21]} radius={0.12} position={[0, -0.15, 0.6]} receiveShadow>
        <meshStandardMaterial color={C.platform} roughness={0.95} />
      </RoundedBox>

      <CourtWall length={28} position={[0, 0, -9.8]} windows={[-10.5, -6.5, 6.5, 10.5]} />
      <CourtWall length={20.6} position={[-14, 0, 0.5]} rotation={Math.PI / 2} windows={[-6.5, -2, 2.5, 7]} />
      <Seal position={[0, 4.3, -9.62]} />
      <Rugs />
      <JuryBox jumpKey={jumpKey} calm={calm} />
      <WitnessStand />
      <Plant x={-12.6} z={-8.6} />
      <Plant x={12.6} z={-8.6} />
      <Plant x={-12.6} z={6.8} />

      <RoundedBox
        args={[11.4, 0.5, 3.6]}
        radius={0.08}
        position={[-0.6, 0.25, -5.4]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={C.white} roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[3.2, 2.7, 0.3]} radius={0.14} position={[0, 1.85, -7.45]} castShadow>
        <meshStandardMaterial color={C.blueDark} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[6.6, 1.8, 1]} radius={0.1} position={[0, 1.4, -4.1]} castShadow receiveShadow>
        <meshStandardMaterial color={C.blue} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[7, 0.16, 1.3]} radius={0.06} position={[0, 2.34, -4.1]} castShadow receiveShadow>
        <meshStandardMaterial color={C.white} roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 1.4, -3.59]}>
        <planeGeometry args={[6.2, 0.14]} />
        <meshStandardMaterial color={C.white} roughness={0.6} />
      </mesh>

      {(["PRO", "CON"] as const).map((side) => {
        const seat = seatOf(side, narrow);
        const spot = spotOf(side, narrow);
        return (
          <group key={side}>
            <Chair x={seat[0]} z={seat[1] - 0.15} />
            <Table x={seat[0]} z={seat[1] + 1.25} />
          </group>
        );
      })}

      <group position={[0, 0, 6.4]}>
        <RoundedBox args={[20, 0.12, 0.22]} radius={0.04} position={[0, 0.95, 0]} castShadow>
          <meshStandardMaterial color={C.blue} roughness={0.6} />
        </RoundedBox>
        {Array.from({ length: 12 }, (_, i) => -9.9 + i * 1.8).map((x) => (
          <mesh key={x} position={[x, 0.47, 0]} castShadow>
            <boxGeometry args={[0.14, 0.94, 0.14]} />
            <meshStandardMaterial color={C.white} roughness={0.6} />
          </mesh>
        ))}
      </group>
      {[7.8, 9.6].map((z, row) => (
        <group key={z}>
          {[-8.4, -4.2, 0, 4.2, 8.4].map((x, i) => (
            <group key={x}>
              <RoundedBox
                args={[3.4, 0.3, 0.9]}
                radius={0.06}
                position={[x, 0.35, z]}
                castShadow
                receiveShadow
              >
                <meshStandardMaterial color={C.white} roughness={0.7} />
              </RoundedBox>
              <Spectator
                x={x - 0.75}
                z={z}
                color={SPECTATORS[(i * 2 + row) % SPECTATORS.length]}
                jumpKey={jumpKey}
                calm={calm}
              />
              <Spectator
                x={x + 0.75}
                z={z}
                color={SPECTATORS[(i * 2 + 1 + row * 3) % SPECTATORS.length]}
                jumpKey={jumpKey}
                calm={calm}
              />
            </group>
          ))}
        </group>
      ))}

      <Tree x={16.5} z={-8} s={1.3} />
      <Tree x={16} z={4} s={1.1} />
      <Tree x={-16.5} z={7} s={1.2} />
      <Tree x={6} z={13} s={1} />
    </group>
  );
}
