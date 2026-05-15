/**
 * Self-contained Orbit API client. No external MCP server dependency.
 */

import { loadConfig } from "./utils/config.js";
import { extractDetailedProfile, parseApiResponse } from "./extractors.js";
import type { OrbitConfig } from "./utils/config.js";
import type { JsonRecord, ProfileDetails, SearchResult, SourceLink } from "./types.js";

function getBaseHeaders(config: OrbitConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  // App metadata is optional for public profile reads; never restore a hardcoded app id.
  if (config.appId) {
    headers["App-Id"] = config.appId;
    headers["App-Version"] = config.appVersion;
  }
  return headers;
}

function getAuthHeaders(config: OrbitConfig): Record<string, string> {
  const headers = getBaseHeaders(config);
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }
  return headers;
}

function buildApiErrorMessage(
  action: string,
  status: number,
  statusText: string,
  bodyText: string,
  config: OrbitConfig,
  authenticated = false
): string {
  if (authenticated && status === 401) {
    const detail = bodyText || statusText;
    if (!config.appId) {
      return `${action} failed (${status}): API credentials were rejected, and app metadata is not configured for this CLI install. If you upgraded from a version that bundled app metadata, run \`orbit login --app-id <provided-app-id>\` or set ORBIT_APP_ID; otherwise run \`orbit login\` with a valid key. ${detail}`;
    }
    return `${action} failed (${status}): API credentials were rejected. Run \`orbit login\` again or set a valid ORBIT_API_KEY. ${detail}`;
  }

  if (authenticated && status === 403) {
    const detail = bodyText || statusText;
    return `${action} failed (${status}): API credentials are not authorized for this request. Check that the key has the required permissions. ${detail}`;
  }

  if (!config.appId && (status === 401 || status === 403)) {
    const detail = bodyText || statusText;
    return `${action} failed (${status}): app metadata is not configured for this CLI install. If you upgraded from a version that bundled app metadata, run \`orbit login --app-id <provided-app-id>\` or set ORBIT_APP_ID, then retry. ${detail}`;
  }

  return `${action} failed (${status}): ${bodyText || statusText}`;
}

function requireApiKey(config: OrbitConfig, action: string): void {
  if (!config.apiKey) {
    throw new Error(`${action} requires Orbit API credentials. Run \`orbit login\` or set ORBIT_API_KEY.`);
  }
}

async function fetchJson(
  url: string,
  init: RequestInit,
  config: OrbitConfig,
  action = "Request",
  authenticated = false
): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(buildApiErrorMessage(action, response.status, response.statusText, body, config, authenticated));
  }
  return response.json();
}

export async function searchPeople(query: string, numResults = 6): Promise<SearchResult[]> {
  const config = loadConfig();
  requireApiKey(config, "Search");

  const timeout = AbortSignal.timeout(60_000);
  const body = {
    query,
    numUsers: numResults,
    isManualInput: true,
    // The published search schema names the requester field userId; CLI config exposes it as requestingProfileId.
    ...(config.requestingProfileId ? { userId: config.requestingProfileId } : {}),
  };

  const response = await fetch(`${config.apiHost}/v2/social/profiles/searches/smart/sse`, {
    method: "POST",
    headers: getAuthHeaders(config),
    body: JSON.stringify(body),
    signal: timeout,
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(buildApiErrorMessage("Search", response.status, response.statusText, bodyText, config, true));
  }

  const rawUsers = parseSSEResponse(await response.text());

  return rawUsers.map(normalizeSearchUser).filter((u): u is SearchResult => u !== null);
}

function normalizeSearchUser(user: RawSearchUser): SearchResult | null {
  const profileId = getRawProfileId(user);
  if (!profileId) return null;

  return {
    profileId,
    displayName: user.displayName ?? "Unknown",
    age: typeof user.age === "number" ? user.age : null,
    city: user.city ?? null,
    matchReason: parseMatchReason(user.matchReason),
  };
}

export async function getRawProfile(profileId: string): Promise<unknown> {
  const config = loadConfig();
  return fetchJson(
    `${config.apiHost}/v2/social/profiles/users/${profileId}?sortImagesAsOrbit=true&showFirstOrbit=true`,
    { method: "GET", headers: getBaseHeaders(config) },
    config,
    "Profile lookup"
  );
}

export async function getProfile(profileId: string): Promise<ProfileDetails> {
  const response = await getRawProfile(profileId);
  const { socialProfile, orbitFirstDegree } = parseApiResponse(response);
  return extractDetailedProfile(socialProfile, orbitFirstDegree, profileId);
}

export async function getMyProfile(): Promise<ProfileDetails> {
  const config = loadConfig();
  requireApiKey(config, "`orbit me`");

  const response = await fetchJson(`${config.apiHost}/v1/profile`, {
    method: "GET",
    headers: getAuthHeaders(config),
  }, config, "Authentication check", true) as { status: string; payload?: { user?: { id?: string; profileId?: string } } };

  const profileId = response.payload?.user?.profileId ?? response.payload?.user?.id;
  if (!profileId) throw new Error("Could not determine your profile ID. Is your API key valid?");

  return getProfile(profileId);
}

function srcLine(sources: SourceLink[], max = 5): string | null {
  if (sources.length === 0) return null;
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const s of sources) {
    if (urls.length >= max) break;
    try {
      const host = new URL(s.url).hostname.replace(/^www\./, "");
      if (!seen.has(host)) { seen.add(host); urls.push(s.url); }
    } catch { urls.push(s.url); }
  }
  const more = sources.length > max ? ` (+${sources.length - max} more)` : "";
  return `  src: ${urls.join(" ")}${more}`;
}

