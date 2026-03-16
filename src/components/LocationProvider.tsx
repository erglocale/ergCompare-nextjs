"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface LocationCity {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export type LocationSource = "gps" | "manual" | "stored";

interface LocationContextType {
  currentLocation: LocationCity | null;
  setLocation: (city: LocationCity) => void;
  buildLocationFromCoordinates: (lat: number, lng: number) => Promise<LocationCity>;
  isRequesting: boolean;
  permissionDenied: boolean;
  locationSource: LocationSource | null;
  requestLocation: () => Promise<LocationCity | null>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);
const STORAGE_KEY = "ergCompare_location";

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocationContext must be used within a LocationProvider");
  }
  return context;
}

export default function LocationProvider({ children }: { children: React.ReactNode }) {
  const [currentLocation, setCurrentLocation] = useState<LocationCity | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locationSource, setLocationSource] = useState<LocationSource | null>(null);

  // Reverse geocode to get a readable region name
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) return `Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`;

    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=place,locality&limit=1`
      );
      const data = await res.json();
      if (data.features?.length > 0) {
        return data.features[0].place_name;
      }
    } catch (error) {
      console.error("Reverse geocoding failed", error);
    }
    return `Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
  }, []);

  const persistLocation = useCallback((city: LocationCity, source: LocationSource) => {
    setCurrentLocation(city);
    setLocationSource(source);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(city));
  }, []);

  const buildLocationFromCoordinates = useCallback(
    async (lat: number, lng: number) => {
      const placeName = await reverseGeocode(lat, lng);
      return {
        id: `custom-${lat.toFixed(6)}-${lng.toFixed(6)}`,
        name: placeName,
        lat,
        lng,
      };
    },
    [reverseGeocode]
  );

  const requestLocation = useCallback(() => {
    return new Promise<LocationCity | null>((resolve) => {
      if (!("geolocation" in navigator)) {
        console.warn("Geolocation is not supported by this browser.");
        resolve(null);
        return;
      }

      setIsRequesting(true);
      setPermissionDenied(false);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const loc = await buildLocationFromCoordinates(latitude, longitude);

          persistLocation(loc, "gps");
          setIsRequesting(false);
          resolve(loc);
        },
        (error) => {
          console.error("Error obtaining location", error);
          setPermissionDenied(true);
          setIsRequesting(false);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    });
  }, [buildLocationFromCoordinates, persistLocation]);

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LocationCity;
        setCurrentLocation(parsed);
        setLocationSource("stored");
      } catch (e) {
        console.error("Failed to parse stored location", e);
        void requestLocation();
      }
    } else {
      // First time load: automatically ask for permission
      void requestLocation();
    }
  }, [requestLocation]);

  const handleSetLocation = useCallback(
    (city: LocationCity) => {
      persistLocation(city, "manual");
      setPermissionDenied(false);
    },
    [persistLocation]
  );

  if (!mounted) return null; // Avoid hydration mismatch

  return (
    <LocationContext.Provider
      value={{
        currentLocation,
        setLocation: handleSetLocation,
        buildLocationFromCoordinates,
        isRequesting,
        permissionDenied,
        locationSource,
        requestLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}
