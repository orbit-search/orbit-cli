export type SectionName = "bio" | "work" | "education" | "accomplishments" | "controversies" | "passions" | "personal" | "qualities" | "worldview" | "social" | "connections" | "sources" | "facts" | "skills" | "locations";
export interface SectionOptions {
    json?: boolean;
}
export declare function sectionCommand(profileId: string, section: string, options: SectionOptions): Promise<void>;
//# sourceMappingURL=sections.d.ts.map