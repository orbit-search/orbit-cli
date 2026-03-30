/**
 * Self-contained Orbit API client. No external MCP server dependency.
 */
import { loadConfig } from "./utils/config.js";
import { extractDetailedProfile, parseApiResponse } from "./extractors.js";
const API_HOST = "https://api.orbitsearch.com";
const APP_ID = "0eae6b0f-c7aa-43c3-af09-7bd5a0a7df7d";
const APP_VERSION = "1.0.0";
function getBaseHeaders() {
    return {
        "App-Id": APP_ID,
        "App-Version": APP_VERSION,
        "Content-Type": "application/json",
    };
}
function getAuthHeaders() {
    const config = loadConfig();
    const headers = getBaseHeaders();
    if (config.apiKey) {
        headers["Authorization"] = `Bearer ${config.apiKey}`;
    }
    return headers;
}
async function fetchJson(url, init) {
    const response = await fetch(url, init);
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`API error (${response.status}): ${body || response.statusText}`);
    }
    return response.json();
}
export async function searchPeople(query, numResults = 6) {
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
    const res = response;
    return parseUsers(res?.payload?.users ?? []);
}
export async function getProfile(userId) {
    const response = await fetchJson(`${API_HOST}/v2/social/profiles/users/${userId}?sortImagesAsOrbit=true&showFirstOrbit=true`, { method: "GET", headers: getAuthHeaders() });
    const { socialProfile, orbitFirstDegree } = parseApiResponse(response);
    return extractDetailedProfile(socialProfile, orbitFirstDegree, userId);
}
export async function getMyProfile() {
    const response = await fetchJson(`${API_HOST}/v1/profile`, {
        method: "GET",
        headers: getAuthHeaders(),
    });
    const userId = response.payload?.user?.id;
    if (!userId)
        throw new Error("Could not determine your user ID. Is your API key valid?");
    return getProfile(userId);
}
export function formatProfile(profile) {
    const lines = [];
    lines.push(`═══ ${profile.displayName || "Unknown"} ═══`);
    const header = [];
    if (profile.location)
        header.push(`📍 ${profile.location}`);
    if (profile.age)
        header.push(`🎂 ${profile.age}`);
    if (profile.link)
        header.push(`🔗 ${profile.link}`);
    if (header.length)
        lines.push(header.join(" | "));
    if (profile.bio)
        lines.push("", `📝 ${profile.bio}`);
    if (profile.jobs.length > 0) {
        lines.push("", "💼 Work:");
        for (const j of profile.jobs)
            lines.push(`  • ${j.text}${j.years ? ` (${j.years})` : ""}`);
    }
    if (profile.education.length > 0) {
        lines.push("", "🎓 Education:");
        for (const e of profile.education)
            lines.push(`  • ${e.text}${e.years ? ` (${e.years})` : ""}`);
    }
    if (profile.accomplishments.length > 0) {
        lines.push("", "🏆 Accomplishments:");
        for (const a of profile.accomplishments.slice(0, 5))
            lines.push(`  • ${a.text}`);
    }
    if (profile.worldview) {
        const wv = [];
        if (profile.worldview.politics)
            wv.push(`Politics: ${profile.worldview.politics}`);
        if (profile.worldview.religion)
            wv.push(`Religion: ${profile.worldview.religion}`);
        if (profile.worldview.causes)
            wv.push(`Causes: ${profile.worldview.causes}`);
        if (wv.length)
            lines.push("", `🌍 ${wv.join(" | ")}`);
    }
    if (profile.passions.length > 0) {
        lines.push("", `🔥 Passions: ${profile.passions.join(", ")}`);
    }
    if (profile.socialLinks.length > 0) {
        const links = profile.socialLinks.map((s) => `${s.media}: ${s.handle}`).join(" | ");
        lines.push("", `🌐 ${links}`);
    }
    return lines.join("\n");
}
// ── SSE parsing ──
function parseSSEResponse(text) {
    let latestPayload = null;
    const lines = text.split("\n");
    let currentEvent = "";
    let dataBuffer = "";
    for (const line of lines) {
        if (line.startsWith("event:")) {
            currentEvent = line.substring(6).trim();
            dataBuffer = "";
        }
        else if (line.startsWith("data:")) {
            const chunk = line.substring(5).trim();
            dataBuffer = dataBuffer ? `${dataBuffer}\n${chunk}` : chunk;
        }
        else if (line.trim() === "") {
            if (currentEvent && dataBuffer) {
                try {
                    if (currentEvent === "initial") {
                        latestPayload = JSON.parse(dataBuffer);
                    }
                    else if (currentEvent === "update" && latestPayload) {
                        const update = JSON.parse(dataBuffer);
                        if (latestPayload.users) {
                            const existing = latestPayload.users.find((u) => u.userId === update.userId);
                            if (existing)
                                existing.matchReason = update.matchReason;
                        }
                    }
                }
                catch { /* skip */ }
            }
            currentEvent = "";
            dataBuffer = "";
        }
    }
    return parseUsers(latestPayload?.users ?? []);
}
function parseUsers(rawUsers) {
    const users = new Map();
    for (const entry of rawUsers) {
        if (!entry.userId)
            continue;
        const reason = typeof entry.matchReason === "object" && entry.matchReason !== null
            ? entry.matchReason.reason
            : typeof entry.matchReason === "string"
                ? entry.matchReason
                : undefined;
        users.set(entry.userId, { userId: entry.userId, matchReason: reason });
    }
    return users;
}
//# sourceMappingURL=api.js.map