/**
 * Self-contained Orbit API client. No external MCP server dependency.
 */

import { loadConfig } from "./utils/config.js";
import { extractDetailedProfile, parseApiResponse } from "./extractors.js";
import type { ProfileDetails, SearchUser } from "./types.js";

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

export async function searchPeople(query: string, numResults = 6): Promise<Map<string, SearchUser>> {
  const config = loadConfig();

  if (config.apiKey) {
    // Authenticated: use SSE endpoint
    const response = await fetch(`${API_HOST}/v2/social/profiles/searches/smart/sse`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ query, numUsers: numResults, isManualInput: true }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Search failed (${response.status}): ${body || response.statusText}`);
    }

    return parseSSEResponse(await response.text());
  }

  // Anonymous: use internal endpoint with service key
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
  });

  const res = response as { payload?: { users?: { userId: string; matchReason?: string | { reason?: string } }[] } };
  return parseUsers(res?.payload?.users ?? []);
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

export function formatProfile(profile: ProfileDetails): string {
  const lines: string[] = [];

  // Header
  lines.push(`=== ${profile.displayName || "Unknown"} ===`);
  const header: string[] = [];
  if (profile.location) header.push(profile.location);
  if (profile.age && profile.birthday) header.push(`Age ${profile.age} (${profile.birthday})`);
  else if (profile.age) header.push(`Age ${profile.age}`);
  if (profile.link) header.push(profile.link);
  if (header.length) lines.push(header.join(" | "));

  // Bio
  if (profile.bio) {
    lines.push("", "--- Bio ---", profile.bio);
  }

  // Basics
  const basics: string[] = [];
  if (profile.birthday) basics.push(`  Birthday: ${profile.birthday}`);
  if (profile.location) basics.push(`  Current location: ${profile.location}`);
  if (profile.previousLocations.length > 0) {
    basics.push(`  Previous locations: ${profile.previousLocations.join(", ")}`);
  }
  if (profile.skills.length > 0) {
    basics.push(`  Skills: ${profile.skills.join(", ")}`);
  }
  if (basics.length > 0) {
    lines.push("", "--- Basics ---", ...basics);
  }

  // Work History
  if (profile.jobs.length > 0) {
    lines.push("", "--- Work History ---");
    for (const j of profile.jobs) {
      let line = `  * ${j.text}`;
      if (j.title) line += ` — ${j.title}`;
      if (j.years) line += ` (${j.years})`;
      lines.push(line);
      if (j.description) lines.push(`    ${j.description}`);
      if (j.readMore) lines.push(`    ${j.readMore.slice(0, 200)}${j.readMore.length > 200 ? "..." : ""}`);
    }
  }

  // Education
  if (profile.education.length > 0) {
    lines.push("", "--- Education ---");
    for (const e of profile.education) {
      lines.push(`  * ${e.text}${e.years ? ` (${e.years})` : ""}`);
    }
  }

  // Accomplishments
  if (profile.accomplishments.length > 0) {
    lines.push("", "--- Accomplishments ---");
    for (const a of profile.accomplishments) {
      lines.push(`  * ${a.text}`);
      if (a.readMore) lines.push(`    ${a.readMore.slice(0, 200)}${a.readMore.length > 200 ? "..." : ""}`);
    }
  }

  // Controversies
  if (profile.controversies.length > 0) {
    lines.push("", "--- Controversies ---");
    for (const c of profile.controversies) {
      lines.push(`  * ${c.text}`);
      if (c.readMore) lines.push(`    ${c.readMore.slice(0, 200)}${c.readMore.length > 200 ? "..." : ""}`);
    }
  }

  // Passions
  if (profile.passions.length > 0) {
    lines.push("", "--- Passions ---");
    for (const p of profile.passions) {
      let line = `  * ${p.name}`;
      if (p.description) line += ` — ${p.description}`;
      lines.push(line);
      if (p.detail) lines.push(`    ${p.detail}`);
    }
  }

  // Personal Life
  if (profile.personalLife.length > 0) {
    lines.push("", "--- Personal Life ---");
    for (const p of profile.personalLife) lines.push(`  * ${p}`);
  }

  // Best Qualities
  if (profile.bestQualities.length > 0) {
    lines.push("", "--- Best Qualities ---");
    for (const q of profile.bestQualities) lines.push(`  * ${q.text}`);
  }

  // Worldview
  if (profile.worldview) {
    lines.push("", "--- Worldview ---");
    if (profile.worldview.politics) lines.push(`  Politics: ${profile.worldview.politics}`);
    if (profile.worldview.religion) lines.push(`  Religion: ${profile.worldview.religion}`);
    if (profile.worldview.causes) lines.push(`  Causes: ${profile.worldview.causes}`);
  }

  // Social Media
  if (profile.socialLinks.length > 0) {
    lines.push("", "--- Social Media ---");
    for (const s of profile.socialLinks) lines.push(`  ${s.media}: ${s.handle}`);
  }

  // Fun Facts (grouped by category, skip basics/social_media_and_links to avoid repetition)
  const factCategories = ["hobbies_and_interests", "early_life", "brand_preferences", "music", "possessions", "worldview"];
  for (const category of factCategories) {
    const facts = profile.funFacts[category];
    if (facts && facts.length > 0) {
      const label = category.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      lines.push("", `--- ${label} ---`);
      for (const f of facts.slice(0, 10)) {
        lines.push(`  * ${f.text}`);
      }
    }
  }

  // Connections
  if (profile.orbitFirstDegree.length > 0) {
    lines.push("", `--- Connections (${profile.orbitFirstDegree.length}) ---`);
    const shown = profile.orbitFirstDegree.slice(0, 20);
    lines.push(`  ${shown.map(c => c.fullName).join(", ")}${profile.orbitFirstDegree.length > 20 ? `, ... and ${profile.orbitFirstDegree.length - 20} more` : ""}`);
  }

  // Sources
  if (profile.orbitSources.length > 0) {
    lines.push("", `--- Sources (${profile.orbitSources.length}) ---`);
    for (const s of profile.orbitSources) {
      lines.push(`  ${s.name || "link"}: ${s.url}`);
    }
  }

  // Photos
  if (profile.photos.length > 0) {
    lines.push("", `--- Photos (${profile.photos.length}) ---`);
    for (const p of profile.photos) lines.push(`  ${p}`);
  }

  return lines.join("\n");
}

// ── SSE parsing ──

function parseSSEResponse(text: string): Map<string, SearchUser> {
  let latestUsers: { userId: string; matchReason?: string | { reason?: string } }[] = [];
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
            // Handle both {users:[...]} and {status,payload:{users:[...]}} formats
            latestUsers = parsed?.payload?.users ?? parsed?.users ?? [];
          } else if (currentEvent === "update" && latestUsers.length > 0) {
            const update = JSON.parse(dataBuffer) as { userId: string; matchReason?: string | { reason?: string } };
            const existing = latestUsers.find((u) => u.userId === update.userId);
            if (existing) existing.matchReason = update.matchReason;
          }
        } catch { /* skip */ }
      }
      currentEvent = "";
      dataBuffer = "";
    }
  }

  return parseUsers(latestUsers);
}

function parseUsers(rawUsers: { userId: string; matchReason?: string | { reason?: string } }[]): Map<string, SearchUser> {
  const users = new Map<string, SearchUser>();
  for (const entry of rawUsers) {
    if (!entry.userId) continue;
    const reason =
      typeof entry.matchReason === "object" && entry.matchReason !== null
        ? (entry.matchReason as { reason?: string }).reason
        : typeof entry.matchReason === "string"
          ? entry.matchReason
          : undefined;
    users.set(entry.userId, { userId: entry.userId, matchReason: reason });
  }
  return users;
}
