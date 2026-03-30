function parseAge(birthday) {
    if (!birthday)
        return null;
    const match = /(\d+)\s+years?\s+old/i.exec(birthday);
    if (!match)
        return null;
    const age = Number.parseInt(match[1], 10);
    return Number.isNaN(age) ? null : age;
}
function parseBirthday(birthday) {
    if (!birthday)
        return null;
    // Try to extract a date like "December 1, 2002" or "2002-12-01"
    const dateMatch = /born\s+(.+)/i.exec(birthday);
    if (dateMatch)
        return dateMatch[1].replace(/,\s*$/, "").trim();
    // Try ISO date
    const isoMatch = /(\d{4}-\d{2}-\d{2})/.exec(birthday);
    if (isoMatch)
        return isoMatch[1];
    return birthday;
}
function extractPhotos(widgets) {
    if (!Array.isArray(widgets))
        return [];
    return widgets
        .filter(w => w.type === "sendit.games:photoreview-v1")
        .map(w => {
        const data = w.data;
        return data?.answer?.trim();
    })
        .filter((url) => !!url);
}
function extractDefaultPhoto(widgets) {
    if (!Array.isArray(widgets))
        return null;
    const photoWidgets = widgets.filter(w => w.type === "sendit.games:photoreview-v1");
    const defaultWidget = photoWidgets.find(w => {
        const data = w.data;
        return data?.type === "default";
    });
    const chosen = defaultWidget ?? photoWidgets[0];
    const data = chosen?.data;
    return data?.answer?.trim() ?? null;
}
function extractMyBasics(widgets) {
    if (!Array.isArray(widgets))
        return {};
    const basics = widgets.find(w => w.type === "sendit.games:mybasics-v1");
    if (!basics?.data || !Array.isArray(basics.data))
        return {};
    const result = {};
    for (const item of basics.data) {
        if (item.question === "birthday" && item.answer)
            result.birthday = item.answer;
        if (item.question === "location" && item.answer)
            result.location = item.answer;
    }
    return result;
}
function listItems(items) {
    if (!items)
        return [];
    const result = [];
    for (const item of items) {
        if (!item.name?.trim())
            continue;
        let years = item.extData?.years;
        if (years && /^\d{4}-$/.test(years))
            years = `${years}Present`;
        // Extract readMore narrative
        let readMore;
        const sections = item.extData?.readMore?.sections;
        if (sections && sections.length > 0) {
            readMore = sections
                .map(s => s.content?.trim())
                .filter(Boolean)
                .join(" ")
                .slice(0, 500);
        }
        result.push({
            text: item.name.trim(),
            years,
            title: item.extData?.jobTitle?.trim() || undefined,
            description: item.extData?.jobDescription?.trim() || undefined,
            readMore,
            imageUrl: item.imageUrl || undefined,
        });
    }
    return result;
}
function flags(section) {
    if (!section?.flags)
        return [];
    return Object.values(section.flags).filter((v) => v.trim() !== "").map((v) => v.trim());
}
function worldview(section) {
    if (!section)
        return null;
    const p = section.politics?.trim();
    const r = section.religion?.trim();
    const c = section.causes?.trim();
    if (!p && !r && !c)
        return null;
    return { ...(p ? { politics: p } : {}), ...(r ? { religion: r } : {}), ...(c ? { causes: c } : {}) };
}
function extractPassions(items) {
    if (!items)
        return [];
    const seen = new Set();
    const result = [];
    for (const item of items) {
        const name = item.passion?.trim();
        if (!name || seen.has(name))
            continue;
        seen.add(name);
        result.push({
            name,
            description: item.description?.trim() || undefined,
            detail: (typeof item.detail === "string" ? item.detail : "")?.trim() || undefined,
            emoji: item.emoji || undefined,
        });
    }
    return result;
}
function extractFunFacts(widgets) {
    if (!Array.isArray(widgets))
        return {};
    const facts = widgets.filter(w => w.type === "sendit.games:fun-facts-v1");
    const grouped = {};
    const seen = new Set();
    for (const fact of facts) {
        const data = fact.data;
        const answer = data?.answer?.trim();
        if (!answer || seen.has(answer))
            continue;
        seen.add(answer);
        const labels = fact.labels ?? ["none"];
        const sources = (data?.sources ?? [])
            .filter(s => s.link)
            .map(s => ({ name: s.name ?? "", url: s.link }));
        const funFact = { text: answer, labels, sources };
        for (const label of labels) {
            if (!grouped[label])
                grouped[label] = [];
            grouped[label].push(funFact);
        }
    }
    return grouped;
}
function extractSkills(funFacts) {
    const skills = [];
    // Look for skills mentions in fun facts
    for (const fact of (funFacts["basics"] ?? [])) {
        const match = /skills?\s+in\s+(.+?)(?:,\s+as\s+listed|\.)/i.exec(fact.text);
        if (match) {
            skills.push(...match[1].split(/,\s*(?:and\s+)?/).map(s => s.trim()).filter(Boolean));
        }
    }
    return [...new Set(skills)];
}
function extractPreviousLocations(funFacts) {
    const locations = [];
    const seen = new Set();
    for (const fact of (funFacts["basics"] ?? [])) {
        const liveMatch = /(?:lived?\s+in|lives?\s+in)\s+(.+?)(?:\s*\(|$)/i.exec(fact.text);
        if (liveMatch) {
            const loc = liveMatch[1].replace(/[.,]+$/, "").trim();
            const normalized = loc.toLowerCase();
            if (!seen.has(normalized)) {
                seen.add(normalized);
                locations.push(loc);
            }
        }
    }
    return locations;
}
function firstDegree(data) {
    if (!data?.users)
        return [];
    return data.users
        .filter((u) => u.senditId)
        .map((u) => ({
        senditId: u.senditId,
        fullName: u.fullName ?? "",
        avatarUrl: u.avatarUrl ?? null,
        link: "https://orbitsearch.com/" + encodeURIComponent(u.senditId),
    }));
}
export function parseApiResponse(response) {
    const res = response;
    if (!res?.payload?.socialProfile) {
        throw new Error("Orbit API did not return payload.socialProfile");
    }
    return {
        socialProfile: res.payload.socialProfile,
        orbitFirstDegree: res.payload.socialProfile.orbitFirstDegree ?? res.payload.orbitFirstDegree,
    };
}
export function extractDetailedProfile(profile, orbitFirstDegree, userId) {
    const { aiRating } = profile;
    const myBasics = extractMyBasics(profile.widgets);
    const funFacts = extractFunFacts(profile.widgets);
    return {
        userId,
        displayName: profile.displayName ?? null,
        username: profile.username ?? null,
        photoUrl: extractDefaultPhoto(profile.widgets),
        photos: extractPhotos(profile.widgets),
        link: profile.link ?? null,
        location: aiRating.basic?.location?.trim() ?? profile.location?.city?.trim() ?? myBasics.location ?? null,
        birthday: myBasics.birthday ?? parseBirthday(aiRating.basic?.birthday) ?? null,
        age: parseAge(aiRating.basic?.birthday),
        verified: profile.verified ?? false,
        generationLevel: profile.generationLevel ?? null,
        bio: aiRating.bio ?? null,
        greenFlags: flags(aiRating.greenFlagsV2),
        redFlags: flags(aiRating.redFlagsV2),
        personalLife: flags(aiRating.personalLife),
        loveLanguage: flags(aiRating.loveLanguage),
        starSign: flags(aiRating.starSign),
        jobs: listItems(aiRating.jobs?.jobs),
        education: listItems(aiRating.education?.educations),
        accomplishments: listItems(aiRating.accomplishments?.accomplishments),
        controversies: listItems(aiRating.controversies?.controversies),
        bestQualities: listItems(aiRating.bestQualities?.qualities),
        netWorth: listItems(aiRating.netWorth?.netWorth),
        worldview: worldview(aiRating.worldview),
        passions: extractPassions(aiRating.passions),
        funFacts,
        socialLinks: (profile.socialMediaHandles ?? [])
            .filter((h) => h.media && h.handle?.trim())
            .map((h) => ({ media: h.media, handle: h.handle.trim() })),
        orbitFirstDegree: firstDegree(orbitFirstDegree),
        orbitSources: (profile.orbitSources ?? [])
            .filter((s) => s.link)
            .map((s) => ({ url: s.link, name: s.title ?? s.sourceName ?? "" })),
        skills: extractSkills(funFacts),
        previousLocations: extractPreviousLocations(funFacts),
    };
}
//# sourceMappingURL=extractors.js.map