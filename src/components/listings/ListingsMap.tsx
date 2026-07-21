"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, ExternalLink } from "lucide-react";

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

// Coordinate mapping cache / fallback locations for preset demo properties + geocoded entries
const DEMO_COORDS: Record<string, [number, number]> = {
  "Grand Horizon Towers": [34.0522, -118.2437], // Los Angeles Downtown
  "Sunset Villa": [34.0983, -118.3267], // Hollywood Sunset
  "Downtown Tech Plaza": [34.0407, -118.2673], // LA Live area
  "Move-Out Sandbox Estates": [34.0689, -118.4452], // Westwood / UCLA area
  "Seaside Breeze Condos": [34.0195, -118.4912], // Santa Monica
};

// Component to dynamically fit map bounds to active markers
function MapBoundsController({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [coordinates, map]);

  return null;
}

export default function ListingsMap({
  groupedProperties,
  hoveredPropertyId,
  onHoverProperty,
  onSelectProperty,
}: ListingsMapProps) {
  const [propertyCoords, setPropertyCoords] = useState<Record<string, [number, number]>>({});

  useEffect(() => {
    // Determine coordinates for each property
    const newCoords: Record<string, [number, number]> = {};
    groupedProperties.forEach((group, idx) => {
      const name = group.property.name;
      if (DEMO_COORDS[name]) {
        newCoords[group.property.id] = DEMO_COORDS[name];
      } else {
        // Generate a plausible spread coordinate around central LA if not preset
        const baseLat = 34.0522;
        const baseLng = -118.2437;
        const latOffset = (idx % 5 - 2) * 0.035 + (idx * 0.008);
        const lngOffset = (idx % 4 - 1.5) * 0.04 - (idx * 0.006);
        newCoords[group.property.id] = [baseLat + latOffset, baseLng + lngOffset];
      }
    });
    setPropertyCoords(newCoords);
  }, [groupedProperties]);

  const activeCoordinates = Object.values(propertyCoords);
  const defaultCenter: [number, number] = activeCoordinates.length > 0 ? activeCoordinates[0] : [34.0522, -118.2437];

  // Helper to construct custom HTML markers (Apple Maps style price bubbles)
  const createPriceMarkerIcon = (price: number, isHovered: boolean, isMulti: boolean) => {
    const formattedPrice = price >= 1000 ? `$${(price / 1000).toFixed(1)}k` : `$${price}`;
    
    const html = `
      <div class="relative group cursor-pointer transition-all duration-200 ${isHovered ? "z-50 scale-110" : "z-10"}">
        ${isHovered ? '<div class="absolute -inset-2 bg-blue-500/30 rounded-full animate-ping"></div>' : ''}
        <div class="px-3 py-1.5 rounded-full font-bold text-xs shadow-md flex items-center justify-center gap-1 border border-white/60 transition-all ${
          isHovered
            ? "bg-[#007AFF] text-white shadow-lg shadow-blue-500/40 ring-4 ring-blue-500/20"
            : "bg-white/95 text-[#1D1D1F] hover:bg-white hover:shadow-lg backdrop-blur-md"
        }">
          <span>${formattedPrice}</span>
          ${isMulti ? '<span class="text-[9px] opacity-75 font-normal">+</span>' : ''}
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: "custom-leaflet-price-pin",
      iconSize: [60, 32],
      iconAnchor: [30, 16],
    });
  };

  return (
    <div className="relative w-full h-full rounded-[22px] overflow-hidden border border-black/5 shadow-inner">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%" }}
        className="z-10 font-sans"
      >
        {/* CartoDB Light Tile Layer - Clean, minimal Apple Maps feel */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {activeCoordinates.length > 0 && <MapBoundsController coordinates={activeCoordinates} />}

        {groupedProperties.map((group) => {
          const coords = propertyCoords[group.property.id];
          if (!coords) return null;

          const isHovered = hoveredPropertyId === group.property.id;
          const isMulti = group.units.length > 1;

          return (
            <Marker
              key={group.property.id}
              position={coords}
              icon={createPriceMarkerIcon(group.minRent, isHovered, isMulti)}
              eventHandlers={{
                mouseover: () => onHoverProperty(group.property.id),
                mouseout: () => onHoverProperty(null),
                click: () => onSelectProperty(group),
              }}
            >
              <Popup className="ios-leaflet-popup">
                <div className="p-1 max-w-[220px] text-left">
                  {group.property.coverPhoto && (
                    <img
                      src={group.property.coverPhoto}
                      alt={group.property.name}
                      className="w-full h-24 object-cover rounded-xl mb-2"
                    />
                  )}
                  <div className="text-[10px] font-bold text-[#007AFF] uppercase tracking-wide">
                    {group.property.city}
                  </div>
                  <h4 className="font-bold text-sm text-[#1D1D1F] line-clamp-1 leading-snug">
                    {group.property.name}
                  </h4>
                  <p className="text-xs text-[#8E8E93] truncate">{group.property.address}</p>
                  
                  <div className="mt-2 pt-2 border-t border-black/5 flex items-center justify-between">
                    <span className="font-black text-sm text-[#1D1D1F]">
                      ${group.minRent.toLocaleString()}
                      <span className="text-[10px] font-normal text-[#8E8E93]">/mo</span>
                    </span>
                    <button
                      onClick={() => onSelectProperty(group)}
                      className="bg-[#007AFF] hover:bg-[#0066CC] text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm transition-colors"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Apple-style Map Controls Overlay */}
      <div className="absolute top-4 left-4 z-20 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/60 shadow-sm flex items-center gap-2 pointer-events-none text-xs font-semibold text-[#1D1D1F]">
        <Navigation className="h-3.5 w-3.5 text-[#007AFF] animate-pulse" />
        <span>Interactive Map &bull; {groupedProperties.length} Properties</span>
      </div>
    </div>
  );
}
