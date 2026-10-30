import { apiRequest } from "../api";
import type { ActivityPage } from "./types";

export async function listWorkspaceActivity(
  workspaceId: string,
  page = 1,
  limit = 10,
): Promise<ActivityPage> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return apiRequest<ActivityPage>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/activity?${query}`,
  );
}
