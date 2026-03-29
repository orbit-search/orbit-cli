/**
 * Output formatting utilities for token-efficient display
 */

import type {
  CombinedProfile,
  DeepSearchProfile,
  FullOrbitProfile,
  SocialProfile,
  OutputFormat,
} from '../api/types.js';

/**
 * Format a profile for display based on the requested format
 */
export function formatProfile(
  profile: CombinedProfile,
  format: OutputFormat,
  section?: string
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(profile, null, 2);
    case 'brief':
      return formatBrief(profile);
    case 'text':
    default:
      return formatText(profile, section);
  }
}

/**
 * Format multiple profiles for display
 */
export function formatProfiles(
  profiles: CombinedProfile[],
  format: OutputFormat
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(profiles, null, 2);
    case 'brief':
      return profiles.map(formatBrief).join('\n');
    case 'text':
    default:
      return profiles.map((p) => formatText(p)).join('\n\n═══\n\n');
  }
}

/**
 * One-line brief format
 * Example: Nicholas Dominici | 38 | Bethlehem, PA | DVP Operations @ RestorixHealth | ESU
 */
function formatBrief(profile: CombinedProfile): string {
  const parts: string[] = [profile.name];

  if (profile.age) parts.push(String(profile.age));
  if (profile.location) parts.push(profile.location);

  const currentJob = profile.jobs?.[0];
  if (currentJob) {
    const jobText = currentJob.years?.includes('-')
      ? `${currentJob.name} (${currentJob.years})`
      : currentJob.name;
    parts.push(jobText);
  }

  const school = profile.education?.[0];
  if (school) {
    parts.push(school.name);
  }

  return parts.join(' | ');
}

/**
 * Full text format with sections
 */
function formatText(profile: CombinedProfile, section?: string): string {
  const lines: string[] = [];

  // Header
  const headerParts: string[] = [];
  if (profile.location) headerParts.push(`📍 ${profile.location}`);
  if (profile.age) headerParts.push(`🎂 ${profile.age}`);
  if (profile.orbitId) {
    headerParts.push(`🔗 orbitsearch.com/${profile.orbitId.slice(0, 8)}...`);
  }

  lines.push(`═══ ${profile.name} ═══`);
  if (headerParts.length > 0) {
    lines.push(headerParts.join(' | '));
  }
  lines.push('');

  // If a specific section is requested, only show that
  if (section) {
    const sectionContent = getSection(profile, section);
    if (sectionContent) {
      lines.push(sectionContent);
    }
    return lines.join('\n');
  }

  // Bio
  if (profile.bio) {
    lines.push(`📝 Bio: ${profile.bio}`);
    lines.push('');
  }

  // Work
  if (profile.jobs && profile.jobs.length > 0) {
    lines.push('💼 Work:');
    for (const job of profile.jobs) {
      const years = job.years ? ` (${job.years})` : '';
      lines.push(`  • ${job.name}${years}`);
    }
    lines.push('');
  }

  // Education
  if (profile.education && profile.education.length > 0) {
    lines.push('🎓 Education:');
    for (const edu of profile.education) {
      const years = edu.years ? ` (${edu.years})` : '';
      lines.push(`  • ${edu.name}${years}`);
    }
    lines.push('');
  }

  // Accomplishments
  if (profile.accomplishments && profile.accomplishments.length > 0) {
    lines.push('🏆 Accomplishments:');
    for (const acc of profile.accomplishments.slice(0, 3)) {
      lines.push(`  • ${acc.name}`);
    }
    lines.push('');
  }

  // Worldview
  if (profile.worldview) {
    const worldviewParts: string[] = [];
    if (profile.worldview.politics) worldviewParts.push(`Politics: ${profile.worldview.politics}`);
    if (profile.worldview.religion) worldviewParts.push(`Religion: ${profile.worldview.religion}`);
    if (profile.worldview.causes) worldviewParts.push(`Causes: ${profile.worldview.causes}`);
    if (worldviewParts.length > 0) {
      lines.push('🌍 Worldview: ' + worldviewParts.join(' | '));
      lines.push('');
    }
  }

  // Passions
  if (profile.passions && profile.passions.length > 0) {
    lines.push('🔥 Passions: ' + profile.passions.map((p) => p.passion).join(', '));
    lines.push('');
  }

  // Social handles
  if (profile.socialHandles && profile.socialHandles.length > 0) {
    const handles: string[] = [];
    for (const h of profile.socialHandles) {
      const media = h.media.toLowerCase();
      const handle = h.handle.trim();
      if (!handle) continue;
      if (media.includes('linkedin')) {
        handles.push(`LinkedIn: ${handle.startsWith('http') ? handle : `linkedin.com/in/${handle}`}`);
      } else if (media.includes('twitter') || media.includes('x')) {
        handles.push(`X: @${handle.replace(/^@/, '')}`);
      } else if (media.includes('instagram')) {
        handles.push(`IG: @${handle.replace(/^@/, '')}`);
      } else if (media.includes('tiktok')) {
        handles.push(`TikTok: @${handle.replace(/^@/, '')}`);
      } else {
        handles.push(`${h.media}: ${handle}`);
      }
    }
    if (handles.length > 0) {
      lines.push(`🌐 Social: ${handles.join(' | ')}`);
      lines.push('');
    }
  }

  // LinkedIn from deep-search data (if no social handles)
  if ((!profile.socialHandles || profile.socialHandles.length === 0) && profile.rawDeepSearch) {
    const ds = profile.rawDeepSearch as any;
    if (ds.linkedin_profile_url) {
      lines.push(`🌐 LinkedIn: ${ds.linkedin_profile_url}`);
      lines.push('');
    }
  }

  // Phone (from deep search)
  if (profile.rawDeepSearch) {
    const ds = profile.rawDeepSearch as any;
    if (ds.mobile_phone || ds.phone_numbers?.length > 0) {
      const phone = ds.mobile_phone || ds.phone_numbers?.[0];
      if (phone) lines.push(`📱 Phone: ${phone}`);
    }
    if (ds.email_addresses?.length > 0) {
      lines.push(`📧 Email: ${ds.email_addresses.join(', ')}`);
    }
  }

  // Sources count
  if (profile.sources && profile.sources.length > 0) {
    lines.push(`📊 Sources: ${profile.sources.length} sources indexed`);
  }

  return lines.join('\n').trim();
}

