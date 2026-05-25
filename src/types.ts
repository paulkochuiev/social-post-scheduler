export type UserId = number;
export type PlatformId = number;

/** Seconds from midnight [0, daySeconds). */
export type TimeSlot = number;

export interface TimeDistribution {
  sample(): TimeSlot;
}

export interface PostIntent {
  userId: UserId;
  platformId: PlatformId;
  desiredTime: TimeSlot;
}

export interface ScheduledPost extends PostIntent {
  scheduledTime: TimeSlot;
}

export interface SchedulerConfig {
  /** Length of scheduling window in seconds (e.g. 86400 for one day). */
  daySeconds: number;
  /** Minimum gap between any two posts; discretization step. */
  deltaSeconds: number;
}

export interface IntentMatrix {
  /** postProbability[i][j] in [0, 1] */
  postProbability: number[][];
  /** timeDistribution[i][j] */
  timeDistribution: TimeDistribution[][];
}

export interface ScheduleMetrics {
  totalPosts: number;
  collisions: number;
  avgDelaySec: number;
  maxDelaySec: number;
}
