import logo from "@/assets/foxwood-logo.png";

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
        className="block h-8 sm:h-10 md:h-11 w-auto max-w-[180px] sm:max-w-[220px] md:max-w-none object-contain"
        loading="eager"
        decoding="async"
      />
    </span>
  );
}
