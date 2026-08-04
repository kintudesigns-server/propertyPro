"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, ExternalLink } from "lucide-react";

interface PropertyGroup {
  property: {
    id: string;
    name: string;
    address: string;
    city: string;
    country: string;
    coverPhoto?: string | null;
    type: string;
  };
  units: any[];
  minRent: number;
  maxRent: number;
  minBeds: number;
  maxBeds: number;
}

interface ListingsMapProps {
  groupedProperties: PropertyGroup[];
  hoveredPropertyId: string | null;
  onHoverProperty: (id: string | null) => void;
  onSelectProperty: (group: PropertyGroup) => void;
}

const DEMO_COORDS: Record<string, [number, number]> = {
  "Grand Horizon Towers":    [34.0522, -118.2437],
  "Sunset Villa":            [34.0983, -118.3267],
  "Downtown Tech Plaza":     [34.0407, -118.2673],
  "Move-Out Sandbox Estates":[34.0689, -118.4452],
  "Seaside Breeze Condos":   [34.0195, -118.4912],
};

export default function ListingsMap({
  groupedProperties,
  hoveredPropertyId,
  onHoverProperty,
  onSelectProperty,
}: ListingsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Initialize Map Instance safely
  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    // Remove existing instance if any
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Wipe any stale _leaflet_id on DOM node
    if ((containerRef.current as any)._leaflet_id) {
      delete (containerRef.current as any)._leaflet_id;
    }

    const defaultCenter: [number, number] = [34.0522, -118.2437];
    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: 12,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = layerGroup;
    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersGroupRef.current = null;
    };
  }, [mounted]);

  // 2. Sync Markers and Fit Bounds when properties or hovered state changes
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;

    const layerGroup = markersGroupRef.current;
    layerGroup.clearLayers();

    const activeCoords: [number, number][] = [];

    groupedProperties.forEach((group, idx) => {
      const name = group.property.name;
      let coords: [number, number];

      if (DEMO_COORDS[name]) {
        coords = DEMO_COORDS[name];
      } else {
        const baseLat = 34.0522;
        const baseLng = -118.2437;
        const latOffset = ((idx % 5) - 2) * 0.035 + idx * 0.008;
        const lngOffset = ((idx % 4) - 1.5) * 0.04 - idx * 0.006;
        coords = [baseLat + latOffset, baseLng + lngOffset];
      }

      activeCoords.push(coords);

      const isHovered = hoveredPropertyId === group.property.id;
      const isMulti = group.units.length > 1;
      const formattedPrice =
        group.minRent >= 1000 ? `$${(group.minRent / 1000).toFixed(1)}k` : `$${group.minRent}`;

      const iconHtml = `
        <div class="relative cursor-pointer transition-all duration-200 ${isHovered ? "z-50" : "z-10"}">
          ${isHovered ? '<div class="absolute -inset-2 bg-slate-900/20 rounded-full animate-ping"></div>' : ""}
          <div style="
            padding: 5px 12px;
            border-radius: 20px;
            font-weight: 800;
            font-size: 11px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.18);
            border: 2px solid white;
            display: flex;
            align-items: center;
            gap: 3px;
            white-space: nowrap;
            background: ${isHovered ? "#0f172a" : "white"};
            color: ${isHovered ? "white" : "#0f172a"};
            transition: all 0.15s;
          ">
            <span>${formattedPrice}</span>
            ${isMulti ? '<span style="font-size:9px;opacity:0.7">+</span>' : ""}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "custom-leaflet-price-pin",
        iconSize: [64, 32],
        iconAnchor: [32, 16],
      });

      const popupHtml = `
        <div style="padding: 4px; max-width: 220px; text-align: left; font-family: sans-serif;">
          ${
            group.property.coverPhoto
              ? `<img src="${group.property.coverPhoto}" alt="${group.property.name}" style="width: 100%; height: 96px; object-fit: cover; border-radius: 12px; margin-bottom: 8px;" />`
              : ""
          }
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
            ${group.property.city || "Property"}
          </div>
          <h4 style="font-weight: 800; font-size: 14px; color: #0f172a; margin: 2px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${group.property.name}
          </h4>
          <p style="font-size: 11px; color: #94a3b8; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${group.property.address}
          </p>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9; display: flex; items-center; justify-content: space-between;">
            <span style="font-weight: 900; font-size: 14px; color: #0f172a;">
              $${group.minRent.toLocaleString()}<span style="font-size: 10px; font-weight: 500; color: #94a3b8;">/mo</span>
            </span>
          </div>
        </div>
      `;

      const marker = L.marker(coords, { icon: customIcon }).addTo(layerGroup);
      marker.bindPopup(popupHtml);

      marker.on("mouseover", () => onHoverProperty(group.property.id));
      marker.on("mouseout", () => onHoverProperty(null));
      marker.on("click", () => onSelectProperty(group));
    });

    if (activeCoords.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(activeCoords);
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [groupedProperties, hoveredPropertyId, onHoverProperty, onSelectProperty]);

  if (!mounted) {
    return (
      <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-semibold animate-pulse border border-slate-200">
        Loading Map...
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      <div ref={containerRef} className="w-full h-full z-10 font-sans" />

      {/* Floating Header Badge */}
      <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 pointer-events-none text-xs font-semibold text-slate-700">
        <Navigation className="h-3.5 w-3.5 text-slate-500" />
        <span>Interactive Map · {groupedProperties.length} Properties</span>
      </div>
    </div>
  );
}
