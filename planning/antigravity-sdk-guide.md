# Antigravity SDK — Agent Spawning Guide

Use this after planning is done and you're ready to hand off implementation tasks to Gemini 3.5 Flash agents.

---

## Setup

```bash
pip install google-antigravity
```

API key is in `planning/keys.md`.

---

## Minimal Working Example

```python
import asyncio
import os
from google.antigravity import Agent, LocalAgentConfig

config = LocalAgentConfig(
    model="gemini-3.5-flash",
    system_instructions="You are a senior software engineer. Implement tasks precisely.",
    api_key=os.getenv("GEMINI_API_KEY"),
)

async def main():
    async with Agent(config) as agent:
        response = await agent.chat("Your implementation task here.")
        print(await response.text())

asyncio.run(main())
```

---

## Correct Imports

```python
from google.antigravity import Agent, LocalAgentConfig
from google.antigravity.types import ChatResponse
```

**Not** `from google_antigravity import ...` — that fails.

---

## LocalAgentConfig Fields

| Field | Type | Notes |
|---|---|---|
| `model` | str | `"gemini-3.5-flash"` (default after I/O 2026) |
| `system_instructions` | str | Agent's persona and constraints |
| `api_key` | str | Falls back to `$GEMINI_API_KEY` env var |
| `tools` | list | Optional tool definitions |
| `mcp_servers` | list | Optional MCP server connections |
| `conversation_id` | str | Resume a previous session |
| `save_dir` | str | Persist conversation to disk |

---

## ChatResponse Fields

```python
response = await agent.chat("...")

await response.text()          # str — final answer
await response.thoughts()      # str — reasoning trace (if thinking enabled)
await response.tool_calls()    # list — tool invocations made
await response.chunks()        # async iter — streaming chunks
response.usage_metadata        # token counts
```

---

## Multi-Turn Conversation

```python
async with Agent(config) as agent:
    r1 = await agent.chat("Read the PRD in planning/03_PRD...")
    print(await r1.text())

    r2 = await agent.chat("Now implement the auth flow described in section 3.")
    print(await r2.text())
```

The agent retains context within the `async with` block.

---

## Spawning Multiple Agents in Parallel

```python
import asyncio
import os
from google.antigravity import Agent, LocalAgentConfig

API_KEY = os.getenv("GEMINI_API_KEY")

async def run_agent(role: str, task: str) -> str:
    config = LocalAgentConfig(
        model="gemini-3.5-flash",
        system_instructions=f"You are a {role}.",
        api_key=API_KEY,
    )
    async with Agent(config) as agent:
        response = await agent.chat(task)
        return await response.text()

async def main():
    results = await asyncio.gather(
        run_agent("backend engineer", "Implement the /api/auth/login endpoint using NextAuth."),
        run_agent("frontend engineer", "Implement the login page UI in React with form validation."),
        run_agent("database engineer", "Write the Prisma migration for the users table."),
    )
    for r in results:
        print(r)
        print("---")

asyncio.run(main())
```

---

## Planning → Implementation Handoff Pattern

After your planning docs are ready (PRD, ERD, tickets), feed them directly to agents:

```python
import asyncio
import os
from pathlib import Path
from google.antigravity import Agent, LocalAgentConfig

API_KEY = os.getenv("GEMINI_API_KEY")
PLANNING_DIR = Path("planning")

async def implement_ticket(ticket_id: str, ticket_description: str) -> str:
    prd = (PLANNING_DIR / "03_PRD_Product_Requirements_Document_v2.md").read_text()
    schema = (PLANNING_DIR / "schema-erd-v23.md").read_text()

    config = LocalAgentConfig(
        model="gemini-3.5-flash",
        system_instructions=(
            "You are a principal engineer implementing features for Divergencie. "
            "Follow the PRD and schema exactly. Write production-ready code."
        ),
        api_key=API_KEY,
    )

    prompt = f"""
## Context
### PRD
{prd}

### Schema
{schema}

## Task — {ticket_id}
{ticket_description}

Implement this now. Output only code files with their paths.
"""

    async with Agent(config) as agent:
        response = await agent.chat(prompt)
        return await response.text()

async def main():
    result = await implement_ticket(
        ticket_id="TICKET-42",
        ticket_description="Add divergence score calculation to the match endpoint.",
    )
    print(result)

asyncio.run(main())
```

---

## Enable Thinking (Deeper Reasoning)

```python
config = LocalAgentConfig(
    model="gemini-3.5-flash",
    api_key=API_KEY,
    system_instructions="...",
    gemini_config={
        "models": {
            "default": {
                "name": "gemini-3.5-flash",
                "generation": {"thinking_level": "high"},
            }
        }
    },
)
```

Thinking levels: `"minimal"` `"low"` `"medium"` `"high"`

---

## Streaming Output

```python
async with Agent(config) as agent:
    response = await agent.chat("Implement the feature.")
    async for chunk in await response.chunks():
        print(chunk, end="", flush=True)
```

---

## Resume a Conversation

```python
# First run — save the conversation ID
async with Agent(config) as agent:
    r = await agent.chat("Plan the implementation.")
    conv_id = agent.conversation_id

# Later — resume it
config2 = LocalAgentConfig(
    model="gemini-3.5-flash",
    api_key=API_KEY,
    conversation_id=conv_id,
)
async with Agent(config2) as agent:
    r = await agent.chat("Now implement what we planned.")
    print(await r.text())
```

---

## Notes

- Each `async with Agent(...)` block is one session — context is shared within it, gone after.
- `gemini-3.5-flash` is ~$1.50/$9.00 per M input/output tokens.
- Free tier (~500 req/day) works for development.
- Subagents (agents spawning agents) supported via `CapabilitiesConfig(enable_subagents=True)`.
