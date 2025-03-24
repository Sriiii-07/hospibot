import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const SPECIALIZATION_MAP = {
  'Cardiology': ['heart', 'cardiac', 'cardiovascular', 'chest pain', 'hypertension', 'cardiologist'],
  'Dermatology': ['skin', 'rash', 'acne', 'dermal', 'eczema', 'psoriasis', 'dermatologist'],
  'Neurology': ['brain', 'nerve', 'neurological', 'headache', 'migraine', 'seizure', 'neurologist'],
  'Orthopedics': ['bone', 'joint', 'muscle', 'orthopedic', 'fracture', 'sprain', 'orthopedist'],
  'Gastroenterology': ['stomach', 'intestine', 'digestive', 'gastro', 'abdomen', 'liver', 'gastroenterologist'],
  'ENT': ['ear', 'nose', 'throat', 'otolaryngology', 'sinus', 'hearing', 'otolaryngologist'],
  'Ophthalmology': ['eye', 'vision', 'optical', 'ophthalmologic', 'retina', 'ophthalmologist'],
  'Urology': ['kidney', 'bladder', 'urinary', 'prostate', 'urologic', 'urologist'],
  'Gynecology': ['female', 'reproductive', 'gynecologic', 'uterus', 'ovarian', 'gynecologist'],
  'Pulmonology': ['lung', 'respiratory', 'pulmonary', 'breathing', 'asthma', 'pulmonologist'],
  'Endocrinology': ['hormone', 'thyroid', 'diabetes', 'endocrine', 'endocrinologist'],
  'Psychiatry': ['mental', 'psychiatric', 'depression', 'anxiety', 'behavioral', 'psychiatrist'],
  'Oncology': ['cancer', 'tumor', 'oncologic', 'malignant', 'oncologist'],
  'Rheumatology': ['arthritis', 'rheumatic', 'autoimmune', 'joint pain', 'rheumatologist'],
  'General': ['general', 'primary care', 'family medicine', 'common cold', 'flu', 'general physician']
};
const PRACTITIONER_TO_FIELD = {
  'cardiologist': 'Cardiology',
  'dermatologist': 'Dermatology',
  'neurologist': 'Neurology',
  'orthopedist': 'Orthopedics',
  'gastroenterologist': 'Gastroenterology',
  'otolaryngologist': 'ENT',
  'ophthalmologist': 'Ophthalmology',
  'urologist': 'Urology',
  'gynecologist': 'Gynecology',
  'pulmonologist': 'Pulmonology',
  'endocrinologist': 'Endocrinology',
  'psychiatrist': 'Psychiatry',
  'oncologist': 'Oncology',
  'rheumatologist': 'Rheumatology',
  'general physician': 'General'
};

const FIELD_TO_PRACTITIONER = {
  'cardiology': 'Cardiologist',
  'dermatology': 'Dermatologist',
  'neurology': 'Neurologist',
  'orthopedics': 'Orthopedist',
  'gastroenterology': 'Gastroenterologist',
  'ent': 'ENT Specialist',
  'ophthalmology': 'Ophthalmologist',
  'urology': 'Urologist',
  'gynecology': 'Gynecologist',
  'pulmonology': 'Pulmonologist',
  'endocrinology': 'Endocrinologist',
  'psychiatry': 'Psychiatrist',
  'oncology': 'Oncologist',
  'rheumatology': 'Rheumatologist',
  'general': 'General Physician'
};

