import { LocateFixed, Loader2, X, Compass } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RADIUS_OPTIONS, RADIUS_PLACES, placeCoords } from "@/lib/geo";

export interface RadiusValue {
  lat: string;
  lng: string;
  radius: string;
  nearLabel: string;
}

interface Props {
  value: RadiusValue;
  onChange: (v: Partial<RadiusValue>) => void;
  matchCount?: number;
}

/** "Search within X km of a place" control for the listings page. */
export function RadiusFilter({ value, onChange, matchCount }: Props) {
  const [locating, setLocating] = useState(false);
  const active = !!(value.lat && value.lng);

  function pickPlace(name: string) {
    if (!name) {
      onChange({ lat: "", lng: "", nearLabel: "" });
      return;
    }
    const c = placeCoords(name);
    if (!c) return;
    onChange({ lat: String(c.lat), lng: String(c.lng), nearLabel: name, radius: value.radius || "10" });
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Location isn't available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({
          lat: pos.coords.latitude.toFixed(5),
          lng: pos.coords.longitude.toFixed(5),
          nearLabel: "My location",
          radius: value.radius || "10",
        });
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location. Pick a town instead.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold inline-flex items-center gap-1.5">
          <Compass className="h-4 w-4 text-primary" /> Search by radius
        </h4>
        {active && (
          <button
            onClick={() => onChange({ lat: "", lng: "", nearLabel: "" })}
            className="text-xs text-muted-foreground hover:text-secondary inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <select
          aria-label="Search centre point"
          value={RADIUS_PLACES.includes(value.nearLabel) ? value.nearLabel : ""}
          onChange={(e) => pickPlace(e.target.value)}
          className="w-full rounded-lg border border-border bg-field px-3 py-2 text-sm"
        >
          <option value="">Choose a centre point…</option>
          {RADIUS_PLACES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="btn-ghost w-full !py-2 text-xs justify-center"
        >
          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
          Use my location
        </button>

        <div>
          <label className="text-xs text-muted-foreground">Within</label>
          <select
            aria-label="Search radius"
            value={value.radius || "10"}
            disabled={!active}
            onChange={(e) => onChange({ radius: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-field px-3 py-2 text-sm disabled:opacity-50"
          >
            {RADIUS_OPTIONS.map((km) => (
              <option key={km} value={km}>{km} km</option>
            ))}
          </select>
        </div>

        {active && (
          <p className="text-[11px] text-muted-foreground">
            Showing listings within {value.radius || 10} km of <span className="font-medium text-foreground">{value.nearLabel || "your point"}</span>
            {typeof matchCount === "number" ? ` · ${matchCount} match${matchCount === 1 ? "" : "es"}` : ""}.
          </p>
        )}
      </div>
    </div>
  );
}
