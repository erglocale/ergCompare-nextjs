"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Map, { Marker, NavigationControl, GeolocateControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onMarkerChange: (coords: { latitude: number; longitude: number }) => void;
  height?: string | number;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onMarkerChange,
  height = 400,
}: LocationPickerMapProps) {
  const [viewState, setViewState] = useState({
    longitude,
    latitude,
    zoom: 6,
  });

  // Track previous coords to detect large jumps (preset city switches)
  const prevCoordsRef = useRef({ latitude, longitude });

  useEffect(() => {
    const prev = prevCoordsRef.current;
    const dist = Math.abs(latitude - prev.latitude) + Math.abs(longitude - prev.longitude);
    prevCoordsRef.current = { latitude, longitude };

    // Only re-center the map for large coordinate changes (preset city switch).
    // Small changes (map clicks / drags within viewport) should NOT move the viewport.
    if (dist > 0.5) {
      setViewState((v) => ({ ...v, latitude, longitude, zoom: Math.max(v.zoom, 6) }));
    }
  }, [latitude, longitude]);

  const [isDragging, setIsDragging] = useState(false);

  // Use the token from environment variables
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const onDragStart = useCallback(() => setIsDragging(true), []);

  const onDragEnd = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: any) => {
      setIsDragging(false);
      
      // Defensively parse new coordinates due to v6 vs v7 react-map-gl differences
      const lngLat = event.lngLat || (event.target && event.target.getLngLat && event.target.getLngLat());
      if (!lngLat) return;

      const lon = lngLat.lng !== undefined ? lngLat.lng : lngLat[0];
      const lat = lngLat.lat !== undefined ? lngLat.lat : lngLat[1];

      if (lon !== undefined && lat !== undefined) {
        onMarkerChange({ longitude: lon, latitude: lat });
      }
    },
    [onMarkerChange]
  );

  const onMapClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: any) => {
      const lngLat = event.lngLat;
      if (!lngLat) return;

      const lon = lngLat.lng !== undefined ? lngLat.lng : lngLat[0];
      const lat = lngLat.lat !== undefined ? lngLat.lat : lngLat[1];

      if (lon !== undefined && lat !== undefined) {
        onMarkerChange({ longitude: lon, latitude: lat });
      }
    },
    [onMarkerChange]
  );

  // Reference to the geolocate control so we can trigger it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geolocateControlRef = useRef<any>(null);

  // Handle geolocation result
  const onGeolocate = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: any) => {
      // Different versions wrapper the coords differently. Extract safely.
      const coords = event?.coords || event?.target?._lastKnownPosition?.coords;
      if (coords) {
        onMarkerChange({
          longitude: coords.longitude,
          latitude: coords.latitude,
        });
        
        // Also pan the map to the new location and zoom in moderately
        setViewState((prev) => ({
          ...prev,
          longitude: coords.longitude,
          latitude: coords.latitude,
          zoom: 8,
        }));
      }
    },
    [onMarkerChange]
  );

  return (
    <div
      style={{
        height,
        width: "100%",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: "1px solid var(--border)",
        position: "relative",
      }}
    >
      <Map
        {...viewState}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onMove={(evt: any) => setViewState(evt.viewState)}
        onClick={onMapClick}
        mapStyle="mapbox://styles/priyanku94/ckv3ic1ev4q9714mtfmn6sokk?optimize=true&zoomwheel=true&fresh=true"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl
          ref={geolocateControlRef}
          position="bottom-right"
          trackUserLocation={true}
          showAccuracyCircle={false}
          showUserLocation={false}
          positionOptions={{ enableHighAccuracy: true }}
          onGeolocate={onGeolocate}
        />

        <Marker
          longitude={longitude}
          latitude={latitude}
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          anchor="bottom"
        >
          {/* Custom Brand Pin */}
          <div
            style={{
              cursor: isDragging ? "grabbing" : "grab",
              transform: isDragging ? "scale(1.1) translateY(-5px)" : "scale(1)",
              transition: "transform 0.15s ease",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21C16 16.5 19 12 19 8.5C19 4.35786 15.866 1 12 1C8.13401 1 5 4.35786 5 8.5C5 12 8 16.5 12 21Z"
                fill="var(--primary)"
                stroke="#fff"
                strokeWidth="2"
              />
              <circle cx="12" cy="8.5" r="3" fill="#fff" />
            </svg>
          </div>
        </Marker>
      </Map>
    </div>
  );
}
