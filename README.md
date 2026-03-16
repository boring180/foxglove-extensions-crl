# foxglove_extensions

Repository for Foxglove extensions.

This repository is intended to host multiple extensions over time.

## Extensions

<table>
  <tr>
    <th>Extension</th>
    <th>Preview</th>
  </tr>
  <tr>
    <td>

**[Odometry Converter](odom-converter/README.md)**

Converts `nav_msgs/msg/Odometry` to `geometry_msgs/msg/PoseStamped` and `foxglove.SceneUpdate` (breadcrumb trail).

Prebuilt: [hulchvse.odom-converter-0.5.0.foxe](odom-converter/releases/hulchvse.odom-converter-0.5.0.foxe)

  </td>
    <td><img src="https://github.com/user-attachments/assets/9f49da04-9836-470d-9e68-a217dc7608a6" alt="Odometry trail visualization" width="360" /></td>
  </tr>
</table>

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
