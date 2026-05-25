import { describe, expect, it } from "vitest";
import { buildDemoIntentMatrix } from "./distributions.js";
import {
  countUserCollisions,
  generateIntents,
  hasMinimumGap,
  schedulePosts,
} from "./scheduler.js";
import type { PostIntent, SchedulerConfig } from "./types.js";

const defaultConfig: SchedulerConfig = {
  daySeconds: 86_400,
  deltaSeconds: 1,
};

describe("schedulePosts (EDCR)", () => {
  it("resolves two users with the same desired time", () => {
    const intents: PostIntent[] = [
      { userId: 0, platformId: 0, desiredTime: 10_000 },
      { userId: 1, platformId: 1, desiredTime: 10_000 },
    ];
    const scheduled = schedulePosts(intents, defaultConfig);
    const times = scheduled.map((p) => p.scheduledTime);

    expect(new Set(times).size).toBe(2);
    expect(countUserCollisions(scheduled)).toBe(0);
  });

  it("keeps unique scheduled slots for many random intents", () => {
    const matrix = buildDemoIntentMatrix(8, 4, defaultConfig.daySeconds);
    const intents = generateIntents(matrix, 8, 4);
    const scheduled = schedulePosts(intents, defaultConfig);
    const times = scheduled.map((p) => p.scheduledTime);

    expect(new Set(times).size).toBe(times.length);
    expect(countUserCollisions(scheduled)).toBe(0);
    expect(hasMinimumGap(scheduled, defaultConfig.deltaSeconds)).toBe(true);
  });

  it("enforces minimum gap when delta > 1", () => {
    const config: SchedulerConfig = {
      daySeconds: 86_400,
      deltaSeconds: 60,
    };
    const intents: PostIntent[] = [
      { userId: 0, platformId: 0, desiredTime: 100 },
      { userId: 1, platformId: 0, desiredTime: 101 },
    ];
    const scheduled = schedulePosts(intents, config);

    expect(scheduled[1].scheduledTime - scheduled[0].scheduledTime).toBeGreaterThanOrEqual(60);
    expect(countUserCollisions(scheduled)).toBe(0);
  });
});

describe("generateIntents", () => {
  it("may produce fewer than N*M posts when probability is low", () => {
    const matrix = buildDemoIntentMatrix(5, 3, defaultConfig.daySeconds);

    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) {
        matrix.postProbability[i][j] = 0;
      }
    }

    const intents = generateIntents(matrix, 5, 3);

    expect(intents.length).toBe(0);
  });
});
