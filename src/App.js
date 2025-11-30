import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Home from './components/Home';
import './App.css';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/home" replace /> : <Login />
        } 
      />
      <Route 
        path="/home" 
        element={
          isAuthenticated ? <Home /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/" 
        element={
          <Navigate to={isAuthenticated ? "/home" : "/login"} replace />
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
