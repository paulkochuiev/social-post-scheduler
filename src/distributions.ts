import type { IntentMatrix, PlatformId, TimeDistribution, UserId } from "./types.js";

export function uniformDay(daySeconds: number): TimeDistribution {
  return {
    sample(): number {
      return Math.floor(Math.random() * daySeconds);
    },
  };
}

/** Bell-shaped peak around peakHour (0–23) in local day seconds. */
export function gaussianPeak(
  daySeconds: number,
  peakHour: number,
  spreadHours = 2,
): TimeDistribution {
  const peakSeconds = peakHour * 3600;
  const spreadSeconds = spreadHours * 3600;

  return {
    sample(): number {
      const u1 = Math.random();
      const u2 = Math.random();
      const z =
        Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const offset = z * spreadSeconds;
      let t = Math.round(peakSeconds + offset);

      if (t < 0) {
        t = 0;
      }

      if (t >= daySeconds) {
        t = daySeconds - 1;
      }

      return t;
    },
  };
}

export function buildDemoIntentMatrix(
  userCount: number,
  platformCount: number,
  daySeconds: number,
): IntentMatrix {
  const postProbability: number[][] = [];
  const timeDistribution: TimeDistribution[][] = [];
  const peakHours = [9, 12, 18, 21];

  for (let i = 0; i < userCount; i++) {
    postProbability[i] = [];
    timeDistribution[i] = [];

    for (let j = 0; j < platformCount; j++) {
      postProbability[i][j] = 0.55 + (i % 3) * 0.1;
      const peakHour = peakHours[j % peakHours.length] ?? 12;
      timeDistribution[i][j] = gaussianPeak(daySeconds, peakHour, 1.5);
    }
  }

  return { postProbability, timeDistribution };
}

export function getDistribution(
  matrix: IntentMatrix,
  userId: UserId,
  platformId: PlatformId,
): TimeDistribution {
  const row = matrix.timeDistribution[userId];

  if (!row) {
    throw new Error(`Unknown userId: ${userId}`);
  }

  const dist = row[platformId];

  if (!dist) {
    throw new Error(`Unknown platformId: ${platformId}`);
  }

  return dist;
}

export function getPostProbability(
  matrix: IntentMatrix,
  userId: UserId,
  platformId: PlatformId,
): number {
  const row = matrix.postProbability[userId];

  if (!row) {
    throw new Error(`Unknown userId: ${userId}`);
  }

  const p = row[platformId];

  if (p === undefined) {
    throw new Error(`Unknown platformId: ${platformId}`);
  }

  return p;
}
