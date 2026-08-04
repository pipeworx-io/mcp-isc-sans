# mcp-isc-sans

SANS Internet Storm Center (ISC) MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Isc Sans data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
