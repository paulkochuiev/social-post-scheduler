import {
  getDistribution,
  getPostProbability,
} from "./distributions.js";
import type {
  IntentMatrix,
  PostIntent,
  ScheduleMetrics,
  ScheduledPost,
  SchedulerConfig,
} from "./types.js";

export function generateIntents(
  matrix: IntentMatrix,
  userCount: number,
  platformCount: number,
): PostIntent[] {
  const intents: PostIntent[] = [];

  for (let userId = 0; userId < userCount; userId++) {
    for (let platformId = 0; platformId < platformCount; platformId++) {
      const p = getPostProbability(matrix, userId, platformId);

      if (Math.random() >= p) {
        continue;
      }

      const dist = getDistribution(matrix, userId, platformId);
      intents.push({
        userId,
        platformId,
        desiredTime: dist.sample(),
      });
    }
  }

  return intents;
}

function compareIntents(a: PostIntent, b: PostIntent): number {
  if (a.desiredTime !== b.desiredTime) {
    return a.desiredTime - b.desiredTime;
  }

  if (a.userId !== b.userId) {
    return a.userId - b.userId;
  }

  return a.platformId - b.platformId;
}

/**
 * EDCR: Earliest-Deadline Conflict Resolution.
 * Assigns unique time slots so two users never share the same scheduled second.
 */
export function schedulePosts(
  intents: PostIntent[],
  config: SchedulerConfig,
): ScheduledPost[] {
  const sorted = [...intents].sort(compareIntents);
  const occupied = new Set<number>();
  const scheduled: ScheduledPost[] = [];
  const { daySeconds, deltaSeconds } = config;
  let lastScheduled = -deltaSeconds;

  for (const intent of sorted) {
    let t = Math.max(intent.desiredTime, lastScheduled + deltaSeconds);

    while (occupied.has(t)) {
      t += deltaSeconds;
    }

    if (t >= daySeconds) {
      t = daySeconds - 1;

      while ((occupied.has(t) || t <= lastScheduled) && t > 0) {
        t -= 1;
      }
    }

    occupied.add(t);
    lastScheduled = t;
    scheduled.push({ ...intent, scheduledTime: t });
  }

  return scheduled;
}

/** Count pairs of distinct users sharing the same scheduled time. */
export function countUserCollisions(posts: ScheduledPost[]): number {
  const byTime = new Map<number, Set<number>>();

  for (const post of posts) {
    let users = byTime.get(post.scheduledTime);

    if (!users) {
      users = new Set();
      byTime.set(post.scheduledTime, users);
    }

    users.add(post.userId);
  }

  let collisions = 0;

  for (const users of byTime.values()) {
    if (users.size > 1) {
      collisions += 1;
    }
  }

  return collisions;
}

export function computeMetrics(posts: ScheduledPost[]): ScheduleMetrics {
  if (posts.length === 0) {
    return {
      totalPosts: 0,
      collisions: 0,
      avgDelaySec: 0,
      maxDelaySec: 0,
    };
  }

  let totalDelay = 0;
  let maxDelay = 0;

  for (const post of posts) {
    const delay = post.scheduledTime - post.desiredTime;
    totalDelay += delay;

    if (delay > maxDelay) {
      maxDelay = delay;
    }
  }

  return {
    totalPosts: posts.length,
    collisions: countUserCollisions(posts),
    avgDelaySec: totalDelay / posts.length,
    maxDelaySec: maxDelay,
  };
}

export function hasMinimumGap(
  posts: ScheduledPost[],
  deltaSeconds: number,
): boolean {
  const times = posts.map((p) => p.scheduledTime).sort((a, b) => a - b);

  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] < deltaSeconds) {
      return false;
    }
  }

  return true;
}
