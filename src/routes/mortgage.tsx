import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calculator, TrendingUp, Wallet, Percent } from "lucide-react";
import { formatKsh } from "@/lib/mock-data";
import heroTools from "@/assets/hero-tools.jpg";

export const Route = createFileRoute("/mortgage")({
  head: () => ({
    meta: [
      { title: "Mortgage Calculator — Foxwood Properties" },
      { name: "description", content: "Estimate your monthly home loan repayments in Kenya. Free mortgage calculator by Foxwood Properties." },
      { property: "og:title", content: "Mortgage Calculator — Foxwood Properties" },
      { property: "og:description", content: "Estimate your monthly home loan repayments in Kenya." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Mortgage,
});

function Mortgage() {
  const [price, setPrice] = useState(10_000_000);
  const [down, setDown] = useState(2_000_000);
  const [rate, setRate] = useState(13.5);
  const [years, setYears] = useState(20);

  const { monthly, total, interest, principal } = useMemo(() => {
    const principal = Math.max(price - down, 0);
    const r = rate / 100 / 12;
    const n = years * 12;
    const monthly = r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
    const total = monthly * n;
    return { monthly: isFinite(monthly) ? monthly : 0, total, interest: total - principal, principal };
  }, [price, down, rate, years]);

  return (
    <>
      <section className="bg-primary-soft border-b border-border">
        <div className="container-page py-10 md:py-14">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-background rounded-full px-3 py-1"><Calculator className="h-3.5 w-3.5" /> Financial Tools</div>
          <h1 className="text-3xl md:text-4xl font-bold mt-3">Mortgage Calculator</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">Estimate your monthly repayments and total cost. Adjust the sliders to see how price, deposit, interest rate and term affect your loan.</p>
        </div>
      </section>

      <section className="container-page py-10 md:py-14 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-soft space-y-6">
          <Field label="Property Price" value={price} onChange={setPrice} min={500_000} max={200_000_000} step={100_000} format={formatKsh} />
          <Field label="Down Payment" value={down} onChange={setDown} min={0} max={price} step={50_000} format={formatKsh} hint={`${((down / price) * 100 || 0).toFixed(1)}% of price`} />
          <Field label="Interest Rate (annual)" value={rate} onChange={setRate} min={1} max={30} step={0.1} format={(v) => `${v.toFixed(2)}%`} />
          <Field label="Loan Term (years)" value={years} onChange={setYears} min={1} max={30} step={1} format={(v) => `${v} years`} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/85 text-primary-foreground p-8 shadow-glow">
            <p className="text-sm opacity-90">Estimated monthly payment</p>
            <p className="text-4xl md:text-5xl font-bold mt-2">{formatKsh(Math.round(monthly))}</p>
            <p className="text-xs opacity-80 mt-2">Based on {years}-year loan at {rate}% APR</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat icon={<Wallet className="h-4 w-4" />} label="Loan amount" value={formatKsh(principal)} />
            <Stat icon={<Percent className="h-4 w-4" />} label="Total interest" value={formatKsh(Math.round(interest))} />
            <Stat icon={<TrendingUp className="h-4 w-4" />} label="Total repayment" value={formatKsh(Math.round(total))} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold text-sm">Payment breakdown</h3>
            <div className="mt-4 h-3 rounded-full bg-muted overflow-hidden flex">
              <div className="bg-primary" style={{ width: `${(principal / (principal + interest)) * 100 || 0}%` }} />
              <div className="bg-secondary" style={{ width: `${(interest / (principal + interest)) * 100 || 0}%` }} />
            </div>
            <div className="mt-3 flex justify-between text-xs">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" /> Principal</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-secondary" /> Interest</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Estimates only. Actual rates and payments depend on your lender, income and property valuation. Contact Foxwood Properties for tailored financing guidance.</p>
        </div>
      </section>
    </>
  );
}

function Field({ label, value, onChange, min, max, step, format, hint }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; format: (v: number) => string; hint?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm font-bold text-primary">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-2 accent-primary" />
      <div className="mt-2 flex items-center gap-2">
        <input type="number" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
      <div className="mt-1 font-bold text-sm">{value}</div>
    </div>
  );
}
