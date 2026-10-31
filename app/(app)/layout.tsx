import { MobileBar } from "@/components/shell/MobileBar";
import { Sidebar } from "@/components/shell/Sidebar";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileBar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
