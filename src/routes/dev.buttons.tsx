/**
 * Internal harness rendering every Button variant/size so automated tests can
 * assert hover colours (secondary background + white text) and focus rings in
 * light and dark themes. Not linked from navigation, excluded from indexing.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const VARIANTS = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;
const SIZES = ["default", "sm", "lg", "icon"] as const;

export const Route = createFileRoute("/dev/buttons")({
  head: () => ({
    meta: [
      { title: "Button states harness | Foxwood Properties" },
      {
        name: "description",
        content:
          "Internal harness rendering every button variant and size for hover, focus and theme regression tests.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Button states harness | Foxwood Properties" },
      {
        property: "og:description",
        content: "Internal harness for button hover and focus visual regression tests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ButtonHarness,
});

function ButtonHarness() {
  return (
    <div className="container-page py-12 space-y-10" data-testid="button-harness">
      <h1 className="text-2xl font-semibold">Button states harness</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Variants</h2>
        <div className="flex flex-wrap items-center gap-3" data-testid="variant-row">
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} data-testid={`btn-${variant}`}>
              {variant}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Sizes</h2>
        <div className="flex flex-wrap items-center gap-3">
          {SIZES.map((size) => (
            <Button key={size} size={size} data-testid={`btn-size-${size}`} aria-label={`Size ${size}`}>
              {size === "icon" ? "•" : size}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Disabled</h2>
        <div className="flex flex-wrap items-center gap-3">
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} disabled data-testid={`btn-disabled-${variant}`}>
              {variant}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Custom utilities</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary btn-primary-hover" data-testid="btn-utility-primary">
            btn-primary
          </button>
          <button className="btn-secondary" data-testid="btn-utility-secondary">
            btn-secondary
          </button>
          <button className="btn-ghost" data-testid="btn-utility-ghost">
            btn-ghost
          </button>
        </div>
      </section>
    </div>
  );
}
