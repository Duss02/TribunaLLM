// Hex values for the 3D diorama. The page chrome uses the `.court` tokens in globals.css; where a colour
// appears in both (ground, blue, ink, signal) it is the same value, because three.js cannot read CSS variables.
export const C = {
  ground: "#e9edf5",
  platform: "#f8f9fc",
  platformEdge: "#d9dfea",
  blue: "#2f5df5",
  blueDark: "#2146c7",
  blueSoft: "#d6e0ff",
  white: "#ffffff",
  plaster: "#f3f5fa",
  glass: "#bfe3f2",
  tan: "#e2b67c",
  tanDark: "#c4935a",
  tape: "#f1d3a4",
  yellow: "#f2c14e",
  ink: "#1b2238",
  signal: "#d63c22",
  leaf: "#5cc283",
  trunk: "#9a7650",
  jev: "#f7d774",
  wig: "#fbfaf6",
  pan: "#ffffff",
} as const;

export const VENDOR_HEX: Record<string, string> = {
  anthropic: "#3e7cf0",
  openai: "#f27d4a",
  google: "#3fbf7f",
  deepseek: "#f5b72b",
  moonshot: "#f06fb0",
  alibaba: "#7a6cf2",
  mistral: "#ff8a3d",
  meta: "#ef5a5a",
  xai: "#8b93a8",
  unknown: "#9aa3b5",
};

export const vendorHex = (vendor: string) => VENDOR_HEX[vendor] ?? VENDOR_HEX.unknown;

export type Shape = "cloud" | "heart" | "frog" | "bean";

const SHAPES: Record<string, Shape> = {
  anthropic: "cloud",
  openai: "heart",
  google: "frog",
  deepseek: "bean",
  moonshot: "heart",
  alibaba: "bean",
  mistral: "frog",
  meta: "cloud",
  xai: "bean",
};

/** Each maker gets a body shape, so two different makers never look like the same toy in another colour. */
export const shapeOf = (vendor: string): Shape => SHAPES[vendor] ?? "cloud";
