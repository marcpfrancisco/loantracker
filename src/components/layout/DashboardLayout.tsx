import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { GlobalLoadingBar } from "./GlobalLoadingBar";

export default function DashboardLayout() {
  return (
    <div className="bg-background flex h-screen w-full overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar />

      {/* Main content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar — hidden on desktop */}
        <TopBar />

        {/* Thin loading indicator — synced with all React Query fetches */}
        <GlobalLoadingBar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav — hidden on desktop */}
      <BottomNav />
    </div>
  );
}