export async function POST(req) {
  try {
    const body = await req.json();
    const { disease } = body;

    if (!disease) {
      return NextResponse.json({ error: 'Disease information is required' }, { status: 400 });
    }

    const availableSpecializations = await getAvailableSpecializations();
    
    const aiRecommendedSpecialization = await getSpecializationForDisease(disease);
    
    const bestSpecialization = findBestMatchingSpecialization(
      aiRecommendedSpecialization, 
      availableSpecializations
    );
    
    let doctor = await findDoctorBySpecialization(bestSpecialization);
    
    if (!doctor) {
      doctor = await findDoctorBySpecialization('General');
      
      if (!doctor) {
        for (const [field, practitioner] of Object.entries(FIELD_TO_PRACTITIONER)) {
          doctor = await findDoctorBySpecialization(practitioner);
          if (doctor) break;
        }
      }
    }
    
    if (!doctor) {
      doctor = await prisma.doctors.create({
        data: {
          name: 'General Physician',
          specialization: 'General',
          appointments: [disease]
        }
      });
    } else {
      const updatedAppointments = [...doctor.appointments, disease];
      doctor = await prisma.doctors.update({
        where: { id: doctor.id },
        data: { appointments: updatedAppointments }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment scheduled successfully',
      doctor: {
        name: doctor.name,
        specialization: doctor.specialization
      },
      originalRecommendation: aiRecommendedSpecialization,
      matchedSpecialization: bestSpecialization
    });
  } catch (error) {
    console.error('Error scheduling appointment:', error);
    return NextResponse.json({ error: 'Failed to schedule appointment' }, { status: 500 });
  }
}

async function getAvailableSpecializations() {
  try {
    const distinctSpecializations = await prisma.doctors.findMany({
      select: {
        specialization: true
      },
      distinct: ['specialization']
    });
    
    return distinctSpecializations.map(item => item.specialization);
  } catch (error) {
    console.error('Error fetching available specializations:', error);
    return ['General'];
  }
}

async function getSpecializationForDisease(disease) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

    const prompt = `
      As a medical expert, determine the most appropriate medical specialization for treating a patient with the following condition or symptom: "${disease}".
      
      Reply ONLY with the name of the medical specialization (e.g., "Cardiology", "Dermatology", "Neurology", "Orthopedics", etc.).
      If you're uncertain or if the condition is general in nature, reply with "General".
      
      Provide only the specialization name, nothing else.
    `;

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 256,
      }
    };

    const response = await axios.post(`${url}?key=${apiKey}`, requestBody, {
      headers: { 'Content-Type': 'application/json' },
    });

    let specialization = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    specialization = specialization.trim();
    
    specialization = specialization.replace(/[^a-zA-Z ]/g, '').trim();
    
    if (!specialization) {
      return 'General';
    }
    
    return specialization;
  } catch (error) {
    console.error('Error getting specialization from AI:', error);
    return 'General';
  }
}

function normalizeSpecialization(specialization) {
  const lowerCaseSpec = specialization.toLowerCase();
  for (const [practitioner, field] of Object.entries(PRACTITIONER_TO_FIELD)) {
    if (lowerCaseSpec.includes(practitioner.toLowerCase())) {
      return field;
    }
  }
  
  for (const [field, practitioner] of Object.entries(FIELD_TO_PRACTITIONER)) {
    if (lowerCaseSpec.includes(field.toLowerCase())) {
      return field.charAt(0).toUpperCase() + field.slice(1);
    }
  }
  
  return specialization;
}

