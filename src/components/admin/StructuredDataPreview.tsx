import { CheckCircle2, AlertTriangle, Braces } from "lucide-react";
import {
  auditStructuredData,
  type ValidationResult,
  type Json,
} from "@/lib/structured-data";

function ResultSummary({ result }: { result: ValidationResult }) {
  return result.valid ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
      <CheckCircle2 className="h-4 w-4" /> Valid
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
      <AlertTriangle className="h-4 w-4" /> {result.errors} error{result.errors === 1 ? "" : "s"}
    </span>
  );
}

function JsonBlock({ data }: { data: Json }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-md border border-border bg-muted/50 p-4 text-xs leading-5">
      <code>{JSON.stringify(data, null, 2)}</code>
    </pre>
  );
}

export function StructuredDataPreview() {
  const blocks = auditStructuredData();

  return (
    <section className="space-y-4 rounded-md border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <Braces className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <h2 className="font-bold">Structured-data checks</h2>
          <p className="text-xs text-muted-foreground">
            Generated Organization, AboutPage, and Person markup as published in page metadata.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {blocks.map((block) => (
          <details key={block.key} className="rounded-md border border-border p-4" open={!block.result.valid}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-semibold">{block.label}</span>
                <span className="text-xs text-muted-foreground">{block.page}</span>
              </span>
              <ResultSummary result={block.result} />
            </summary>
            <div className="mt-4 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {block.result.checks.map((check) => (
                  <div key={check.field} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
                    <code>{check.field}</code>
                    <span className={check.ok ? "text-primary" : check.required ? "text-destructive" : "text-muted-foreground"}>
                      {check.ok ? "Pass" : check.required ? "Missing" : "Optional"}
                    </span>
                  </div>
                ))}
              </div>
              <JsonBlock data={block.data} />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}