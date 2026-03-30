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
    let rawUsers;
    if (config.apiKey) {
        const response = await fetch(`${API_HOST}/v2/social/profiles/searches/smart/sse`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ query, numUsers: numResults, isManualInput: true }),
        });
        if (!response.ok) {
            const body = await response.text().catch(() => "");
            throw new Error(`Search failed (${response.status}): ${body || response.statusText}`);
        }
        rawUsers = parseSSEResponse(await response.text());
    }
    else {
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
export async function getProfile(userId) {
    // Profile endpoint uses different auth — don't send API key in Authorization header
    const response = await fetchJson(`${API_HOST}/v2/social/profiles/users/${userId}?sortImagesAsOrbit=true&showFirstOrbit=true`, { method: "GET", headers: getBaseHeaders() });
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
function fmtSources(sources) {
    if (sources.length === 0)
        return [];
    // Deduplicate by hostname, keep first URL per domain
    const seen = new Set();
    const deduped = [];
    for (const s of sources) {
        try {
            const host = new URL(s.url).hostname.replace(/^www\./, "");
            if (!seen.has(host)) {
                seen.add(host);
                deduped.push(s);
            }
        }
        catch {
            deduped.push(s);
        }
    }
    return [`  Sources: ${deduped.map(s => s.url).join(" , ")}`];
}
export function formatProfile(profile) {
    const l = [];
    // Header
    const hdr = [profile.displayName || "Unknown"];
    if (profile.age)
        hdr.push(`${profile.age}`);
    if (profile.birthday)
        hdr.push(`b. ${profile.birthday}`);
    if (profile.location)
        hdr.push(profile.location);
    l.push(hdr.join(" | "));
    if (profile.link)
        l.push(profile.link);
    // Bio
    if (profile.bio) {
        l.push("", profile.bio);
        l.push(...fmtSources(profile.bioSources));
    }
    // Skills
    if (profile.skills.length > 0)
        l.push("", `Skills: ${profile.skills.join(", ")}`);
    // Locations
    if (profile.previousLocations.length > 0) {
        l.push(`Locations: ${profile.previousLocations.join(" > ")}`);
    }
    // Work
    if (profile.jobs.length > 0) {
        l.push("", "WORK");
        for (const j of profile.jobs) {
            let line = `  ${j.text}`;
            if (j.title)
                line += `, ${j.title}`;
            if (j.years)
                line += ` (${j.years})`;
            l.push(line);
            if (j.description)
                l.push(`    ${j.description.slice(0, 150)}${j.description.length > 150 ? "..." : ""}`);
        }
        l.push(...fmtSources(profile.jobSources));
    }
    // Education
    if (profile.education.length > 0) {
        l.push("", "EDUCATION");
        for (const e of profile.education)
            l.push(`  ${e.text}${e.years ? ` (${e.years})` : ""}`);
        l.push(...fmtSources(profile.educationSources));
    }
    // Accomplishments
    if (profile.accomplishments.length > 0) {
        l.push("", "ACCOMPLISHMENTS");
        for (const a of profile.accomplishments)
            l.push(`  ${a.text}`);
        l.push(...fmtSources(profile.accomplishmentSources));
    }
    // Controversies
    if (profile.controversies.length > 0) {
        l.push("", "CONTROVERSIES");
        for (const c of profile.controversies)
            l.push(`  ${c.text}`);
        l.push(...fmtSources(profile.controversySources));
    }
    // Passions
    if (profile.passions.length > 0) {
        l.push("", "PASSIONS");
        for (const p of profile.passions) {
            l.push(`  ${p.name}${p.detail ? ` — ${p.detail}` : ""}`);
        }
    }
    // Personal
    const personal = [
        ...profile.personalLife,
        ...profile.bestQualities.map(q => q.text),
    ].filter(Boolean);
    if (personal.length > 0 || profile.worldview) {
        l.push("", "PERSONAL");
        for (const p of personal)
            l.push(`  ${p}`);
        if (profile.worldview) {
            if (profile.worldview.politics)
                l.push(`  Politics: ${profile.worldview.politics}`);
            if (profile.worldview.religion)
                l.push(`  Religion: ${profile.worldview.religion}`);
            if (profile.worldview.causes)
                l.push(`  Causes: ${profile.worldview.causes}`);
        }
    }
    // Social
    if (profile.socialLinks.length > 0) {
        l.push("", "SOCIAL");
        for (const s of profile.socialLinks)
            l.push(`  ${s.media}: ${s.handle}`);
    }
    // Connections
    if (profile.orbitFirstDegree.length > 0) {
        const names = profile.orbitFirstDegree.slice(0, 15).map(c => c.fullName).join(", ");
        const more = profile.orbitFirstDegree.length > 15 ? ` +${profile.orbitFirstDegree.length - 15} more` : "";
        l.push("", `CONNECTIONS (${profile.orbitFirstDegree.length})`, `  ${names}${more}`);
    }
    return l.join("\n");
}
function parseMatchReason(mr) {
    if (!mr)
        return null;
    if (typeof mr === "string")
        return mr;
    return mr.reason ?? null;
}
function parseSSEResponse(text) {
    let latestUsers = [];
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
                        const parsed = JSON.parse(dataBuffer);
                        latestUsers = parsed?.payload?.users ?? parsed?.users ?? [];
                    }
                    else if (currentEvent === "update" && latestUsers.length > 0) {
                        const update = JSON.parse(dataBuffer);
                        const existing = latestUsers.find((u) => u.userId === update.userId);
                        if (existing)
                            existing.matchReason = update.matchReason;
                    }
                }
                catch { /* skip */ }
            }
            currentEvent = "";
            dataBuffer = "";
        }
    }
    return latestUsers;
}
//# sourceMappingURL=api.js.map