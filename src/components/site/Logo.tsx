import logoAsset from "@/assets/foxwood-logo-main.png.asset.json";
const logo = logoAsset.url;

const ALT = "Foxwood Properties — Your gateway to prime deals";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label={ALT}
      className={`inline-flex items-center ${className}`}
    >
      <img
        src={logo}
        alt={ALT}
        className="block h-9 sm:h-11 md:h-12 w-auto max-w-[210px] sm:max-w-[270px] md:max-w-[320px] object-contain"
        loading="eager"
        decoding="async"
      />
    </span>
  );
}