/**
 * Get a specific section of the profile
 */
function getSection(profile: CombinedProfile, section: string): string | null {
  switch (section.toLowerCase()) {
    case 'bio':
      return profile.bio ? `📝 Bio: ${profile.bio}` : null;

    case 'jobs':
    case 'work':
      if (!profile.jobs || profile.jobs.length === 0) return null;
      return (
        '💼 Work:\n' +
        profile.jobs.map((j) => `  • ${j.name}${j.years ? ` (${j.years})` : ''}`).join('\n')
      );

    case 'education':
      if (!profile.education || profile.education.length === 0) return null;
      return (
        '🎓 Education:\n' +
        profile.education
          .map((e) => `  • ${e.name}${e.years ? ` (${e.years})` : ''}`)
          .join('\n')
      );

    case 'worldview':
      if (!profile.worldview) return null;
      const parts: string[] = [];
      if (profile.worldview.politics) parts.push(`Politics: ${profile.worldview.politics}`);
      if (profile.worldview.religion) parts.push(`Religion: ${profile.worldview.religion}`);
      if (profile.worldview.causes) parts.push(`Causes: ${profile.worldview.causes}`);
      return parts.length > 0 ? '🌍 Worldview: ' + parts.join(' | ') : null;

    case 'accomplishments':
      if (!profile.accomplishments || profile.accomplishments.length === 0) return null;
      return (
        '🏆 Accomplishments:\n' +
        profile.accomplishments.slice(0, 5).map((a: { name: string }) => `  • ${a.name}`).join('\n')
      );

    case 'controversies':
      if (!profile.controversies || profile.controversies.length === 0) return null;
      return (
        '⚠️ Controversies:\n' +
        profile.controversies.slice(0, 5).map((c: { name: string }) => `  • ${c.name}`).join('\n')
      );

    case 'passions':
      if (!profile.passions || profile.passions.length === 0) return null;
      return '🔥 Passions: ' + profile.passions.map((p: { passion: string }) => p.passion).join(', ');

    case 'sources':
      if (!profile.sources || profile.sources.length === 0) return null;
      return (
        '📚 Sources:\n' +
        profile.sources.slice(0, 10).map((s: { title?: string; link: string; sourceName?: string }) => `  • ${s.title || s.link} (${s.sourceName || 'unknown'})`).join('\n')
      );

    default:
      return null;
  }
}

