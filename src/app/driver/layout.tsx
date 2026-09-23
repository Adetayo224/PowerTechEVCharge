import { BottomNav } from "@/components/bottom-nav";
import { DriverProvider } from "@/lib/driver-context";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <DriverProvider>
      <div className="min-h-dvh pb-28">
        {children}
        <BottomNav role="driver" />
      </div>
    </DriverProvider>
  );
}
