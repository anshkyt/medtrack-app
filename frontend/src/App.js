import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Medications from './pages/Medications';
import Analytics from './pages/Analytics';
import Navbar from './components/Navbar';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <Router>
      <div className="App">
        {isAuthenticated && <Navbar user={user} onLogout={handleLogout} />}
        
        <Routes>
          <Route 
            path="/login" 
            element={
              !isAuthenticated ? 
                <Login onLogin={handleLogin} /> : 
                <Navigate to="/dashboard" />
            } 
          />
          <Route 
            path="/register" 
            element={
              !isAuthenticated ? 
                <Register onLogin={handleLogin} /> : 
                <Navigate to="/dashboard" />
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? 
                <Dashboard /> : 
                <Navigate to="/login" />
            } 
          />
          <Route 
            path="/medications" 
            element={
              isAuthenticated ? 
                <Medications /> : 
                <Navigate to="/login" />
            } 
          />
          <Route 
            path="/analytics" 
            element={
              isAuthenticated ? 
                <Analytics /> : 
                <Navigate to="/login" />
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
