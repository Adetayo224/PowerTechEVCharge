import { BottomNav } from "@/components/bottom-nav";
import { DriverProvider } from "@/lib/driver-context";
import { VehiclePrompt } from "@/components/vehicle-prompt";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <DriverProvider>
      <div className="min-h-dvh pb-28">
        {children}
        <VehiclePrompt />
        <BottomNav role="driver" />
      </div>
    </DriverProvider>
  );
}
