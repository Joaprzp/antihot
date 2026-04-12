import { createRootRoute, Outlet } from "@tanstack/react-router";
import { FeedbackWidget } from "@/Shared/FeedbackWidget";

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <FeedbackWidget />
    </>
  ),
});
