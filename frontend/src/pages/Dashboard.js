import React, { useState, useEffect } from 'react';
import { getDashboard, logAdherence } from '../services/api';
import { Pill, Calendar, TrendingUp, Clock, Check, X } from 'lucide-react';
import './Dashboard.css';

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const data = await getDashboard();
      setDashboardData(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load dashboard');
      setLoading(false);
    }
  };

  const handleTakeMedication = async (medicationName, scheduledTime) => {
    try {
      await logAdherence({
        medication_id: 1, // You'd need to track this properly
        scheduled_time: scheduledTime,
        status: 'taken'
      });
      fetchDashboard(); // Refresh dashboard
    } catch (err) {
      console.error('Failed to log adherence:', err);
    }
  };

  const handleSkipMedication = async (medicationName, scheduledTime) => {
    try {
      await logAdherence({
        medication_id: 1,
        scheduled_time: scheduledTime,
        status: 'skipped'
      });
      fetchDashboard();
    } catch (err) {
      console.error('Failed to log adherence:', err);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading your dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome Back!</h1>
        <p>Here's your medication overview for today</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">
            <Pill size={24} />
          </div>
          <div className="stat-content">
            <h3>{dashboardData?.active_medications || 0}</h3>
            <p>Active Medications</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <h3>
              {dashboardData?.today_adherence?.taken || 0} / {dashboardData?.today_adherence?.total || 0}
            </h3>
            <p>Taken Today</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>{dashboardData?.today_adherence?.rate || 0}%</h3>
            <p>Today's Adherence</p>
          </div>
        </div>
      </div>

      <div className="upcoming-section">
        <h2>
          <Clock size={24} />
          Upcoming Doses
        </h2>
        
        {dashboardData?.upcoming_doses?.length > 0 ? (
          <div className="upcoming-list">
            {dashboardData.upcoming_doses.map((dose, index) => (
              <div key={index} className="dose-card">
                <div className="dose-info">
                  <h3>{dose.medication}</h3>
                  <p>{dose.dosage}</p>
                  <span className="dose-time">
                    {new Date(dose.time).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <div className="dose-actions">
                  <button 
                    className="btn-take"
                    onClick={() => handleTakeMedication(dose.medication, dose.time)}
                  >
                    <Check size={18} /> Take
                  </button>
                  <button 
                    className="btn-skip"
                    onClick={() => handleSkipMedication(dose.medication, dose.time)}
                  >
                    <X size={18} /> Skip
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Pill size={48} />
            <p>No upcoming doses in the next 24 hours</p>
          </div>
        )}
      </div>

      <div className="quick-tips">
        <h3>💡 Quick Tips</h3>
        <ul>
          <li>Set up your medications in the Medications tab</li>
          <li>Enable browser notifications for reminders</li>
          <li>Check Analytics to track your adherence trends</li>
          <li>Review drug interactions regularly</li>
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;
