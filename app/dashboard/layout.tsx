import RequireAuth from "@/components/dashboard/RequireAuth";
import DashboardChrome from "@/components/dashboard/DashboardChrome";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <DashboardChrome>{children}</DashboardChrome>
    </RequireAuth>
  );
}
