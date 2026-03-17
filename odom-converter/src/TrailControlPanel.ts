import { PanelExtensionContext, Topic } from "@foxglove/extension";

import {
  DEFAULT_CONFIG,
  getAllTrailConfigs,
  getTrailConfigForTopic,
  setTrailConfigForTopic,
  TrailRuntimeConfig,
} from "./trailRuntimeConfig";
import { ingestOdometryMessage, OdometryLike, requestTrailClear } from "./trailRuntimeHistory";

function createLabel(text: string): HTMLLabelElement {
  const label = document.createElement("label");
  label.textContent = text;
  label.style.display = "flex";
  label.style.flexDirection = "column";
  label.style.gap = "6px";
  label.style.fontSize = "12px";
  return label;
}

function createNumberInput(min: string, max: string | undefined, step: string): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "number";
  input.min = min;
  if (max != undefined) {
    input.max = max;
  }
  input.step = step;
  input.style.width = "100%";
  return input;
}

function initTopicRow(args: {
  topicName: string;
  config: TrailRuntimeConfig;
  onChange: (topicName: string, partial: Partial<TrailRuntimeConfig>) => void;
  onClear: (topicName: string) => void;
}): HTMLDivElement {
  const { topicName, config, onChange, onClear } = args;

  const card = document.createElement("div");
  card.style.border = "1px solid rgba(127,127,127,0.25)";
  card.style.borderRadius = "8px";
  card.style.padding = "12px";
  card.style.display = "grid";
  card.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  card.style.gap = "10px";
  card.style.background = "rgba(127,127,127,0.05)";

  const header = document.createElement("div");
  header.style.gridColumn = "1 / -1";
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "flex-start";
  header.style.gap = "8px";

  const title = document.createElement("div");
  title.textContent = topicName;
  title.style.fontWeight = "600";
  title.style.fontSize = "13px";
  title.style.wordBreak = "break-all";

  const badge = document.createElement("div");
  badge.textContent = "odom";
  badge.style.padding = "2px 8px";
  badge.style.borderRadius = "999px";
  badge.style.fontSize = "11px";
  badge.style.background = "rgba(25, 179, 255, 0.15)";
  badge.style.color = "#1998d6";
  badge.style.marginLeft = "auto";

  // Eye icon button — acts as visibility toggle
  let isVisible = config.visible;
  const eyeBtn = document.createElement("button");
  eyeBtn.title = "Toggle trail visibility";
  eyeBtn.style.background = "none";
  eyeBtn.style.border = "none";
  eyeBtn.style.cursor = "pointer";
  eyeBtn.style.padding = "2px 4px";
  eyeBtn.style.lineHeight = "1";
  eyeBtn.style.opacity = "0.85";
  eyeBtn.style.display = "flex";
  eyeBtn.style.alignItems = "center";

  const SVG_EYE_OPEN =
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>` +
    `<circle cx="12" cy="12" r="3"/>` +
    `</svg>`;
  const SVG_EYE_CLOSED =
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>` +
    `<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>` +
    `<path d="M14.12 14.12a3 3 0 0 1-4.24-4.24"/>` +
    `<line x1="1" y1="1" x2="23" y2="23"/>` +
    `</svg>`;

  const updateEye = (visible: boolean): void => {
    eyeBtn.innerHTML = visible ? SVG_EYE_OPEN : SVG_EYE_CLOSED;
    eyeBtn.title = visible ? "Hide trail" : "Show trail";
  };
  updateEye(isVisible);

  header.appendChild(eyeBtn);
  header.appendChild(title);
  header.appendChild(badge);

  const lifetimeLabel = createLabel("Trail lifetime (s)");
  const lifetimeInput = createNumberInput("0", undefined, "0.1");
  lifetimeInput.value = config.lifetimeSec.toString();
  lifetimeLabel.appendChild(lifetimeInput);

  const scaleLabel = createLabel("Trail scale");
  const scaleInput = createNumberInput("0.05", "10", "0.05");
  scaleInput.value = config.axisScale.toString();
  scaleLabel.appendChild(scaleInput);

  const styleLabel = createLabel("Style");
  const styleSelect = document.createElement("select");
  styleSelect.style.width = "100%";
  for (const value of ["arrow", "axes"] as const) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value === "arrow" ? "Arrow" : "Axes";
    styleSelect.appendChild(option);
  }
  styleSelect.value = config.style;
  styleLabel.appendChild(styleSelect);

  const colorLabel = createLabel("Arrow color");
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = config.arrowColorHex;
  colorInput.style.width = "100%";
  colorLabel.appendChild(colorInput);

  const opacityLabel = createLabel("Arrow opacity");
  const opacityInput = createNumberInput("0", "1", "0.05");
  opacityInput.value = config.arrowAlpha.toString();
  opacityLabel.appendChild(opacityInput);

  const posTolLabel = createLabel("Position tolerance (m)");
  const posTolInput = createNumberInput("0", "10", "0.01");
  posTolInput.value = config.minPositionDelta.toString();
  posTolLabel.appendChild(posTolInput);

  const rotTolLabel = createLabel("Rotation tolerance (deg)");
  const rotTolInput = createNumberInput("0", "180", "0.5");
  rotTolInput.value = config.minRotationDeltaDeg.toString();
  rotTolLabel.appendChild(rotTolInput);

  const footer = document.createElement("div");
  footer.style.gridColumn = "1 / -1";
  footer.style.fontSize = "11px";
  footer.style.opacity = "0.7";

  const settingsNodes = [lifetimeLabel, scaleLabel, styleLabel, colorLabel, opacityLabel, posTolLabel, rotTolLabel];

  const refreshVisibility = (visible: boolean): void => {
    card.style.opacity = visible ? "1" : "0.5";
    for (const node of settingsNodes) {
      const inputs = Array.from(node.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select"));
      for (const el of inputs) {
        el.disabled = !visible;
      }
    }
  };

  const refreshArrowControls = (): void => {
    const arrowMode = styleSelect.value === "arrow";
    colorInput.disabled = !arrowMode || !isVisible;
    opacityInput.disabled = !arrowMode || !isVisible;
    colorLabel.style.opacity = arrowMode ? "1" : "0.45";
    opacityLabel.style.opacity = arrowMode ? "1" : "0.45";
    footer.textContent =
      styleSelect.value === "axes"
        ? "Axes style uses fixed RGB axis colors."
        : "Arrow style uses the selected color and opacity.";
  };

  const emitChange = (): void => {
    onChange(topicName, {
      lifetimeSec: Number(lifetimeInput.value),
      axisScale: Number(scaleInput.value),
      style: styleSelect.value as TrailRuntimeConfig["style"],
      arrowColorHex: colorInput.value,
      arrowAlpha: Number(opacityInput.value),
      minPositionDelta: Number(posTolInput.value),
      minRotationDeltaDeg: Number(rotTolInput.value),
    });
    refreshArrowControls();
  };

  lifetimeInput.addEventListener("change", emitChange);
  scaleInput.addEventListener("change", emitChange);
  styleSelect.addEventListener("change", emitChange);
  colorInput.addEventListener("change", emitChange);
  opacityInput.addEventListener("change", emitChange);
  posTolInput.addEventListener("change", emitChange);
  rotTolInput.addEventListener("change", emitChange);

  const refreshInputs = (cfg: TrailRuntimeConfig): void => {
    lifetimeInput.value = cfg.lifetimeSec.toString();
    scaleInput.value = cfg.axisScale.toString();
    styleSelect.value = cfg.style;
    colorInput.value = cfg.arrowColorHex;
    opacityInput.value = cfg.arrowAlpha.toString();
    posTolInput.value = cfg.minPositionDelta.toString();
    rotTolInput.value = cfg.minRotationDeltaDeg.toString();
    isVisible = cfg.visible;
    updateEye(isVisible);
    refreshVisibility(isVisible);
  };

  eyeBtn.addEventListener("click", () => {
    isVisible = !isVisible;
    updateEye(isVisible);
    refreshVisibility(isVisible);
    refreshArrowControls();
    onChange(topicName, { visible: isVisible });
  });

  // Initial state
  refreshVisibility(isVisible);
  refreshArrowControls();

  const buttonRow = document.createElement("div");
  buttonRow.style.gridColumn = "1 / -1";
  buttonRow.style.display = "flex";
  buttonRow.style.gap = "8px";

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset to defaults";
  resetBtn.style.flex = "1";
  resetBtn.style.fontSize = "11px";
  resetBtn.style.padding = "4px 8px";
  resetBtn.style.cursor = "pointer";
  resetBtn.addEventListener("click", () => {
    onChange(topicName, { ...DEFAULT_CONFIG });
    refreshInputs(DEFAULT_CONFIG);
    refreshArrowControls();
  });

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear trail";
  clearBtn.style.flex = "1";
  clearBtn.style.fontSize = "11px";
  clearBtn.style.padding = "4px 8px";
  clearBtn.style.cursor = "pointer";
  clearBtn.addEventListener("click", () => {
    onClear(topicName);
  });

  buttonRow.appendChild(resetBtn);
  buttonRow.appendChild(clearBtn);

  card.appendChild(header);
  card.appendChild(lifetimeLabel);
  card.appendChild(scaleLabel);
  card.appendChild(styleLabel);
  card.appendChild(colorLabel);
  card.appendChild(opacityLabel);
  card.appendChild(posTolLabel);
  card.appendChild(rotTolLabel);
  card.appendChild(footer);
  card.appendChild(buttonRow);

  return card;
}

