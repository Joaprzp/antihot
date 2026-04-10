import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/Landing/Landing";

export const Route = createFileRoute("/")({
  component: Landing,
});
