// Client calls /api/proxy/* → next.config rewrites to the API (no CORS in dev).

const DEMO_WORKSPACE = "11111111-1111-1111-1111-111111111111";
const DEMO_USER = "user_demo";

function tenantHeaders(extra: HeadersInit = {}): HeadersInit {
  return {
    "X-Workspace-Id": DEMO_WORKSPACE,
    "X-User-Id": DEMO_USER,
    ...extra,
  };
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: tenantHeaders({
      "Content-Type": "application/json",
      ...(init.headers || {}),
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type Summary = {
  totalObjectives: number;
  active: number;
  completed: number;
  atRisk: number;
  avgProgress: number;
  objectives: Array<{
    id: string;
    title: string;
    quarter: string;
    progress: number;
    status: string;
  }>;
};

export type KeyResult = {
  id: string;
  objectiveId: string;
  title: string;
  metricType: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  unit: string | null;
  confidence: number;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
};

export type Objective = {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  ownerId: string;
  quarter: string;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  keyResults: KeyResult[];
};

export type CheckIn = {
  id: string;
  keyResultId: string;
  workspaceId: string;
  authorId: string;
  previousValue: number;
  newValue: number;
  confidence: number | null;
  note: string | null;
  createdAt: string;
};

export type AuditEntry = {
  id: string;
  workspace_id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_state: unknown;
  after_state: unknown;
  created_at: string;
};

export type Member = {
  workspaceId: string;
  userId: string;
  email: string;
  displayName: string | null;
  role: string;
  invitedAt: string;
  acceptedAt: string | null;
};

export const api = {
  dashboardSummary: () => request<Summary>("/dashboard/summary"),
  listObjectives: () => request<Objective[]>("/objectives"),
  getObjective: (id: string) => request<Objective>(`/objectives/${id}`),
  createObjective: (body: {
    title: string;
    description?: string;
    ownerId: string;
    quarter: string;
  }) =>
    request<Objective>("/objectives", {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    }),
  updateObjective: (id: string, body: Partial<Objective>) =>
    request<Objective>(`/objectives/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteObjective: (id: string) =>
    request<void>(`/objectives/${id}`, { method: "DELETE" }),
  addKeyResult: (
    objectiveId: string,
    body: {
      title: string;
      metricType?: string;
      startValue?: number;
      targetValue: number;
      currentValue?: number;
      unit?: string;
      confidence?: number;
    },
  ) =>
    request<KeyResult>(`/objectives/${objectiveId}/key-results`, {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    }),
  submitCheckIn: (
    keyResultId: string,
    body: { newValue: number; confidence?: number; note?: string; status?: string },
  ) =>
    request<{ checkIn: CheckIn; keyResult: KeyResult; objectiveProgress: number }>(
      `/key-results/${keyResultId}/check-ins`,
      {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(body),
      },
    ),
  listCheckIns: (keyResultId: string) =>
    request<CheckIn[]>(`/key-results/${keyResultId}/check-ins`),
  listMembers: () => request<Member[]>("/members"),
  listAudit: () => request<AuditEntry[]>("/audit?limit=100"),
};

export const TENANT = { workspaceId: DEMO_WORKSPACE, userId: DEMO_USER };
