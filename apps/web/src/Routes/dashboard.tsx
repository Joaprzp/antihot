import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/Dashboard/Dashboard";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});