function findBestMatchingSpecialization(aiRecommendation, availableSpecializations) {
  const normalizedAiRecommendation = normalizeSpecialization(aiRecommendation);
  
  for (const availableSpec of availableSpecializations) {
    if (availableSpec.toLowerCase() === aiRecommendation.toLowerCase() ||
        availableSpec.toLowerCase() === normalizedAiRecommendation.toLowerCase()) {
      return availableSpec;
    }
  }
  
  for (const [practitioner, field] of Object.entries(PRACTITIONER_TO_FIELD)) {
    if (aiRecommendation.toLowerCase().includes(practitioner.toLowerCase())) {
      const matchingPractitioner = availableSpecializations.find(
        spec => spec.toLowerCase().includes(practitioner.toLowerCase())
      );
      
      if (matchingPractitioner) {
        return matchingPractitioner;
      }
      
      
      const matchingField = availableSpecializations.find(
        spec => spec.toLowerCase().includes(field.toLowerCase())
      );
      
      if (matchingField) {
        return matchingField;
      }
    }
  }
  
  for (const [field, practitioner] of Object.entries(FIELD_TO_PRACTITIONER)) {
    if (aiRecommendation.toLowerCase().includes(field.toLowerCase())) {
      const matchingField = availableSpecializations.find(
        spec => spec.toLowerCase().includes(field.toLowerCase())
      );
      
      if (matchingField) {
        return matchingField;
      }
    
      const matchingPractitioner = availableSpecializations.find(
        spec => spec.toLowerCase().includes(practitioner.toLowerCase())
      );
      
      if (matchingPractitioner) {
        return matchingPractitioner;
      }
    }
  }
  
  
  for (const availableSpec of availableSpecializations) {
    if (
      availableSpec.toLowerCase().includes(aiRecommendation.toLowerCase()) ||
      aiRecommendation.toLowerCase().includes(availableSpec.toLowerCase()) ||
      availableSpec.toLowerCase().includes(normalizedAiRecommendation.toLowerCase()) ||
      normalizedAiRecommendation.toLowerCase().includes(availableSpec.toLowerCase())
    ) {
      return availableSpec;
    }
  }

  let bestMatch = null;
  let highestSimilarity = 0;
  
  for (const [specialization, relatedTerms] of Object.entries(SPECIALIZATION_MAP)) {
    const normalizedSpecialization = specialization.toLowerCase();
    
    
    let matchingAvailableSpec = null;
    
    matchingAvailableSpec = availableSpecializations.find(
      spec => spec.toLowerCase() === normalizedSpecialization
    );
    
    if (!matchingAvailableSpec) {
      for (const term of [...relatedTerms, specialization]) {
        const matchingSpec = availableSpecializations.find(
          spec => spec.toLowerCase().includes(term.toLowerCase()) || 
                 term.toLowerCase().includes(spec.toLowerCase())
        );
        
        if (matchingSpec) {
          matchingAvailableSpec = matchingSpec;
          break;
        }
      }
    }
    
    if (!matchingAvailableSpec) continue;
    let similarity = 0;
    
    if (normalizedSpecialization === aiRecommendation.toLowerCase() ||
        normalizedSpecialization === normalizedAiRecommendation.toLowerCase()) {
      similarity = 100;
    } else {
      for (const term of relatedTerms) {
        if (aiRecommendation.toLowerCase().includes(term.toLowerCase()) ||
            term.toLowerCase().includes(aiRecommendation.toLowerCase())) {
          similarity += 10;
        }
      }
      
      const aiWords = aiRecommendation.toLowerCase().split(/\W+/);
      for (const word of aiWords) {
        if (word.length < 3) continue;
        
        if (normalizedSpecialization.includes(word)) {
          similarity += 5;
        }
        
        for (const term of relatedTerms) {
          if (term.toLowerCase().includes(word)) {
            similarity += 2;
          }
        }
      }
    }
    
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = matchingAvailableSpec;
    }
  }
  
  if (bestMatch) {
    return bestMatch;
  }
  
  const generalDoctor = availableSpecializations.find(
    spec => spec.toLowerCase().includes('general')
  );
  
  return generalDoctor || availableSpecializations[0] || 'General';
}

async function findDoctorBySpecialization(specialization) {
  try {
    const doctors = await prisma.doctors.findMany({
      where: {
        specialization: {
          equals: specialization,
          mode: 'insensitive'
        }
      }
    });
    
    if (doctors.length === 0) {
      return null;
    }
    
    return doctors.reduce((minDoctor, currentDoctor) => {
      return currentDoctor.appointments.length < minDoctor.appointments.length 
        ? currentDoctor 
        : minDoctor;
    }, doctors[0]);
  } catch (error) {
    console.error('Error finding doctor:', error);
    return null;
  }
}