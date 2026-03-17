# Changelog

## 0.5.1

- Added per-topic trail visibility toggle with an eye icon in the topic header.
- Hiding a trail now clears only scene visibility (not the history buffer), so showing it restores buffered history.
- Added `Reset to defaults` and `Clear trail` buttons to each topic card.
- Updated default trail settings to: arrow style, red color, scale 2, 100s lifetime, 0.2m position tolerance, 5° rotation tolerance, and 0.5 opacity.
- Removed upper clamp on trail scale.

## 0.5.0

- Replaced the global trail control panel with a per-topic settings panel.
- Added independent lifetime, scale, style, and arrow color/opacity controls for each odometry topic.
- Renamed the panel to `🧭 Odometry Trail Settings` for better discoverability.

## 0.4.0

- Added trail style control: `Arrow` or `Axes`.
- Added arrow color picker and opacity control (applies in `Arrow` style).
- Kept live runtime updates via the `Odometry trail controls` panel.

## 0.3.1

- Removed alias-encoded trail topic names (no more `__odom_trail/...` entries in 3D topic list).
- Fixed live panel knobs to update converter behavior directly at runtime.
- Kept original odometry topic names while using converted `foxglove.SceneUpdate` schema.

## 0.3.0

- Added custom panel `Odometry trail controls` with live UI knobs for trail lifetime and axis scale.
- Added variable-driven topic aliases so trail settings apply without rebuilding the extension.

## 0.2.0

- Made trail lifetime configurable via `TRAIL_CONFIG.lifetimeSec`.
- Made trail size configurable via `TRAIL_CONFIG.axisScale`.
- Derived arrow dimensions from a single scale setting for easier tuning.

## 0.1.0

- Added `foxglove.SceneUpdate` conversion for odometry breadcrumb trails in the 3D panel.
- Keeps the original `geometry_msgs/msg/PoseStamped` conversion for current-pose visualization.

## 0.0.1

- Initial Odometry -> PoseStamped schema converter.
