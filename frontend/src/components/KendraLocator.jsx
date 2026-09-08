import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getNearbyKendras } from '../api';
import { MapPin, Navigation, Store, Phone } from 'lucide-react';

// Fix for default leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom icon for the user's location
const UserIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `<div style="background-color: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Emerald green marker for Kendras to match the theme
const KendraIcon = L.divIcon({
  className: 'custom-kendra-marker',
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10b981" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.4));">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
      <circle cx="12" cy="10" r="3" fill="white"></circle>
    </svg>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Component to dynamically change map view when user location updates
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

export default function KendraLocator() {
  const [userLoc, setUserLoc] = useState(null);
  const [kendras, setKendras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [radius, setRadius] = useState(5000);

  useEffect(() => {
    locateUser();
  }, []);

  useEffect(() => {
    if (userLoc) {
      fetchKendras(userLoc.lat, userLoc.lng, radius);
    }
  }, [userLoc, radius]);

  const locateUser = () => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLoc({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (err) => {
        setError('Unable to retrieve your location. Please allow location access.');
        setLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const fetchKendras = async (lat, lng, radiusVal) => {
    try {
      setLoading(true);
      const data = await getNearbyKendras(lat, lng, radiusVal);
      if (data && data.results) {
        setKendras(data.results);
        if (data.fallback_used) {
          console.warn("Overpass API unavailable. Using fallback location data.");
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch nearby Kendras.');
    } finally {
      setLoading(false);
    }
  };

  const handleRadiusChange = (e) => {
    setRadius(Number(e.target.value));
  };

  const center = userLoc ? [userLoc.lat, userLoc.lng] : [28.6139, 77.2090]; // Default to Delhi if no user loc

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Find your nearest <span className="gradient-text">Janaushadhi Kendra</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Locate PMBJP stores nearby to purchase affordable generic medicines.
        </p>
      </div>

      <div className="glass-card p-4 rounded-xl border border-border shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <label className="text-sm font-medium whitespace-nowrap">Search Radius:</label>
          <select 
            value={radius} 
            onChange={handleRadiusChange}
            className="bg-background border border-border text-foreground rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none flex-1 md:flex-none"
          >
            <option value={2000}>2 km</option>
            <option value={5000}>5 km</option>
            <option value={10000}>10 km</option>
            <option value={20000}>20 km</option>
          </select>
        </div>
        
        <button 
          onClick={locateUser}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-md active:scale-95"
        >
          <Navigation className="w-4 h-4" />
          Update Location
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-xl text-center">
          {error}
        </div>
      )}

      <div className="w-full h-[600px] rounded-2xl overflow-hidden shadow-xl border border-border relative z-0">
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-[1000] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-primary/40 border-t-primary animate-spin" />
              <span className="text-sm font-medium">Fetching locations...</span>
            </div>
          </div>
        )}
        <MapContainer 
          center={center} 
          zoom={13} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%', zIndex: 1 }}
        >
          <ChangeView center={center} zoom={13} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles"
          />
          
          {userLoc && (
            <Marker position={[userLoc.lat, userLoc.lng]} icon={UserIcon}>
              <Popup>
                <div className="font-semibold text-center">Your Location</div>
              </Popup>
            </Marker>
          )}

          {kendras.map((kendra, idx) => {
            const pos = [kendra.lat, kendra.lon];
            return (
              <Marker key={idx} position={pos} icon={KendraIcon}>
                <Popup className="kendra-popup">
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <h3 className="font-bold text-base text-primary flex items-start gap-1">
                      <Store className="w-4 h-4 mt-1 flex-shrink-0" />
                      {kendra.name}
                    </h3>
                    {kendra.address && (
                      <div className="text-sm text-foreground/80 flex items-start gap-1 border-t border-border/50 pt-2">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <span>{kendra.address}</span>
                      </div>
                    )}
                    {kendra.contact_number && (
                      <div className="text-sm font-medium flex items-center gap-1">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {kendra.contact_number}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
