export interface POI {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  latitude: number;
  longitude: number;
  elevation?: number | null; // in meters, optional
  created_at?: string;
}

export type POIFormData = {
  name: string;
  description: string;
  category: string;
  latitude: string | number;
  longitude: string | number;
  elevation: string | number; // user input string or number
};

export const POI_CATEGORIES = [
  { id: 'Landmark', label: 'Landmark', color: '#dc2626' }, // red
  { id: 'Historical', label: 'Historical', color: '#d97706' }, // amber
  { id: 'Park', label: 'Park / Nature', color: '#16a34a' }, // green
  { id: 'Culture', label: 'Culture & Arts', color: '#9333ea' }, // purple
  { id: 'Viewpoint', label: 'Viewpoint', color: '#0284c7' }, // sky
  { id: 'Dining', label: 'Dining & Cafe', color: '#ea580c' }, // orange
  { id: 'Government', label: 'Government', color: '#475569' }, // slate
  { id: 'Other', label: 'Other', color: '#6b7280' }, // gray
] as const;
