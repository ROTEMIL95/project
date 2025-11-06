import { Bed, Sofa, ChefHat, Bath, Building2, Home, DoorOpen } from 'lucide-react';

/**
 * Room Type Definitions
 * Used across the application for consistent room categorization
 */
export const ROOM_TYPES = [
  {
    id: 'bedroom_small',
    label: 'חדר שינה קטן',
    icon: Bed,
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    defaultArea: 10,
    defaultCeilingHeight: 2.7,
    defaultWallAreaFactor: 100,
    category: 'bedrooms'
  },
  {
    id: 'bedroom_medium',
    label: 'חדר שינה בינוני',
    icon: Bed,
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    defaultArea: 12,
    defaultCeilingHeight: 2.7,
    defaultWallAreaFactor: 100,
    category: 'bedrooms'
  },
  {
    id: 'bedroom_large',
    label: 'חדר שינה גדול',
    icon: Bed,
    iconColor: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    defaultArea: 15,
    defaultCeilingHeight: 2.7,
    defaultWallAreaFactor: 100,
    category: 'bedrooms'
  },
  {
    id: 'living_small',
    label: 'סלון קטן',
    icon: Sofa,
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    defaultArea: 20,
    defaultCeilingHeight: 2.7,
    defaultWallAreaFactor: 100,
    category: 'common'
  },
  {
    id: 'living_large',
    label: 'סלון גדול',
    icon: Sofa,
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    defaultArea: 30,
    defaultCeilingHeight: 2.9,
    defaultWallAreaFactor: 95,
    category: 'common'
  },
  {
    id: 'kitchen',
    label: 'מטבח',
    icon: ChefHat,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    defaultArea: 10,
    defaultCeilingHeight: 2.7,
    defaultWallAreaFactor: 85, // Lower due to cabinets
    category: 'wet'
  },
  {
    id: 'bathroom',
    label: 'אמבטיה',
    icon: Bath,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    defaultArea: 5,
    defaultCeilingHeight: 2.7,
    defaultWallAreaFactor: 90,
    category: 'wet'
  },
  {
    id: 'hallway',
    label: 'מסדרון',
    icon: DoorOpen,
    iconColor: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    defaultArea: 8,
    defaultCeilingHeight: 2.7,
    defaultWallAreaFactor: 110, // Higher due to long walls
    category: 'common'
  },
  {
    id: 'office',
    label: 'חדר עבודה',
    icon: Building2,
    iconColor: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    defaultArea: 12,
    defaultCeilingHeight: 2.7,
    defaultWallAreaFactor: 100,
    category: 'common'
  },
  {
    id: 'custom',
    label: 'מותאם אישית',
    icon: Home,
    iconColor: 'text-slate-500',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    defaultArea: 10,
    defaultCeilingHeight: 2.7,
    defaultWallAreaFactor: 100,
    category: 'custom'
  }
];

/**
 * Room Categories
 */
export const ROOM_CATEGORIES = [
  { id: 'bedrooms', label: 'חדרי שינה', color: 'purple' },
  { id: 'common', label: 'חללים משותפים', color: 'blue' },
  { id: 'wet', label: 'חללי רטיבים', color: 'cyan' },
  { id: 'custom', label: 'מותאם אישית', color: 'slate' }
];

/**
 * Helper function to get room icon component
 */
export const getRoomIcon = (roomTypeId) => {
  const roomType = ROOM_TYPES.find(rt => rt.id === roomTypeId);
  if (!roomType) return Home;
  return roomType.icon;
};

/**
 * Helper function to get room type data
 */
export const getRoomTypeData = (roomTypeId) => {
  return ROOM_TYPES.find(rt => rt.id === roomTypeId) || ROOM_TYPES[ROOM_TYPES.length - 1]; // Default to custom
};