export function initTrailControlPanel(context: PanelExtensionContext): () => void {
  const root = document.createElement("div");
  root.style.height = "100%";
  root.style.overflow = "auto";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "12px";
  root.style.padding = "12px";
  root.style.boxSizing = "border-box";
  root.style.fontFamily = "system-ui, sans-serif";

  const title = document.createElement("h2");
  title.textContent = "🧭 Odometry Trail Settings";
  title.style.margin = "0";
  title.style.fontSize = "15px";

  const help = document.createElement("div");
  help.textContent =
    "Configure each nav_msgs/msg/Odometry topic independently. Changes affect the SceneUpdate trail live.";
  help.style.fontSize = "12px";
  help.style.opacity = "0.85";

  const topicList = document.createElement("div");
  topicList.style.display = "flex";
  topicList.style.flexDirection = "column";
  topicList.style.gap = "12px";

  root.appendChild(title);
  root.appendChild(help);
  root.appendChild(topicList);
  context.panelElement.appendChild(root);

  let currentTopics: readonly Topic[] = [];
  let odomTopicNames = new Set<string>();
  let lastOdomTopicsKey = "";

  const persistState = (): void => {
    context.saveState({ topics: getAllTrailConfigs() });
  };

  const handleTopicChange = (topicName: string, partial: Partial<TrailRuntimeConfig>): void => {
    setTrailConfigForTopic(topicName, partial);
    persistState();
  };

  const handleTopicClear = (topicName: string): void => {
    requestTrailClear(topicName);
  };

  const renderTopics = (): void => {
    topicList.replaceChildren();

    const odomTopics = currentTopics.filter((topic) => topic.schemaName === "nav_msgs/msg/Odometry");

    if (odomTopics.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No nav_msgs/msg/Odometry topics detected in the current data source.";
      empty.style.fontSize = "12px";
      empty.style.opacity = "0.75";
      topicList.appendChild(empty);
      return;
    }

    for (const topic of odomTopics) {
      const config = getTrailConfigForTopic(topic.name);
      topicList.appendChild(
        initTopicRow({
          topicName: topic.name,
          config,
          onChange: handleTopicChange,
          onClear: handleTopicClear,
        }),
      );
    }
  };

  const updateSubscriptions = (): void => {
    odomTopicNames = new Set(
      currentTopics
        .filter((topic) => topic.schemaName === "nav_msgs/msg/Odometry")
        .map((topic) => topic.name),
    );

    context.subscribe(Array.from(odomTopicNames).map((topic) => ({ topic })));
  };

  const makeOdomTopicsKey = (topics: readonly Topic[]): string => {
    return topics
      .filter((topic) => topic.schemaName === "nav_msgs/msg/Odometry")
      .map((topic) => topic.name)
      .sort()
      .join("\n");
  };

  context.onRender = (renderState, done) => {
    if (renderState.topics) {
      currentTopics = renderState.topics;

      const nextKey = makeOdomTopicsKey(currentTopics);
      if (nextKey !== lastOdomTopicsKey) {
        lastOdomTopicsKey = nextKey;
        updateSubscriptions();
        renderTopics();
      }
    }

    for (const messageEvent of renderState.currentFrame ?? []) {
      if (!odomTopicNames.has(messageEvent.topic)) {
        continue;
      }

      ingestOdometryMessage(
        messageEvent.topic,
        messageEvent.message as OdometryLike,
        getTrailConfigForTopic(messageEvent.topic),
      );
    }

    done();
  };

  context.watch("topics");
  context.watch("currentFrame");
  renderTopics();

  return () => {
    root.remove();
  };
}
