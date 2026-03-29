export interface SearchOptions {
    limit?: number;
    json?: boolean;
    verbose?: boolean;
    age?: number;
    location?: string;
}
export declare function searchCommand(query: string, options: SearchOptions): Promise<void>;
//# sourceMappingURL=search.d.ts.map