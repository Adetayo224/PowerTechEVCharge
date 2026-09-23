export default function OfflinePage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">You are offline</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">Reconnect to find and book chargers.</p>
      </div>
    </main>
  );
}
