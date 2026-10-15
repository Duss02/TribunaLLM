"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Side } from "@/lib/side";
import { Medal, type Mark } from "../vendor-mark";
import { makeMedalTexture } from "./medal-texture";
import { C, shapeOf, vendorHex } from "./palette";
import { Diorama, Gavel, JudgeToy, type Mood, Scales3D, seatOf, Toy } from "./toys";

export interface StageProps {
  vendors: Record<Side, Mark>;
  labels: Record<Side, string>;
  makers: Record<Side, string>;
  /** The side whose turn is being spoken: it walks to the bay and talks until the turn ends. */
  speaking: Side | null;
  /** The speaker has the floor but its model has not sent a word yet. */
  thinking: boolean;
  winner: Side | "draw" | null;
  /** Retractions so far on each side; a rise flinches that side. */
  hits: Record<Side, number>;
  /** Retractions so far overall; a rise brings the gavel down and makes the gallery jump. */
  retracted: number;
  margin: number;
  totals: Record<Side, string>;
  /** True while the camera should be on the judge, reading the verdict. */
  zoomJudge: boolean;
  judging: boolean;
  /** Extra gavel strikes from the page's own gavel button. */
  gavelPokes: number;
  onPokeJudge: () => void;
}

// An isometric view from the front right. The camera is orthographic, so only its direction matters;
// the zoom is fitted to the stage so the whole platform shows at any size.
const VIEW = new THREE.Vector3(0.42, 0.85, 1).normalize();
const WIDE_TARGET = new THREE.Vector3(0, 0.6, -0.4);
const JUDGE_TARGET = new THREE.Vector3(0.6, 3.4, -5);

function Rig({ zoom, calm, narrow }: { zoom: boolean; calm: boolean; narrow: boolean }) {
  const { camera, size } = useThree();
  const target = useRef(WIDE_TARGET.clone());

  useFrame((state, dt) => {
    const cam = camera as THREE.OrthographicCamera;
    // The platform is about 22 units wide and 17 deep; fit whichever is tighter.
    const fit = Math.min(size.width / (narrow ? 19 : 37), size.height / (narrow ? 19 : 25));
    const goalZoom = zoom ? fit * (narrow ? 1.9 : 2.2) : fit;
    const goal = zoom ? JUDGE_TARGET : WIDE_TARGET;
    const lambda = calm ? 1000 : zoom ? 2.4 : 3;
    const drift = zoom || calm ? 0 : 0.6;
    target.current.x = THREE.MathUtils.damp(target.current.x, goal.x + state.pointer.x * drift, lambda, dt);
    target.current.y = THREE.MathUtils.damp(target.current.y, goal.y, lambda, dt);
    target.current.z = THREE.MathUtils.damp(target.current.z, goal.z - state.pointer.y * drift, lambda, dt);
    cam.zoom = THREE.MathUtils.damp(cam.zoom, goalZoom, lambda, dt);
    cam.position.copy(target.current).addScaledVector(VIEW, 40);
    cam.lookAt(target.current);
    cam.updateProjectionMatrix();
  });
  return null;
}

