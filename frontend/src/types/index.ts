export type Role = "admin" | "doctor" | "staff";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface DoctorProfile {
  id: string;
  qualification?: string;
  specialization?: string;
  experience_years: number;
  license_number?: string;
  verification_status: "pending" | "verified" | "rejected";
  verified_at?: string;
  verified_by?: string;
}

export interface DoctorWithProfile {
  user: User;
  profile?: DoctorProfile;
}

export interface Patient {
  id: string;
  patient_code: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  phone?: string;
  email?: string;
  address?: string;
  blood_group?: string;
  height_cm?: number;
  weight_kg?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  is_active: boolean;
  created_at: string;
  age?: number;
  consultations?: PatientConsultation[];
  last_consultation?: string;
}

export interface PatientConsultation {
  id: string;
  consultation_date: string;
  status: string;
  chief_complaint?: string;
  notes?: string;
  outcome?: string;
  follow_up_date?: string;
  doctor_id: string;
  patient_id: string;
  case_history?: {
    id: string;
    chief_complaint?: string;
    diagnosis?: string;
    treatment_plan?: string;
    is_ai_generated: boolean;
    is_approved: boolean;
  };
}

export interface ConsultationBrief {
  id: string;
  patient_id: string;
  doctor_id: string;
  chief_complaint?: string;
  status: string;
  consultation_date: string;
}

export interface Transcript {
  id: string;
  consultation_id: string;
  raw_text: string;
  selected_language?: string;
  detected_language?: string;
  confidence_note?: string;
  duration_seconds?: number;
  is_edited: boolean;
  created_at: string;
}

export interface CaseHistory {
  id: string;
  consultation_id: string;
  chief_complaint?: string;
  history_of_present_illness?: string;
  past_medical_history?: string;
  current_medications?: string;
  allergies?: string;
  family_history?: string;
  social_history?: string;
  review_of_systems?: string;
  physical_examination?: string;
  investigations?: string;
  diagnosis?: string;
  treatment_plan?: string;
  follow_up?: string;
  is_ai_generated: boolean;
  is_approved: boolean;
  doctor_notes?: string;
  approved_at?: string;
  created_at: string;
}

export interface Symptom {
  id: string;
  consultation_id: string;
  name: string;
  description?: string;
  duration?: string;
  severity?: string;
  body_part?: string;
}

export interface MedicineSuggestion {
  id: string;
  consultation_id: string;
  medicine_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  reason?: string;
  warnings?: string;
  status: "pending" | "accepted" | "rejected";
  doctor_notes?: string;
  is_ai_generated: boolean;
  created_at: string;
}

export interface MedicalReport {
  id: string;
  patient_id: string;
  consultation_id?: string;
  title: string;
  report_type?: string;
  file_path?: string;
  file_type?: string;
  extracted_text?: string;
  ai_summary?: string;
  created_at: string;
}

export interface FullConsultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  consultation_date: string;
  status: string;
  chief_complaint?: string;
  notes?: string;
  follow_up_date?: string;
  outcome?: string;
  created_at: string;
  patient?: Patient;
  transcript?: Transcript;
  case_history?: CaseHistory;
  symptoms: Symptom[];
  medicine_suggestions: MedicineSuggestion[];
}

export interface STTResponse {
  transcript: string;
  detected_language: string;
  selected_language: string;
  confidence_note?: string;
  duration_seconds?: number;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: string;
  created_at: string;
}

export interface AdminDashboard {
  total_doctors: number;
  pending_doctors: number;
  verified_doctors: number;
  rejected_doctors: number;
  total_patients: number;
  total_consultations: number;
  today_consultations: number;
  pending_case_histories: number;
  recent_audit_logs: AuditLog[];
}

export interface ExtractedCaseHistory {
  chief_complaint?: string | null;
  history_of_present_illness?: string | null;
  past_medical_history?: string | null;
  current_medications?: string[];
  allergies?: string[];
  symptoms: {
    name: string;
    description?: string | null;
    duration?: string | null;
    severity?: string | null;
    body_part?: string | null;
  }[];
  investigations?: string[];
  treatment_history?: string[];
  follow_up?: string | null;
}

export interface MedicineSuggestionAI {
  medicine_name: string;
  category?: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  reason?: string | null;
  warnings?: string | null;
  relevant_context?: string | null;
}

export interface MedicineSuggestionResult {
  suggestions: MedicineSuggestionAI[];
  disclaimer?: string;
  consultation_id?: string;
}