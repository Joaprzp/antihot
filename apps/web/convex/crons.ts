import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily at 03:00 Argentina time (06:00 UTC, since Argentina is UTC-3)
crons.daily(
  "daily price scrape",
  { hourUTC: 6, minuteUTC: 0 },
  internal.cronScrape.runDailyScrape,
);

export default crons;
