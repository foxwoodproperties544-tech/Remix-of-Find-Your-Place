import { ShieldCheck } from "lucide-react";

type Size = "sm" | "md";

export function VerifiedBadge({ size = "sm", label = "Verified", className = "" }: { size?: Size; label?: string; className?: string }) {
  const s = size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1";
  return (
    <span
      title="Identity & documents reviewed by Foxwood"
      className={`inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground font-semibold ${s} ${className}`}
    >
      <ShieldCheck className="h-3 w-3" /> {label}
    </span>
  );
}

export function KycStatusPill({ status }: { status: "none" | "pending" | "approved" | "rejected" | null | undefined }) {
  if (!status || status === "none") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground text-[11px] px-2 py-0.5 font-medium">Not verified</span>
  );
  if (status === "pending") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 text-secondary text-[11px] px-2 py-0.5 font-semibold">KYC pending</span>
  );
  if (status === "rejected") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive text-[11px] px-2 py-0.5 font-semibold">KYC rejected</span>
  );
  return <VerifiedBadge label="KYC verified" />;
}
