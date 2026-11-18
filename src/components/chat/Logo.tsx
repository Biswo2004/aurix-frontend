import { cn } from "@/lib/utils";
export function LogoMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-lg", className)} style={{ background: "var(--gradient-logo)" }}>
      <svg viewBox="0 0 24 24" className="size-[60%]" fill="none">
        <path d="M12 3 21 19H3L12 3Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="14" r="2" fill="white" />
      </svg>
    </span>
  );
}
