import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/blog")({
  component: BlogDashboardLayout,
});

function BlogDashboardLayout() {
  return <Outlet />;
}