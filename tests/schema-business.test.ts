import { describe, it, expect } from 'vitest';
import { businessNode } from '../src/lib/business-schema';
import { BRAND } from '../src/lib/agent-facts';
import { BUSINESS_ID } from '../src/lib/schema-graph';
import { checkAnswer, DEFAULT_RULES } from '../src/lib/agent-guardrail';

const node = businessNode() as Record<string, any>;

describe('businessNode: JSON-LD aligned to the brand facts', () => {
  it('keeps the canonical @id and types', () => {
    expect(node['@id']).toBe(BUSINESS_ID);
    expect(node['@type']).toEqual(['LocalBusiness', 'HomeAndConstructionBusiness']);
    expect(node['@context']).toBeUndefined();
  });

  it('slogan, founder, phone and email come from BRAND', () => {
    expect(node.slogan).toBe(BRAND.tagline);
    expect(node.founder).toEqual({ '@type': 'Person', name: 'Jaime Aguilar' });
    expect(node.telephone).toBe(BRAND.phone);
    expect(node.email).toBe(BRAND.email);
  });

  it('description leads with remodeling, says fully insured and since 2019, never licensed', () => {
    const d: string = node.description;
    expect(d.toLowerCase().indexOf('remodeling')).toBeGreaterThanOrEqual(0);
    expect(d.toLowerCase().indexOf('remodeling')).toBeLessThan(d.toLowerCase().indexOf('handyman'));
    expect(d).toContain('fully insured');
    expect(d).toContain('since 2019');
    expect(d.toLowerCase()).not.toContain('licensed');
    expect(d).not.toMatch(/[—–]/);
    expect(checkAnswer(d, DEFAULT_RULES)).toEqual({ ok: true, violations: [] });
  });

  it('keeps the nine service areas and the existing actions, and adds the agent estimate action', () => {
    expect(node.areaServed).toHaveLength(9);
    const actions: any[] = node.potentialAction;
    expect(actions.some((a) => a['@type'] === 'ReserveAction')).toBe(true);
    expect(actions.some((a) => a.name === 'Call Now')).toBe(true);
    const agent = actions.find((a) => a.target?.urlTemplate === 'https://www.ifixxnc.com/api/agent/estimate');
    expect(agent).toBeTruthy();
    expect(agent['@type']).toBe('CommunicateAction');
    expect(agent.name).toBe('Request an estimate (AI assistants)');
    expect(agent.target.contentType).toBe('application/json');
    expect(agent.target.httpMethod).toBe('POST');
  });

  it('keeps address, geo, hours, rating and sameAs', () => {
    expect(node.address.addressLocality).toBe('Charlotte');
    expect(node.geo.latitude).toBe('35.2271');
    expect(node.openingHoursSpecification.length).toBeGreaterThan(0);
    expect(node.aggregateRating['@type']).toBe('AggregateRating');
    expect(node.sameAs.length).toBe(10);
    expect(node.legalName).toBe('iFIXX Remodeling LLC');
    expect(node.foundingDate).toBe('2019');
  });
});
