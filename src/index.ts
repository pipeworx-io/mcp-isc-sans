interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * SANS Internet Storm Center (ISC) MCP.
 *
 * Keyless internet threat intelligence from the SANS ISC DShield project:
 * IP reputation / attack-report history, per-port attack activity (volume of
 * probes hitting TCP/UDP ports like SSH/RDP/SMB), and the global InfoCon
 * threat level. A live operational-security complement to passive-DNS and
 * CVE packs. Keyless.
 */


const BASE = 'https://isc.sans.edu/api';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

/** Parse ISC numeric fields → Number, or null on null/empty/non-numeric. */
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Best-effort common-name for well-known ports. */
function serviceName(port: number): string | null {
  const map: Record<number, string> = {
    22: 'SSH',
    23: 'Telnet',
    25: 'SMTP',
    80: 'HTTP',
    443: 'HTTPS',
    445: 'SMB',
    3389: 'RDP',
    3306: 'MySQL',
    5432: 'Postgres',
    1433: 'MSSQL',
    6379: 'Redis',
    27017: 'MongoDB',
  };
  return map[port] ?? null;
}

const INFOCON_MEANING: Record<string, string> = {
  green: 'Everything normal',
  yellow: 'Elevated — notable activity',
  orange: 'High — major disruption likely',
  red: 'Severe — patching/connectivity issues',
};

/**
 * GET a path under BASE with the `?json` suffix added. Guards res.json() —
 * ISC returns HTML or an { error } object on bad input rather than throwing.
 */
async function iscGet(path: string): Promise<Record<string, unknown>> {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE}${path}${sep}json`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  const text = await res.text();
  if (!res.ok) {
    return { __error: `ISC: ${res.status} ${text.slice(0, 200)}` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { __error: `ISC: non-JSON response (${text.slice(0, 120)})` };
  }
  if (parsed && typeof parsed === 'object') {
    return parsed as Record<string, unknown>;
  }
  return { __error: 'ISC: unexpected response shape' };
}

const tools: McpToolExport['tools'] = [
  {
    name: 'ip_reputation',
    description:
      "Look up an IPv4 address in the SANS ISC DShield database — its attack-report history, ASN/owner, abuse contact, and risk. A high report_count means the IP is an active attack source (firewall logs submitted by sensors worldwide). report_count null/0 = no malicious activity reported. The comment field often names known infrastructure (e.g. \"Google public recursive name server\"). Keyless.",
    inputSchema: {
      type: 'object',
      properties: {
        ip: {
          type: 'string',
          description: 'An IPv4 address, e.g. "8.8.8.8" or "45.155.205.233".',
        },
      },
      required: ['ip'],
    },
  },
  {
    name: 'port_activity',
    description:
      'Get recent attack/probe activity for a TCP/UDP port from SANS ISC — daily counts of report records, distinct target IPs, and distinct source IPs hitting the port. Useful for spotting scanning surges against services like SSH (22), RDP (3389), SMB (445), or Telnet (23). Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        port: {
          type: 'number',
          description: 'A port number, e.g. 22 (SSH), 3389 (RDP), 445 (SMB), 23 (Telnet).',
        },
      },
      required: ['port'],
    },
  },
  {
    name: 'threat_level',
    description:
      "Get the global SANS ISC InfoCon threat level — the internet-wide \"weather report\" for malicious activity. Returns one of green/yellow/orange/red with a plain-English meaning. An at-a-glance signal of whether a major internet-scale event is underway. Keyless, no arguments.",
    inputSchema: { type: 'object', properties: {} },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'ip_reputation':
        return ipReputation(args);
      case 'port_activity':
        return portActivity(args);
      case 'threat_level':
        return threatLevel();
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function ipReputation(args: Record<string, unknown>): Promise<unknown> {
  const ip = typeof args.ip === 'string' ? args.ip.trim() : '';
  if (!ip) return { error: 'provide an IPv4 address', ip: args.ip ?? null };

  const body = await iscGet(`/ip/${encodeURIComponent(ip)}`);
  if (typeof body.__error === 'string') return { error: body.__error, ip };

  // ISC wraps the result in a top-level `ip` key.
  const d = (body.ip ?? body) as Record<string, unknown>;
  if (typeof d.error === 'string') return { error: `ISC: ${d.error}`, ip };

  const reportCount = num(d.count);
  const attackedTargets = num(d.attacks);
  const threat_summary =
    reportCount === null || reportCount === 0
      ? 'No malicious activity reported'
      : `Reported in ${reportCount} attack records against ${attackedTargets ?? 0} targets`;

  return {
    ip: d.number ?? ip,
    report_count: reportCount,
    attacked_targets: attackedTargets,
    first_seen: d.mindate ?? null,
    last_seen: d.maxdate ?? null,
    updated: d.updated ?? null,
    max_risk: num(d.maxrisk),
    comment: d.comment ?? null,
    asn: num(d.as),
    as_name: d.asname ?? null,
    as_country: d.ascountry ?? null,
    as_size: num(d.assize),
    abuse_contact: d.asabusecontact ?? null,
    threat_summary,
  };
}

async function portActivity(args: Record<string, unknown>): Promise<unknown> {
  const port = num(args.port);
  if (port === null) return { error: 'provide a numeric port', port: args.port ?? null };

  // /porthistory returns a numbered-key object of dated rows (time series).
  // Window the last ~12 days; we slice to the most recent ~10 below.
  const end = new Date();
  const start = new Date(end.getTime() - 12 * 24 * 60 * 60 * 1000);
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);

  const body = await iscGet(`/porthistory/${port}/${fmt(start)}/${fmt(end)}`);
  if (typeof body.__error === 'string') return { error: body.__error, port };
  if (typeof body.error === 'string') return { error: `ISC: ${body.error}`, port };

  // Rows are keyed "0","1",... alongside meta keys (startdate/enddate/port).
  const rows: Array<Record<string, unknown>> = [];
  for (const [k, v] of Object.entries(body)) {
    if (/^\d+$/.test(k) && v && typeof v === 'object') {
      rows.push(v as Record<string, unknown>);
    }
  }
  rows.sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
  const recent_activity = rows.slice(-10).map((r) => ({
    date: r.date ?? null,
    reports: num(r.records),
    targets: num(r.targets),
    sources: num(r.sources),
  }));

  return {
    port,
    service: serviceName(port),
    recent_activity,
  };
}

async function threatLevel(): Promise<unknown> {
  const body = await iscGet('/infocon');
  if (typeof body.__error === 'string') return { error: body.__error };

  const status = typeof body.status === 'string' ? body.status.toLowerCase() : null;
  return {
    infocon: status,
    meaning: (status && INFOCON_MEANING[status]) ?? 'Unknown level',
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
