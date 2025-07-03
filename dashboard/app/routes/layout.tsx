import { Outlet, Link, useLocation } from "react-router";
import { cn } from "~/lib/utils";
import {
  LayoutDashboard,
  Tag,
  Settings,
  GitCommit
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { useState, useEffect } from "react";
import { useSchedulerStore } from "~/store/schedulerStore";
import { StagedChangesPanel } from "~/components/staged-changes/StagedChangesPanel";

const navigation = [
  {
    path: "/",
    title: "Queues",
    icon: LayoutDashboard,
  },
  {
    path: "/node-labels",
    title: "Node Labels",
    icon: Tag,
  },
  {
    path: "/global-settings",
    title: "Global Settings",
    icon: Settings,
  },
];

export default function Layout() {
  const location = useLocation();
  const [stagedChangesPanelOpen, setStagedChangesPanelOpen] = useState(false);
  const loadInitialData = useSchedulerStore(state => state.loadInitialData);
  const stagedChanges = useSchedulerStore(state => state.stagedChanges);

  useEffect(() => {
    loadInitialData().catch(err => {
      console.error('Failed to load initial data:', err);
    });
  }, [loadInitialData]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card">
        <div className="flex h-14 items-center border-b px-4">
          <h1 className="text-lg font-semibold">YARN Scheduler</h1>
        </div>
        <nav className="space-y-1 p-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                           (item.path === "/" && location.pathname.startsWith("/queue/"));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>


      
      <StagedChangesPanel 
        open={stagedChangesPanelOpen} 
        onClose={() => setStagedChangesPanelOpen(false)}
        onOpen={() => setStagedChangesPanelOpen(true)}
      />
    </div>
  );
}