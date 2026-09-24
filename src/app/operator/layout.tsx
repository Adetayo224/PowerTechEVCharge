import { BottomNav } from "@/components/bottom-nav";
import { OperatorClaimStations } from "@/components/operator-claim-stations";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-28">
      {children}
      <OperatorClaimStations />
      <BottomNav role="operator" />
    </div>
  );
}
