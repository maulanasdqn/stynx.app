const RELEASES_API = "https://api.github.com/repos/maulanasdqn/stynx-code/releases?per_page=30";
export const RELEASES_PAGE = "https://github.com/maulanasdqn/stynx-code/releases";
const TAG_PREFIX = "desktop-v";

export type TPlatformId = "mac" | "windows" | "linux";

export interface IDownload {
  label: string;
  note: string;
  url: string;
  size: string;
}

export interface IPlatform {
  id: TPlatformId;
  name: string;
  requirement: string;
  downloads: IDownload[];
}

export interface IDesktopRelease {
  version: string;
  pageUrl: string;
  platforms: IPlatform[];
}

interface IAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

interface IRelease {
  tag_name: string;
  html_url: string;
  draft: boolean;
  assets: IAsset[];
}

const FORMATS: { platform: TPlatformId; label: string; note: string; match: RegExp }[] = [
  { platform: "mac", label: "Apple Silicon", note: ".dmg · M1 and newer", match: /_aarch64\.dmg$/ },
  { platform: "mac", label: "Intel", note: ".dmg · Intel Macs", match: /_x64\.dmg$/ },
  { platform: "windows", label: "Installer", note: ".exe · 64-bit", match: /_x64-setup\.exe$/ },
  { platform: "windows", label: "MSI", note: ".msi · managed installs", match: /_x64_en-US\.msi$/ },
  { platform: "linux", label: "AppImage", note: "any distro · x86_64", match: /_amd64\.AppImage$/ },
  { platform: "linux", label: "Debian / Ubuntu", note: ".deb · amd64", match: /_amd64\.deb$/ },
  { platform: "linux", label: "Fedora / RHEL", note: ".rpm · x86_64", match: /\.x86_64\.rpm$/ },
];

const PLATFORMS: Omit<IPlatform, "downloads">[] = [
  { id: "mac", name: "macOS", requirement: "macOS 11 or later" },
  { id: "windows", name: "Windows", requirement: "Windows 10 or 11" },
  { id: "linux", name: "Linux", requirement: "x86_64 with WebKitGTK 4.1" },
];

const formatSize = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(0)} MB`;

const requestHeaders = (): Record<string, string> => {
  const token = process.env.GITHUB_TOKEN;
  return token ? { "User-Agent": "stynx-app", Authorization: `Bearer ${token}` } : { "User-Agent": "stynx-app" };
};

let releasesRequest: Promise<IRelease[]> | null = null;

const fetchReleases = (): Promise<IRelease[]> => {
  releasesRequest ??= requestReleases();
  return releasesRequest;
};

const requestReleases = async (): Promise<IRelease[]> => {
  try {
    const response = await fetch(RELEASES_API, { headers: requestHeaders() });
    return response.ok ? ((await response.json()) as IRelease[]) : [];
  } catch {
    return [];
  }
};

const toDownloads = (assets: IAsset[], platform: TPlatformId): IDownload[] =>
  FORMATS.filter((format) => format.platform === platform).flatMap((format) => {
    const asset = assets.find((candidate) => format.match.test(candidate.name));
    return asset ? [{ label: format.label, note: format.note, url: asset.browser_download_url, size: formatSize(asset.size) }] : [];
  });

export const loadDesktopRelease = async (): Promise<IDesktopRelease | null> => {
  const release = (await fetchReleases()).find((candidate) => !candidate.draft && candidate.tag_name.startsWith(TAG_PREFIX) && candidate.assets.length > 0);
  if (!release) return null;
  return {
    version: release.tag_name.slice(TAG_PREFIX.length),
    pageUrl: release.html_url,
    platforms: PLATFORMS.map((platform) => ({ ...platform, downloads: toDownloads(release.assets, platform.id) })),
  };
};

export const latestVersion = async (): Promise<string | null> => (await loadDesktopRelease())?.version ?? null;
