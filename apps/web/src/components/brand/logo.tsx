import { cn } from "@/lib/utils";

/** The Cogwork cog mark — a single geometric gear with a "run" notch center. */
export function CogMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2.2l1.7 1.0 2-0.3 1.0 1.7 1.7 1.0-0.3 2 1.0 1.7-1.0 1.7 0.3 2-1.7 1.0-1.0 1.7-2-0.3-1.7 1.0-1.7-1.0-2 0.3-1.0-1.7-1.7-1.0 0.3-2-1.0-1.7 1.0-1.7-0.3-2 1.7-1.0 1.0-1.7 2 0.3 1.7-1.0z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="3.4" fill="var(--paper)" />
      <path d="M11 10.4l3 1.6-3 1.6v-3.2z" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className, markSize = 22 }: { className?: string; markSize?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CogMark size={markSize} className="text-violet" />
      <span className="font-display font-bold text-ink" style={{ fontSize: markSize - 2 }}>
        Cogwork
      </span>
    </span>
  );
}
