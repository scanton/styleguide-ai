interface PlaceholderProps {
  width: number;
  height: number;
  alt: string;
  className?: string;
}

export function Placeholder({ width, height, alt, className }: PlaceholderProps) {
  const aspectRatio = height / width;
  const paddingBottom = `${(aspectRatio * 100).toFixed(2)}%`;

  return (
    <div
      className={`relative overflow-hidden bg-muted ${className ?? ""}`}
      style={{ paddingBottom, width: "100%", maxWidth: width }}
      role="img"
      aria-label={alt}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-muted-foreground">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span className="text-xs text-center leading-snug opacity-60">
          image pending
        </span>
      </div>
    </div>
  );
}
