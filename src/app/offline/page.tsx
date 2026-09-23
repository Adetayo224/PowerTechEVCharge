import { LogoMark } from "@/components/logo";

export default function OfflinePage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6 text-center bg-background">
      <div className="max-w-sm">
        <LogoMark size={56} />
        <h1 className="mt-6 text-2xl font-bold tracking-tight">You are offline</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">
          Reconnect to find and book chargers.
        </p>
      </div>
    </main>
  );
}
