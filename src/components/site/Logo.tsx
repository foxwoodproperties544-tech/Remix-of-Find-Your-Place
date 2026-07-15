import logo from "@/assets/foxwood-logo.jpg";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="Foxwood Properties — Your gateway to prime deals"
      className={`h-10 md:h-11 w-auto object-contain ${className}`}
    />
  );
}
