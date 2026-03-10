"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useComparisonsQuery, useDeleteComparisonMutation } from "@/lib/query-hooks";
import styles from "./page.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const { data: comparisons = [], isLoading, isError } = useComparisonsQuery();
  const deleteComparison = useDeleteComparisonMutation();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  return (
    <div className={styles.page}>
      {/* Fleet Comparisons Header */}
      <div className={styles.sectionHeader}>
        <h3 className={styles.pageTitle}>Fleet Comparisons</h3>
        <Link href="/new" className="btn btn-primary">+ New Comparison</Link>
      </div>

      {isLoading ? (
        <div className={styles.emptyCard}>
          <h3 className={styles.emptyTitle}>Loading comparisons…</h3>
          <p className={styles.emptyCopy}>Fetching your saved comparison reports.</p>
        </div>
      ) : isError ? (
        <div className={styles.emptyCard}>
          <h3 className={styles.emptyTitle}>Could not load comparisons</h3>
          <p className={styles.emptyCopy}>Check that the backend is running and your session is active.</p>
        </div>
      ) : comparisons.length === 0 ? (
        <div className={styles.emptyCard}>
          <h3 className={styles.emptyTitle}>No comparisons yet</h3>
          <Link href="/new" className="btn btn-primary">+ New Comparison</Link>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
        {comparisons.map((comp, i) => (
          <div
            key={comp.id}
            className={styles.compCard}
            style={{ animationDelay: `${i * 0.1}s` }}
            onClick={() => router.push(`/compare/${comp.id}`)}
          >
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                <h3 className={styles.cardTitle}>{comp.name}</h3>
                <span className={styles.cardLocation}>{comp.location}</span>
              </div>
              <div className={styles.cardHeaderRight}>
                <span
                  className={`badge ${
                    comp.status === "completed" ? "badge-success" : "badge-info"
                  }`}
                >
                  {comp.status === "completed" ? "✓ Complete" : "⏳ In Progress"}
                </span>
                {/* 3-dot menu */}
                <div className={styles.menuWrapper} onClick={(e) => e.stopPropagation()}>
                  <button
                    className={styles.menuBtn}
                    onClick={() => setMenuOpenId(menuOpenId === comp.id ? null : comp.id)}
                    aria-label="Actions"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>
                  {menuOpenId === comp.id && (
                    <div className={styles.menuDropdown}>
                      {deletingId === comp.id ? (
                        <span className={styles.menuItem}>Deleting…</span>
                      ) : (
                        <button
                          className={`${styles.menuItem} ${styles.menuItemDanger}`}
                          onClick={() => {
                            setDeletingId(comp.id);
                            setMenuOpenId(null);
                            deleteComparison.mutate(comp.id, {
                              onSettled: () => setDeletingId(null),
                            });
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.cardMetrics}>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Fleet Size</span>
                <span className={styles.metricValue}>{comp.fleetSize} vehicles</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Contract</span>
                <span className={styles.metricValue}>{comp.contractYears} years</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>TCO Savings</span>
                <span className={`${styles.metricValue} ${styles.successText}`}>Pending</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Payback</span>
                <span className={styles.metricValue}>Pending</span>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <span className={styles.cardDate}>
                Created {new Date(comp.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className={styles.viewLink}>View Details →</span>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
