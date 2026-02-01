import React, { useState, useEffect } from 'react';
import { getAdherenceStats } from '../services/api';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { TrendingUp, Calendar, Target } from 'lucide-react';
import './Analytics.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function Analytics() {
  const [stats, setStats] = useState(null);
  const [timeRange, setTimeRange] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const fetchStats = async () => {
    try {
      const data = await getAdherenceStats(timeRange);
      setStats(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="analytics-container"><div className="loading">Loading analytics...</div></div>;
  }

  if (!stats) {
    return <div className="analytics-container"><div className="error">No data available</div></div>;
  }

  // Prepare data for line chart
  const dailyDates = Object.keys(stats.daily_stats || {}).sort();
  const adherenceRates = dailyDates.map(date => {
    const day = stats.daily_stats[date];
    const total = day.taken + day.missed + day.skipped;
    return total > 0 ? (day.taken / total * 100).toFixed(1) : 0;
  });

  const lineChartData = {
    labels: dailyDates.map(date => {
      const d = new Date(date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }),
    datasets: [
      {
        label: 'Adherence Rate (%)',
        data: adherenceRates,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Daily Adherence Trend',
        font: {
          size: 16,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          },
        },
      },
    },
  };

  // Prepare data for doughnut chart
  const doughnutData = {
    labels: ['Taken', 'Missed', 'Skipped'],
    datasets: [
      {
        data: [stats.taken, stats.missed, stats.skipped],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 206, 86, 0.8)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Overall Distribution',
        font: {
          size: 16,
        },
      },
    },
  };

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>Adherence Analytics</h1>
        <div className="time-range-selector">
          <button
            className={timeRange === 7 ? 'active' : ''}
            onClick={() => setTimeRange(7)}
          >
            7 Days
          </button>
          <button
            className={timeRange === 30 ? 'active' : ''}
            onClick={() => setTimeRange(30)}
          >
            30 Days
          </button>
          <button
            className={timeRange === 90 ? 'active' : ''}
            onClick={() => setTimeRange(90)}
          >
            90 Days
          </button>
        </div>
      </div>

      <div className="stats-overview">
        <div className="stat-card-large">
          <div className="stat-icon-large success">
            <Target size={32} />
          </div>
          <div className="stat-content-large">
            <h2>{stats.adherence_rate}%</h2>
            <p>Overall Adherence Rate</p>
          </div>
        </div>

        <div className="stat-card-large">
          <div className="stat-icon-large info">
            <Calendar size={32} />
          </div>
          <div className="stat-content-large">
            <h2>{stats.total_doses}</h2>
            <p>Total Scheduled Doses</p>
          </div>
        </div>

        <div className="stat-card-large">
          <div className="stat-icon-large warning">
            <TrendingUp size={32} />
          </div>
          <div className="stat-content-large">
            <h2>{stats.taken}</h2>
            <p>Doses Taken</p>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-container">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-container">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
          <div className="chart-stats">
            <div className="stat-row">
              <span className="stat-label">Taken:</span>
              <span className="stat-value taken">{stats.taken}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Missed:</span>
              <span className="stat-value missed">{stats.missed}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Skipped:</span>
              <span className="stat-value skipped">{stats.skipped}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="insights-section">
        <h2>Insights & Recommendations</h2>
        <div className="insights-grid">
          {stats.adherence_rate >= 80 ? (
            <div className="insight-card success">
              <h3>🎉 Great Job!</h3>
              <p>You're maintaining excellent adherence. Keep up the good work!</p>
            </div>
          ) : stats.adherence_rate >= 60 ? (
            <div className="insight-card warning">
              <h3>⚠️ Room for Improvement</h3>
              <p>Try setting more reminders or adjusting medication times to fit your schedule better.</p>
            </div>
          ) : (
            <div className="insight-card error">
              <h3>❗ Action Needed</h3>
              <p>Consider talking to your doctor about barriers to adherence. We're here to help!</p>
            </div>
          )}

          {stats.missed > stats.taken * 0.2 && (
            <div className="insight-card">
              <h3>💡 Tip</h3>
              <p>You're missing doses frequently. Try linking medication times to daily routines like meals.</p>
            </div>
          )}

          <div className="insight-card">
            <h3>📊 Your Progress</h3>
            <p>
              You've taken {stats.taken} out of {stats.total_doses} scheduled doses in the last {timeRange} days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
