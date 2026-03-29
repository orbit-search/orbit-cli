import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { DeepSearchClient } from './api/deep-search.js';
import { SocialApiClient } from './api/social-api.js';
import { loadConfig, getDeepSearchConfig, getSocialApiConfig } from './utils/config.js';
import { combineProfiles, formatProfile, formatProfiles, formatError } from './utils/formatter.js';
const config = loadConfig();
const deepSearchClient = new DeepSearchClient(getDeepSearchConfig(config));
const socialClient = new SocialApiClient(getSocialApiConfig(config));
const server = new Server({
    name: 'orbit-search',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'search_people',
                description: 'Search for people by name. Returns matching profiles with key details like age, location, work history, and education.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Name to search for',
                        },
                        limit: {
                            type: 'number',
                            description: 'Number of results to return (default: 3, max: 10)',
                        },
                        age: {
                            type: 'number',
                            description: 'Optional age hint for ranking results',
                        },
                    },
                    required: ['query'],
                },
            },
            {
                name: 'get_profile',
                description: 'Get full profile for a specific person by their ID. Returns comprehensive data including bio, work history, education, worldview, and social media handles.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Orbit ID or Sendit ID (UUID)',
                        },
                        section: {
                            type: 'string',
                            description: 'Optional: only return specific section (bio, jobs, education, worldview, accomplishments, controversies, passions, sources)',
                        },
                    },
                    required: ['id'],
                },
            },
            {
                name: 'deep_search',
                description: 'Trigger a new deep search for someone who may not be in the system yet. This initiates a background search that may take several minutes. Returns a search ID to check status.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Full name to search for',
                        },
                        phone: {
                            type: 'string',
                            description: 'Optional phone number (improves accuracy)',
                        },
                        twitter: {
                            type: 'string',
                            description: 'Optional Twitter/X handle (without @)',
                        },
                    },
                    required: ['name'],
                },
            },
            {
                name: 'smart_search',
                description: 'Natural language search for people using criteria like "Stanford engineers who worked at Google". May fall back to basic search if the smart endpoint is unavailable.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Natural language query describing the person(s) you are looking for',
                        },
                        limit: {
                            type: 'number',
                            description: 'Number of results (default: 6)',
                        },
                    },
                    required: ['query'],
                },
            },
        ],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'search_people': {
                const query = args?.query;
                const limit = args?.limit ?? 3;
                const age = args?.age;
                const searchResult = await deepSearchClient.searchProfiles(query, age);
                if (!searchResult.success || !searchResult.profiles || searchResult.profiles.length === 0) {
                    return {
                        content: [{ type: 'text', text: 'No profiles found.' }],
                    };
                }
                const profilesToProcess = searchResult.profiles.slice(0, limit);
                const combinedProfiles = [];
                for (const deepProfile of profilesToProcess) {
                    let socialProfile = null;
                    if (deepProfile.sendit_id) {
                        try {
                            socialProfile = await socialClient.getProfileByUserId(deepProfile.sendit_id);
                        }
                        catch {
                            // Continue without social profile
                        }
                    }
                    combinedProfiles.push(combineProfiles(deepProfile, socialProfile));
                }
                const output = formatProfiles(combinedProfiles, 'text');
                return {
                    content: [{ type: 'text', text: output }],
                };
            }
            case 'get_profile': {
                const id = args?.id;
                const section = args?.section;
                let combinedProfile;
                // Try as orbit_id first (via deep-search), then as sendit_id (via social API)
                let fullProfile = null;
                let socialProfile = null;
                try {
                    fullProfile = await deepSearchClient.getFullProfile(id);
                }
                catch {
                    // Not an orbit_id, or not found
                }
                if (fullProfile) {
                    // Got orbit profile — try to enrich with social data
                    const senditId = fullProfile.sendit_id;
                    if (senditId) {
                        try {
                            socialProfile = await socialClient.getProfileByUserId(senditId);
                        }
                        catch {
                            // Continue without social profile
                        }
                    }
                    combinedProfile = combineProfiles(fullProfile, socialProfile);
                }
                else {
                    // Try as sendit_id via social API
                    try {
                        socialProfile = await socialClient.getProfileByUserId(id);
                    }
                    catch {
                        // Not found
                    }
                    if (!socialProfile) {
                        return {
                            content: [{ type: 'text', text: `Profile not found for ID ${id}` }],
                            isError: true,
                        };
                    }
                    combinedProfile = combineProfiles(null, socialProfile);
                }
                const output = formatProfile(combinedProfile, 'text', section);
                return {
                    content: [{ type: 'text', text: output }],
                };
            }
            case 'deep_search': {
                const personName = args?.name;
                const phone = args?.phone;
                const twitter = args?.twitter;
                const result = await deepSearchClient.triggerDeepSearch(personName, { phone, twitterHandle: twitter });
                const output = `Deep search initiated.\nSearch ID: ${result.search_id}\nJob ID: ${result.job_id}\n\nUse the search ID to check status or wait for results.`;
                return {
                    content: [{ type: 'text', text: output }],
                };
            }
            case 'smart_search': {
                const smartQuery = args?.query;
                const smartLimit = args?.limit ?? 6;
                const result = await socialClient.smartSearch(smartQuery, smartLimit);
                if (!result) {
                    return {
                        content: [{ type: 'text', text: 'Smart search endpoint is currently unavailable.' }],
                    };
                }
                if (result.status !== 'success' || !result.payload?.users || result.payload.users.length === 0) {
                    return {
                        content: [{ type: 'text', text: 'No profiles found.' }],
                    };
                }
                const combinedProfiles = [];
                for (const user of result.payload.users) {
                    try {
                        const socialProfile = await socialClient.getProfileByUserId(user.userId);
                        if (socialProfile) {
                            combinedProfiles.push(combineProfiles(null, socialProfile));
                        }
                    }
                    catch {
                        // Continue without this profile
                    }
                }
                if (combinedProfiles.length === 0) {
                    return {
                        content: [{ type: 'text', text: 'Found users but could not fetch detailed profiles.\n\n' + JSON.stringify(result.payload.users, null, 2) }],
                    };
                }
                const output = formatProfiles(combinedProfiles, 'text');
                return {
                    content: [{ type: 'text', text: output }],
                };
            }
            default:
                return {
                    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
                    isError: true,
                };
        }
    }
    catch (error) {
        return {
            content: [{ type: 'text', text: formatError(error) }],
            isError: true,
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Orbit MCP Server running on stdio');
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=mcp-server.js.map