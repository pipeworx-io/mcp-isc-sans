# mcp-isc-sans

SANS Internet Storm Center (ISC) MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `ip_reputation` | Look up an IPv4 address in the SANS ISC DShield database — its attack-report history, ASN/owner, abuse contact, and risk. A high report_count means the IP is an active attack source (firewall logs submitted by sensors worldwide). report_count null/0 = no malicious activity reported. The comment field often names known infrastructure (e.g. "Google public recursive name server"). Keyless. |
| `port_activity` | Get recent attack/probe activity for a TCP/UDP port from SANS ISC — daily counts of report records, distinct target IPs, and distinct source IPs hitting the port. Useful for spotting scanning surges against services like SSH (22), RDP (3389), SMB (445), or Telnet (23). Keyless. |
| `threat_level` | Get the global SANS ISC InfoCon threat level — the internet-wide "weather report" for malicious activity. Returns one of green/yellow/orange/red with a plain-English meaning. An at-a-glance signal of whether a major internet-scale event is underway. Keyless, no arguments. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "isc-sans": {
      "url": "https://gateway.pipeworx.io/isc-sans/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/isc-sans/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Isc Sans data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
