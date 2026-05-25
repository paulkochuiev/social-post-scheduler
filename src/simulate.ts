import { buildDemoIntentMatrix } from "./distributions.js";
import { PublishQueue } from "./queue.js";
import {
  computeMetrics,
  generateIntents,
  generateSynchronizedIntents,
  schedulePosts,
} from "./scheduler.js";
import type { PostIntent, ScheduledPost, SchedulerConfig } from "./types.js";

const DAY_SECONDS = 86_400;
const DELTA_SECONDS = 1;

const defaultConfig: SchedulerConfig = {
  daySeconds: DAY_SECONDS,
  deltaSeconds: DELTA_SECONDS,
};

type ScenarioName = "normal" | "congested";

interface ScenarioParams {
  name: ScenarioName;
  userCount: number;
  platformCount: number;
  buildIntents: (n: number, m: number) => PostIntent[];
  sortByDelay: boolean;
}

const scenarios: ScenarioParams[] = [
  {
    name: "normal",
    userCount: 5,
    platformCount: 3,
    buildIntents: (n, m) =>
      generateIntents(buildDemoIntentMatrix(n, m, DAY_SECONDS), n, m),
    sortByDelay: false,
  },
  {
    name: "congested",
    userCount: 20,
    platformCount: 2,
    buildIntents: (n, m) => generateSynchronizedIntents(n, m, 43_200),
    sortByDelay: true,
  },
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function printTable(posts: ScheduledPost[], limit: number, sortByDelay: boolean): void {
  const header = "user | platform | desired  | scheduled | delay(s)";
  console.log(header);
  console.log("-".repeat(header.length));

  let slice = posts.slice().sort((a, b) => a.scheduledTime - b.scheduledTime);

  if (sortByDelay) {
    slice = posts
      .slice()
      .sort(
        (a, b) =>
          b.scheduledTime -
          b.desiredTime -
          (a.scheduledTime - a.desiredTime),
      );
  }

  slice = slice.slice(0, limit);

  for (const post of slice) {
    const delay = post.scheduledTime - post.desiredTime;
    console.log(
      `${post.userId}    | ${post.platformId}        | ${formatTime(post.desiredTime)} | ${formatTime(post.scheduledTime)} | ${delay}`,
    );
  }
}

function runScenario(params: ScenarioParams): void {
  const { name, userCount, platformCount, buildIntents, sortByDelay } = params;

  console.log(`\n=== Scenario: ${name} (N=${userCount}, M=${platformCount}) ===\n`);

  const intents = buildIntents(userCount, platformCount);
  const scheduled = schedulePosts(intents, defaultConfig);
  const queue = new PublishQueue(scheduled);
  const metrics = computeMetrics(scheduled);

  console.log(`Publish queue size: ${queue.size()}`);
  console.log(`Slot gap (delta): ${DELTA_SECONDS}s\n`);

  const firstDue = scheduled[0]?.scheduledTime ?? 0;
  const dueNow = queue.peekDue(firstDue + 60);
  console.log(
    `Due within first minute of earliest slot: ${dueNow.length} post(s)\n`,
  );

  console.log("--- Schedule ---");
  printTable(scheduled, 15, sortByDelay);
  console.log("\n--- Metrics ---");
  console.log(`Total posts: ${metrics.totalPosts}`);
  console.log(`User collisions: ${metrics.collisions}`);
  console.log(`Average delay: ${metrics.avgDelaySec.toFixed(2)}s`);
  console.log(`Max delay: ${metrics.maxDelaySec}s`);
}

function main(): void {
  const arg = process.argv[2];
  const selected =
    arg === "normal" || arg === "congested"
      ? scenarios.filter((s) => s.name === arg)
      : scenarios;

  console.log("Social Post Scheduler — simulation");

  for (const scenario of selected) {
    runScenario(scenario);
  }
}

main();
