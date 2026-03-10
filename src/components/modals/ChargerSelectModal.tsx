"use client";

import { useState, useMemo } from "react";
import {
  mockChargerCatalog,
  formatNumber,
  type ChargerCatalogItem,
} from "@/lib/mock-data";
import styles from "./CatalogModal.module.css";

interface ChargerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (charger: ChargerCatalogItem) => void;
  currency?: string;
}

export default function ChargerSelectModal({
  isOpen,
  onClose,
  onSelect,
  currency = "USD",
}: ChargerSelectModalProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return mockChargerCatalog;
    const q = search.toLowerCase();
    return mockChargerCatalog.filter(
      (ch) =>
        ch.name.toLowerCase().includes(q) ||
        ch.vendor.toLowerCase().includes(q) ||
        ch.type.toLowerCase().includes(q)
    );
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>Select Charger</span>
          <button className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchBar}>
          <input
            className={styles.searchInput}
            placeholder="Search chargers, e.g. ergLocale, ABB, DC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Grid */}
        <div className={styles.grid}>
          {filtered.length === 0 && (
            <div className={styles.emptyState}>
              No chargers found matching &quot;{search}&quot;
            </div>
          )}
          {filtered.map((ch) => (
            <div key={ch.id} className={`${styles.card} ${styles.cardWrapper}`}>
              {/* Vendor Ribbon */}
              <div
                className={styles.vendorRibbon}
                style={{ background: ch.vendorColor }}
              >
                {ch.vendor}
              </div>

              <div
                className={styles.cardImage}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2.5rem",
                  background: "linear-gradient(135deg, #0f3443 0%, #34e89e 100%)",
                  color: "#fff",
                }}
              >
                ⚡
              </div>

              <span className={styles.cardName}>
                {ch.name} — {ch.capacity} kW
              </span>

              <div className={styles.cardSpecs}>
                <div>
                  <div className={styles.specLabel}>Type</div>
                  <div className={styles.specValue}>
                    <span
                      style={{
                        background:
                          ch.type === "DC"
                            ? "rgba(249, 116, 23, 0.15)"
                            : "rgba(46, 204, 113, 0.15)",
                        color: ch.type === "DC" ? "#f97417" : "#2ecc71",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                      }}
                    >
                      {ch.type}
                    </span>
                  </div>
                </div>
                <div>
                  <div className={styles.specLabel}>Capacity</div>
                  <div className={styles.specValue}>{ch.capacity} kW</div>
                </div>
                <div>
                  <div className={styles.specLabel}>Price</div>
                  <div className={styles.specValue}>
                    {formatNumber(ch.price)} {currency}
                  </div>
                </div>
                <div>
                  <div className={styles.specLabel}>Vendor</div>
                  <div className={styles.specValue}>{ch.vendor}</div>
                </div>
              </div>

              <button
                className={styles.selectBtn}
                onClick={() => {
                  onSelect(ch);
                  onClose();
                }}
              >
                Select Charger
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
