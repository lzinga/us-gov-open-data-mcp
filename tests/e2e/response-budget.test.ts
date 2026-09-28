/**
 * End-to-end: the response size budget shortens oversized results (as valid
 * JSON) while code_mode still sees the whole result. Local tools only.
 */

import { describe, it, expect, afterAll } from "vitest";
import { connectStdio } from "./helpers.js";

type CallResult = { isError?: boolean; content: { type: string; text?: string }[] };
const textOf = (res: CallResult) => res.content.map(c => c.text ?? "").join("\n");

describe("MAX_RESPONSE_BYTES", () => {
  let session: Awaited<ReturnType<typeof connectStdio>>;
  afterAll(async () => { await session?.close(); });

  it("shortens a large result to fit and marks it", async () => {
    session = await connectStdio({ args: ["--modules", "treasury"], env: { MAX_RESPONSE_BYTES: "6000" } });
    const res = await session.client.callTool({ name: "treasury_list_datasets", arguments: {} }) as CallResult;
    const text = textOf(res);
    expect(Buffer.byteLength(text)).toBeLessThanOrEqual(6000);
    const parsed = JSON.parse(text);
    expect(parsed.truncatedToFit.shortened[0]).toMatchObject({ path: "data.items", of: 53 });
    expect(parsed.data.items.length).toBeLessThan(53);
    expect(parsed.summary).toMatch(/\[shortened to fit 6 KB\]$/);
  }, 30_000);

  it("leaves code_mode's view of the data complete", async () => {
    const res = await session.client.callTool({
      name: "code_mode",
      arguments: { tool: "treasury_list_datasets", tool_args: {}, code: "console.log(JSON.parse(DATA).data.items.length)" },
    }) as CallResult;
    expect(res.isError).toBeFalsy();
    const [count, , footer] = textOf(res).trim().split("\n");
    expect(count).toBe("53");
    expect(footer).toMatch(/^\[code-mode: 4\d\.\dKB/); // it read the full ~42 KB, not the 6 KB budget
  }, 30_000);

  it("can be turned off with 0", async () => {
    const off = await connectStdio({ args: ["--modules", "treasury"], env: { MAX_RESPONSE_BYTES: "0" } });
    try {
      const res = await off.client.callTool({ name: "treasury_list_datasets", arguments: {} }) as CallResult;
      const parsed = JSON.parse(textOf(res));
      expect(parsed.truncatedToFit).toBeUndefined();
      expect(parsed.data.items).toHaveLength(53);
    } finally {
      await off.close();
    }
  }, 30_000);
});
