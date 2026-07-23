import type { LucideIcon } from "lucide-react";

/* §1 / §0.1 — Single icon family (Lucide), 1.5px stroke, brand colors only.
   Always use this wrapper rather than a bare Lucide component, so stroke width
   and color discipline are enforced in one place. */

const iconColors = {
  brand: "text-brand",
  ink: "text-ink",
  evidence: "text-evidence",
  gold: "text-gold",
  slate: "text-slate",
  paper: "text-paper",
  current: "text-current",
} as const;

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

type IconProps = {
  icon: LucideIcon;
  /** Brand color token. Defaults to inheriting the parent's color. */
  color?: keyof typeof iconColors;
  size?: keyof typeof iconSizes;
  className?: string;
  /** Provide when the icon carries meaning on its own; otherwise it is hidden
      from assistive tech as decoration (§3.5). */
  label?: string;
};

export function Icon({
  icon: LucideComponent,
  color = "current",
  size = "md",
  className = "",
  label,
}: IconProps) {
  return (
    <LucideComponent
      size={iconSizes[size]}
      strokeWidth={1.5}
      className={`${iconColors[color]} ${className}`.trim()}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}

export { iconSizes, iconColors };
