const isMobile = (ua) => /Android|iPhone|iPad|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));

const architectureHint = async () => {
  try {
    const hints = await navigator.userAgentData?.getHighEntropyValues?.(["architecture"]);
    return hints?.architecture ?? null;
  } catch {
    return null;
  }
};

const gpuRenderer = () => {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
  } catch {
    return "";
  }
};

const isIntelMac = async () => {
  const architecture = await architectureHint();
  if (architecture) return architecture !== "arm";
  return /Intel|AMD|Radeon/i.test(gpuRenderer());
};

const detectPlatform = async (ua, targets) => {
  if (/Mac/.test(ua)) return { name: "macOS", choice: (await isIntelMac()) ? targets.macIntel : targets.macArm };
  if (/Win/.test(ua)) return { name: "Windows", choice: targets.windows };
  if (/Linux|X11/.test(ua)) return { name: "Linux", choice: targets.linux };
  return null;
};

const describeChoice = (meta, choice) => {
  const other = document.createElement("a");
  other.href = "#download";
  other.textContent = "Other platforms";
  meta.replaceChildren(`${choice.label} · ${choice.size} · `, other);
};

const initHeroDownload = async () => {
  const button = document.getElementById("hero-download");
  const meta = document.getElementById("hero-download-meta");
  const ua = navigator.userAgent;
  if (!button || isMobile(ua)) return;
  const platform = await detectPlatform(ua, JSON.parse(button.dataset.targets || "{}"));
  if (!platform) return;
  button.textContent = `Download for ${platform.name} ↓`;
  if (!platform.choice) return;
  button.href = platform.choice.url;
  if (meta) describeChoice(meta, platform.choice);
};

initHeroDownload();
