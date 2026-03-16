# odom-converter

Foxglove extension that converts:

- `nav_msgs/msg/Odometry` -> `geometry_msgs/msg/PoseStamped`
- `nav_msgs/msg/Odometry` -> `foxglove.SceneUpdate`

This makes odometry topics usable in Foxglove panels that support pose schemas and also adds a time-limited breadcrumb trail in the 3D panel.

## Primary usage (recommended): install prebuilt `.foxe`

Use the committed artifact:

- `odom-converter/releases/local.odom-converter-0.5.0.foxe`

Install in Foxglove (Desktop or Web):

1. Click your **user icon** (top right).
2. Open **Extensions**.
3. Click **Install Local Extension...**.
4. Select `local.odom-converter-0.5.0.foxe`.

The extension is available immediately after installation.

No `npm` or local build is required for this path.

## Verify it is active

1. In Foxglove, open **Settings** -> **Extensions**.
2. Confirm `Odometry to Pose Converter` is listed and enabled.
3. Load data containing `nav_msgs/msg/Odometry`.
4. In a panel schema picker, choose/confirm the converted output `geometry_msgs/msg/PoseStamped`.
5. In the 3D panel, you can also choose the converted output `foxglove.SceneUpdate` to see a breadcrumb trail of recent odometry poses.

## Where are the knobs?

The extension now provides a custom panel named **🧭 Odometry Trail Settings**.

1. Add panel -> **🧭 Odometry Trail Settings**.
2. The panel discovers all `nav_msgs/msg/Odometry` topics in the current data source.
3. Each topic gets its own settings card with:
   - **Trail lifetime (seconds)**
   - **Trail scale**
   - **Trail style** (`Arrow` or `Axes`)
   - **Arrow color** and **Arrow opacity** (used only in `Arrow` style)
4. Keep your 3D panel subscribed to the converted `foxglove.SceneUpdate` odometry trail.

Changes apply live; no rebuild/reinstall needed.

## Repository layout (recommended)

Keep this extension in:

- `foxglove_extensions/odom-converter/`

Keep the prebuilt distributable artifact in:

- `foxglove_extensions/odom-converter/releases/local.odom-converter-0.5.0.foxe`

## Build from source (optional, for development)

1. Open a terminal and go to this project directory (`odom-converter`).
2. Install dependencies:
   - `npm install`
3. Build the extension:
   - `npm run build`
4. Install into your local Foxglove extensions folder:
   - `npm run local-install`
5. Open your layout and add/select your odometry topic in a panel that supports poses (for example 3D or Raw Messages), using either:
   - `geometry_msgs/msg/PoseStamped` for the current pose
   - `foxglove.SceneUpdate` for a recent breadcrumb trail in 3D

Installed extension location on Ubuntu:

- `~/.foxglove-studio/extensions/local.odom-converter-0.5.0/`

## Can this work without installing npm?

Yes. This repository already includes a prebuilt `.foxe` file, which is the preferred way to use this extension.

### Option A: Install a prebuilt `.foxe` package (recommended)

Use the committed artifact from this repo:

- `odom-converter/releases/local.odom-converter-0.5.0.foxe`

In Foxglove (Desktop or Web), install it through:

1. Click your **user icon** (top right).
2. Open **Extensions**.
3. Click **Install Local Extension...**.
4. Select the `.foxe` file.

The extension is available immediately after installation.

### Option B: Copy a prebuilt unpacked extension directory

If someone provides an already-built folder containing at least:

- `package.json`
- `README.md`
- `CHANGELOG.md`
- `dist/extension.js`

copy it to:

- `~/.foxglove-studio/extensions/<publisher>.<name>-<version>/`

then it appears as an installed extension.

### Important limitation

If you only have TypeScript source code and no prebuilt files, you need Node.js tooling to build it at least once.

## Converter behavior

The extension provides two outputs:

- `geometry_msgs/msg/PoseStamped`
   - `header = odom.header`
   - `pose = odom.pose.pose`
- `foxglove.SceneUpdate`
   - emits one arrow entity per odometry message
   - each arrow automatically expires after the configured lifetime
   - this creates an RViz-like recent trail in the 3D panel without requiring a fixed topic name

## History behavior and limits

- The trail is currently **time-based**, not **count-based**.
- Runtime knob values are controlled in the **🧭 Odometry Trail Settings** panel.
- Settings are stored per odometry topic and applied directly by the SceneUpdate converter at runtime.
- Topic names remain unchanged (no alias topic names are introduced).
- Foxglove does not currently expose the 3D panel axis-scale setting directly to converters, so scale matching is still manual (via this panel knob).
- This generic approach works for any odometry topic because it uses a schema converter.
- A true “last N messages” history would require a stateful topic converter tied to explicit topic names.

No frame transforms are created by this extension. Your TF tree and timestamps must still be valid for 3D visualization.
