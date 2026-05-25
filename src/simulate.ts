import { buildDemoIntentMatrix } from "./distributions.js";
import {
  computeMetrics,
  generateIntents,
  schedulePosts,
} from "./scheduler.js";
import type { ScheduledPost } from "./types.js";

const USER_COUNT = 5;
const PLATFORM_COUNT = 3;
const DAY_SECONDS = 86_400;
const DELTA_SECONDS = 1;

const config = {
  daySeconds: DAY_SECONDS,
  deltaSeconds: DELTA_SECONDS,
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function printTable(posts: ScheduledPost[], limit: number): void {
  const header = "user | platform | desired  | scheduled | delay(s)";
  console.log(header);
  console.log("-".repeat(header.length));

  const slice = posts
    .slice()
    .sort((a, b) => a.scheduledTime - b.scheduledTime)
    .slice(0, limit);

  for (const post of slice) {
    const delay = post.scheduledTime - post.desiredTime;
    console.log(
      `${post.userId}    | ${post.platformId}        | ${formatTime(post.desiredTime)} | ${formatTime(post.scheduledTime)} | ${delay}`,
    );
  }
}

function main(): void {
  const matrix = buildDemoIntentMatrix(
    USER_COUNT,
    PLATFORM_COUNT,
    DAY_SECONDS,
  );
  const intents = generateIntents(matrix, USER_COUNT, PLATFORM_COUNT);
  const scheduled = schedulePosts(intents, config);
  const metrics = computeMetrics(scheduled);

  console.log("Social Post Scheduler — simulation\n");
  console.log(`Users (N): ${USER_COUNT}`);
  console.log(`Platforms (M): ${PLATFORM_COUNT}`);
  console.log(`Slot gap (delta): ${DELTA_SECONDS}s\n`);
  console.log("--- Schedule (first rows) ---");
  printTable(scheduled, 15);
  console.log("\n--- Metrics ---");
  console.log(`Total posts: ${metrics.totalPosts}`);
  console.log(`User collisions: ${metrics.collisions}`);
  console.log(`Average delay: ${metrics.avgDelaySec.toFixed(2)}s`);
  console.log(`Max delay: ${metrics.maxDelaySec}s`);
}

main();
