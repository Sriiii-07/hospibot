"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MedicalAppointmentSystem = () => {
  // States for appointment scheduling
  const [disease, setDisease] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  
  // States for doctors list
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState(null);
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' or 'doctors'

  // Fetch doctors on component mount
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await axios.get('/api/doctors');
        setDoctors(response.data.doctors);
      } catch (err) {
        setDoctorsError('Failed to load doctors. Please try again later.');
        console.error(err);
      } finally {
        setDoctorsLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  // Handle appointment scheduling
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!disease.trim()) {
      setError('Please enter a disease or symptom');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      const result = await axios.post('/api/schedule-appointment', { disease });
      setResponse(result.data);
      
      // Refresh doctors list after scheduling
      try {
        const doctorsResponse = await axios.get('/api/doctors');
        setDoctors(doctorsResponse.data.doctors);
      } catch (err) {
        console.error("Failed to refresh doctors list:", err);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while scheduling the appointment');
    } finally {
      setLoading(false);
    }
  };

  const getSpecialistDescription = (specialization) => {
    // Remove any numbers from the specialization
    const cleanedSpec = specialization.replace(/\d+/g, '').trim();
    
    // Check if it ends with "ist" (e.g., "Oncologist")
    if (cleanedSpec.toLowerCase().endsWith('ist')) {
      return cleanedSpec;
    }
    
    // Add "specialist" to specializations that don't end with "ist"
    if (cleanedSpec.toLowerCase() === 'general') {
      return 'General Physician';
    } else if (cleanedSpec.toLowerCase() === 'ent') {
      return 'ENT Specialist';
    } else {
      return `${cleanedSpec} Specialist`;
    }
  };

  // Floating button handler using direct window.location
  const handleFloatingButtonClick = () => {
    window.location.href = '/medi';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center text-teal-400">
          Medical Appointment System
        </h1>
        
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800 rounded-lg p-1 inline-flex">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 cursor-pointer py-2 rounded-md transition-colors ${
                activeTab === 'schedule' 
                  ? 'bg-teal-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Schedule Appointment
            </button>
            <button
              onClick={() => setActiveTab('doctors')}
              className={`px-4 cursor-pointer py-2 rounded-md transition-colors ${
                activeTab === 'doctors' 
                  ? 'bg-teal-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              View Doctors
            </button>
          </div>
        </div>
        
        {/* Schedule Appointment Section */}
        {activeTab === 'schedule' && (
          <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-center text-teal-400">
              Schedule a Doctor Appointment
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="disease" className="block text-sm font-medium text-gray-300 mb-1">
                  What symptoms or condition are you experiencing?
                </label>
                <input
                  type="text"
                  id="disease"
                  value={disease}
                  onChange={(e) => setDisease(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-white placeholder-gray-400"
                  placeholder="Enter your condition (e.g., fever, back pain)"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 text-white cursor-pointer py-2 px-4 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors disabled:bg-teal-800 disabled:text-gray-300"
              >
                {loading ? 'Finding the right doctor...' : 'Schedule Appointment'}
              </button>
            </form>
            
            {error && (
              <div className="mt-4 p-3 bg-red-900 border border-red-700 text-red-200 rounded">
                {error}
              </div>
            )}
            
            {response && (
              <div className="mt-4 p-4 bg-green-900 border border-green-700 text-green-200 rounded">
                <h3 className="font-semibold text-lg mb-2">Appointment Scheduled!</h3>
                <p><span className="font-medium">Doctor:</span> {response.doctor.name}</p>
                <p>
                  <span className="font-medium">Specialist Type:</span> {getSpecialistDescription(response.doctor.specialization)}
                </p>
                
                {response.originalRecommendation && 
                 response.originalRecommendation.toLowerCase() !== response.matchedSpecialization.toLowerCase() && 
                 response.originalRecommendation.toLowerCase() !== 'general' && (
                  <div className="mt-2 text-sm text-gray-400">
                    <p>We have matched your condition with the most relevant specialist available in our system.</p>
                    <p className="italic">
                      Based on your symptoms, you should see a{' '}
                      {/^[aeiou]/i.test(getSpecialistDescription(response.originalRecommendation)) ? 'n ' : ' '}
                      {getSpecialistDescription(response.originalRecommendation)}.
                    </p>
                  </div>
                )}
                
                <div className="mt-3 bg-gray-800 p-3 rounded border border-green-800">
                  <p className="text-sm">
                    <span className="font-semibold">Your condition:</span> {disease}
                  </p>
                  <p className="text-sm mt-1">
                    <span className="font-semibold">Appointment status:</span> Scheduled successfully
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Doctors List Section */}
        {activeTab === 'doctors' && (
          <div className="container mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center text-teal-400">Available Doctors</h2>
            
            {doctorsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
              </div>
            ) : doctorsError ? (
              <div className="p-4 bg-red-900 border border-red-700 text-red-200 rounded max-w-md mx-auto">
                {doctorsError}
              </div>
            ) : doctors.length === 0 ? (
              <div className="text-center text-gray-400">No doctors found in the system.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 hover:border-teal-600 transition-colors">
                    <h3 className="text-xl font-semibold text-teal-400">{doctor.name}</h3>
                    <p className="text-gray-400 mb-4">Specialization: {getSpecialistDescription(doctor.specialization)}</p>
                    
                    <h4 className="font-medium text-gray-300 mb-2">Appointments:</h4>
                    {doctor.appointments.length === 0 ? (
                      <p className="text-gray-500 italic">No appointments scheduled</p>
                    ) : (
                      <ul className="space-y-1">
                        {doctor.appointments.map((appointment, index) => (
                          <li key={index} className="text-gray-400 flex items-start">
                            <span className="inline-block w-3 h-3 rounded-full bg-teal-500 mt-1.5 mr-2"></span>
                            {appointment}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Floating Button */}
      <div 
        className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center shadow-lg cursor-pointer hover:bg-teal-700 transition-colors duration-300"
        onClick={handleFloatingButtonClick}
      >
        <span className="text-white font-bold text-lg">H</span>
      </div>
    </div>
  );
};

export default MedicalAppointmentSystem;