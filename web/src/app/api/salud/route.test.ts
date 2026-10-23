import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/salud", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("responde 200 cuando la API contesta OK", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Hello", { status: 200 })));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("responde 503 cuando la API contesta con error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 502 })));
    expect((await GET()).status).toBe(503);
  });

  it("responde 503 cuando la API no responde (red o timeout)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")));
    expect((await GET()).status).toBe(503);
  });
});
