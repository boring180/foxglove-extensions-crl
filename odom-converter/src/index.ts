import { ExtensionContext, Immutable, MessageEvent } from "@foxglove/extension";

import { initTrailControlPanel } from "./TrailControlPanel";
import { getTrailConfigForTopic } from "./trailRuntimeConfig";

type Quaternion = { x: number; y: number; z: number; w: number };

type Odometry = {
  header: {
    stamp: {
      sec: number;
      nsec: number;
    };
    frame_id: string;
  };
  child_frame_id?: string;
  pose: {
    pose: {
      position: {
        x: number;
        y: number;
        z: number;
      };
      orientation: {
        x: number;
        y: number;
        z: number;
        w: number;
      };
    };
  };
};

function makeTrailEntityId(msg: Odometry): string {
  const { frame_id, stamp } = msg.header;
  return `odom-trail:${frame_id}:${stamp.sec}:${stamp.nsec}`;
}

function makeTrailLifetime(lifetimeSec: number) {
  const sec = Math.floor(lifetimeSec);
  const nsec = Math.round((lifetimeSec - sec) * 1_000_000_000);

  return {
    sec,
    nsec,
  };
}

function hexToRgb(hexColor: string): { r: number; g: number; b: number } {
  const hex = hexColor.replace("#", "");
  const value = Number.parseInt(hex, 16);
  const r = ((value >> 16) & 0xff) / 255;
  const g = ((value >> 8) & 0xff) / 255;
  const b = (value & 0xff) / 255;
  return { r, g, b };
}

function makeTrailArrow(axisScale: number, arrowColorHex: string, arrowAlpha: number) {
  const shaftLength = axisScale;
  const rgb = hexToRgb(arrowColorHex);

  return {
    shaft_length: shaftLength,
    shaft_diameter: shaftLength * 0.1,
    head_length: shaftLength * (1 / 3),
    head_diameter: shaftLength * 0.2,
    color: {
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      a: arrowAlpha,
    },
  };
}

function multiplyQuat(a: Quaternion, b: Quaternion): Quaternion {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

function makeAxesArrows(msg: Odometry, axisScale: number) {
  const base = msg.pose.pose.orientation;
  const s = Math.SQRT1_2;

  const rotZPlus90: Quaternion = { x: 0, y: 0, z: s, w: s };
  const rotYMinus90: Quaternion = { x: 0, y: -s, z: 0, w: s };

  const qx = base;
  const qy = multiplyQuat(base, rotZPlus90);
  const qz = multiplyQuat(base, rotYMinus90);

  const thickness = axisScale * 0.08;
  const headLength = axisScale * 0.28;
  const headDiameter = axisScale * 0.18;

  return [
    {
      pose: { position: msg.pose.pose.position, orientation: qx },
      shaft_length: axisScale,
      shaft_diameter: thickness,
      head_length: headLength,
      head_diameter: headDiameter,
      color: { r: 1, g: 0.2, b: 0.2, a: 1 },
    },
    {
      pose: { position: msg.pose.pose.position, orientation: qy },
      shaft_length: axisScale,
      shaft_diameter: thickness,
      head_length: headLength,
      head_diameter: headDiameter,
      color: { r: 0.2, g: 1, b: 0.2, a: 1 },
    },
    {
      pose: { position: msg.pose.pose.position, orientation: qz },
      shaft_length: axisScale,
      shaft_diameter: thickness,
      head_length: headLength,
      head_diameter: headDiameter,
      color: { r: 0.2, g: 0.4, b: 1, a: 1 },
    },
  ];
}

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "🧭 Odometry Trail Settings",
    initPanel: initTrailControlPanel,
  });

  extensionContext.registerMessageConverter({
    type: "schema",
    fromSchemaName: "nav_msgs/msg/Odometry",
    toSchemaName: "geometry_msgs/msg/PoseStamped",
    converter: (msg: Odometry) => {
      return {
        header: msg.header,
        pose: msg.pose.pose,
      };
    },
  });

  extensionContext.registerMessageConverter({
    type: "schema",
    fromSchemaName: "nav_msgs/msg/Odometry",
    toSchemaName: "foxglove.SceneUpdate",
    converter: (msg: Odometry, event: Immutable<MessageEvent<Odometry>>) => {
      const { lifetimeSec, axisScale, style, arrowColorHex, arrowAlpha } =
        getTrailConfigForTopic(event.topic);

      return {
        deletions: [],
        entities: [
          {
            timestamp: msg.header.stamp,
            frame_id: msg.header.frame_id,
            id: makeTrailEntityId(msg),
            lifetime: makeTrailLifetime(lifetimeSec),
            frame_locked: true,
            arrows:
              style === "axes"
                ? makeAxesArrows(msg, axisScale)
                : [
                    {
                      pose: msg.pose.pose,
                      ...makeTrailArrow(axisScale, arrowColorHex, arrowAlpha),
                    },
                  ],
          },
        ],
      };
    },
  });
}