export function formatProfile(profile: ProfileDetails): string {
  const l: string[] = [];

  // Header
  const hdr = [profile.displayName || "Unknown"];
  if (profile.age) hdr.push(`${profile.age}`);
  if (profile.birthday) hdr.push(`b. ${profile.birthday}`);
  if (profile.location) hdr.push(profile.location);
  l.push(hdr.join(" | "));
  if (profile.link) l.push(profile.link);

  // Bio + sources
  if (profile.bio) l.push("", profile.bio);
  const bioSrc = srcLine(profile.bioSources);
  if (bioSrc) l.push(bioSrc);

  // Basics block — skills + locations on one line each
  if (profile.skills.length > 0) l.push(`Skills: ${profile.skills.join(", ")}`);
  if (profile.previousLocations.length > 0) l.push(`Locations: ${profile.previousLocations.join(" > ")}`);

  // Work
  if (profile.jobs.length > 0) {
    l.push("", "WORK");
    for (const j of profile.jobs) {
      const parts = [j.text];
      if (j.title) parts[0] += `, ${j.title}`;
      if (j.years) parts.push(j.years);
      l.push(`  ${parts.join(" | ")}`);
      if (j.description) l.push(`    ${j.description.slice(0, 120)}${j.description.length > 120 ? "..." : ""}`);
    }
    const ws = srcLine(profile.jobSources); if (ws) l.push(ws);
  }

  // Education
  if (profile.education.length > 0) {
    l.push("", "EDUCATION");
    for (const e of profile.education) l.push(`  ${e.text}${e.years ? ` | ${e.years}` : ""}`);
    const es = srcLine(profile.educationSources); if (es) l.push(es);
  }

  // Accomplishments
  if (profile.accomplishments.length > 0) {
    l.push("", "ACCOMPLISHMENTS");
    for (const a of profile.accomplishments) l.push(`  ${a.text}`);
    const as2 = srcLine(profile.accomplishmentSources); if (as2) l.push(as2);
  }

  // Controversies
  if (profile.controversies.length > 0) {
    l.push("", "CONTROVERSIES");
    for (const c of profile.controversies) l.push(`  ${c.text}`);
    const cs = srcLine(profile.controversySources); if (cs) l.push(cs);
  }

  // Passions
  if (profile.passions.length > 0) {
    l.push("", "PASSIONS");
    for (const p of profile.passions) l.push(`  ${p.name}${p.detail ? `: ${p.detail}` : ""}`);
  }

  // Personal Life (deduped)
  if (profile.personalLife.length > 0) {
    const seen = new Set<string>();
    const deduped = profile.personalLife.filter(p => { const k = p.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    l.push("", "PERSONAL LIFE");
    for (const p of deduped) l.push(`  ${p}`);
  }

  // Best Qualities
  if (profile.bestQualities.length > 0) {
    l.push("", "BEST QUALITIES");
    l.push(`  ${profile.bestQualities.map(q => q.text).join(", ")}`);
  }

  // Worldview
  const wv: string[] = [];
  if (profile.worldview?.politics) wv.push(`Politics: ${profile.worldview.politics}`);
  if (profile.worldview?.religion) wv.push(`Religion: ${profile.worldview.religion}`);
  if (profile.worldview?.causes) wv.push(`Causes: ${profile.worldview.causes}`);
  if (wv.length > 0) {
    l.push("", "WORLDVIEW");
    for (const w of wv) l.push(`  ${w}`);
  }

  // Social
  if (profile.socialLinks.length > 0) {
    l.push("", "SOCIAL");
    l.push(`  ${profile.socialLinks.map(s => `${s.media}: ${s.handle}`).join(" | ")}`);
  }

  // Connections
  if (profile.orbitFirstDegree.length > 0) {
    const n = profile.orbitFirstDegree.length;
    l.push("", `CONNECTIONS (${n})`);
    for (const c of profile.orbitFirstDegree.slice(0, 10)) {
      l.push(`  ${c.fullName} [${c.profileId}]`);
    }
    if (n > 10) l.push(`  +${n - 10} more`);
  }

  return l.join("\n");
}

export function formatProfileBrief(profile: ProfileDetails): string {
  const l: string[] = [];

  const hdr = [profile.displayName || "Unknown"];
  if (profile.age) hdr.push(`${profile.age}`);
  if (profile.location) hdr.push(profile.location);
  l.push(hdr.join(" | "));

  if (profile.bio) l.push(profile.bio);

  if (profile.jobs.length > 0) {
    l.push(`Work: ${profile.jobs.slice(0, 3).map(j => `${j.text}${j.years ? ` (${j.years})` : ""}`).join(", ")}`);
  }

  if (profile.socialLinks.length > 0) {
    l.push(profile.socialLinks.map(s => `${s.media}: ${s.handle}`).join(" | "));
  }

  return l.join("\n");
}

// ── SSE parsing ──

type RawSearchUser = JsonRecord & {
  profileId?: string;
  displayName?: string;
  age?: number;
  city?: string;
  matchReason?: string | { reason?: string | null };
};

function getRawProfileId(user: RawSearchUser): string | null {
  const schemaProfileId = typeof user.profileId === "string" ? user.profileId : null;
  const schemaSenditId = typeof user["senditId"] === "string" ? user["senditId"] : null;
  const schemaSnakeSenditId = typeof user["sendit_id"] === "string" ? user["sendit_id"] : null;
  const schemaUserId = typeof user["userId"] === "string" ? user["userId"] : null;
  return schemaProfileId ?? schemaSenditId ?? schemaSnakeSenditId ?? schemaUserId;
}

function parseMatchReason(mr: string | { reason?: string | null } | undefined): string | null {
  if (!mr) return null;
  if (typeof mr === "string") return mr;
  return mr.reason ?? null;
}

function parseSSEResponse(text: string): RawSearchUser[] {
  let latestUsers: RawSearchUser[] = [];
  const lines = text.split("\n");
  let currentEvent = "";
  let dataBuffer = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      currentEvent = line.substring(6).trim();
      dataBuffer = "";
    } else if (line.startsWith("data:")) {
      const chunk = line.substring(5).trim();
      dataBuffer = dataBuffer ? `${dataBuffer}\n${chunk}` : chunk;
    } else if (line.trim() === "") {
      if (currentEvent && dataBuffer) {
        try {
          if (currentEvent === "initial") {
            const parsed = JSON.parse(dataBuffer);
            latestUsers = parsed?.payload?.users ?? parsed?.users ?? [];
          } else if (currentEvent === "update" && latestUsers.length > 0) {
            const update = JSON.parse(dataBuffer) as RawSearchUser;
            const updateProfileId = getRawProfileId(update);
            if (!updateProfileId) continue;
            const existing = latestUsers.find((u) => getRawProfileId(u) === updateProfileId);
            if (existing) existing.matchReason = update.matchReason;
          }
        } catch { /* skip */ }
      }
      currentEvent = "";
      dataBuffer = "";
    }
  }

  return latestUsers;
}
