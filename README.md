# React Frontend - IP Geolocation App

A React application for IP geolocation lookup with authentication, search history, and interactive maps.

## Features

### ✅ Core Features

1. **Authentication System**
   - Login page with email and password validation
   - Automatic redirect based on login status
   - Session persistence using Sanctum tokens
   - Logout functionality

2. **IP Geolocation Lookup**
   - Display current user's IP and geolocation information on app load
   - Search for any IP address and view its geolocation data
   - IP address validation (IPv4 and IPv6)
   - Error handling for invalid IP addresses
   - Clear button to reset to user's own IP

3. **Search History**
   - Automatically saves search history to database via API
   - Displays list of previous searches with IP, location, and timestamp
   - Click on history items to reload geo information instantly
   - Checkboxes to select multiple history entries
   - Delete selected history entries with confirmation
   - Select All functionality

4. **Interactive Map** 🗺️ (Big Plus Feature)
   - Displays map with exact location pin for the IP address
   - Uses Leaflet with OpenStreetMap
   - Shows popup with IP and location details when clicking marker
   - Updates automatically when searching new IPs or clicking history items
   - Instant map updates when clicking history items

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Backend API running on `http://localhost:8000` (see backend repository)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/wchesedh/react-frontend.git
cd react-frontend
```

2. Install dependencies:
```bash
npm install
```

### External Libraries Used

All dependencies are listed in `package.json`. Key libraries:

- **axios** (^1.13.2) - For HTTP requests
- **react-router-dom** (^7.9.6) - For routing
- **leaflet** (^1.9.4) - For map functionality
- **react-leaflet** (^5.0.0) - React wrapper for Leaflet

Installation command:
```bash
npm install axios react-router-dom leaflet react-leaflet
```

## Running the Application

```bash
npm start
```

The app will start on `http://localhost:3000` (or next available port).

**Important**: Make sure the Laravel API backend is running on `http://localhost:8000` before starting the frontend.

## API Endpoints

The frontend connects to the Laravel API backend. See the backend repository for API documentation.

### Backend Repository

**API Backend**: The Laravel backend is in a separate repository. Make sure to:
1. Clone and set up the backend repository
2. Run migrations and seeders
3. Start the backend server on `http://localhost:8000`
4. Then start this React frontend

## Project Structure

```
src/
├── components/
│   ├── Login.js          # Login page component
│   ├── Login.css         # Login styles
│   ├── Home.js           # Home page with IP lookup
│   ├── Home.css          # Home styles
│   └── IPMap.js          # Map component (Leaflet)
├── context/
│   └── AuthContext.js    # Authentication context
├── App.js                # Main app with routing
├── App.css               # Global styles
└── index.js              # Entry point
```

## Features Checklist

- ✅ Login form with email and password
- ✅ API integration with backend login endpoint
- ✅ Automatic redirect on app load based on auth status
- ✅ Display current user IP and geolocation on home screen
- ✅ IP address input with validation
- ✅ Error messages for invalid IPs
- ✅ Clear button to reset to user IP
- ✅ Search history stored in database via API
- ✅ History list display
- ✅ Click history items to reload geo info (instant)
- ✅ Checkboxes for multiple selection
- ✅ Select All functionality
- ✅ Delete selected history entries with confirmation
- ✅ Interactive map with location pinning (Big Plus)
- ✅ Instant map updates
- ✅ Active item highlighting

## Layout

- **Top**: IP Information card (full width)
- **Below**: Search form (full width)
- **Bottom Row**: 
  - Left (1/3): Search History
  - Right (2/3): Location Map

## Notes

- Make sure the backend API is running on `http://localhost:8000` for login to work
- The map uses OpenStreetMap tiles (free, no API key required)
- Search history is limited to 50 most recent entries
- Authentication uses Laravel Sanctum tokens stored in localStorage
- All API calls include authentication token in headers

## License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
