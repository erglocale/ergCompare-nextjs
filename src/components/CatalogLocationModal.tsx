"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import LocationPickerMap from "@/components/Map/LocationPickerMap";
import type { LocationCity } from "@/components/LocationProvider";
import styles from "./CatalogLocationModal.module.css";

const FALLBACK_LOCATION: LocationCity = {
  id: "preset-bengaluru",
  name: "Bengaluru, India",
  lat: 12.9716,
  lng: 77.5946,
};

const PRESET_LOCATIONS: LocationCity[] = [
  FALLBACK_LOCATION,
  {
    id: "preset-delhi",
    name: "Delhi, India",
    lat: 28.7041,
    lng: 77.1025,
  },
  {
    id: "preset-san-francisco",
    name: "San Francisco, USA",
    lat: 37.7749,
    lng: -122.4194,
  },
  {
    id: "preset-london",
    name: "London, UK",
    lat: 51.5072,
    lng: -0.1276,
  },
];

interface CatalogLocationModalProps {
  isOpen: boolean;
  initialLocation: LocationCity | null;
  onClose: () => void;
  onConfirm: (location: LocationCity) => void;
  onResolveLocation: (lat: number, lng: number) => Promise<LocationCity>;
  onUseCurrentLocation: () => Promise<void>;
  isRequestingCurrentLocation?: boolean;
  permissionDenied?: boolean;
}

export default function CatalogLocationModal({
  isOpen,
  initialLocation,
  onClose,
  onConfirm,
  onResolveLocation,
  onUseCurrentLocation,
  isRequestingCurrentLocation = false,
  permissionDenied = false,
}: CatalogLocationModalProps) {
  const [draftLocation, setDraftLocation] = useState<LocationCity>(
    initialLocation ?? FALLBACK_LOCATION
  );
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDraftLocation(initialLocation ?? FALLBACK_LOCATION);
    setResolveError(null);
  }, [initialLocation, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleCoordinatesChange = useCallback(
    async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
      setIsResolving(true);
      setResolveError(null);

      try {
        const resolved = await onResolveLocation(latitude, longitude);
        setDraftLocation(resolved);
      } catch (error) {
        console.error("Failed to resolve selected location", error);
        setDraftLocation((prev) => ({
          ...prev,
          id: `custom-${latitude.toFixed(6)}-${longitude.toFixed(6)}`,
          lat: latitude,
          lng: longitude,
          name: `Location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
        }));
        setResolveError("Could not resolve the place name. You can still use this location.");
      } finally {
        setIsResolving(false);
      }
    },
    [onResolveLocation]
  );

  const handlePresetSelect = useCallback((location: LocationCity) => {
    setDraftLocation(location);
    setResolveError(null);
    setIsResolving(false);
  }, []);

  const statusMessage = useMemo(() => {
    if (isRequestingCurrentLocation) {
      return {
        className: styles.statusPending,
        text: "Requesting browser location...",
      };
    }

    if (isResolving) {
      return {
        className: styles.statusPending,
        text: "Resolving place name...",
      };
    }

    if (resolveError) {
      return {
        className: styles.statusError,
        text: resolveError,
      };
    }

    if (permissionDenied) {
      return {
        className: styles.statusError,
        text: "Location permission is blocked. You can still choose a place on the map.",
      };
    }

    return {
      className: "",
      text: "Click or drag the pin to change the market used for this catalog.",
    };
  }, [isRequestingCurrentLocation, isResolving, permissionDenied, resolveError]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-location-title"
      >
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Catalog Market</div>
            <h2 id="catalog-location-title" className={styles.title}>
              Choose catalog location
            </h2>
            <p className={styles.subtitle}>
              Vehicle availability is filtered by the country resolved from this map selection.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close location picker"
          >
            X
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.mapWrap}>
            <LocationPickerMap
              latitude={draftLocation.lat}
              longitude={draftLocation.lng}
              onMarkerChange={handleCoordinatesChange}
              height={420}
            />
          </div>

          <div className={styles.sidePanel}>
            <div className={styles.summaryCard}>
              <span className={styles.cardLabel}>Selected location</span>
              <p className={styles.locationName}>{draftLocation.name}</p>
              <div className={styles.locationCoords}>
                Lat {draftLocation.lat.toFixed(4)}, Lng {draftLocation.lng.toFixed(4)}
              </div>
              <div className={`${styles.statusRow} ${statusMessage.className}`}>
                {statusMessage.text}
              </div>
            </div>

            <div className={styles.presetCard}>
              <span className={styles.cardLabel}>Quick picks</span>
              <div className={styles.presetGrid}>
                {PRESET_LOCATIONS.map((location) => (
                  <button
                    key={location.id}
                    type="button"
                    className={styles.presetButton}
                    onClick={() => handlePresetSelect(location)}
                  >
                    {location.name}
                  </button>
                ))}
              </div>
            </div>

            <p className={styles.helperText}>
              Use a preset, your browser location, or drop the pin anywhere on the map. The
              catalog updates only after you confirm.
            </p>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerNote}>Current filters stay intact when the market changes.</div>
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.ghostButton} ${
                isRequestingCurrentLocation ? styles.buttonDisabled : ""
              }`}
              onClick={() => {
                void onUseCurrentLocation();
              }}
              disabled={isRequestingCurrentLocation}
            >
              {isRequestingCurrentLocation ? "Locating..." : "Use My Location"}
            </button>
            <button
              type="button"
              className={`${styles.primaryButton} ${isResolving ? styles.buttonDisabled : ""}`}
              onClick={() => onConfirm(draftLocation)}
              disabled={isResolving}
            >
              Use This Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
