import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function IPMap({ ipInfo }) {
  const [position, setPosition] = React.useState([0, 0]);

  useEffect(() => {
    if (ipInfo && ipInfo.loc) {
      const [lat, lng] = ipInfo.loc.split(',').map(coord => parseFloat(coord.trim()));
      if (!isNaN(lat) && !isNaN(lng)) {
        setPosition([lat, lng]);
      }
    }
  }, [ipInfo]);

  if (!ipInfo || !ipInfo.loc) {
    return (
      <div className="map-placeholder">
        <p>Location data not available for this IP address</p>
      </div>
    );
  }

  const [lat, lng] = ipInfo.loc.split(',').map(coord => parseFloat(coord.trim()));

  if (isNaN(lat) || isNaN(lng)) {
    return (
      <div className="map-placeholder">
        <p>Invalid location coordinates</p>
      </div>
    );
  }

  return (
    <div className="map-container">
      <MapContainer
        center={[lat, lng]}
        zoom={10}
        style={{ height: '100%', minHeight: '400px', width: '100%', borderRadius: '4px' }}
        key={`${lat}-${lng}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]}>
          <Popup>
            <div>
              <strong>IP: {ipInfo.ip}</strong><br />
              {ipInfo.city && <span>{ipInfo.city}, </span>}
              {ipInfo.region && <span>{ipInfo.region}, </span>}
              {ipInfo.country && <span>{ipInfo.country}</span>}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default IPMap;

