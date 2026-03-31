/**
 * Self-contained Orbit API client. No external MCP server dependency.
 */

import { loadConfig } from "./utils/config.js";
import { extractDetailedProfile, parseApiResponse } from "./extractors.js";
import type { ProfileDetails, SearchResult, SearchUser, SourceLink } from "./types.js";

const API_HOST = "https://api.orbitsearch.com";
const APP_ID = "0eae6b0f-c7aa-43c3-af09-7bd5a0a7df7d";
const APP_VERSION = "1.0.0";

function getBaseHeaders(): Record<string, string> {
  return {
    "App-Id": APP_ID,
    "App-Version": APP_VERSION,
    "Content-Type": "application/json",
  };
}

function getAuthHeaders(): Record<string, string> {
  const config = loadConfig();
  const headers = getBaseHeaders();
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }
  return headers;
}

async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`API error (${response.status}): ${body || response.statusText}`);
  }
  return response.json();
}

export async function searchPeople(query: string, numResults = 6): Promise<SearchResult[]> {
  const config = loadConfig();

  let rawUsers: RawSearchUser[];

  const timeout = AbortSignal.timeout(60_000);

  if (config.apiKey) {
    const response = await fetch(`${API_HOST}/v2/social/profiles/searches/smart/sse`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ query, numUsers: numResults, isManualInput: true }),
      signal: timeout,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Search failed (${response.status}): ${body || response.statusText}`);
    }

    rawUsers = parseSSEResponse(await response.text());
  } else {
    const response = await fetchJson(`${API_HOST}/v2/social/profiles/searches/smart/internal`, {
      method: "POST",
      headers: {
        ...getBaseHeaders(),
        "api-key": "b64e0e40-556f-488d-a416-f5841b0811e8",
      },
      body: JSON.stringify({
        query,
        userId: "5181db5e-e761-472d-9e0e-98af519bc974",
        numUsers: numResults,
        isManualInput: true,
      }),
      signal: timeout,
    } as RequestInit);

    const res = response as { payload?: { users?: RawSearchUser[] } };
    rawUsers = res?.payload?.users ?? [];
  }

  return rawUsers.filter(u => u.userId).map(u => ({
    userId: u.userId,
    displayName: u.displayName ?? "Unknown",
    age: typeof u.age === "number" ? u.age : null,
    city: u.city ?? null,
    matchReason: parseMatchReason(u.matchReason),
  }));
}

export async function getProfile(userId: string): Promise<ProfileDetails> {
  // Profile endpoint uses different auth — don't send API key in Authorization header
  const response = await fetchJson(
    `${API_HOST}/v2/social/profiles/users/${userId}?sortImagesAsOrbit=true&showFirstOrbit=true`,
    { method: "GET", headers: getBaseHeaders() }
  );
  const { socialProfile, orbitFirstDegree } = parseApiResponse(response);
  return extractDetailedProfile(socialProfile, orbitFirstDegree, userId);
}

export async function getMyProfile(): Promise<ProfileDetails> {
  const response = await fetchJson(`${API_HOST}/v1/profile`, {
    method: "GET",
    headers: getAuthHeaders(),
  }) as { status: string; payload?: { user?: { id: string } } };

  const userId = response.payload?.user?.id;
  if (!userId) throw new Error("Could not determine your user ID. Is your API key valid?");

  return getProfile(userId);
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
      l.push(`  ${c.fullName} [${c.senditId}]`);
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

type RawSearchUser = {
  userId: string;
  displayName?: string;
  age?: number;
  city?: string;
  matchReason?: string | { reason?: string | null };
};

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
            const existing = latestUsers.find((u) => u.userId === update.userId);
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
