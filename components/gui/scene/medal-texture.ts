import * as THREE from "three";
import { iconFor, markOn, type Mark } from "../vendor-mark";
import { C } from "./palette";

/** The maker's mark on a disc, painted onto a canvas for the stage. The mark is a Path2D of the icon's own path. */
export function makeMedalTexture(vendor: Mark, label: string, color: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const ink = markOn(vendor) === "ink" ? C.ink : C.white;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    const icon = iconFor(vendor);
    if (icon) {
      const scale = (size * 0.58) / 24;
      ctx.save();
      ctx.translate((size - 24 * scale) / 2, (size - 24 * scale) / 2);
      ctx.scale(scale, scale);
      ctx.fillStyle = ink;
      ctx.fill(new Path2D(icon.path));
      ctx.restore();
    } else {
      ctx.fillStyle = ink;
      ctx.font = "700 150px ui-rounded, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label.trim().charAt(0).toUpperCase() || "?", size / 2, size / 2 + 8);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
