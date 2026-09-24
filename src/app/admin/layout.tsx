import { BottomNav } from "@/components/bottom-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-28">
      {children}
      <BottomNav role="admin" />
    </div>
  );
}
