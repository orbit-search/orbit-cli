import { getProfile, getRawProfile } from "../api.js";
const VALID_SECTIONS = [
    "bio", "work", "education", "accomplishments", "controversies",
    "passions", "personal", "qualities", "worldview", "social",
    "connections", "sources", "facts", "skills", "locations",
];
function extractFunFacts(raw) {
    const widgets = raw?.payload?.socialProfile?.widgets;
    if (!Array.isArray(widgets))
        return [];
    const seen = new Set();
    const facts = [];
    for (const w of widgets) {
        if (w.type !== "sendit.games:fun-facts-v1")
            continue;
        const answer = w.data?.answer?.trim();
        if (!answer || seen.has(answer))
            continue;
        seen.add(answer);
        facts.push({
            text: answer,
            labels: w.labels ?? [],
            sources: (w.data?.sources ?? []).filter((s) => s.link).map((s) => ({ name: s.name ?? "", url: s.link })),
        });
    }
    return facts;
}
function extractAllSources(raw) {
    const sources = raw?.payload?.socialProfile?.orbitSources;
    if (!Array.isArray(sources))
        return [];
    return sources.filter((s) => s.link).map((s) => ({
        url: s.link,
        name: s.title ?? s.sourceName ?? "",
    }));
}
export async function sectionCommand(userId, section, options) {
    if (!VALID_SECTIONS.includes(section)) {
        console.error(`Unknown section: ${section}`);
        console.error(`Valid sections: ${VALID_SECTIONS.join(", ")}`);
        process.exit(1);
    }
    try {
        // For facts and sources we need raw API response
        if (section === "facts" || section === "sources") {
            const raw = await getRawProfile(userId);
            if (section === "facts") {
                const facts = extractFunFacts(raw);
                if (options.json) {
                    console.log(JSON.stringify(facts, null, 2));
                }
                else {
                    if (facts.length === 0) {
                        console.log("No fun facts found.");
                        return;
                    }
                    const grouped = {};
                    for (const f of facts) {
                        for (const label of f.labels.length ? f.labels : ["uncategorized"]) {
                            if (!grouped[label])
                                grouped[label] = [];
                            grouped[label].push(f.text);
                        }
                    }
                    for (const [label, items] of Object.entries(grouped)) {
                        console.log(`\n${label.toUpperCase().replace(/_/g, " ")} (${items.length})`);
                        for (const item of items)
                            console.log(`  ${item}`);
                    }
                    console.log(`\n${facts.length} facts total`);
                }
                return;
            }
            if (section === "sources") {
                const sources = extractAllSources(raw);
                if (options.json) {
                    console.log(JSON.stringify(sources, null, 2));
                }
                else {
                    if (sources.length === 0) {
                        console.log("No sources found.");
                        return;
                    }
                    for (const s of sources)
                        console.log(`${s.name || "link"}: ${s.url}`);
                    console.log(`\n${sources.length} sources`);
                }
                return;
            }
        }
        // Everything else from parsed profile
        const profile = await getProfile(userId);
        const sectionData = {
            bio: () => ({ bio: profile.bio, sources: profile.bioSources }),
            work: () => profile.jobs,
            education: () => profile.education,
            accomplishments: () => profile.accomplishments,
            controversies: () => profile.controversies,
            passions: () => profile.passions,
            personal: () => profile.personalLife,
            qualities: () => profile.bestQualities,
            worldview: () => profile.worldview,
            social: () => profile.socialLinks,
            connections: () => profile.orbitFirstDegree,
            sources: () => null, // handled above
            facts: () => null, // handled above
            skills: () => profile.skills,
            locations: () => profile.previousLocations,
        };
        const data = sectionData[section]();
        if (options.json) {
            console.log(JSON.stringify(data, null, 2));
            return;
        }
        // Text formatting per section
        if (section === "connections") {
            const conns = data;
            if (conns.length === 0) {
                console.log("No connections.");
                return;
            }
            for (const c of conns)
                console.log(`${c.fullName}  [${c.senditId}]`);
            console.log(`\n${conns.length} connections`);
        }
        else if (section === "work") {
            const jobs = data;
            for (const j of jobs) {
                let line = j.text;
                if (j.title)
                    line += `, ${j.title}`;
                if (j.years)
                    line += ` | ${j.years}`;
                console.log(line);
                if (j.description)
                    console.log(`  ${j.description}`);
            }
        }
        else if (section === "education") {
            const edu = data;
            for (const e of edu)
                console.log(`${e.text}${e.years ? ` | ${e.years}` : ""}`);
        }
        else if (section === "social") {
            const links = data;
            for (const s of links)
                console.log(`${s.media}: ${s.handle}`);
        }
        else if (section === "passions") {
            const passions = data;
            for (const p of passions)
                console.log(`${p.name}${p.detail ? `: ${p.detail}` : ""}`);
        }
        else if (section === "bio") {
            const bio = data;
            if (bio.bio)
                console.log(bio.bio);
            else
                console.log("No bio available.");
        }
        else if (Array.isArray(data)) {
            if (data.length === 0) {
                console.log(`No ${section} data.`);
                return;
            }
            for (const item of data) {
                if (typeof item === "string")
                    console.log(item);
                else if (item.text)
                    console.log(item.text);
                else
                    console.log(JSON.stringify(item));
            }
        }
        else if (data && typeof data === "object") {
            for (const [k, v] of Object.entries(data)) {
                if (v)
                    console.log(`${k}: ${v}`);
            }
        }
        else if (data === null || data === undefined) {
            console.log(`No ${section} data.`);
        }
        else {
            console.log(String(data));
        }
    }
    catch (error) {
        console.error(`Failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }
}
//# sourceMappingURL=sections.js.map