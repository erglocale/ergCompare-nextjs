"use client";

import { useMemo, useState } from "react";

import CatalogLocationModal from "@/components/CatalogLocationModal";
import { useLocationContext } from "@/components/LocationProvider";
import { useEvCatalogQuery } from "@/lib/query-hooks";
import type { EvCatalogItem } from "@/lib/mock-data";
import styles from "./page.module.css";

export default function VehiclesCatalogPage() {
  const {
    currentLocation,
    setLocation,
    buildLocationFromCoordinates,
    isRequesting,
    permissionDenied,
    requestLocation,
  } = useLocationContext();
  const { data: vehicles, isLoading: catalogLoading, isError } = useEvCatalogQuery(
    undefined,
    currentLocation?.lat,
    currentLocation?.lng
  );
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

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

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];
    let result = vehicles.filter((v) => {
      const matchSegment =
        selectedSegment === "All" ||
        v.segment === selectedSegment ||
        (selectedSegment === "Truck" && !v.segment);
      const matchBrand =
        selectedBrand === "All" || (v.make || "Other Brands") === selectedBrand;
      const matchSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSegment && matchBrand && matchSearch;
    });

    if (sortBy !== "None") {
      result = [...result].sort((a, b) => {
        if (sortBy === "Battery: Low to High") {
          return (a.battery_capacity || 0) - (b.battery_capacity || 0);
        }
        if (sortBy === "Battery: High to Low") {
          return (b.battery_capacity || 0) - (a.battery_capacity || 0);
        }
        if (sortBy === "Range: Low to High") {
          return (a.max_range || 0) - (b.max_range || 0);
        }
        if (sortBy === "Range: High to Low") {
          return (b.max_range || 0) - (a.max_range || 0);
        }
        if (sortBy === "Payload: Low to High") {
          return (a.load_capacity || 0) - (b.load_capacity || 0);
        }
        if (sortBy === "Payload: High to Low") {
          return (b.load_capacity || 0) - (a.load_capacity || 0);
        }
        return 0;
      });
    }

    return result;
  }, [vehicles, selectedSegment, selectedBrand, searchQuery, sortBy]);

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

  const locationTitle = currentLocation
    ? currentLocation.name.split(",")[0]
    : "No location selected";

  const handleUseCurrentLocation = async () => {
    const resolvedLocation = await requestLocation();
    if (resolvedLocation) {
      setIsLocationModalOpen(false);
    }
  };

  if (isRequesting && !currentLocation) {
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
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>Vehicle Catalog</h1>
        
        </div>

        <div className={styles.locationCard}>
          
          <div className={styles.locationCardBody}>
            <div className={styles.locationInfo}>
              <div className={styles.locationName}>Location: {locationTitle}</div>
              <p className={styles.locationHint}>
                {currentLocation?.name ??
                  "Choose a place on the map to filter the catalog by market."}
              </p>
            </div>
            <div className={styles.locationActions}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsLocationModalOpen(true)}
              >
                Change Location
              </button>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() => {
                  void handleUseCurrentLocation();
                }}
                disabled={isRequesting}
              >
                {isRequesting ? "Locating..." : "Use My Location"}
              </button>
            </div>
          </div>
          {permissionDenied ? (
            <p className={styles.locationWarning}>
              Browser location access is blocked. You can still select a place manually.
            </p>
          ) : null}
        </div>
      </div>

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
          {segmentOptions
            .filter((seg) => seg !== "All")
            .map((seg) => (
              <option key={seg} value={seg}>
                {seg}
              </option>
            ))}
        </select>

        <select
          className={styles.filterDropdown}
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
        >
          <option value="All">All Brands</option>
          {uniqueBrands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>

        <select
          className={styles.filterDropdown}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="None">Sort By...</option>
          <option value="Battery: Low to High">Battery: Low to High</option>
          <option value="Battery: High to Low">Battery: High to Low</option>
          <option value="Range: Low to High">Range: Low to High</option>
          <option value="Range: High to Low">Range: High to Low</option>
          <option value="Payload: Low to High">Payload: Low to High</option>
          <option value="Payload: High to Low">Payload: High to Low</option>
        </select>
      </div>

      {Object.entries(groupedVehicles)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([brand, items]) => (
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
                    <div className={styles.fallbackEmoji}>EV</div>
                  </div>

                  <h3
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      color: "var(--heading)",
                      marginBottom: "1rem",
                      textAlign: "center",
                      minHeight: "2.5rem",
                    }}
                  >
                    {vehicle.name || `${vehicle.make} ${vehicle.model}`}
                  </h3>

                  <div className={styles.specsGrid}>
                    <div className={styles.specBox}>
                      <span className={styles.specLabel}>Bat. Capacity</span>
                      <span className={styles.specValue}>
                        {formatNumber(vehicle.battery_capacity, "kWh")}
                      </span>
                    </div>
                    <div className={styles.specBox}>
                      <span className={styles.specLabel}>Top Range</span>
                      <span className={styles.specValue}>
                        {formatNumber(vehicle.max_range, "km")}
                      </span>
                    </div>
                    <div className={styles.specBox}>
                      <span className={styles.specLabel}>Load Capacity</span>
                      <span className={styles.specValue}>
                        {formatNumber(vehicle.load_capacity, "kg")}
                      </span>
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
          <p>
            Try another segment, clear a brand filter, or switch the catalog location to a
            different market.
          </p>
        </div>
      )}

      <CatalogLocationModal
        isOpen={isLocationModalOpen}
        initialLocation={currentLocation}
        onClose={() => setIsLocationModalOpen(false)}
        onConfirm={(location) => {
          setLocation(location);
          setIsLocationModalOpen(false);
        }}
        onResolveLocation={buildLocationFromCoordinates}
        onUseCurrentLocation={handleUseCurrentLocation}
        isRequestingCurrentLocation={isRequesting}
        permissionDenied={permissionDenied}
      />
    </div>
  );
}
