import { describe, expect, it } from "vitest";
import { buildCongestedIntentMatrix, buildDemoIntentMatrix } from "./distributions.js";
import {
  countUserCollisions,
  generateIntents,
  hasMinimumGap,
  schedulePosts,
  SchedulingError,
} from "./scheduler.js";
import type { PostIntent, SchedulerConfig } from "./types.js";

const defaultConfig: SchedulerConfig = {
  daySeconds: 86_400,
  deltaSeconds: 1,
};

function buildDeterministicIntents(count: number, desiredTime: number): PostIntent[] {
  const intents: PostIntent[] = [];

  for (let i = 0; i < count; i++) {
    intents.push({
      userId: i,
      platformId: 0,
      desiredTime,
    });
  }

  return intents;
}

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

  it("property: randomized runs stay collision-free when scheduled", () => {
    const matrix = buildDemoIntentMatrix(8, 4, defaultConfig.daySeconds);
    let successRuns = 0;

    for (let run = 0; run < 20; run++) {
      const intents = generateIntents(matrix, 8, 4);

      if (intents.length === 0) {
        continue;
      }

      try {
        const scheduled = schedulePosts(intents, defaultConfig);
        const times = scheduled.map((p) => p.scheduledTime);

        expect(new Set(times).size).toBe(times.length);
        expect(countUserCollisions(scheduled)).toBe(0);
        expect(hasMinimumGap(scheduled, defaultConfig.deltaSeconds)).toBe(true);
        successRuns += 1;
      } catch (error) {
        expect(error).toBeInstanceOf(SchedulingError);
      }
    }

    expect(successRuns).toBeGreaterThan(0);
  });

  it("produces positive delay for congested same desired time", () => {
    const intents = buildDeterministicIntents(25, 43_200);
    const scheduled = schedulePosts(intents, defaultConfig);
    const totalDelay = scheduled.reduce(
      (sum, p) => sum + (p.scheduledTime - p.desiredTime),
      0,
    );

    expect(countUserCollisions(scheduled)).toBe(0);
    expect(totalDelay).toBeGreaterThan(0);
    expect(scheduled[scheduled.length - 1].scheduledTime - scheduled[0].scheduledTime).toBe(
      scheduled.length - 1,
    );
  });

  it("schedules end-of-day packing without collision", () => {
    const intents: PostIntent[] = [
      { userId: 0, platformId: 0, desiredTime: 86_390 },
      { userId: 1, platformId: 0, desiredTime: 86_390 },
      { userId: 2, platformId: 0, desiredTime: 86_390 },
      { userId: 3, platformId: 0, desiredTime: 86_390 },
      { userId: 4, platformId: 0, desiredTime: 86_390 },
    ];
    const scheduled = schedulePosts(intents, defaultConfig);
    const times = scheduled.map((p) => p.scheduledTime).sort((a, b) => a - b);

    expect(countUserCollisions(scheduled)).toBe(0);
    expect(times).toEqual([86_390, 86_391, 86_392, 86_393, 86_394]);
  });

  it("throws SchedulingError when day capacity is exceeded", () => {
    const smallDay: SchedulerConfig = { daySeconds: 10, deltaSeconds: 1 };
    const intents = buildDeterministicIntents(15, 0);

    expect(() => schedulePosts(intents, smallDay)).toThrow(SchedulingError);
  });

  it("property: exactly 100 intents remain collision-free", () => {
    const intents = buildDeterministicIntents(100, 5000);
    const scheduled = schedulePosts(intents, defaultConfig);
    const times = scheduled.map((p) => p.scheduledTime);

    expect(times.length).toBe(100);
    expect(new Set(times).size).toBe(100);
    expect(countUserCollisions(scheduled)).toBe(0);
    expect(hasMinimumGap(scheduled, defaultConfig.deltaSeconds)).toBe(true);
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

  it("congested matrix yields many posts", () => {
    const matrix = buildCongestedIntentMatrix(20, 2, defaultConfig.daySeconds);
    const intents = generateIntents(matrix, 20, 2);

    expect(intents.length).toBeGreaterThan(20);
  });
});
