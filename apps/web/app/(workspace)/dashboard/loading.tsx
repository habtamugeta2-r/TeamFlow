import { Layers3, LoaderCircle } from "lucide-react";

export default function DashboardLoading() {
  return (
    <main className="loading-screen" aria-live="polite">
      <span className="brand-mark">
        <Layers3 size={19} />
      </span>
      <LoaderCircle className="spin" size={18} />
      <span>Opening your workspace</span>
    </main>
  );
}
