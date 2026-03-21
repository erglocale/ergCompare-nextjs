"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import LocationPickerMap from "@/components/Map/LocationPickerMap";
import { convertCurrencyAmount, type CurrencyRecord, USD_CURRENCY } from "@/lib/currency";
import {
  useCreateComparisonMutation,
  useCurrencyByCodeQuery,
  useEnergyPriceQuery,
  useEvCatalogQuery,
  useIceParametersQuery,
  useLocationCurrencyQuery,
} from "@/lib/query-hooks";
import type { EvCatalogItem } from "@/lib/mock-data";
import styles from "./setup.module.css";
import catalogStyles from "../vehicles/page.module.css";

const MAX_COMPARISON_NAME_LENGTH = 120;
const MAX_LOCATION_NAME_LENGTH = 160;
const MAX_VEHICLE_NAME_LENGTH = 120;
const MIN_CONTRACT_YEARS = 1;
const MAX_CONTRACT_YEARS = 20;
const MIN_ANNUAL_DRIVE = 1;
const MAX_ANNUAL_DRIVE = 1000000;
const MIN_VEHICLE_COUNT = 1;
const MAX_VEHICLE_COUNT = 10000;
const MAX_PRICE = 1000000000;
const MAX_BATTERY_CAPACITY = 5000;
const MAX_RANGE_KM = 5000;
const MAX_PERCENT = 100;

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function limitText(value: string, maxLength: number) {
  return value.slice(0, maxLength);
}

function parseClampedNumber(value: string, min: number, max: number) {
  if (value.trim() === "") {
    return min;
  }

  return clampNumber(Number(value), min, max);
}

interface VehicleConfig {
  [key: string]: string | number | undefined;
  modelId?: number | string;
  segment?: string;
  catalogPriceUsd?: number;
  priceManuallyEdited?: number;
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
  { name: "Bengaluru, India", lat: 12.9716, lng: 77.5946, currency: "INR" },
  { name: "Pune, India", lat: 18.5204, lng: 73.8567, currency: "INR" },
  { name: "Delhi, India", lat: 28.7041, lng: 77.1025, currency: "INR" },
  { name: "San Francisco, USA", lat: 37.7749, lng: -122.4194, currency: "USD" },
];

// Charger costs are now auto-calculated using smart ratio

function evFromCatalogItem(
  item: EvCatalogItem,
  targetCurrency: CurrencyRecord,
  count = 10
): VehicleConfig {
  return {
    modelId: item.id,
    segment: item.segment ?? undefined,
    catalogPriceUsd: item.avg_cost,
    priceManuallyEdited: 0,
    name: item.name,
    count,
    price: convertCurrencyAmount(USD_CURRENCY, targetCurrency, item.avg_cost),
    batteryCapacity: item.battery_capacity,
    range: item.max_range,
    chargeCyclesPerDay: 1,
    maintenanceCost: 0,
    resalePercent: 10,
  };
}

