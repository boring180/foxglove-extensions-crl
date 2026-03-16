# foxglove_extensions

Repository for Foxglove extensions.

This repository is intended to host multiple extensions over time.

## Extensions

- [Odometry Converter](odom-converter/README.md)
  - Converts `nav_msgs/msg/Odometry` to `geometry_msgs/msg/PoseStamped`
  - Prebuilt package: [odom-converter/releases/local.odom-converter-0.5.0.foxe](odom-converter/releases/local.odom-converter-0.5.0.foxe)

## Repository structure

- `odom-converter/` — standalone Foxglove extension package

Each extension should stay self-contained with its own:

- `package.json`
- `README.md`
- `CHANGELOG.md`
- source and release artifacts

## Notes

- There is intentionally no root npm package yet.
- If a monorepo tool (npm workspaces/pnpm/yarn) is added later, a root package definition can be introduced at that time.
