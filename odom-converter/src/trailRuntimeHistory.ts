import { TrailRuntimeConfig } from "./trailRuntimeConfig";

type Quaternion = { x: number; y: number; z: number; w: number };

type PoseSnapshot = {
  position: { x: number; y: number; z: number };
  orientation: Quaternion;
};

export type OdometryLike = {
  header: {
    stamp: {
      sec: number;
      nsec: number;
    };
    frame_id: string;
  };
  pose: {
    pose: PoseSnapshot;
  };
};

export type TrailEntitySnapshot = {
  id: string;
  timestamp: { sec: number; nsec: number };
  frame_id: string;
  pose: PoseSnapshot;
};

const lastEmittedPoseByTopic = new Map<string, PoseSnapshot>();
const trailHistoryByTopic = new Map<string, TrailEntitySnapshot[]>();
const lastSeenStampByTopic = new Map<string, number>();
const lastProcessedEntityIdByTopic = new Map<string, string>();

export function makeTrailEntityId(msg: OdometryLike): string {
  const { frame_id, stamp } = msg.header;
  return `odom-trail:${frame_id}:${stamp.sec}:${stamp.nsec}`;
}

export function stampToNanoseconds(stamp: { sec: number; nsec: number }): number {
  return stamp.sec * 1_000_000_000 + stamp.nsec;
}

function positionDistance(a: PoseSnapshot["position"], b: PoseSnapshot["position"]): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function rotationDistanceDeg(a: Quaternion, b: Quaternion): number {
  const dot = Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w);
  const clamped = Math.max(-1, Math.min(1, dot));
  const angleRad = 2 * Math.acos(clamped);
  return (angleRad * 180) / Math.PI;
}

function shouldEmitForTopic(topicName: string, msg: OdometryLike, config: TrailRuntimeConfig): boolean {
  const current: PoseSnapshot = {
    position: msg.pose.pose.position,
    orientation: msg.pose.pose.orientation,
  };

  const previous = lastEmittedPoseByTopic.get(topicName);
  if (!previous) {
    lastEmittedPoseByTopic.set(topicName, current);
    return true;
  }

  const movedEnough = positionDistance(current.position, previous.position) >= config.minPositionDelta;
  const rotatedEnough = rotationDistanceDeg(current.orientation, previous.orientation) >= config.minRotationDeltaDeg;
  const shouldEmit = movedEnough || rotatedEnough;

  if (shouldEmit) {
    lastEmittedPoseByTopic.set(topicName, current);
  }

  return shouldEmit;
}

function pruneHistory(
  history: TrailEntitySnapshot[],
  nowStamp: { sec: number; nsec: number },
  lifetimeSec: number,
): TrailEntitySnapshot[] {
  const nowNs = stampToNanoseconds(nowStamp);
  const keepWindowNs = Math.round(lifetimeSec * 1_000_000_000);
  return history.filter((entry) => nowNs - stampToNanoseconds(entry.timestamp) <= keepWindowNs);
}

export function clearTrailHistory(topicName?: string): void {
  if (topicName == undefined) {
    lastEmittedPoseByTopic.clear();
    trailHistoryByTopic.clear();
    lastSeenStampByTopic.clear();
    lastProcessedEntityIdByTopic.clear();
    return;
  }

  lastEmittedPoseByTopic.delete(topicName);
  trailHistoryByTopic.delete(topicName);
  lastSeenStampByTopic.delete(topicName);
  lastProcessedEntityIdByTopic.delete(topicName);
}

const clearPendingTopics = new Set<string>();

export function requestTrailClear(topicName: string): void {
  clearTrailHistory(topicName);
  clearPendingTopics.add(topicName);
}

export function consumeTrailClearPending(topicName: string): boolean {
  if (clearPendingTopics.has(topicName)) {
    clearPendingTopics.delete(topicName);
    return true;
  }
  return false;
}

export function ingestOdometryMessage(
  topicName: string,
  msg: OdometryLike,
  config: TrailRuntimeConfig,
): TrailEntitySnapshot[] {
  if (config.lifetimeSec <= 0) {
    clearTrailHistory(topicName);
    return [];
  }

  const stampNs = stampToNanoseconds(msg.header.stamp);
  const entityId = makeTrailEntityId(msg);
  const lastSeenStampNs = lastSeenStampByTopic.get(topicName);

  if (lastSeenStampNs != undefined && stampNs < lastSeenStampNs) {
    clearTrailHistory(topicName);
  }

  lastSeenStampByTopic.set(topicName, stampNs);

  let history = pruneHistory(trailHistoryByTopic.get(topicName) ?? [], msg.header.stamp, config.lifetimeSec);
  trailHistoryByTopic.set(topicName, history);

  if (lastProcessedEntityIdByTopic.get(topicName) === entityId) {
    return history;
  }
  lastProcessedEntityIdByTopic.set(topicName, entityId);

  if (shouldEmitForTopic(topicName, msg, config)) {
    history = [
      ...history,
      {
        id: entityId,
        timestamp: msg.header.stamp,
        frame_id: msg.header.frame_id,
        pose: msg.pose.pose,
      },
    ];
    trailHistoryByTopic.set(topicName, history);
  }

  return history;
}

export function getTrailHistory(topicName: string): TrailEntitySnapshot[] {
  return trailHistoryByTopic.get(topicName) ?? [];
}
