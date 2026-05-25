import type { ScheduledPost, TimeSlot } from "./types.js";

function compareScheduled(a: ScheduledPost, b: ScheduledPost): number {
  if (a.scheduledTime !== b.scheduledTime) {
    return a.scheduledTime - b.scheduledTime;
  }

  if (a.userId !== b.userId) {
    return a.userId - b.userId;
  }

  return a.platformId - b.platformId;
}

/** Delayed publish queue ordered by scheduledTime (production: Redis ZSET / SQS). */
export class PublishQueue {
  private readonly posts: ScheduledPost[];

  constructor(posts: ScheduledPost[]) {
    this.posts = [...posts].sort(compareScheduled);
  }

  size(): number {
    return this.posts.length;
  }

  peekDue(now: TimeSlot): ScheduledPost[] {
    return this.posts.filter((post) => post.scheduledTime <= now);
  }

  dequeue(post: ScheduledPost): boolean {
    const index = this.posts.findIndex(
      (p) =>
        p.userId === post.userId &&
        p.platformId === post.platformId &&
        p.scheduledTime === post.scheduledTime,
    );

    if (index === -1) {
      return false;
    }

    this.posts.splice(index, 1);

    return true;
  }

  drainDue(now: TimeSlot): ScheduledPost[] {
    const due = this.peekDue(now);

    for (const post of due) {
      this.dequeue(post);
    }

    return due;
  }
}
