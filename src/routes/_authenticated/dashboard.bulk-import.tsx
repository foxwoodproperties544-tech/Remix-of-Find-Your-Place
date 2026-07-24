import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { bulkImportProperties } from "@/lib/bulk-import.functions";
import { toast } from "sonner";
import { UploadCloud, FileSpreadsheet, Check, X, Download, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/bulk-import")({
  component: BulkImport,
  head: () => ({ meta: [{ title: "Bulk import listings — Foxwood Properties" }] }),
});

const HEADERS = [
  "title","description","price","price_suffix","category","property_type",
  "county","town","area","bedrooms","bathrooms","size","features","amenities",
  "contact_phone","contact_whatsapp","video_url","tour_url","images","lat","lng",
];

const SAMPLE = [
  HEADERS.join(","),
  [
    `"Modern 3BR Apartment in Westlands"`,
    `"Spacious apartment with rooftop pool, gym and 24hr security. Walking distance to Sarit."`,
    `18500000`, ``, `For Sale`, `Apartments`, `Nairobi`, `Westlands`, `Rhapta Road`,
    `3`, `2`, `1450 sq ft`, `"Balcony,Parking,Backup Power"`, `"Pool,Gym,CCTV"`,
    `+254700000000`, `+254700000000`, ``, ``, `"https://example.com/1.jpg|https://example.com/2.jpg"`,
    `-1.2670`, `36.8020`,
  ].join(","),
].join("\n");

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = [];
  let cur = ""; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (cur.length) { lines.push(cur); cur = ""; }
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else cur += ch;
  }
  if (cur.length) lines.push(cur);

  const splitLine = (line: string) => {
    const out: string[] = []; let c = ""; let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') { c += '"'; i++; } else q = !q;
      } else if (ch === "," && !q) { out.push(c); c = ""; }
      else c += ch;
    }
    out.push(c);
    return out.map((s) => s.trim());
  };

  const headers = splitLine(lines[0] ?? "").map((h) => h.toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    if (cells.every((c) => c === "")) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, j) => (row[h] = cells[j] ?? ""));
    rows.push(row);
  }
  return { headers, rows };
}

function BulkImport() {
  const importFn = useServerFn(bulkImportProperties);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ row: number; ok: boolean; error?: string; id?: string }[] | null>(null);

  function loadFile(f: File) {
    setResults(null);
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCSV(String(reader.result ?? ""));
        setRows(parsed.rows);
        toast.success(`Parsed ${parsed.rows.length} rows`);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to parse CSV");
      }
    };
    reader.readAsText(f);
  }

  async function runImport() {
    if (!rows.length) return;
    setBusy(true);
    setResults(null);
    try {
      const res = await importFn({ data: { rows } });
      setResults(res.results);
      toast.success(`Imported ${res.successes} of ${res.total} listings as drafts`);
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    } finally {
      setBusy(false);
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "foxwood-listings-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="container-page py-10 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><FileSpreadsheet className="h-7 w-7 text-primary" /> Bulk import listings</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Upload a CSV to create up to 200 listings at once. Imports are saved as <b>drafts</b> — open each one from
            My listings, review, then choose a package to publish.
          </p>
        </div>
        <button onClick={downloadSample} className="btn-ghost border border-border inline-flex items-center gap-2">
          <Download className="h-4 w-4" /> Download template
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-10 cursor-pointer text-center hover:bg-muted/50 transition">
          <input type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ""; }} />
          <UploadCloud className="h-8 w-8 text-primary" />
          <div className="text-sm font-semibold">Choose a CSV file</div>
          <div className="text-xs text-muted-foreground">
            Headers required: {HEADERS.slice(0, 6).join(", ")}, … (see template)
          </div>
          {fileName && <div className="mt-2 text-xs text-primary font-medium">{fileName} — {rows.length} rows ready</div>}
        </label>

        {rows.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 text-sm font-semibold">Preview (first 5 rows)</div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>{["Title","Category","Type","County","Town","Price"].map(h => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 truncate max-w-[280px]">{r.title}</td>
                      <td className="px-3 py-2">{r.category}</td>
                      <td className="px-3 py-2">{r.property_type}</td>
                      <td className="px-3 py-2">{r.county}</td>
                      <td className="px-3 py-2">{r.town}</td>
                      <td className="px-3 py-2">KSh {Number(r.price || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setRows([]); setFileName(""); setResults(null); }} className="btn-ghost border border-border">Clear</button>
              <button onClick={runImport} disabled={busy} className="btn-primary btn-primary-hover inline-flex items-center gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? "Importing…" : `Import ${rows.length} listings`}
              </button>
            </div>
          </div>
        )}
      </div>

      {results && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Import results</h2>
          <ul className="mt-3 space-y-1 text-sm max-h-96 overflow-y-auto">
            {results.map((r) => (
              <li key={r.row} className={`flex items-start gap-2 rounded-md px-2 py-1 ${r.ok ? "text-emerald-700" : "text-destructive"}`}>
                {r.ok ? <Check className="h-4 w-4 mt-0.5 shrink-0" /> : <X className="h-4 w-4 mt-0.5 shrink-0" />}
                <span className="font-semibold w-16">Row {r.row}</span>
                <span className="flex-1">{r.ok ? `Created draft` : r.error}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end">
            <Link to="/dashboard" className="btn-primary btn-primary-hover">Go to My listings</Link>
          </div>
        </div>
      )}
    </div>
  );
}