const EMPTY_EV: VehicleConfig = {
  name: "Select a vehicle…",
  segment: "Other",
  catalogPriceUsd: undefined,
  priceManuallyEdited: 0,
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
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [comparisonName, setComparisonName] = useState("");
  const [mapCoords, setMapCoords] = useState({
    latitude: 12.9716, // Default Bengaluru
    longitude: 77.5946,
  });
  const { data: evCatalog = [], isLoading: catalogLoading } = useEvCatalogQuery(
    undefined,
    mapCoords.latitude,
    mapCoords.longitude
  );
  const [locationName, setLocationName] = useState(PRESET_CITIES[0].name);
  const [contractYears, setContractYears] = useState(8);
  const [annualDrive, setAnnualDrive] = useState(30000);
  const [currencyFallback, setCurrencyFallback] = useState("INR");
  const [evVehicles, setEvVehicles] = useState<VehicleConfig[]>([{ ...EMPTY_EV }]);
  const [iceConfig] = useState<IceConfig>({ ...defaultIce });
  const [location, setLocation] = useState<LocationConfig>({ 
    electricityPrice: 8.5,
    fuelCostPetrol: 102,
    fuelCostDiesel: 88,
    discountRate: 3,
    fixedMonthlyElectricity: 0,
  });
  const [expandedEvs, setExpandedEvs] = useState<Record<number, boolean>>({});

  const activeSegment = evVehicles[0]?.segment && evVehicles[0].segment !== "Other" ? evVehicles[0].segment : undefined;
  // TODO: extract country code from the location coordinate or just use global config?
  // Let's rely on segment mapping as the primary resolution for now, per the schema recommendation.
  const { data: matchedIceParameters } = useIceParametersQuery(activeSegment);
  const {
    data: locationCurrencies = [],
    isLoading: currencyLoading,
    isFetching: currencyFetching,
  } = useLocationCurrencyQuery(mapCoords.latitude, mapCoords.longitude);
  const {
    data: energyPrices,
    isLoading: energyPriceLoading,
    isFetching: energyPriceFetching,
    isError: energyPriceError,
  } = useEnergyPriceQuery(mapCoords.latitude, mapCoords.longitude);
  const { data: fallbackCurrencies = [] } = useCurrencyByCodeQuery(currencyFallback);
  const resolvedCurrency = locationCurrencies[0] ?? fallbackCurrencies[0] ?? null;
  const activeCurrency = resolvedCurrency ?? USD_CURRENCY;
  const currency = resolvedCurrency?.id ?? currencyFallback;

  useEffect(() => {
    if (!energyPrices) {
      return;
    }

    setLocation((currentLocation) => ({
      ...currentLocation,
      electricityPrice: clampNumber(energyPrices.price_per_kwh, 0, 10000),
      fuelCostPetrol: clampNumber(energyPrices.petrol_price, 0, 10000),
      fuelCostDiesel: clampNumber(energyPrices.diesel_price, 0, 10000),
    }));
  }, [energyPrices]);

  const resolvedEvVehicles = useMemo(() => {
    if (!resolvedCurrency) {
      return evVehicles;
    }

    return evVehicles.map((vehicle) => {
      if (
        typeof vehicle.catalogPriceUsd !== "number" ||
        vehicle.priceManuallyEdited === 1
      ) {
        return vehicle;
      }

      return {
        ...vehicle,
        price: convertCurrencyAmount(
          USD_CURRENCY,
          resolvedCurrency,
          vehicle.catalogPriceUsd
        ),
      };
    });
  }, [evVehicles, resolvedCurrency]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("All");
  const [sortBy, setSortBy] = useState("None");
  
  const filteredCatalog = useMemo(() => {
    if (!evCatalog) return [];
    let result = evCatalog;
    
    if (selectedSegment !== "All") {
      result = result.filter(v => v.segment === selectedSegment || (selectedSegment === "Truck" && !v.segment));
    }
    
    if (searchQuery.trim()) {
      result = result.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

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
  }, [evCatalog, searchQuery, selectedSegment, sortBy]);

  const toggleEvExpanded = (idx: number) => {
    setExpandedEvs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleEvSelect = (ev: EvCatalogItem) => {
    // We restrict to a single EV in this refined flow
    setEvVehicles([evFromCatalogItem(ev, activeCurrency, 10)]); // Default count 10
  };

  const selectPresetCity = (city: typeof PRESET_CITIES[0]) => {
    setMapCoords({ latitude: city.lat, longitude: city.lng });
    setLocationName(limitText(city.name, MAX_LOCATION_NAME_LENGTH));
    setCurrencyFallback(city.currency);
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
        setLocationName(limitText(data.features[0].place_name, MAX_LOCATION_NAME_LENGTH));
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
  ];

  const updateEv = (index: number, field: keyof VehicleConfig, value: string | number) => {
    const updated = [...resolvedEvVehicles];
    (updated[index] as Record<string, unknown>)[field] = value;
    if (field === "price") {
      updated[index].priceManuallyEdited = 1;
    }
    setEvVehicles(updated);
  };



  const canGoNext = step < steps.length - 1;
  const canGoPrev = step > 0;
  const isLastStep = step === steps.length - 1;

  const handleSubmit = async () => {
    try {
      setSubmitError(null);

      const normalizedComparisonName = comparisonName.trim();

      if (normalizedComparisonName.length > MAX_COMPARISON_NAME_LENGTH) {
        setSubmitError(`Comparison name must be at most ${MAX_COMPARISON_NAME_LENGTH} characters.`);
        return;
      }

      if (locationName.length > MAX_LOCATION_NAME_LENGTH) {
        setSubmitError("Location name is too long.");
        return;
      }

      if (!resolvedEvVehicles.length) {
        setSubmitError("At least one EV vehicle is required.");
        return;
      }

      if ((currencyLoading || currencyFetching) && !resolvedCurrency) {
        setSubmitError("Currency is still loading for the selected location.");
        return;
      }

      if (!resolvedCurrency && currencyFallback !== USD_CURRENCY.id) {
        setSubmitError("Unable to resolve the market currency for the selected location.");
        return;
      }

      if ((energyPriceLoading || energyPriceFetching) && !energyPrices) {
        setSubmitError("Energy prices are still loading for the selected location.");
        return;
      }

      if (energyPriceError && !energyPrices) {
        setSubmitError("Unable to load backend energy prices for the selected location.");
        return;
      }

      const safeEvVehicles = resolvedEvVehicles.map((ev) => ({
        modelId: ev.modelId,
        segment: ev.segment,
        name: limitText(ev.name.trim(), MAX_VEHICLE_NAME_LENGTH),
        count: clampNumber(ev.count, MIN_VEHICLE_COUNT, MAX_VEHICLE_COUNT),
        price: clampNumber(ev.price, 0, MAX_PRICE),
        batteryCapacity: clampNumber(ev.batteryCapacity, 0, MAX_BATTERY_CAPACITY),
        range: clampNumber(ev.range, 0, MAX_RANGE_KM),
        chargeCyclesPerDay: clampNumber(ev.chargeCyclesPerDay, 1, 3),
        maintenanceCost: clampNumber(ev.maintenanceCost, 0, MAX_PRICE),
        resalePercent: clampNumber(ev.resalePercent, 0, MAX_PERCENT),
      }));

      const marketIce = matchedIceParameters && matchedIceParameters.length > 0 ? matchedIceParameters[0] : null;

      const safeIceConfig = {
        name: marketIce ? `${marketIce.segment || "ICE"} Baseline` : iceConfig.name || "Custom ICE Vehicle",
        cost: marketIce ? marketIce.cost : Number(iceConfig.cost) || 1200000,
        mileage: marketIce ? marketIce.mileage : Number(iceConfig.mileage) || 15,
        fuelType: marketIce ? marketIce.fuel_type : iceConfig.fuelType || "petrol",
        maintenancePercent: marketIce ? marketIce.maintenance_percent : Number(iceConfig.maintenancePercent) || 5,
        depreciationPercent: marketIce ? marketIce.residual_percent : Number(iceConfig.depreciationPercent) || 10,
      };

      const safeLocation = {
        ...location,
        electricityPrice: clampNumber(location.electricityPrice, 0, 10000),
        fuelCostPetrol: clampNumber(location.fuelCostPetrol, 0, 10000),
        fuelCostDiesel: clampNumber(location.fuelCostDiesel, 0, 10000),
        discountRate: clampNumber(location.discountRate, 0, MAX_PERCENT),
        fixedMonthlyElectricity: clampNumber(location.fixedMonthlyElectricity, 0, MAX_PRICE),
      };

      const data = await createComparison.mutateAsync({
          comparisonName: normalizedComparisonName,
          mapCoords,
          locationName: limitText(locationName, MAX_LOCATION_NAME_LENGTH),
          includeIce: true,
          contractYears: clampNumber(contractYears, MIN_CONTRACT_YEARS, MAX_CONTRACT_YEARS),
          annualDrive: clampNumber(annualDrive, MIN_ANNUAL_DRIVE, MAX_ANNUAL_DRIVE),
          currency: resolvedCurrency?.id ?? currency,
          evVehicles: safeEvVehicles,
          iceConfig: safeIceConfig,
          location: safeLocation,
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
                onChange={(e) => setComparisonName(limitText(e.target.value, MAX_COMPARISON_NAME_LENGTH))}
                placeholder="e.g. Downtown Delivery Fleet, Airport Shuttle..."
                maxLength={MAX_COMPARISON_NAME_LENGTH}
              />
              <p className={styles.nameHint}>
                Give your comparison a memorable name to find it easily later
              </p>
            </div>

            <div className={styles.twoColumnLayout}>
              <div>
                <h3 className={styles.sectionTitle}>Location & Energy Costs</h3>
                <p className={styles.sectionDesc}>
                  Configure your fleet&apos;s operating location and energy pricing
                </p>

                <div className={styles.formGrid} style={{ marginTop: "24px" }}>
                  <div className={styles.field}>
                    <label className={styles.label}>Contract Period (years)</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={contractYears}
                      onChange={(e) => setContractYears(parseClampedNumber(e.target.value, MIN_CONTRACT_YEARS, MAX_CONTRACT_YEARS))}
                      min={MIN_CONTRACT_YEARS}
                      max={MAX_CONTRACT_YEARS}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Annual Drive (km)</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={annualDrive}
                      onChange={(e) => setAnnualDrive(parseClampedNumber(e.target.value, MIN_ANNUAL_DRIVE, MAX_ANNUAL_DRIVE))}
                      min={MIN_ANNUAL_DRIVE}
                      max={MAX_ANNUAL_DRIVE}
                    />
                  </div>
                </div>
              </div>

              <div>
                {/* Map Selection Component */}
                <div className={styles.mapContainer}>
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
                    height={340}
                  />
                  <p className={styles.nameHint} style={{ marginTop: "8px" }}>
                    Location automatically determines live energy rates, climate impact, and currency.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: EV Fleet */}
        {step === 1 && (
          <div className={`${styles.section} ${styles.compactSection}`}>
            <h3 className={styles.sectionTitle}>Electric Vehicle Fleet</h3>
            <p className={styles.sectionDescCompact}>
              {resolvedEvVehicles[0]?.name === EMPTY_EV.name 
                ? "Select a vehicle from the catalog to configure your fleet." 
                : "Configure your EV fleet details and specifications"}
            </p>
            
            {/* If no EV is selected, show Catalog Grid */}
            {resolvedEvVehicles[0]?.name === EMPTY_EV.name ? (
              <div className={styles.inlineCatalogContainer}>
                <div className={catalogStyles.filtersSection} style={{ marginBottom: "1.5rem" }}>
                  <input
                    type="text"
                    placeholder="Search vehicles..."
                    className={catalogStyles.searchInput}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <select 
                    className={catalogStyles.filterDropdown} 
                    value={selectedSegment} 
                    onChange={e => setSelectedSegment(e.target.value)}
                  >
                    <option value="All">All Segments</option>
                    <option value="3 Wheeler">3 Wheeler</option>
                    <option value="Auto Rickshaw">Auto Rickshaw</option>
                    <option value="Pickup Truck">Pickup Truck</option>
                    <option value="Mini Truck">Mini Truck</option>
                    <option value="Truck">Truck</option>
                    <option value="Passenger 4 Wheeler">Passenger 4 Wheeler</option>
                  </select>
                  <select 
                    className={catalogStyles.filterDropdown} 
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
                </div>
                
                {catalogLoading ? (
                  <div className={catalogStyles.loading}>Loading catalog...</div>
                ) : (
                  <div className={catalogStyles.cardsGrid}>
                    {filteredCatalog.map((vehicle) => (
                      <div 
                        key={vehicle.id} 
                        className={`${catalogStyles.card} ${styles.selectableCard}`}
                        onClick={() => handleEvSelect(vehicle)}
                      >
                        <div className={catalogStyles.cardImageWrapper}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://tsx-static.s3.ap-south-1.amazonaws.com/Vehicles/Electric/${vehicle.id}.png`}
                            alt={vehicle.name}
                            className={catalogStyles.vehicleImage}
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = "none";
                              target.parentElement!.classList.add(catalogStyles.cardImageFallback);
                            }}
                          />
                          <div className={catalogStyles.fallbackEmoji}>🚙</div>
                        </div>

                        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "1rem", textAlign: "center", minHeight: "2.5rem" }}>
                          {vehicle.name || `${vehicle.make} ${vehicle.model}`}
                        </h3>

                        <div className={catalogStyles.specsGrid}>
                          <div className={catalogStyles.specBox}>
                            <span className={catalogStyles.specLabel}>Bat. Capacity</span>
                            <span className={catalogStyles.specValue}>{vehicle.battery_capacity ?? "NA"} kWh</span>
                          </div>
                          <div className={catalogStyles.specBox}>
                            <span className={catalogStyles.specLabel}>Top Range</span>
                            <span className={catalogStyles.specValue}>{vehicle.max_range ?? "NA"} km</span>
                          </div>
                          <div className={catalogStyles.specBox}>
                            <span className={catalogStyles.specLabel}>Payload</span>
                            <span className={catalogStyles.specValue}>{vehicle.load_capacity ?? "NA"} kg</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {!catalogLoading && filteredCatalog.length === 0 && (
                  <div className={catalogStyles.empty}>
                    <h3>No vehicles found matching filters</h3>
                  </div>
                )}
              </div>
            ) : (
              /* If EV IS selected, show its configuration form */
              <div className={styles.vehicleCard}>
                <div className={styles.vehicleHeader}>
                  <span className={styles.vehicleBadge}>Selected EV</span>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      className={styles.browseBtn}
                      onClick={() => {
                        setEvVehicles([{ ...EMPTY_EV }]);
                        setSearchQuery("");
                      }}
                    >
                      🔄 Change Vehicle
                    </button>
                  </div>
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Vehicle Model</label>
                    <input
                      className={styles.input}
                      value={resolvedEvVehicles[0].name}
                      readOnly
                      style={{ cursor: "not-allowed", opacity: 0.8 }}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Fleet Size (Units)</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={resolvedEvVehicles[0].count}
                      onChange={(e) =>
                        updateEv(0, "count", parseClampedNumber(e.target.value, MIN_VEHICLE_COUNT, MAX_VEHICLE_COUNT))
                      }
                      min={MIN_VEHICLE_COUNT}
                      max={MAX_VEHICLE_COUNT}
                    />
                  </div>
                </div>

                <div style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => toggleEvExpanded(0)}
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                  >
                    {expandedEvs[0] ? "Hide Advanced Parameters" : "Edit Parameters"}
                  </button>
                </div>
                {expandedEvs[0] && (
                  <div className={styles.formGrid} style={{ marginTop: "16px" }}>
                    <div className={styles.field}>
                      <label className={styles.label}>Price ({currency})</label>
                      <input type="number" className={styles.input} value={resolvedEvVehicles[0].price} onChange={e => updateEv(0, "price", parseClampedNumber(e.target.value, 0, MAX_PRICE))} min={0} max={MAX_PRICE} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Battery Capacity (kWh)</label>
                      <input type="number" className={styles.input} value={resolvedEvVehicles[0].batteryCapacity} onChange={e => updateEv(0, "batteryCapacity", parseClampedNumber(e.target.value, 0, MAX_BATTERY_CAPACITY))} min={0} max={MAX_BATTERY_CAPACITY} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Max Range (km)</label>
                      <input type="number" className={styles.input} value={resolvedEvVehicles[0].range} onChange={e => updateEv(0, "range", parseClampedNumber(e.target.value, 0, MAX_RANGE_KM))} min={0} max={MAX_RANGE_KM} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Charge Cycles per Day</label>
                      <select className={styles.select} value={resolvedEvVehicles[0].chargeCyclesPerDay} onChange={e => updateEv(0, "chargeCyclesPerDay", Number(e.target.value))}>
                        <option value={1}>1 Cycle (Slow/Overnight)</option>
                        <option value={2}>2 Cycles (Fast/Opportunity)</option>
                        <option value={3}>3 Cycles (Extreme/24h)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
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
    </div>
  );
}
