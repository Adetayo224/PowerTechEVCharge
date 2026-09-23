import { BottomNav } from "@/components/bottom-nav";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-28">
      {children}
      <BottomNav role="driver" />
    </div>
  );
}
