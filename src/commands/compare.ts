import { getProfile, formatProfileBrief } from "../api.js";
import type { ProfileDetails } from "../types.js";

export interface CompareOptions {
  json?: boolean;
}

function findShared(a: ProfileDetails, b: ProfileDetails) {
  // Shared connections
  const aConnIds = new Set(a.orbitFirstDegree.map(c => c.senditId));
  const sharedConns = b.orbitFirstDegree.filter(c => aConnIds.has(c.senditId));

  // Shared companies (normalized)
  const norm = (s: string) => s.toLowerCase().replace(/[,.]?\s*(inc|corp|llc|ltd|co)\b\.?/gi, "").replace(/[^a-z0-9\s]/g, "").trim();
  const aCompanies = new Set(a.jobs.map(j => norm(j.text)));
  const bCompanies = b.jobs.map(j => ({ original: j.text, years: j.years, norm: norm(j.text) }));
  const sharedCompanies = bCompanies.filter(j => aCompanies.has(j.norm));

  // Shared schools
  const aSchools = new Set(a.education.map(e => norm(e.text)));
  const bSchools = b.education.map(e => ({ original: e.text, years: e.years, norm: norm(e.text) }));
  const sharedSchools = bSchools.filter(e => aSchools.has(e.norm));

  // Shared skills
  const aSkills = new Set(a.skills.map(s => s.toLowerCase()));
  const sharedSkills = b.skills.filter(s => aSkills.has(s.toLowerCase()));

  return { sharedConns, sharedCompanies, sharedSchools, sharedSkills };
}

export async function compareCommand(userIdA: string, userIdB: string, options: CompareOptions): Promise<void> {
  try {
    const [a, b] = await Promise.all([getProfile(userIdA), getProfile(userIdB)]);

    if (options.json) {
      const shared = findShared(a, b);
      console.log(JSON.stringify({
        personA: a,
        personB: b,
        shared: {
          connections: shared.sharedConns,
          companies: shared.sharedCompanies.map(c => c.original),
          schools: shared.sharedSchools.map(s => s.original),
          skills: shared.sharedSkills,
        },
      }, null, 2));
      return;
    }

    const shared = findShared(a, b);

    console.log(`=== ${a.displayName ?? "Person A"} ===`);
    console.log(formatProfileBrief(a));
    console.log(`\n=== ${b.displayName ?? "Person B"} ===`);
    console.log(formatProfileBrief(b));

    console.log("\n=== In Common ===");

    if (shared.sharedConns.length > 0) {
      console.log(`\nShared connections (${shared.sharedConns.length}):`);
      for (const c of shared.sharedConns.slice(0, 10)) {
        console.log(`  ${c.fullName}  [${c.senditId}]`);
      }
      if (shared.sharedConns.length > 10) console.log(`  +${shared.sharedConns.length - 10} more`);
    }

    if (shared.sharedCompanies.length > 0) {
      console.log(`\nShared companies:`);
      for (const c of shared.sharedCompanies) {
        console.log(`  ${c.original}${c.years ? ` (${c.years})` : ""}`);
      }
    }

    if (shared.sharedSchools.length > 0) {
      console.log(`\nShared schools:`);
      for (const s of shared.sharedSchools) {
        console.log(`  ${s.original}${s.years ? ` (${s.years})` : ""}`);
      }
    }

    if (shared.sharedSkills.length > 0) {
      console.log(`\nShared skills: ${shared.sharedSkills.join(", ")}`);
    }

    if (shared.sharedConns.length === 0 && shared.sharedCompanies.length === 0 && shared.sharedSchools.length === 0 && shared.sharedSkills.length === 0) {
      console.log("  Nothing in common found.");
    }
  } catch (error) {
    console.error(`Failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
