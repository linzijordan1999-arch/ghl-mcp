import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GHLApiClient } from '../clients/ghl-api-client.js';
import {
  MCPListFunnelsParams,
  MCPGetFunnelPagesParams,
  MCPGetFunnelCountParams
} from '../types/ghl-types.js';

export class FunnelTools {
  constructor(private apiClient: GHLApiClient) {}

  getTools(): Tool[] {
    return [
      {
        name: 'ghl_list_funnels',
        description: 'List all funnels for a location. Funnels are multi-step landing page sequences used for lead generation and conversion in GoHighLevel.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'The location ID to list funnels for. Defaults to the configured location.'
            },
            name: {
              type: 'string',
              description: 'Filter funnels by name (partial match supported)'
            },
            search: {
              type: 'string',
              description: 'Search term to filter funnels'
            },
            status: {
              type: 'string',
              description: 'Filter by funnel status (e.g., "active", "inactive")'
            },
            type: {
              type: 'string',
              description: 'Filter by funnel type'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of funnels to return (default: 10)'
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)'
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'ghl_get_funnel_pages',
        description: 'Get all pages (steps) within a specific funnel. Each page represents a step in the funnel sequence that visitors navigate through.',
        inputSchema: {
          type: 'object',
          properties: {
            funnelId: {
              type: 'string',
              description: 'The unique ID of the funnel to retrieve pages for'
            },
            locationId: {
              type: 'string',
              description: 'The location ID. Defaults to the configured location.'
            },
            name: {
              type: 'string',
              description: 'Filter pages by name'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of pages to return (default: 20)'
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)'
            }
          },
          required: ['funnelId'],
          additionalProperties: false
        }
      },
      {
        name: 'ghl_get_funnel_count',
        description: 'Get the total count of funnels for a location, optionally filtered by type, status, or search term. Useful for analytics and pagination planning.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'The location ID. Defaults to the configured location.'
            },
            type: {
              type: 'string',
              description: 'Filter count by funnel type'
            },
            search: {
              type: 'string',
              description: 'Search term to filter the count'
            },
            status: {
              type: 'string',
              description: 'Filter count by funnel status'
            }
          },
          additionalProperties: false
        }
      }
    ];
  }

  async executeFunnelTool(name: string, params: any): Promise<any> {
    try {
      switch (name) {
        case 'ghl_list_funnels':
          return await this.listFunnels(params as MCPListFunnelsParams);

        case 'ghl_get_funnel_pages':
          return await this.getFunnelPages(params as MCPGetFunnelPagesParams);

        case 'ghl_get_funnel_count':
          return await this.getFunnelCount(params as MCPGetFunnelCountParams);

        default:
          throw new Error(`Unknown funnel tool: ${name}`);
      }
    } catch (error) {
      console.error(`Error executing funnel tool ${name}:`, error);
      throw error;
    }
  }

  private async listFunnels(params: MCPListFunnelsParams): Promise<any> {
    try {
      const result = await this.apiClient.listFunnels({
        locationId: params.locationId || '',
        name: params.name,
        search: params.search,
        status: params.status,
        type: params.type,
        limit: params.limit,
        offset: params.offset
      });

      if (!result.success || !result.data) {
        throw new Error(`Failed to list funnels: ${result.error?.message || 'Unknown error'}`);
      }

      return {
        success: true,
        funnels: result.data.funnels,
        count: result.data.count,
        message: `Successfully retrieved ${result.data.funnels.length} funnels`,
        metadata: {
          totalCount: result.data.count,
          returnedCount: result.data.funnels.length,
          pagination: {
            limit: params.limit || 10,
            offset: params.offset || 0
          },
          filters: {
            ...(params.name && { name: params.name }),
            ...(params.search && { search: params.search }),
            ...(params.status && { status: params.status }),
            ...(params.type && { type: params.type })
          }
        }
      };
    } catch (error) {
      throw new Error(`Failed to list funnels: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getFunnelPages(params: MCPGetFunnelPagesParams): Promise<any> {
    try {
      const result = await this.apiClient.getFunnelPages({
        locationId: params.locationId || '',
        funnelId: params.funnelId,
        name: params.name,
        limit: params.limit,
        offset: params.offset
      });

      if (!result.success || !result.data) {
        throw new Error(`Failed to get funnel pages: ${result.error?.message || 'Unknown error'}`);
      }

      return {
        success: true,
        pages: result.data.pages,
        total: result.data.total,
        funnelId: params.funnelId,
        message: `Successfully retrieved ${result.data.pages.length} funnel pages`,
        metadata: {
          totalPages: result.data.total,
          returnedCount: result.data.pages.length,
          pagination: {
            limit: params.limit || 20,
            offset: params.offset || 0
          },
          ...(params.name && { nameFilter: params.name })
        }
      };
    } catch (error) {
      throw new Error(`Failed to get funnel pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getFunnelCount(params: MCPGetFunnelCountParams): Promise<any> {
    try {
      const result = await this.apiClient.getFunnelCount({
        locationId: params.locationId || '',
        type: params.type,
        search: params.search,
        status: params.status
      });

      if (!result.success || !result.data) {
        throw new Error(`Failed to get funnel count: ${result.error?.message || 'Unknown error'}`);
      }

      return {
        success: true,
        count: result.data.count,
        message: `Location has ${result.data.count} funnels`,
        filters: {
          ...(params.type && { type: params.type }),
          ...(params.search && { search: params.search }),
          ...(params.status && { status: params.status })
        }
      };
    } catch (error) {
      throw new Error(`Failed to get funnel count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
