import Image from "next/image";
import { clsx } from "@/lib/cx";
import { BRAND } from "@/lib/content";

// The artwork already contains the "InsightFlow" wordmark, so nothing should
// print the brand name next to it. Three prepared assets (background removed,
// padding trimmed):
//   lockup      — horizontal mark + wordmark, for light surfaces
//   lockup-dark — same with the navy half lifted to white, for dark surfaces
//   mark        — square symbol only, for tight spots (icons, collapsed rails)
const ASSETS = {
  lockup: { src: "/images/insightflow-lockup.png", w: 1102, h: 240 },
  "lockup-dark": { src: "/images/insightflow-lockup-dark.png", w: 1102, h: 240 },
  mark: { src: "/images/insightflow-mark.png", w: 256, h: 256 },
} as const;

export default function BrandLogo({
  height = 32,
  onDark = false,
  variant = "lockup",
  priority = false,
  imgClassName,
  className,
}: {
  /** Rendered height in px — width follows the artwork's aspect ratio. */
  height?: number;
  onDark?: boolean;
  variant?: "lockup" | "mark";
  priority?: boolean;
  imgClassName?: string;
  className?: string;
}) {
  const asset = ASSETS[variant === "mark" ? "mark" : onDark ? "lockup-dark" : "lockup"];

  return (
    <span className={clsx("inline-flex shrink-0 items-center", className)}>
      <Image
        src={asset.src}
        alt={BRAND.name}
        width={asset.w}
        height={asset.h}
        priority={priority}
        sizes={`${Math.round((height * asset.w) / asset.h)}px`}
        style={{ height, width: "auto" }}
        className={clsx("w-auto object-contain", imgClassName)}
      />
    </span>
  );
}
