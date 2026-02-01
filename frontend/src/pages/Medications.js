import React, { useState, useEffect } from 'react';
import { getMedications, addMedication, updateMedication, deleteMedication, checkInteractions } from '../services/api';
import { Plus, Edit2, Trash2, AlertTriangle, Pill } from 'lucide-react';
import './Medications.css';

function Medications() {
  const [medications, setMedications] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
    time_of_day: ['08:00'],
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchMedications();
  }, []);

  useEffect(() => {
    if (medications.length >= 2) {
      checkDrugInteractions();
    }
  }, [medications]);

  const fetchMedications = async () => {
    try {
      const data = await getMedications();
      setMedications(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch medications:', err);
      setLoading(false);
    }
  };

  const checkDrugInteractions = async () => {
    try {
      const medNames = medications.map(med => med.name);
      const data = await checkInteractions(medNames);
      setInteractions(data.interactions);
    } catch (err) {
      console.error('Failed to check interactions:', err);
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    // Clean up formData - remove empty end_date
    const cleanData = {
      ...formData,
      end_date: formData.end_date || undefined  // Don't send empty string
    };
    
    if (editingMed) {
      await updateMedication(editingMed.id, cleanData);
    } else {
      await addMedication(cleanData);
    }
    
    fetchMedications();
    resetForm();
  } catch (err) {
    console.error('Failed to save medication:', err);
  }
};

  const handleEdit = (medication) => {
    setEditingMed(medication);
    setFormData({
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      time_of_day: medication.time_of_day,
      start_date: medication.start_date.split('T')[0],
      end_date: medication.end_date ? medication.end_date.split('T')[0] : '',
      notes: medication.notes || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this medication?')) {
      try {
        await deleteMedication(id);
        fetchMedications();
      } catch (err) {
        console.error('Failed to delete medication:', err);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      dosage: '',
      frequency: 'daily',
      time_of_day: ['08:00'],
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      notes: ''
    });
    setShowAddForm(false);
    setEditingMed(null);
  };

  const addTimeSlot = () => {
    setFormData({
      ...formData,
      time_of_day: [...formData.time_of_day, '12:00']
    });
  };

  const updateTimeSlot = (index, value) => {
    const newTimes = [...formData.time_of_day];
    newTimes[index] = value;
    setFormData({ ...formData, time_of_day: newTimes });
  };

  const removeTimeSlot = (index) => {
    if (formData.time_of_day.length > 1) {
      const newTimes = formData.time_of_day.filter((_, i) => i !== index);
      setFormData({ ...formData, time_of_day: newTimes });
    }
  };

  if (loading) {
    return <div className="medications-container"><div className="loading">Loading medications...</div></div>;
  }

  return (
    <div className="medications-container">
      <div className="medications-header">
        <h1>My Medications</h1>
        <button className="btn-add" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={20} /> Add Medication
        </button>
      </div>

      {interactions.length > 0 && (
        <div className="interactions-warning">
          <AlertTriangle size={24} />
          <div>
            <h3>Drug Interactions Detected</h3>
            {interactions.map((interaction, index) => (
              <div key={index} className={`interaction ${interaction.severity}`}>
                <strong>{interaction.drug1} ⚠ {interaction.drug2}</strong>
                <span className="severity-badge">{interaction.severity}</span>
                <p>{interaction.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="medication-form-card">
          <h2>{editingMed ? 'Edit Medication' : 'Add New Medication'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Medication Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Lisinopril"
                  required
                />
              </div>
              <div className="form-group">
                <label>Dosage *</label>
                <input
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  placeholder="e.g., 10mg"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Frequency *</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                >
                  <option value="daily">Once Daily</option>
                  <option value="twice_daily">Twice Daily</option>
                  <option value="three_times">Three Times Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="as_needed">As Needed</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Time(s) of Day</label>
              {formData.time_of_day.map((time, index) => (
                <div key={index} className="time-slot">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => updateTimeSlot(index, e.target.value)}
                  />
                  {formData.time_of_day.length > 1 && (
                    <button type="button" onClick={() => removeTimeSlot(index)} className="btn-remove-time">
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addTimeSlot} className="btn-add-time">
                + Add Time Slot
              </button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Date (Optional)</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Special instructions, side effects to watch for, etc."
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-save">
                {editingMed ? 'Update' : 'Add'} Medication
              </button>
              <button type="button" onClick={resetForm} className="btn-cancel">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="medications-list">
        {medications.length > 0 ? (
          medications.map((med) => (
            <div key={med.id} className="medication-card">
              <div className="med-header">
                <div className="med-icon">
                  <Pill size={24} />
                </div>
                <div className="med-info">
                  <h3>{med.name}</h3>
                  <p className="dosage">{med.dosage}</p>
                </div>
                <div className="med-actions">
                  <button onClick={() => handleEdit(med)} className="btn-edit">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(med.id)} className="btn-delete">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="med-details">
                <div className="detail-item">
                  <strong>Frequency:</strong> {med.frequency.replace('_', ' ')}
                </div>
                <div className="detail-item">
                  <strong>Times:</strong> {med.time_of_day.join(', ')}
                </div>
                {med.notes && (
                  <div className="detail-item">
                    <strong>Notes:</strong> {med.notes}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Pill size={64} />
            <h3>No Medications Added</h3>
            <p>Click "Add Medication" to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Medications;
