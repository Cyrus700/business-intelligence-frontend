import RequireAuth from "@/components/dashboard/RequireAuth";
import DashboardChrome from "@/components/dashboard/DashboardChrome";
import { DashboardFiltersProvider } from "@/lib/filters";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <DashboardFiltersProvider>
        <DashboardChrome>{children}</DashboardChrome>
      </DashboardFiltersProvider>
    </RequireAuth>
  );
}
