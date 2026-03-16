"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface LocationCity {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface LocationContextType {
  currentLocation: LocationCity | null;
  setLocation: (city: LocationCity) => void;
  isRequesting: boolean;
  permissionDenied: boolean;
  requestLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

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

  // Reverse geocode to get a readable region name
  const reverseGeocode = async (lat: number, lng: number) => {
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
  };

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      console.warn("Geolocation is not supported by this browser.");
      return;
    }

    setIsRequesting(true);
    setPermissionDenied(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const placeName = await reverseGeocode(latitude, longitude);
        
        const loc: LocationCity = {
          id: `custom-${latitude}-${longitude}`,
          name: placeName,
          lat: latitude,
          lng: longitude,
        };
        
        setCurrentLocation(loc);
        localStorage.setItem("ergCompare_location", JSON.stringify(loc));
        setIsRequesting(false);
      },
      (error) => {
        console.error("Error obtaining location", error);
        setPermissionDenied(true);
        setIsRequesting(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
    const stored = localStorage.getItem("ergCompare_location");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCurrentLocation(parsed);
      } catch (e) {
        console.error("Failed to parse stored location", e);
        requestLocation();
      }
    } else {
      // First time load: automatically ask for permission
      requestLocation();
    }
  }, [requestLocation]);

  const handleSetLocation = (city: LocationCity) => {
    setCurrentLocation(city);
    localStorage.setItem("ergCompare_location", JSON.stringify(city));
  };

  if (!mounted) return null; // Avoid hydration mismatch

  return (
    <LocationContext.Provider 
      value={{ 
        currentLocation, 
        setLocation: handleSetLocation, 
        isRequesting,
        permissionDenied,
        requestLocation
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}
