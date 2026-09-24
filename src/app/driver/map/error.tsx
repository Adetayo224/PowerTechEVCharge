"use client";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function MapError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[driver/map] boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 safe-top safe-bottom">
      <div className="w-full max-w-md">
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-9 w-9 rounded-full bg-[var(--accent-soft)] border border-[var(--accent)]/25 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold">The map failed to load</div>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Something went wrong while rendering the map. You can retry, or go back to the home screen.
              </p>
              <pre className="mt-3 max-h-56 overflow-auto rounded-xl bg-[var(--surface)] border border-[var(--border)] p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[var(--muted-foreground)]">
{error.message || "Unknown error"}{error.digest ? `\n\ndigest: ${error.digest}` : ""}
              </pre>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => reset()} className="flex-1"><RotateCcw className="h-4 w-4" /> Retry</Button>
                <Link href="/driver/home"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Home</Button></Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
