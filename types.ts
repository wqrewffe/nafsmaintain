export interface ReminderSettings {
  breakfast: { enabled: boolean; time: string }; // "HH:MM"
  lunch: { enabled: boolean; time: string };
  dinner: { enabled: boolean; time: string };
  workout: { enabled: boolean; time: string };
  checkin: { enabled: boolean }; // Weekly reminder
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  height: number;
  heightUnit: 'cm' | 'ft';
  age: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
  workoutTime: number; // minutes per day
  country: string;
  lastCheckinDate?: string;
  reminderSettings?: ReminderSettings;
}

export interface Exercise {
  name: string;
  sets?: string;
  reps?: string;
  durationSeconds?: number;
  notes: string;
  videoUrl?: string;
}

export interface MealPlanItem {
  name: string;
  description: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  recipe: string[];
}

export interface HealthPlan {
  dailyCalorieGoal: number;
  macronutrientTargets: {
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  };
  sampleMealPlan: {
    breakfast: MealPlanItem;
    lunch: MealPlanItem;
    dinner: MealPlanItem;
    snacks: MealPlanItem[];
  };
  workoutPlan: {
    title: string;
    durationMinutes: number;
    exercises: Exercise[];
  };
  intermittentFasting?: {
    window: string;
    notes: string;
  };
}

export interface FoodLogItem {
    mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
    description: string;
    totalCalories: number;
    macronutrients: {
        proteinGrams: number;
        carbsGrams: number;
        fatGrams: number;
    };
    timestamp: Date;
    imageUrl?: string; 
}

export interface DailyLog {
    date: string; // YYYY-MM-DD
    meals: FoodLogItem[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
}

export interface WeightEntry {
    date: string; // YYYY-MM-DD
    weight: number;
    weightUnit: 'kg' | 'lbs';
}