/**
 * Combine Deep Search and Social profiles into a unified structure
 */
export function combineProfiles(
  deepSearchProfile: DeepSearchProfile | FullOrbitProfile | null,
  socialProfile: SocialProfile | null
): CombinedProfile {
  const combined: CombinedProfile = {
    name: 'Unknown',
  };

  if (deepSearchProfile) {
    const fullProfile = deepSearchProfile as FullOrbitProfile;
    combined.orbitId = deepSearchProfile.orbit_id;
    combined.name = fullProfile.person_name || fullProfile.display_name || deepSearchProfile.name || 'Unknown';
    combined.age = deepSearchProfile.age;
    // Location can be a string or an object {lat, lon} — normalize
    const rawLoc = deepSearchProfile.location;
    if (typeof rawLoc === 'string') {
      combined.location = rawLoc;
    } else if (rawLoc && typeof rawLoc === 'object') {
      // Full orbit profile has location as {lat, lon} - use city/state instead
      const city = (fullProfile as any).city;
      const state = (fullProfile as any).state;
      combined.location = [city, state].filter(Boolean).join(', ') || undefined;
    }
    combined.senditId = deepSearchProfile.sendit_id;
    combined.rawDeepSearch = deepSearchProfile;

    if (fullProfile.jobs && Array.isArray(fullProfile.jobs)) {
      combined.jobs = fullProfile.jobs
        .filter((j: { title?: string; company?: string }) => j.title || j.company)
        .map((j: { title?: string; company?: string; years?: string }) => ({
          name: j.company && j.title ? `${j.title} @ ${j.company}` : j.title || j.company || '',
          years: j.years,
        }));
    }

    if (fullProfile.schools && Array.isArray(fullProfile.schools)) {
      combined.education = fullProfile.schools.map((s: { name?: string; years?: string }) => ({
        name: s.name || '',
        years: s.years,
      }));
    }
  }

  if (socialProfile) {
    combined.senditId = socialProfile.userId;
    combined.rawSocial = socialProfile;

    if (socialProfile.aiRating) {
      const ai = socialProfile.aiRating;

      if (ai.bio) {
        combined.bio = ai.bio;
      }

      if (ai.basic?.location && !combined.location) {
        combined.location = ai.basic.location;
      }

      if (ai.basic?.birthday && !combined.age) {
        // Try to extract age from birthday
        const age = extractAge(ai.basic.birthday);
        if (age) combined.age = age;
      }

      if (ai.jobs?.jobs) {
        combined.jobs = ai.jobs.jobs.map((j) => ({
          name: j.name,
          years: j.extData?.years,
        }));
      }

      if (ai.education?.educations) {
        combined.education = ai.education.educations.map((e) => ({
          name: e.name,
          years: e.extData?.years,
        }));
      }

      if (ai.accomplishments?.accomplishments) {
        combined.accomplishments = ai.accomplishments.accomplishments;
      }

      if (ai.controversies?.controversies) {
        combined.controversies = ai.controversies.controversies;
      }

      if (ai.bestQualities?.qualities) {
        combined.bestQualities = ai.bestQualities.qualities;
      }

      if (ai.worldview) {
        combined.worldview = ai.worldview;
      }

      if (ai.passions) {
        combined.passions = ai.passions;
      }
    }

    if (socialProfile.socialMediaHandles) {
      combined.socialHandles = socialProfile.socialMediaHandles;
    }

    if (socialProfile.orbitSources) {
      combined.sources = socialProfile.orbitSources;
    }
  }

  return combined;
}

/**
 * Extract age from birthday string
 */
function extractAge(birthday: string): number | undefined {
  // Try to extract year from various formats
  const yearMatch = birthday.match(/(\d{4})/);
  if (yearMatch) {
    const birthYear = parseInt(yearMatch[1], 10);
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    if (age > 0 && age < 150) return age;
  }
  return undefined;
}

/**
 * Format error message
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
}

/**
 * Format success message
 */
export function formatSuccess(message: string): string {
  return `✓ ${message}`;
}
