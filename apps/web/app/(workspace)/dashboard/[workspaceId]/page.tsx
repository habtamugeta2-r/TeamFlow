import WorkspaceDashboard from "@/features/dashboard/workspace-dashboard";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <WorkspaceDashboard workspaceId={workspaceId} />;
}
