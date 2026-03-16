"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";
import { useEvCatalogQuery } from "@/lib/query-hooks";
import type { EvCatalogItem } from "@/lib/mock-data";
import { useLocationContext } from "@/components/LocationProvider";

export default function VehiclesCatalogPage() {
  const { currentLocation, isRequesting, permissionDenied, requestLocation } = useLocationContext();
  const { data: vehicles, isLoading: catalogLoading, isError } = useEvCatalogQuery(
    undefined,
    currentLocation?.lat,
    currentLocation?.lng
  );

  // Filter states
  const [selectedSegment, setSelectedSegment] = useState<string>("All");
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("None");

  const segmentOptions = [
    "All",
    "3 Wheeler",
    "Auto Rickshaw",
    "Pickup Truck",
    "Mini Truck",
    "Truck",
    "Passenger 4 Wheeler",
  ];

  const uniqueBrands = useMemo(() => {
    if (!vehicles) return [];
    const brands = new Set(vehicles.map((v) => v.make || "Other Brands"));
    return Array.from(brands).sort();
  }, [vehicles]);

  // Apply Filters
  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];
    let result = vehicles.filter((v) => {
      const matchSegment =
        selectedSegment === "All" ||
        v.segment === selectedSegment ||
        (selectedSegment === "Truck" && !v.segment);
      const matchBrand = selectedBrand === "All" || (v.make || "Other Brands") === selectedBrand;
      const matchSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSegment && matchBrand && matchSearch;
    });

    if (sortBy !== "None") {
      result = [...result].sort((a, b) => {
        if (sortBy === "Battery: Low to High") return (a.battery_capacity || 0) - (b.battery_capacity || 0);
        if (sortBy === "Battery: High to Low") return (b.battery_capacity || 0) - (a.battery_capacity || 0);
        if (sortBy === "Range: Low to High") return (a.max_range || 0) - (b.max_range || 0);
        if (sortBy === "Range: High to Low") return (b.max_range || 0) - (a.max_range || 0);
        if (sortBy === "Payload: Low to High") return (a.load_capacity || 0) - (b.load_capacity || 0);
        if (sortBy === "Payload: High to Low") return (b.load_capacity || 0) - (a.load_capacity || 0);
        return 0;
      });
    }

    return result;
  }, [vehicles, selectedSegment, selectedBrand, searchQuery, sortBy]);

  // Group filtered vehicles by make
  const groupedVehicles = useMemo(() => {
    return filteredVehicles.reduce((acc, vehicle) => {
      const brand = vehicle.make || "Other Brands";
      if (!acc[brand]) acc[brand] = [];
      acc[brand].push(vehicle);
      return acc;
    }, {} as Record<string, EvCatalogItem[]>);
  }, [filteredVehicles]);

  const formatNumber = (val: number | null | undefined, suffix = "") => {
    if (val === null || val === undefined) return "NA";
    return `${val.toLocaleString()} ${suffix}`.trim();
  };

  if (isRequesting) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <h3>Finding your location...</h3>
          <p>Please allow location access when prompted.</p>
        </div>
      </div>
    );
  }

  if (catalogLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <h3>Loading Vehicle Catalog...</h3>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h3>Error loading vehicles</h3>
          <p>Please check your connection or try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Vehicle Catalog</h1>

      {/* Filters Section */}
      <div className={styles.filtersSection}>
        <input
          type="text"
          placeholder="Search vehicles..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <select
          className={styles.filterDropdown}
          value={selectedSegment}
          onChange={(e) => setSelectedSegment(e.target.value)}
        >
          <option value="All">All Segments</option>
          {segmentOptions.filter((seg) => seg !== "All").map((seg) => (
            <option key={seg} value={seg}>{seg}</option>
          ))}
        </select>

        <select
          className={styles.filterDropdown}
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
        >
          <option value="All">All Brands</option>
          {uniqueBrands.map(brand => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>

        <select 
          className={styles.filterDropdown} 
          value={sortBy} 
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="None">Sort By...</option>
          <option value="Battery: Low to High">Battery: Low to High</option>
          <option value="Battery: High to Low">Battery: High to Low</option>
          <option value="Range: Low to High">Range: Low to High</option>
          <option value="Range: High to Low">Range: High to Low</option>
          <option value="Payload: Low to High">Payload: Low to High</option>
          <option value="Payload: High to Low">Payload: High to Low</option>
        </select>

        {currentLocation && (
          <span className={styles.locationBadge} title="Vehicles tailored to your region">
            📍 {currentLocation.name.split(',')[0]}
          </span>
        )}

        {permissionDenied && (
          <button className="btn btn-outline" onClick={requestLocation} style={{ marginLeft: "auto", fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
            Retry Location Access
          </button>
        )}
      </div>

      {Object.entries(groupedVehicles).sort(([a], [b]) => a.localeCompare(b)).map(([brand, items]) => (
        <section key={brand} className={styles.brandSection}>
          <h2 className={styles.brandTitle}>{brand}</h2>
          
          <div className={styles.cardsGrid}>
            {items.map((vehicle) => (
              <div key={vehicle.id} className={styles.card}>
                
                <div className={styles.cardImageWrapper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://tsx-static.s3.ap-south-1.amazonaws.com/Vehicles/Electric/${vehicle.id}.png`}
                    alt={vehicle.name}
                    className={styles.vehicleImage}
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = "none";
                      target.parentElement!.classList.add(styles.cardImageFallback);
                    }}
                  />
                  {/* Fallback emoji only shown if image fails, via CSS class combo */}
                  <div className={styles.fallbackEmoji}>🚙</div>
                </div>

                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "1rem", textAlign: "center", minHeight: "2.5rem" }}>
                  {vehicle.name || `${vehicle.make} ${vehicle.model}`}
                </h3>

                <div className={styles.specsGrid}>
                  <div className={styles.specBox}>
                    <span className={styles.specLabel}>Bat. Capacity</span>
                    <span className={styles.specValue}>{formatNumber(vehicle.battery_capacity, "kWh")}</span>
                  </div>
                  <div className={styles.specBox}>
                    <span className={styles.specLabel}>Top Range</span>
                    <span className={styles.specValue}>{formatNumber(vehicle.max_range, "km")}</span>
                  </div>
                  <div className={styles.specBox}>
                    <span className={styles.specLabel}>Load Capacity</span>
                    <span className={styles.specValue}>{formatNumber(vehicle.load_capacity, "kg")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {Object.keys(groupedVehicles).length === 0 && (
        <div className={styles.empty}>
          <h3>No vehicles found matching filters</h3>
        </div>
      )}
    </div>
  );
}
