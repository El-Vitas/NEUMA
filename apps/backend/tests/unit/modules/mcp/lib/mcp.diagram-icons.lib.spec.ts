import { describe, expect, it } from 'bun:test';
import { hasMcpDiagramIcon, searchMcpDiagramIcons } from '@/modules/mcp/lib/mcp.diagram-icons.lib';
import type { McpIconPack } from '@/modules/mcp/types/mcp.pages.types';

const brands: McpIconPack = {
  icons: { aws: {}, 'aws-lambda': {}, postgresql: {}, 'google-cloud': {} },
  prefix: 'logos',
};
const material: McpIconPack = {
  aliases: { 'database-outline-alias': {} },
  icons: {
    database: {},
    'database-lock': {},
    monitor: {},
    'monitor-dashboard': {},
    presentation: {},
    server: {},
    'server-network': {},
  },
  prefix: 'mdi',
};

describe('searchMcpDiagramIcons', () => {
  it('finds icons by their name across the packs, the exact one first, as a diagram names them', () => {
    expect(searchMcpDiagramIcons([brands, material], 'database', 10)).toEqual([
      'mdi:database',
      'mdi:database-lock',
      'mdi:database-outline-alias',
    ]);
  });

  it('puts first the icon that has every word asked for, however they are written', () => {
    expect(searchMcpDiagramIcons([brands, material], 'Google  Cloud', 10)).toEqual(['logos:google-cloud']);
    expect(searchMcpDiagramIcons([brands, material], 'aws lambda', 10)).toEqual(['logos:aws-lambda', 'logos:aws']);
  });

  it('finds the icons that answer any of several words, those named just like one of them first', () => {
    expect(searchMcpDiagramIcons([brands, material], 'monitor presentation screen', 10)).toEqual([
      'mdi:monitor',
      'mdi:presentation',
      'mdi:monitor-dashboard',
    ]);
  });

  it('gives no more than asked for', () => {
    expect(searchMcpDiagramIcons([brands, material], 'server', 1)).toEqual(['mdi:server']);
  });

  it('says nothing when no icon answers', () => {
    expect(searchMcpDiagramIcons([brands, material], 'unicornio', 10)).toEqual([]);
  });
});

describe('hasMcpDiagramIcon', () => {
  it('knows an icon by its pack and its name, aliases included', () => {
    expect(hasMcpDiagramIcon([brands, material], 'logos:postgresql')).toBe(true);
    expect(hasMcpDiagramIcon([brands, material], 'mdi:database-outline-alias')).toBe(true);
  });

  it('knows the icons Mermaid draws on its own in an architecture diagram, and no other name without a pack', () => {
    expect(hasMcpDiagramIcon([brands, material], 'database')).toBe(true);
    expect(hasMcpDiagramIcon([brands, material], 'laptop')).toBe(false);
  });

  it('does not know an icon from another pack, or one the pack does not have', () => {
    expect(hasMcpDiagramIcon([brands, material], 'fa:user')).toBe(false);
    expect(hasMcpDiagramIcon([brands, material], 'logos:unicornio')).toBe(false);
  });
});
