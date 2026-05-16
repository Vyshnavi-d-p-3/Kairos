import { NextRequest } from "next/server";

// BFF forwards Spring SSE; sets tenant headers server-side. Use cache: no-store for streaming.
const API_BASE = process.env.API_BASE_INTERNAL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const workspaceId =
    req.nextUrl.searchParams.get("workspaceId") || "11111111-1111-1111-1111-111111111111";

  const upstream = await fetch(`${API_BASE}/api/v1/dashboard/stream`, {
    headers: {
      Accept: "text/event-stream",
      "X-Workspace-Id": workspaceId,
      "X-User-Id": req.nextUrl.searchParams.get("userId") || "user_demo",
    },
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(`upstream ${upstream.status}`, { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
