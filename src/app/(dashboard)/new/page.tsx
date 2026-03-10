"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import LocationPickerMap from "@/components/Map/LocationPickerMap";
import EVehicleSelectModal from "@/components/modals/EVehicleSelectModal";
import { useCreateComparisonMutation, useEvCatalogQuery } from "@/lib/query-hooks";
import type { EvCatalogItem } from "@/lib/mock-data";
import styles from "./setup.module.css";

interface VehicleConfig {
  [key: string]: string | number | undefined;
  modelId?: number;
  name: string;
  count: number;
  price: number;
  batteryCapacity: number;
  range: number;
  chargeCyclesPerDay: number;
  maintenanceCost: number;
  resalePercent: number;
}

interface IceConfig {
  name: string;
  cost: number;
  mileage: number;
  fuelType: "petrol" | "diesel";
  maintenancePercent: number;
  depreciationPercent: number;
}

interface LocationConfig {
  electricityPrice: number;
  fuelCostPetrol: number;
  fuelCostDiesel: number;
  discountRate: number;
  fixedMonthlyElectricity: number;
}

const PRESET_CITIES = [
  { name: "Bengaluru, India", lat: 12.9716, lng: 77.5946, currency: "INR", electricity: 8.5, petrol: 102, diesel: 88 },
  { name: "Pune, India", lat: 18.5204, lng: 73.8567, currency: "INR", electricity: 9.0, petrol: 104, diesel: 91 },
  { name: "Delhi, India", lat: 28.7041, lng: 77.1025, currency: "INR", electricity: 7.5, petrol: 94, diesel: 87 },
  { name: "San Francisco, USA", lat: 37.7749, lng: -122.4194, currency: "USD", electricity: 0.25, petrol: 4.5, diesel: 5.0 },
];

// Charger costs are now auto-calculated using smart ratio

function evFromCatalogItem(item: EvCatalogItem, count = 10): VehicleConfig {
  return {
    modelId: item.id,
    name: item.name,
    count,
    price: item.avg_cost,
    batteryCapacity: item.battery_capacity,
    range: item.max_range,
    chargeCyclesPerDay: 1,
    maintenanceCost: 0,
    resalePercent: 10,
  };
}

const EMPTY_EV: VehicleConfig = {
  name: "Select a vehicle…",
  count: 10,
  price: 0,
  batteryCapacity: 0,
  range: 0,
  chargeCyclesPerDay: 1,
  maintenanceCost: 0,
  resalePercent: 10,
};

const defaultIce: IceConfig = {
  name: "Custom ICE Vehicle",
  cost: 1000000,
  mileage: 15,
  fuelType: "petrol",
  maintenancePercent: 5,
  depreciationPercent: 10,
};





