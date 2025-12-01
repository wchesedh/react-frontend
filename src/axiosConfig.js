import axios from 'axios';

// Base URL for API requests
const baseURL = process.env.NODE_ENV === 'production'
  ? 'https://your-production-api-url.com'  // Replace with your actual production API URL
  : 'http://localhost:8000';

const instance = axios.create({
  baseURL,
  withCredentials: true,  // Important for CORS with credentials
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Add auth token to requests if it exists
const token = localStorage.getItem('auth_token');
if (token) {
  instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export default instance;