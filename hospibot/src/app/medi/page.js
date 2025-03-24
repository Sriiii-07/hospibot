"use client";
import React, { useState } from 'react';

const SymptomAnalyzer = () => {
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!symptoms.trim()) {
      setError('Please enter your symptoms');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('symptoms', symptoms);
      
      const result = await fetch('/api/gemini-health', {
        method: 'POST',
        body: formData,
      });
      
      const data = await result.json();
      
      if (!result.ok) {
        throw new Error(data.error || 'Failed to analyze symptoms');
      }
      
      // Set the structured response
      setResponse(data.result);
    } catch (err) {
      setError(err.message || 'An error occurred while analyzing your symptoms');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-center text-teal-400">
          Health Symptom Analyzer
        </h1>
        <p className="text-center text-gray-400 mb-8">
          Enter your symptoms to receive potential diagnoses and treatment suggestions
        </p>
        
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="symptoms" className="block text-sm font-medium text-gray-300 mb-1">
                  Describe your symptoms in detail
                </label>
                <textarea
                  id="symptoms"
                  rows="4"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-white placeholder-gray-400 resize-none"
                  placeholder="For example: Persistent headache for 3 days, slight fever, and fatigue"
                ></textarea>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors disabled:bg-teal-800 disabled:text-gray-300"
              >
                {loading ? 'Analyzing symptoms...' : 'Analyze Symptoms'}
              </button>
            </form>
          </div>
          
          {error && (
            <div className="p-4 bg-red-900 border-t border-red-700 text-red-200">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}
          
          {response && (
            <div className="p-6 bg-gray-800 border-t border-gray-700">
              <h2 className="text-xl font-semibold text-teal-400 mb-4">Analysis Results for {symptoms}</h2>
              
              <div className="bg-gray-750 p-5 rounded-lg border border-gray-600">
                {/* Introduction */}
                <div className="mb-4">
                  <p className="mb-3 text-gray-300">{response.introduction}</p>
                </div>
                
                {/* Potential Diseases */}
                {response.potentialDiseases && response.potentialDiseases.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-teal-500 mb-3">Potential Conditions</h3>
                    <div className="space-y-2">
                      {response.potentialDiseases.map((disease, index) => (
                        <div key={index} className="mb-3 p-3 bg-gray-800 rounded-md border border-gray-700">
                          <h4 className="font-semibold text-teal-400 mb-1">{disease.name}</h4>
                          {disease.description && <p className="text-gray-300">{disease.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Medications */}
                {response.medications && response.medications.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-teal-500 mb-3">Potential Medical Treatments</h3>
                    <div className="space-y-2">
                      {response.medications.map((medication, index) => (
                        <div key={index} className="mb-2">
                          <span className="font-medium text-teal-400">{medication.name}</span>
                          {medication.description && <span className="text-gray-300">: {medication.description}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Natural Remedies */}
                {response.naturalRemedies && response.naturalRemedies.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-teal-500 mb-3">Natural Remedies</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {response.naturalRemedies.map((remedy, index) => (
                        <li key={index} className="mb-2 text-gray-300">{remedy}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Lifestyle Changes */}
                {response.lifestyleChanges && response.lifestyleChanges.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-teal-500 mb-3">Lifestyle Modifications</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {response.lifestyleChanges.map((change, index) => (
                        <li key={index} className="mb-2 text-gray-300">{change}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Disclaimer */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <p className="text-gray-400 text-sm">
                    <span className="text-teal-500 font-semibold">DISCLAIMER:</span> {response.disclaimer}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SymptomAnalyzer;