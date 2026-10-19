export const GPC_RULE_ID = 1;
export const REFERRER_RULE_ID = 2;

/** Cross-site requests send no referrer. Same-site requests still do. */
export const REFERRER_POLICY_VALUE = 'same-origin';

const HEADER_RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'other',
] as const;

export interface HeaderRule {
  id: number;
  priority: number;
  action: {
    type: 'modifyHeaders';
    requestHeaders?: { header: string; operation: 'set'; value: string }[];
    responseHeaders?: { header: string; operation: 'set'; value: string }[];
  };
  condition: {
    urlFilter: string;
    resourceTypes: string[];
  };
}

export function gpcRule(): HeaderRule {
  return {
    id: GPC_RULE_ID,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [{ header: 'Sec-GPC', operation: 'set', value: '1' }],
    },
    condition: {
      urlFilter: '*',
      resourceTypes: [...HEADER_RESOURCE_TYPES],
    },
  };
}

export function referrerRule(): HeaderRule {
  return {
    id: REFERRER_RULE_ID,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      responseHeaders: [{ header: 'Referrer-Policy', operation: 'set', value: REFERRER_POLICY_VALUE }],
    },
    condition: {
      urlFilter: '*',
      resourceTypes: ['main_frame', 'sub_frame'],
    },
  };
}

export function headerRules(settings: { sendGpc: boolean; trimReferrers: boolean }): HeaderRule[] {
  const rules: HeaderRule[] = [];
  if (settings.sendGpc) rules.push(gpcRule());
  if (settings.trimReferrers) rules.push(referrerRule());
  return rules;
}
