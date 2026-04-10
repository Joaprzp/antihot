import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="font-heading text-3xl font-bold">Dashboard</h1>
    </div>
  );
}
