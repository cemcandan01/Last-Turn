"""Yerel Unity MCP pilotunu model/API cagrisi olmadan salt okunur dogrular."""
import asyncio
import json
import os
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parent.parent
INSTALL = ROOT / "tests/cikti/unity-mcp-pilot"


async def main():
    env = {key: os.environ[key] for key in (
        "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "APPDATA", "LOCALAPPDATA", "USERPROFILE", "PATH"
    ) if key in os.environ}
    env.update(UNITY_MCP_DISABLE_TELEMETRY="1", MCP_DISABLE_TELEMETRY="1",
               DISABLE_TELEMETRY="1", UNITY_MCP_SKIP_STARTUP_CONNECT="1")
    params = StdioServerParameters(
        command=str(INSTALL / "server-venv/Scripts/mcp-for-unity.exe"),
        args=["--transport", "stdio", "--default-instance", "McpEditorPilot@f75713f6"],
        env=env,
    )
    with (INSTALL / "connection-probe.log").open("w", encoding="utf-8") as log:
        async with stdio_client(params, errlog=log) as (read, write):
            async with ClientSession(read, write) as client:
                await client.initialize()
                tools = await client.list_tools()
                instances = await client.read_resource("mcpforunity://instances")
                active = await client.call_tool("manage_scene", {"action": "get_active"})
                console = await client.call_tool("read_console", {
                    "action": "get", "types": ["error"], "count": 6, "include_stacktrace": False
                })
                proof = {"toolCount": len(tools.tools),
                         "instances": instances.model_dump(mode="json"),
                         "activeScene": active.model_dump(mode="json"),
                         "console": console.model_dump(mode="json")}
                output = INSTALL / "connection-proof.json"
                output.write_text(json.dumps(proof, ensure_ascii=False, indent=2), encoding="utf-8")
                for name, result in (("manage_scene", active), ("read_console", console)):
                    if result.isError:
                        raise RuntimeError(f"{name} MCP hatasi; kanit: {output}")
                    for item in result.content:
                        if item.type != "text":
                            continue
                        data = json.loads(item.text)
                        if isinstance(data, dict) and data.get("success") is False:
                            raise RuntimeError(f"{name} basarisiz; kanit: {output}")
                print(f"MCP baglantisi, sahne ve Console sorgusu gecti; {len(tools.tools)} arac. Kanit: {output}")


if __name__ == "__main__":
    asyncio.run(main())