/** Pins DOM elements to points in the scene, so labels stay crisp and in the page's own fonts. */
function Pins({
  pins,
}: {
  pins: { ref: RefObject<HTMLElement | null>; at: (out: THREE.Vector3) => THREE.Vector3; bottom?: boolean }[];
}) {
  const point = useRef(new THREE.Vector3());
  useFrame(({ camera, size }) => {
    for (const pin of pins) {
      const el = pin.ref.current;
      if (!el) continue;
      pin.at(point.current).project(camera);
      const half = el.offsetWidth / 2 + 6;
      const x = Math.min(Math.max((point.current.x * 0.5 + 0.5) * size.width, half), size.width - half);
      const y = (-point.current.y * 0.5 + 0.5) * size.height;
      // A plate hangs from its anchor with its bottom edge there; a total is centred on it.
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, ${pin.bottom ? "-100%" : "-50%"})`;
      el.style.opacity = "1";
    }
  });
  return null;
}

function Plate({
  side,
  vendor,
  label,
  maker,
  color,
  pinRef,
  hidden,
  compact,
}: {
  side: Side;
  vendor: Mark;
  label: string;
  maker: string;
  color: string;
  pinRef: RefObject<HTMLDivElement | null>;
  hidden: boolean;
  compact: boolean;
}) {
  return (
    <div
      ref={pinRef}
      className={`court-card pointer-events-none absolute top-0 left-0 flex items-center gap-2 rounded-2xl px-2.5 py-1.5 opacity-0 ${compact ? "" : "w-52"} ${hidden ? "invisible" : ""}`}
    >
      <Medal vendor={vendor} label={vendor === "unknown" ? label : maker} color={color} className="size-8" />
      <div className="min-w-0">
        <p className="font-display text-base leading-none font-semibold">{side}</p>
        {!compact && <p className="truncate text-sm leading-tight font-bold">{label}</p>}
      </div>
    </div>
  );
}

export function Stage(props: StageProps) {
  const {
    vendors,
    labels,
    makers,
    speaking,
    thinking,
    winner,
    hits,
    retracted,
    margin,
    totals,
    zoomJudge,
    judging,
    gavelPokes,
    onPokeJudge,
  } = props;
  const colors = { PRO: vendorHex(vendors.PRO), CON: vendorHex(vendors.CON) };
  const gavelKey = retracted + gavelPokes;

  // A narrow stage pulls the tables toward the middle; a reduced-motion setting stops walking and bouncing.
  const frame = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => setNarrow(element.clientWidth < element.clientHeight * 1.1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setCalm(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      query.removeEventListener("change", sync);
    };
  }, []);

  const medals = useMemo(
    () => ({
      PRO: makeMedalTexture(vendors.PRO, makers.PRO, colors.PRO),
      CON: makeMedalTexture(vendors.CON, makers.CON, colors.CON),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vendors.PRO, vendors.CON, makers.PRO, makers.CON],
  );
  useEffect(
    () => () => {
      medals.PRO.dispose();
      medals.CON.dispose();
    },
    [medals],
  );

  const moodOf = (side: Side): Mood =>
    !winner || winner === "draw" ? "neutral" : winner === side ? "won" : "lost";

  const pans = { PRO: useRef<THREE.Group>(null), CON: useRef<THREE.Group>(null) };
  const plateRefs = { PRO: useRef<HTMLDivElement>(null), CON: useRef<HTMLDivElement>(null) };
  const anchors = { PRO: useRef<THREE.Group>(null), CON: useRef<THREE.Group>(null) };
  const totalRefs = { PRO: useRef<HTMLSpanElement>(null), CON: useRef<HTMLSpanElement>(null) };

  const pins = useMemo(
    () =>
      (["PRO", "CON"] as const).flatMap((side) => [
        {
          ref: plateRefs[side] as RefObject<HTMLElement | null>,
          bottom: true,
          // Above the mascot's head, wherever it is: at its table or at the bay while it speaks.
          at: (out: THREE.Vector3) => {
            const anchor = anchors[side].current;
            if (!anchor) return out.set(seatOf(side, narrow)[0], 2.6, seatOf(side, narrow)[1]);
            return anchor.getWorldPosition(out);
          },
        },
        {
          ref: totalRefs[side] as RefObject<HTMLElement | null>,
          at: (out: THREE.Vector3) => {
            const pan = pans[side].current;
            if (!pan) return out.set(0, -99, 0);
            pan.getWorldPosition(out);
            return out.add(new THREE.Vector3(0, -2.2, 0.4));
          },
        },
      ]),
    // The refs are stable objects; only the seat positions depend on the layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [narrow],
  );

  return (
    <div ref={frame} className="absolute inset-0 overflow-hidden">
      <Canvas
        orthographic
        shadows
        dpr={[1, 2]}
        camera={{ zoom: 40, position: [24, 25, 39], near: -100, far: 200 }}
        gl={{ antialias: true }}
        aria-label="The courtroom: Jev on the bench, the two models at their tables, the gallery behind the rail"
      >
        <color attach="background" args={[C.ground]} />
        <hemisphereLight args={["#ffffff", "#c9d3e6", 1.6]} />
        <directionalLight
          position={[8, 16, 10]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-16}
          shadow-camera-right={16}
          shadow-camera-top={14}
          shadow-camera-bottom={-14}
          shadow-camera-near={1}
          shadow-camera-far={50}
          shadow-bias={-0.0006}
        />
        <Rig zoom={zoomJudge} calm={calm} narrow={narrow} />
        <Pins pins={pins} />
        <Diorama narrow={narrow} jumpKey={retracted} calm={calm} />
        <Gavel strikeKey={gavelKey} calm={calm} />
        <Scales3D margin={margin} colors={colors} pans={pans} jolt={retracted} calm={calm} />
        <JudgeToy lookAt={speaking} speaking={judging} onPoke={onPokeJudge} calm={calm} />
        {(["PRO", "CON"] as const).map((side) => (
          <Toy
            key={side}
            side={side}
            shape={side === "CON" ? "bean" : shapeOf(vendors[side])}
            color={colors[side]}
            medal={medals[side]}
            atSpot={speaking === side}
            talking={speaking === side && !thinking}
            thinking={speaking === side && thinking}
            mood={moodOf(side)}
            hitKey={hits[side]}
            narrow={narrow}
            calm={calm}
            labelAnchor={anchors[side]}
          />
        ))}
      </Canvas>
      {(["PRO", "CON"] as const).map((side) => (
        <Plate
          key={side}
          side={side}
          vendor={vendors[side]}
          label={labels[side]}
          maker={makers[side]}
          color={colors[side]}
          pinRef={plateRefs[side]}
          hidden={zoomJudge}
          compact={narrow}
        />
      ))}
      {(["PRO", "CON"] as const).map((side) => (
        <span
          key={side}
          ref={totalRefs[side]}
          className={`court-card font-display pointer-events-none absolute top-0 left-0 rounded-full px-2.5 py-0.5 text-lg leading-tight font-semibold opacity-0 ${zoomJudge ? "invisible" : ""}`}
        >
          {totals[side]}
        </span>
      ))}
    </div>
  );
}
