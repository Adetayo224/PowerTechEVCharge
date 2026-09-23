import { BottomNav } from "@/components/bottom-nav";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-28">
      {children}
      <BottomNav role="operator" />
    </div>
  );
}
