import type {
  ApiProfileResponse,
  ApiSocialProfile,
  ApiWidget,
  ApiFlagsSection,
  ApiBioSectionListItem,
  ApiPassionItem,
  ApiOrbitFirstDegree,
  BioSectionItem,
  ProfileDetails,
} from "./types.js";


function parseAge(birthday?: string): number | null {
  if (!birthday) return null;
  const match = /(\d+)\s+years?\s+old/i.exec(birthday);
  if (!match) return null;
  const age = Number.parseInt(match[1], 10);
  return Number.isNaN(age) ? null : age;
}

function extractPhoto(widgets: ApiWidget[] | undefined): string | null {
  if (!Array.isArray(widgets)) return null;
  const photoWidgets = widgets.filter(w => w.type === "sendit.games:photoreview-v1" && w.data?.answer?.trim());
  const defaultWidget = photoWidgets.find(w => w.data?.type === "default");
  const chosen = defaultWidget ?? photoWidgets[0];
  return chosen?.data?.answer?.trim() ?? null;
}

function listItems(items: ApiBioSectionListItem[] | undefined): BioSectionItem[] {
  if (!items) return [];
  const result: BioSectionItem[] = [];
  for (const item of items) {
    if (!item.name?.trim()) continue;
    let years = item.extData?.years;
    if (years && /^\d{4}-$/.test(years)) years = `${years}Present`;
    result.push({ text: item.name.trim(), years });
  }
  return result;
}

function flags(section: ApiFlagsSection | undefined): string[] {
  if (!section?.flags) return [];
  return Object.values(section.flags).filter((v) => v.trim() !== "").map((v) => v.trim());
}

function worldview(
  section: { politics?: string; religion?: string; causes?: string } | undefined
): ProfileDetails["worldview"] {
  if (!section) return null;
  const p = section.politics?.trim();
  const r = section.religion?.trim();
  const c = section.causes?.trim();
  if (!p && !r && !c) return null;
  return { ...(p ? { politics: p } : {}), ...(r ? { religion: r } : {}), ...(c ? { causes: c } : {}) };
}

function passions(items: ApiPassionItem[] | undefined): string[] {
  if (!items) return [];
  const result: string[] = [];
  for (const item of items) {
    const name = item.passion?.trim();
    if (name) result.push(name);
  }
  return [...new Set(result)];
}

function firstDegree(data: ApiOrbitFirstDegree | undefined): ProfileDetails["orbitFirstDegree"] {
  if (!data?.users) return [];
  return data.users
    .filter((u) => u.senditId)
    .map((u) => ({
      senditId: u.senditId,
      fullName: u.fullName ?? "",
      avatarUrl: u.avatarUrl ?? null,
      link: "https://orbitsearch.com/" + encodeURIComponent(u.senditId),
    }));
}

export function parseApiResponse(response: unknown): {
  socialProfile: ApiSocialProfile;
  orbitFirstDegree?: ApiOrbitFirstDegree;
} {
  const res = response as ApiProfileResponse;
  if (!res?.payload?.socialProfile) {
    throw new Error("Orbit API did not return payload.socialProfile");
  }
  return {
    socialProfile: res.payload.socialProfile,
    orbitFirstDegree: res.payload.orbitFirstDegree,
  };
}

export function extractDetailedProfile(
  profile: ApiSocialProfile,
  orbitFirstDegree: ApiOrbitFirstDegree | undefined,
  userId: string
): ProfileDetails {
  const { aiRating } = profile;
  
  return {
    userId,
    displayName: profile.displayName ?? null,
    username: profile.username ?? null,
    photoUrl: extractPhoto(profile.widgets),
    link: profile.link ?? null,
    location: aiRating.basic?.location?.trim() ?? profile.location?.city?.trim() ?? null,
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
    passions: passions(aiRating.passions),
    socialLinks: (profile.socialMediaHandles ?? [])
      .filter((h) => h.media && h.handle?.trim())
      .map((h) => ({ media: h.media, handle: h.handle.trim() })),
    orbitFirstDegree: firstDegree(orbitFirstDegree),
    orbitSources: (profile.orbitSources ?? [])
      .filter((s) => s.link)
      .slice(0, 10)
      .map((s) => ({ url: s.link, name: s.title ?? s.sourceName ?? "" })),
  };
}
