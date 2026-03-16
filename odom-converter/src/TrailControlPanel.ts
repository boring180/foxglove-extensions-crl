import { PanelExtensionContext, Topic } from "@foxglove/extension";

import {
  getAllTrailConfigs,
  getTrailConfigForTopic,
  replaceAllTrailConfigs,
  setTrailConfigForTopic,
  TrailRuntimeConfig,
} from "./trailRuntimeConfig";

type PanelState = {
  topics: Record<string, TrailRuntimeConfig>;
};

function createLabel(text: string): HTMLLabelElement {
  const label = document.createElement("label");
  label.textContent = text;
  label.style.display = "flex";
  label.style.flexDirection = "column";
  label.style.gap = "6px";
  label.style.fontSize = "12px";
  return label;
}

function createNumberInput(min: string, max: string, step: string): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "number";
  input.min = min;
  input.max = max;
  input.step = step;
  input.style.width = "100%";
  return input;
}

function initTopicRow(args: {
  topicName: string;
  config: TrailRuntimeConfig;
  onChange: (topicName: string, partial: Partial<TrailRuntimeConfig>) => void;
}): HTMLDivElement {
  const { topicName, config, onChange } = args;

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
  header.style.justifyContent = "space-between";
  header.style.gap = "12px";

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

  header.appendChild(title);
  header.appendChild(badge);

  const lifetimeLabel = createLabel("Trail lifetime (s)");
  const lifetimeInput = createNumberInput("0.1", "120", "0.1");
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

  const footer = document.createElement("div");
  footer.style.gridColumn = "1 / -1";
  footer.style.fontSize = "11px";
  footer.style.opacity = "0.7";

  const refreshArrowControls = (): void => {
    const arrowMode = styleSelect.value === "arrow";
    colorInput.disabled = !arrowMode;
    opacityInput.disabled = !arrowMode;
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
    });
    refreshArrowControls();
  };

  lifetimeInput.addEventListener("change", emitChange);
  scaleInput.addEventListener("change", emitChange);
  styleSelect.addEventListener("change", emitChange);
  colorInput.addEventListener("change", emitChange);
  opacityInput.addEventListener("change", emitChange);

  refreshArrowControls();

  card.appendChild(header);
  card.appendChild(lifetimeLabel);
  card.appendChild(scaleLabel);
  card.appendChild(styleLabel);
  card.appendChild(colorLabel);
  card.appendChild(opacityLabel);
  card.appendChild(footer);

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

  const initialState = (context.initialState as Partial<PanelState> | undefined)?.topics;
  replaceAllTrailConfigs(initialState);

  let currentTopics: readonly Topic[] = [];

  const persistState = (): void => {
    context.saveState({ topics: getAllTrailConfigs() });
  };

  const handleTopicChange = (topicName: string, partial: Partial<TrailRuntimeConfig>): void => {
    setTrailConfigForTopic(topicName, partial);
    persistState();
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
        }),
      );
    }
  };

  context.onRender = (renderState, done) => {
    currentTopics = renderState.topics ?? [];
    renderTopics();
    done();
  };

  context.watch("topics");
  persistState();
  renderTopics();

  return () => {
    root.remove();
  };
}
