import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="font-heading text-5xl font-bold">AntiHot</h1>
    </div>
  );
}
