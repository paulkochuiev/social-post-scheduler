import { describe, expect, it } from "vitest";
import { PublishQueue } from "./queue.js";
import type { ScheduledPost } from "./types.js";

describe("PublishQueue", () => {
  const posts: ScheduledPost[] = [
    { userId: 0, platformId: 0, desiredTime: 100, scheduledTime: 100 },
    { userId: 1, platformId: 0, desiredTime: 100, scheduledTime: 150 },
    { userId: 2, platformId: 1, desiredTime: 200, scheduledTime: 200 },
  ];

  it("returns posts due at or before now", () => {
    const queue = new PublishQueue(posts);

    expect(queue.peekDue(100).map((p) => p.userId)).toEqual([0]);
    expect(queue.peekDue(150).map((p) => p.userId).sort()).toEqual([0, 1]);
    expect(queue.peekDue(200).length).toBe(3);
  });

  it("dequeues and drains due posts", () => {
    const queue = new PublishQueue(posts);

    expect(queue.dequeue(posts[0])).toBe(true);
    expect(queue.size()).toBe(2);
    expect(queue.peekDue(200).length).toBe(2);

    const drained = queue.drainDue(200);

    expect(drained.length).toBe(2);
    expect(queue.size()).toBe(0);
  });
});
