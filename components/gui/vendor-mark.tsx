import {
  type SimpleIcon,
  siAnthropic,
  siDeepseek,
  siGoogle,
  siMeta,
  siMistralai,
  siMoonshotai,
  siQwen,
} from "simple-icons";
import type { Vendor } from "@/lib/models/registry";

export type Mark = Vendor | "unknown";

// simple-icons has no mark for OpenAI or xAI, and its X mark is not xAI's, so those two and any
// unknown maker get a monogram rather than a stand-in.
const ICONS: Partial<Record<Mark, SimpleIcon>> = {
  anthropic: siAnthropic,
  google: siGoogle,
  deepseek: siDeepseek,
  moonshot: siMoonshotai,
  alibaba: siQwen,
  mistral: siMistralai,
  meta: siMeta,
};

export const iconFor = (vendor: Mark): SimpleIcon | undefined => ICONS[vendor];

// The one maker colour light enough that paper-white on it fails contrast.
export const markOn = (vendor: Mark): "ink" | "paper" => (vendor === "deepseek" ? "ink" : "paper");

/** The maker's mark on a flat disc in the maker's colour. */
export function Medal({
  vendor,
  label,
  color,
  className = "size-12",
}: {
  vendor: Mark;
  label: string;
  color: string;
  className?: string;
}) {
  const icon = iconFor(vendor);
  const fill = markOn(vendor) === "ink" ? "var(--court-ink)" : "var(--court-paper)";
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={icon?.title ?? label} className={`${className} shrink-0`}>
      <circle cx="32" cy="32" r="31" fill={color} />
      {icon ? (
        <path d={icon.path} fill={fill} transform="translate(14 14) scale(1.5)" />
      ) : (
        <text
          x="32"
          y="43"
          textAnchor="middle"
          fontSize="30"
          fontWeight="700"
          fill={fill}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {label.trim().charAt(0).toUpperCase() || "?"}
        </text>
      )}
    </svg>
  );
}
