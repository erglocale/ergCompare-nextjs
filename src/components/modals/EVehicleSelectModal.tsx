"use client";

import { useState, useMemo } from "react";
import { formatNumber, type EvCatalogItem } from "@/lib/mock-data";
import styles from "./CatalogModal.module.css";

interface EVehicleSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ev: EvCatalogItem) => void;
  catalog: EvCatalogItem[];
  catalogLoading?: boolean;
  currency?: string;
}

export default function EVehicleSelectModal({
  isOpen,
  onClose,
  onSelect,
  catalog,
  catalogLoading = false,
  currency = "USD",
}: EVehicleSelectModalProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const sorted = [...catalog].sort((a, b) => a.name.localeCompare(b.name));
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((ev) => ev.name.toLowerCase().includes(q));
  }, [search, catalog]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>Select EV Vehicle</span>
          <button className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchBar}>
          <input
            className={styles.searchInput}
            placeholder="Search vehicles, e.g. Tata, MG, Hyundai..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Grid */}
        <div className={styles.grid}>
          {catalogLoading && (
            <div className={styles.emptyState}>Loading vehicles…</div>
          )}
          {!catalogLoading && filtered.length === 0 && (
            <div className={styles.emptyState}>
              No vehicles found matching &quot;{search}&quot;
            </div>
          )}
          {filtered.map((ev) => (
            <div key={ev.id} className={styles.card}>
              <div className={styles.cardImage}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://tsx-static.s3.ap-south-1.amazonaws.com/Vehicles/Electric/${ev.id}.png`}
                  alt={ev.name}
                  className={styles.cardImg}
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                    target.parentElement!.classList.add(styles.cardImageFallback);
                  }}
                />
              </div>

              <span className={styles.cardName}>{ev.name}</span>

              <div className={styles.cardSpecs}>
                <div>
                  <div className={styles.specLabel}>Price</div>
                  <div className={styles.specValue}>
                    {formatNumber(ev.avg_cost)} {currency}
                  </div>
                </div>
                <div>
                  <div className={styles.specLabel}>Range</div>
                  <div className={styles.specValue}>{ev.max_range} km</div>
                </div>
                <div>
                  <div className={styles.specLabel}>Battery</div>
                  <div className={styles.specValue}>
                    {ev.battery_capacity} kWh
                  </div>
                </div>
                <div>
                  <div className={styles.specLabel}>DC Power</div>
                  <div className={styles.specValue}>
                    {ev.effective_power_dc > 0
                      ? `${ev.effective_power_dc} kW`
                      : "N/A"}
                  </div>
                </div>
              </div>

              <button
                className={styles.selectBtn}
                onClick={() => {
                  onSelect(ev);
                  onClose();
                }}
              >
                Select Vehicle
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
