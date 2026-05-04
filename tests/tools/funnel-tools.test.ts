/**
 * Unit Tests for Funnel Tools
 * Tests all 3 funnel management MCP tools
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { FunnelTools } from '../../src/tools/funnel-tools.js';
import { MockGHLApiClient, mockFunnel, mockFunnelPage } from '../mocks/ghl-api-client.mock.js';

describe('FunnelTools', () => {
  let funnelTools: FunnelTools;
  let mockGhlClient: MockGHLApiClient;

  beforeEach(() => {
    mockGhlClient = new MockGHLApiClient();
    funnelTools = new FunnelTools(mockGhlClient as any);
  });

  describe('getTools', () => {
    it('should return 3 funnel tool definitions', () => {
      const tools = funnelTools.getTools();
      expect(tools).toHaveLength(3);

      const toolNames = tools.map(tool => tool.name);
      expect(toolNames).toEqual([
        'ghl_list_funnels',
        'ghl_get_funnel_pages',
        'ghl_get_funnel_count'
      ]);
    });

    it('should have proper schema definitions for all tools', () => {
      const tools = funnelTools.getTools();

      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });

    it('should require funnelId for ghl_get_funnel_pages', () => {
      const tools = funnelTools.getTools();
      const funnelPagesTool = tools.find(t => t.name === 'ghl_get_funnel_pages');
      expect(funnelPagesTool?.inputSchema.required).toContain('funnelId');
    });
  });

  describe('executeFunnelTool', () => {
    it('should route tool calls correctly', async () => {
      const listSpy = jest.spyOn(funnelTools as any, 'listFunnels');
      const pagesSpy = jest.spyOn(funnelTools as any, 'getFunnelPages');
      const countSpy = jest.spyOn(funnelTools as any, 'getFunnelCount');

      await funnelTools.executeFunnelTool('ghl_list_funnels', {});
      await funnelTools.executeFunnelTool('ghl_get_funnel_pages', { funnelId: 'funnel_123' });
      await funnelTools.executeFunnelTool('ghl_get_funnel_count', {});

      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(pagesSpy).toHaveBeenCalledTimes(1);
      expect(countSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw error for unknown tool', async () => {
      await expect(
        funnelTools.executeFunnelTool('unknown_funnel_tool', {})
      ).rejects.toThrow('Unknown funnel tool: unknown_funnel_tool');
    });
  });

  describe('ghl_list_funnels', () => {
    it('should list funnels successfully', async () => {
      const result = await funnelTools.executeFunnelTool('ghl_list_funnels', {});

      expect(result.success).toBe(true);
      expect(result.funnels).toBeDefined();
      expect(Array.isArray(result.funnels)).toBe(true);
      expect(result.funnels).toHaveLength(1);
      expect(result.funnels[0]).toMatchObject(mockFunnel as any);
      expect(result.message).toContain('1 funnels');
    });

    it('should pass filter params to the API', async () => {
      const listFunnelsSpy = jest.spyOn(mockGhlClient, 'listFunnels');

      await funnelTools.executeFunnelTool('ghl_list_funnels', {
        name: 'Sales Funnel',
        status: 'active',
        type: 'funnel',
        limit: 5,
        offset: 10
      });

      expect(listFunnelsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sales Funnel',
          status: 'active',
          type: 'funnel',
          limit: 5,
          offset: 10
        })
      );
    });

    it('should include pagination metadata', async () => {
      const result = await funnelTools.executeFunnelTool('ghl_list_funnels', {
        limit: 5,
        offset: 0
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.pagination).toEqual({
        limit: 5,
        offset: 0
      });
    });

    it('should include filter metadata when filters are applied', async () => {
      const result = await funnelTools.executeFunnelTool('ghl_list_funnels', {
        status: 'active',
        search: 'test'
      });

      expect(result.metadata.filters).toMatchObject({
        status: 'active',
        search: 'test'
      });
    });
  });

  describe('ghl_get_funnel_pages', () => {
    it('should get funnel pages successfully', async () => {
      const result = await funnelTools.executeFunnelTool('ghl_get_funnel_pages', {
        funnelId: 'funnel_123'
      });

      expect(result.success).toBe(true);
      expect(result.pages).toBeDefined();
      expect(Array.isArray(result.pages)).toBe(true);
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0]).toMatchObject(mockFunnelPage as any);
      expect(result.funnelId).toBe('funnel_123');
      expect(result.message).toContain('1 funnel pages');
    });

    it('should pass filter params to the API', async () => {
      const getPagesSpy = jest.spyOn(mockGhlClient, 'getFunnelPages');

      await funnelTools.executeFunnelTool('ghl_get_funnel_pages', {
        funnelId: 'funnel_123',
        name: 'Landing',
        limit: 10,
        offset: 0
      });

      expect(getPagesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          funnelId: 'funnel_123',
          name: 'Landing',
          limit: 10,
          offset: 0
        })
      );
    });

    it('should throw error when funnel not found', async () => {
      await expect(
        funnelTools.executeFunnelTool('ghl_get_funnel_pages', { funnelId: 'not_found' })
      ).rejects.toThrow('Failed to get funnel pages');
    });

    it('should include total and pagination in metadata', async () => {
      const result = await funnelTools.executeFunnelTool('ghl_get_funnel_pages', {
        funnelId: 'funnel_123',
        limit: 20,
        offset: 0
      });

      expect(result.total).toBe(1);
      expect(result.metadata.totalPages).toBe(1);
      expect(result.metadata.pagination).toEqual({
        limit: 20,
        offset: 0
      });
    });
  });

  describe('ghl_get_funnel_count', () => {
    it('should get funnel count successfully', async () => {
      const result = await funnelTools.executeFunnelTool('ghl_get_funnel_count', {});

      expect(result.success).toBe(true);
      expect(result.count).toBe(5);
      expect(result.message).toContain('5 funnels');
    });

    it('should pass filter params to the API', async () => {
      const getCountSpy = jest.spyOn(mockGhlClient, 'getFunnelCount');

      await funnelTools.executeFunnelTool('ghl_get_funnel_count', {
        type: 'funnel',
        search: 'sales',
        status: 'active'
      });

      expect(getCountSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'funnel',
          search: 'sales',
          status: 'active'
        })
      );
    });

    it('should include applied filters in result', async () => {
      const result = await funnelTools.executeFunnelTool('ghl_get_funnel_count', {
        status: 'active',
        type: 'funnel'
      });

      expect(result.filters).toMatchObject({
        status: 'active',
        type: 'funnel'
      });
    });

    it('should return empty filters object when no filters applied', async () => {
      const result = await funnelTools.executeFunnelTool('ghl_get_funnel_count', {});
      expect(result.filters).toEqual({});
    });
  });
});