export default function NewComparisonSetup() {
  const router = useRouter();
  const createComparison = useCreateComparisonMutation();
  const { data: evCatalog = [], isLoading: catalogLoading } = useEvCatalogQuery();
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [comparisonName, setComparisonName] = useState("");
  const [mapCoords, setMapCoords] = useState({
    latitude: 12.9716, // Default Bengaluru
    longitude: 77.5946,
  });
  const [locationName, setLocationName] = useState(PRESET_CITIES[0].name);
  const [includeIce, setIncludeIce] = useState(true);
  const [contractYears, setContractYears] = useState(8);
  const [annualDrive, setAnnualDrive] = useState(30000);
  const [currency, setCurrency] = useState("INR");
  const [evVehicles, setEvVehicles] = useState<VehicleConfig[]>([{ ...EMPTY_EV }]);
  const [catalogInitialised, setCatalogInitialised] = useState(false);
  const [iceConfig, setIceConfig] = useState<IceConfig>({ ...defaultIce });
  const [location, setLocation] = useState<LocationConfig>({ 
    electricityPrice: 8.5,
    fuelCostPetrol: 102,
    fuelCostDiesel: 88,
    discountRate: 3,
    fixedMonthlyElectricity: 0,
  });
  const [expandedEvs, setExpandedEvs] = useState<Record<number, boolean>>({});
  const [iceExpanded, setIceExpanded] = useState(false);

  // Set the first EV from catalog once data loads
  useEffect(() => {
    if (!catalogInitialised && evCatalog.length > 0) {
      setCatalogInitialised(true);
      setEvVehicles([evFromCatalogItem(evCatalog[0])]);
    }
  }, [evCatalog, catalogInitialised]);

  // Modal state
  const [evModalOpen, setEvModalOpen] = useState(false);
  const [evModalIndex, setEvModalIndex] = useState(0);

  const toggleEvExpanded = (idx: number) => {
    setExpandedEvs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleEvSelect = (ev: EvCatalogItem) => {
    const updated = [...evVehicles];
    updated[evModalIndex] = evFromCatalogItem(ev, updated[evModalIndex].count);
    setEvVehicles(updated);
  };

  const selectPresetCity = (city: typeof PRESET_CITIES[0]) => {
    setMapCoords({ latitude: city.lat, longitude: city.lng });
    setLocationName(city.name);
    setCurrency(city.currency);
    setLocation({
      ...location,
      electricityPrice: city.electricity,
      fuelCostPetrol: city.petrol,
      fuelCostDiesel: city.diesel,
    });
  };

  // Reverse-geocode coordinates to get a human-readable location name
  const reverseGeocode = useCallback(async (coords: { latitude: number; longitude: number }) => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) return;
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.longitude},${coords.latitude}.json?access_token=${token}&types=place,locality&limit=1`
      );
      const data = await res.json();
      if (data.features?.length > 0) {
        setLocationName(data.features[0].place_name);
      } else {
        setLocationName("Custom location");
      }
    } catch {
      setLocationName("Custom location");
    }
  }, []);

  const handleMapMarkerChange = useCallback((coords: { latitude: number; longitude: number }) => {
    setMapCoords(coords);
    reverseGeocode(coords);
  }, [reverseGeocode]);

  const steps = [
    { label: "Location & Energy", icon: "📍" },
    { label: "EV Fleet", icon: "⚡" },
    { label: "ICE Fleet", icon: "⛽" },
  ];

  const updateEv = (index: number, field: keyof VehicleConfig, value: string | number) => {
    const updated = [...evVehicles];
    (updated[index] as Record<string, unknown>)[field] = value;
    setEvVehicles(updated);
  };



  const canGoNext = step < steps.length - 1;
  const canGoPrev = step > 0;
  const isLastStep = step === steps.length - 1;

  const handleSubmit = async () => {
    try {
      setSubmitError(null);

      const data = await createComparison.mutateAsync({
          comparisonName,
          mapCoords,
          locationName,
          includeIce,
          contractYears,
          annualDrive,
          currency,
          evVehicles,
          iceConfig,
          location,
      });
      router.push(`/compare/${data.report.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create comparison.");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>New Fleet Comparison</h1>
        <p className={styles.subtitle}>
          Set up your parameters to compare EV vs ICE fleet costs
        </p>
      </div>

      {/* Step Indicator */}
      <div className={styles.stepper}>
        {steps.map((s, i) => (
          <button
            key={i}
            className={`${styles.stepItem} ${i === step ? styles.stepActive : ""} ${i < step ? styles.stepDone : ""}`}
            onClick={() => setStep(i)}
          >
            <span className={styles.stepIcon}>{i < step ? "✓" : s.icon}</span>
            <span className={styles.stepLabel}>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className={styles.formCard}>
        {/* Step 0: Location & Energy */}
        {step === 0 && (
          <div className={styles.section}>
            {/* Comparison Name - full width */}
            <div className={styles.nameFieldWrap}>
              <label className={styles.nameLabel}>Comparison Name</label>
              <input
                className={styles.nameInput}
                value={comparisonName}
                onChange={(e) => setComparisonName(e.target.value)}
                placeholder="e.g. Downtown Delivery Fleet, Airport Shuttle..."
              />
              <p className={styles.nameHint}>
                Give your comparison a memorable name to find it easily later
              </p>
            </div>

            <h3 className={styles.sectionTitle}>Location & Energy Costs</h3>
            <p className={styles.sectionDesc}>
              Configure your fleet&apos;s operating location and energy pricing
            </p>

            {/* Map Selection Component */}
            <div className={styles.mapContainer} style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "12px", flexWrap: "wrap", gap: "12px" }}>
                <label className={styles.label} style={{ margin: 0 }}>
                  Select Primary Operating Region
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {PRESET_CITIES.map((city) => (
                    <button
                      key={city.name}
                      onClick={() => selectPresetCity(city)}
                      style={{
                        padding: "4px 12px",
                        fontSize: "12px",
                        borderRadius: "100px",
                        border: "1px solid var(--border)",
                        background: mapCoords.latitude === city.lat ? "var(--primary)" : "var(--surface)",
                        color: mapCoords.latitude === city.lat ? "white" : "var(--text-primary)",
                        cursor: "pointer",
                      }}
                    >
                      {city.name.split(",")[0]}
                    </button>
                  ))}
                </div>
              </div>
              <LocationPickerMap
                latitude={mapCoords.latitude}
                longitude={mapCoords.longitude}
                onMarkerChange={handleMapMarkerChange}
                height={350}
              />
              <p className={styles.nameHint} style={{ marginTop: "8px" }}>
                Location automatically determines live energy rates, climate impact, and currency.
              </p>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Contract Period (years)</label>
                <input
                  type="number"
                  className={styles.input}
                  value={contractYears}
                  onChange={(e) => setContractYears(Number(e.target.value))}
                  min={1}
                  max={20}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Annual Drive (km)</label>
                <input
                  type="number"
                  className={styles.input}
                  value={annualDrive}
                  onChange={(e) => setAnnualDrive(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: EV Fleet */}
        {step === 1 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Electric Vehicle Fleet</h3>
            <p className={styles.sectionDesc}>
              Configure your EV fleet details and specifications
            </p>
            {evVehicles.map((ev, idx) => (
              <div key={idx} className={styles.vehicleCard}>
                <div className={styles.vehicleHeader}>
                  <span className={styles.vehicleBadge}>EV {idx + 1}</span>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      className={styles.browseBtn}
                      onClick={() => {
                        setEvModalIndex(idx);
                        setEvModalOpen(true);
                      }}
                    >
                      🔍 Browse Vehicles
                    </button>
                    {evVehicles.length > 1 && (
                      <button
                        className={styles.removeBtn}
                        onClick={() =>
                          setEvVehicles(evVehicles.filter((_, i) => i !== idx))
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Vehicle Name</label>
                    <input
                      className={styles.input}
                      value={ev.name}
                      readOnly
                      title="Please use 'Browse Vehicles' to change the EV model"
                      style={{ cursor: "not-allowed", opacity: 0.8 }}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Number of Vehicles</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={ev.count}
                      onChange={(e) =>
                        updateEv(idx, "count", Number(e.target.value))
                      }
                      min={1}
                    />
                  </div>
                </div>

                {/* Advanced EV specs toggle */}
                <div style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => toggleEvExpanded(idx)}
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                  >
                    {expandedEvs[idx] ? "Hide Advanced Parameters" : "Edit Parameters"}
                  </button>
                </div>
                {expandedEvs[idx] && (
                  <div className={styles.formGrid} style={{ marginTop: "16px" }}>
                    <div className={styles.field}>
                      <label className={styles.label}>Price ({currency})</label>
                      <input type="number" className={styles.input} value={ev.price} onChange={e => updateEv(idx, "price", Number(e.target.value))} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Battery Capacity (kWh)</label>
                      <input type="number" className={styles.input} value={ev.batteryCapacity} onChange={e => updateEv(idx, "batteryCapacity", Number(e.target.value))} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Max Range (km)</label>
                      <input type="number" className={styles.input} value={ev.range} onChange={e => updateEv(idx, "range", Number(e.target.value))} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Charge Cycles per Day</label>
                      <select className={styles.select} value={ev.chargeCyclesPerDay} onChange={e => updateEv(idx, "chargeCyclesPerDay", Number(e.target.value))}>
                        <option value={1}>1 Cycle (Slow/Overnight)</option>
                        <option value={2}>2 Cycles (Fast/Opportunity)</option>
                        <option value={3}>3 Cycles (Extreme/24h)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button
              className={styles.addBtn}
              onClick={() => {
                const newIndex = evVehicles.length;
                setEvVehicles([
                  ...evVehicles,
                  { ...EMPTY_EV, name: `EV Vehicle ${newIndex + 1}` },
                ]);
                setEvModalIndex(newIndex);
                setEvModalOpen(true);
              }}
            >
              + Add Another EV Vehicle
            </button>
          </div>
        )}

        {/* Step 2: ICE Fleet */}
        {step === 2 && (
          <div className={styles.section}>
            {/* Prominent ICE Toggle Card */}
            <div
              className={`${styles.iceToggleCard} ${includeIce ? styles.iceToggleActive : ""}`}
              onClick={() => setIncludeIce(!includeIce)}
              role="button"
              tabIndex={0}
            >
              <div className={styles.iceToggleLeft}>
                <div className={styles.iceToggleIcon}>
                  {includeIce ? "✅" : "⛽"}
                </div>
                <div>
                  <h3 className={styles.iceToggleTitle}>
                    Compare with ICE Fleet
                  </h3>
                  <p className={styles.iceToggleDesc}>
                    Add a traditional fuel vehicle to compare total cost of
                    ownership, CO₂ emissions, and financial returns side-by-side
                    with your EV fleet.
                  </p>
                </div>
              </div>
              <div className={styles.iceToggleSwitch}>
                <div
                  className={`${styles.switchTrack} ${includeIce ? styles.switchOn : ""}`}
                >
                  <div className={styles.switchThumb} />
                </div>
              </div>
            </div>

            {!includeIce && (
              <div className={styles.iceSkipNotice}>
                <span className={styles.iceSkipIcon}>ℹ️</span>
                <p>
                  You&apos;re skipping ICE comparison. Your report will only
                  analyze EV fleet costs. You can always come back and enable
                  this later.
                </p>
              </div>
            )}

            {includeIce && (
              <>
                <h4 className={styles.iceFormHeading}>
                  ICE Vehicle Configuration
                </h4>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Vehicle Name</label>
                    <input
                      className={styles.input}
                      value={iceConfig.name}
                      onChange={(e) =>
                        setIceConfig({ ...iceConfig, name: e.target.value })
                      }
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Fuel Type</label>
                    <select
                      className={styles.select}
                      value={iceConfig.fuelType}
                      onChange={(e) =>
                        setIceConfig({
                          ...iceConfig,
                          fuelType: e.target.value as "petrol" | "diesel",
                        })
                      }
                    >
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                    </select>
                  </div>
                </div>

                {/* Advanced ICE specs toggle */}
                <div style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => setIceExpanded(prev => !prev)}
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                  >
                    {iceExpanded ? "Hide Advanced Parameters" : "Edit Parameters"}
                  </button>
                </div>
                
                {iceExpanded && (
                  <div className={styles.formGrid} style={{ marginTop: "16px" }}>
                    <div className={styles.field}>
                      <label className={styles.label}>Cost per Vehicle ({currency})</label>
                      <input type="number" className={styles.input} value={iceConfig.cost} onChange={e => setIceConfig({ ...iceConfig, cost: Number(e.target.value) })} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Mileage (km/L)</label>
                      <input type="number" className={styles.input} value={iceConfig.mileage} onChange={e => setIceConfig({ ...iceConfig, mileage: Number(e.target.value) })} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Maintenance (%/year)</label>
                      <input type="number" className={styles.input} value={iceConfig.maintenancePercent} onChange={e => setIceConfig({ ...iceConfig, maintenancePercent: Number(e.target.value) })} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Depreciation (%/year)</label>
                      <input type="number" className={styles.input} value={iceConfig.depreciationPercent} onChange={e => setIceConfig({ ...iceConfig, depreciationPercent: Number(e.target.value) })} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>



      {/* Navigation */}
      <div className={styles.navRow}>
        {submitError ? <div className={styles.errorBanner}>{submitError}</div> : null}
        {canGoPrev && (
          <button className="btn btn-outline" onClick={() => setStep(step - 1)}>
            ← Previous
          </button>
        )}
        <div className={styles.navSpacer} />
        {canGoNext && (
          <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
            Next →
          </button>
        )}
        {isLastStep && (
          <button className="btn btn-primary" onClick={handleSubmit} disabled={createComparison.isPending}>
            {createComparison.isPending ? "Creating comparison..." : "🚀 Calculate Comparison"}
          </button>
        )}
      </div>

      {/* Selection Modals */}
      <EVehicleSelectModal
        isOpen={evModalOpen}
        onClose={() => setEvModalOpen(false)}
        onSelect={handleEvSelect}
        catalog={evCatalog}
        catalogLoading={catalogLoading}
        currency={currency}
      />
    </div>
  );
}
