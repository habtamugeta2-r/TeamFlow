"use client";

import { History, LoaderCircle } from "lucide-react";
import { activityCopy, formattedTimestamp } from "@/lib/format";
import type { WorkspaceActivity } from "@/lib/teamflow/types";

type ActivityFeedProps = {
  activities: WorkspaceActivity[];
  page: number;
  totalPages: number;
  loading: boolean;
  loadingMore: boolean;
  error: string;
  onRetry: () => void;
  onLoadMore: () => void;
};

export default function ActivityFeed({
  activities,
  page,
  totalPages,
  loading,
  loadingMore,
  error,
  onRetry,
  onLoadMore,
}: ActivityFeedProps) {
  return (
    <section className="activity-section" id="activity">
      <div className="section-heading">
        <div>
          <p className="eyebrow">A RECORD OF THE WORK</p>
          <h2>Recent activity</h2>
        </div>
        <History size={18} aria-hidden="true" />
      </div>

      <div className="activity-list" aria-busy={loading}>
        {loading ? (
          <div className="activity-state">
            <LoaderCircle className="spin" size={17} />
            Loading activity
          </div>
        ) : error ? (
          <div className="activity-state activity-state-error" role="alert">
            <span>{error}</span>
            <button
              className="button button-quiet"
              type="button"
              onClick={onRetry}
            >
              Retry
            </button>
          </div>
        ) : activities.length === 0 ? (
          <div className="activity-state">
            No activity yet. Project and task updates will appear here.
          </div>
        ) : (
          activities.map((activity) => {
            const copy = activityCopy(activity);
            return (
              <article className="activity-row" key={activity.id}>
                <span className="activity-marker" aria-hidden="true" />
                <div className="activity-copy">
                  <p>{copy.message}</p>
                  {copy.detail && <small>{copy.detail}</small>}
                </div>
                <time dateTime={activity.createdAt}>
                  {formattedTimestamp(activity.createdAt)}
                </time>
              </article>
            );
          })
        )}
      </div>

      {!loading && !error && page < totalPages && (
        <button
          className="button button-quiet activity-more"
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
        >
          {loadingMore && <LoaderCircle className="spin" size={15} />}
          Load older activity
        </button>
      )}
    </section>
  );
}
