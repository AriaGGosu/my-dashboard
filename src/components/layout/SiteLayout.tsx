import { Outlet } from "react-router-dom";
import { GridOverlay } from "./GridOverlay";
import { FloatingDock } from "./FloatingDock";

export function SiteLayout() {
  return (
    <div className="min-h-screen bg-[#070707] relative overflow-x-hidden">
      <GridOverlay />
      <main className="relative z-10 min-h-screen">
        <Outlet />
      </main>
      <FloatingDock />
    </div>
  );
}
