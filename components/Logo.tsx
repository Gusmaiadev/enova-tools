export function Logo({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline gap-[0.4ch] font-display text-[1.35rem] font-bold tracking-tight ${className}`}
    >
      <span className="text-text">E-nova</span>
      <span className="text-blue">Tools</span>
    </span>
  )
}
