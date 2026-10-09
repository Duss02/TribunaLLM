/** The TribunaLLM mark: a pair of scales whose pans are two speech bubbles, the two models being weighed. */
export function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="8" fill="#2f5df5" />
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M16 8.5V24M11 24.5h10M6.5 11h19" />
        <path d="M8 11.4 5.2 15M8 11.4l2.8 3.6M24 11.4 21.2 15M24 11.4l2.8 3.6" strokeWidth="1.2" />
      </g>
      <circle cx="16" cy="8" r="1.8" fill="#f2c14e" />
      <path d="M5.5 15h5a2.5 2.5 0 0 1 0 5H8l-1.8 1.7.2-1.7h-.9a2.5 2.5 0 0 1 0-5Z" fill="#fff" />
      <path d="M21.5 15h5a2.5 2.5 0 0 1 0 5h-.9l.2 1.7L24 20h-2.5a2.5 2.5 0 0 1 0-5Z" fill="#fff" />
    </svg>
  );
}

/** The mark with the name, "LLM" set in the brand blue. */
export function Logo({
  className = "text-xl",
  markClassName = "size-9",
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-semibold tracking-tight ${className}`}>
      <LogoMark className={markClassName} />
      <span>
        Tribuna<span className="text-[#2f5df5]">LLM</span>
      </span>
    </span>
  );
}
