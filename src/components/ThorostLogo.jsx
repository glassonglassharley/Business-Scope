import Image from "next/image";

/**
 * Header brand mark: the actual logo artwork (public/thorost-logo.png,
 * background removed + trimmed to content) rather than redrawn, so it
 * matches the reference exactly. Shown at the same ~2:1 aspect ratio on
 * every breakpoint, just scaled down by height on mobile.
 */
export function ThorostLogo({ className = "h-8 w-auto sm:h-11" }) {
  return <Image src="/thorost-logo.png" alt="" width={928} height={472} className={className} priority />;
}
