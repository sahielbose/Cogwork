/** Shared marketing-site constants. No fabricated proof — honest signals only. */
export const GITHUB_URL = "https://github.com/sahielbose/Cogwork";
export const GITHUB_REPO = "sahielbose/Cogwork";
export const DISCORD_URL = "https://discord.gg/cogwork";

/** Honest, non-fabricated open-source signals (real once the repo is public). */
export const OSS_SIGNALS = [
  "Apache-2.0",
  "Self-hostable",
  "TypeScript",
  "Bring your own keys",
];

export interface GithubStats {
  stars: number | null;
  forks: number | null;
  /** present only when the repo is public + reachable */
  live: boolean;
}

/**
 * Real GitHub stats with an honest fallback — NO fabricated numbers. Fetched
 * server-side (cached 1h). Returns nulls when the repo is private/unreachable;
 * callers then show honest OSS signal tags instead of invented counts.
 */
export async function getGithubStats(): Promise<GithubStats> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      headers: { accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { stars: null, forks: null, live: false };
    const json = (await res.json()) as { stargazers_count?: number; forks_count?: number };
    return {
      stars: typeof json.stargazers_count === "number" ? json.stargazers_count : null,
      forks: typeof json.forks_count === "number" ? json.forks_count : null,
      live: true,
    };
  } catch {
    return { stars: null, forks: null, live: false };
  }
}

export function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
