export interface User {
  id: string;
  email: string;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
}

export interface AlumniProfile {
  id: string;
  user_id: string;
  email?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  preferred_name?: string;
  maiden_name?: string;
  date_of_birth?: string;
  gender?: string;
  house?: string;
  year_group?: string;
  graduation_year?: number;
  boarding_type?: string;
  final_year_class?: string;
  leadership_roles?: string;
  clubs?: string;
  sports?: string;
  program?: string;
  phone?: string;
  whatsapp?: string;
  secondary_email?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  linkedin_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  location?: string;
  bio?: string;
  profile_photo_url?: string;
  occupation?: string;
  employer?: string;
  industry?: string;
  job_title?: string;
  professional_field?: string;
  years_of_experience?: number;
  certifications?: string;
  expertise?: string;
  is_mentor_available?: boolean;
  is_speaker_available?: boolean;
  has_board_service?: boolean;
  board_positions?: unknown[];
  has_business?: boolean;
  business_name?: string;
  business_description?: string;
  business_category?: string;
  business_website?: string;
  business_phone?: string;
  business_email?: string;
  business_address?: string;
  business_logo_url?: string;
  business_industry?: string;
  business_location?: string;
  business_social?: string;
  business_services?: string;
  mentorship_areas?: string;
  career_guidance_available?: boolean;
  emergency_contact_name?: string;
  emergency_contact_mobile?: string;
  emergency_contact_relationship?: string;
  is_admin?: boolean;
  created_at?: string;
}

export interface Photo {
  id: string;
  uploaded_by?: string;
  url: string;
  caption?: string;
  category?: string;
  year?: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  uploader_photo?: string;
}

export interface Memory {
  id: string;
  author_id?: string;
  title: string;
  content: string;
  year_range?: string;
  tags?: string[];
  likes: number;
  created_at: string;
  updated_at: string;
  first_name?: string;
  last_name?: string;
  author_photo?: string;
  comment_count?: number;
  user_liked?: boolean;
  comments?: MemoryComment[];
}

export interface MemoryComment {
  id: string;
  memory_id: string;
  author_id?: string;
  content: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  author_photo?: string;
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  event_date?: string;
  event_time?: string;
  location?: string;
  event_type?: string;
  created_at: string;
}

export interface BirthdayAlumni {
  user_id: string;
  email: string;
  first_name: string;
  last_name?: string;
  profile_photo_url?: string;
  date_of_birth: string;
  days_until: number;
}

export interface Advertisement {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price?: string;
  category?: string;
  image_url?: string;
  contact_info?: string;
  business_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  // joined
  first_name?: string;
  last_name?: string;
  profile_photo_url?: string;
  email?: string;
  poster_email?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

export interface AdminStats {
  total_alumni: number;
  pending_approvals: number;
  total_photos: number;
  total_memories: number;
  total_activities: number;
}

export interface PortalSettings {
  id: string;
  school_name: string;
  logo_url?: string;
  updated_at: string;
}

// Registration form data (6 steps)
export interface RegistrationFormData {
  // Step 1 - Personal
  first_name: string;
  middle_name: string;
  last_name: string;
  preferred_name: string;
  date_of_birth: string;
  // Step 2 - School
  graduation_year: string;
  boarding_type: string;
  house: string;
  program: string;
  final_year_class: string;
  leadership_roles: string;
  clubs: string;
  sports: string;
  // Step 3 - Contact
  email: string;
  password: string;
  secondary_email: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  region: string;
  country: string;
  linkedin_url: string;
  facebook_url: string;
  instagram_url: string;
  // Step 4 - Professional
  employer: string;
  industry: string;
  job_title: string;
  professional_field: string;
  years_of_experience: string;
  certifications: string;
  expertise: string;
  is_mentor_available: boolean;
  is_speaker_available: boolean;
  has_board_service: boolean;
  // Step 5 - Business & Mentorship
  has_business: boolean;
  business_name: string;
  business_industry: string;
  business_location: string;
  business_website: string;
  business_social: string;
  business_services: string;
  mentorship_areas: string;
  career_guidance_available: boolean;
  // Step 6 - Emergency
  emergency_contact_name: string;
  emergency_contact_mobile: string;
  emergency_contact_relationship: string;
}
