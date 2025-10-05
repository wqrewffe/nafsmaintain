import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile, HealthPlan, FoodLogItem, DailyLog, WeightEntry } from '../types';

const USERS_COLLECTION = 'users';
const PLANS_COLLECTION = 'plans';
const LOGS_COLLECTION = 'logs';
const WEIGHT_HISTORY_COLLECTION = 'weightHistory';


export const saveUserProfile = async (userProfile: UserProfile): Promise<void> => {
    const userDocRef = doc(db, USERS_COLLECTION, userProfile.uid);
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];

    const profileWithCheckin: UserProfile = {
        ...userProfile,
        lastCheckinDate: today.toISOString(),
    };
    
    // Use a batch write to set the profile and the first weight entry atomically
    const batch = writeBatch(db);
    batch.set(userDocRef, profileWithCheckin);

    const firstWeightEntry: WeightEntry = {
        date: dateString,
        weight: userProfile.weight,
        weightUnit: userProfile.weightUnit,
    };
    const weightHistoryDocRef = doc(db, USERS_COLLECTION, userProfile.uid, WEIGHT_HISTORY_COLLECTION, dateString);
    batch.set(weightHistoryDocRef, firstWeightEntry);
    
    await batch.commit();
};


export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
};

export const saveHealthPlan = async (uid: string, plan: HealthPlan): Promise<void> => {
    const planDocRef = doc(db, PLANS_COLLECTION, uid);
    await setDoc(planDocRef, plan);
};

export const getHealthPlan = async (uid: string): Promise<HealthPlan | null> => {
    const planDocRef = doc(db, PLANS_COLLECTION, uid);
    const docSnap = await getDoc(planDocRef);
    if (docSnap.exists()) {
        return docSnap.data() as HealthPlan;
    }
    return null;
};

export const addFoodLog = async (uid: string, foodLog: FoodLogItem): Promise<void> => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const dailyLogDocRef = doc(db, USERS_COLLECTION, uid, LOGS_COLLECTION, dateString);

    const docSnap = await getDoc(dailyLogDocRef);
    if (docSnap.exists()) {
        const currentData = docSnap.data() as DailyLog;
        await updateDoc(dailyLogDocRef, {
            meals: arrayUnion(foodLog),
            totalCalories: currentData.totalCalories + foodLog.totalCalories,
            totalProtein: currentData.totalProtein + foodLog.macronutrients.proteinGrams,
            totalCarbs: currentData.totalCarbs + foodLog.macronutrients.carbsGrams,
            totalFat: currentData.totalFat + foodLog.macronutrients.fatGrams,
        });
    } else {
        await setDoc(dailyLogDocRef, {
            date: dateString,
            meals: [foodLog],
            totalCalories: foodLog.totalCalories,
            totalProtein: foodLog.macronutrients.proteinGrams,
            totalCarbs: foodLog.macronutrients.carbsGrams,
            totalFat: foodLog.macronutrients.fatGrams,
        });
    }
};

export const getDailyLog = async (uid: string, date: Date): Promise<DailyLog | null> => {
    const dateString = date.toISOString().split('T')[0];
    const dailyLogDocRef = doc(db, USERS_COLLECTION, uid, LOGS_COLLECTION, dateString);
    const docSnap = await getDoc(dailyLogDocRef);
    if(docSnap.exists()) {
        return docSnap.data() as DailyLog;
    }
    return null;
};

export const getHistoricalLogs = async (uid: string): Promise<DailyLog[]> => {
    const logsCollectionRef = collection(db, USERS_COLLECTION, uid, LOGS_COLLECTION);
    const querySnapshot = await getDocs(logsCollectionRef);
    const logs: DailyLog[] = [];
    querySnapshot.forEach((doc) => {
        logs.push(doc.data() as DailyLog);
    });
    return logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userDocRef, data);
};

export const updateUserWeightAndCheckin = async (uid: string, weight: number, weightUnit: 'kg' | 'lbs'): Promise<void> => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const weightHistoryDocRef = doc(db, USERS_COLLECTION, uid, WEIGHT_HISTORY_COLLECTION, dateString);

    const weightEntry: WeightEntry = {
        date: dateString,
        weight: weight,
        weightUnit: weightUnit
    };

    const batch = writeBatch(db);
    batch.set(weightHistoryDocRef, weightEntry, { merge: true }); // Use merge to overwrite if entry for today already exists
    batch.update(userDocRef, {
        weight: weight,
        weightUnit: weightUnit,
        lastCheckinDate: today.toISOString()
    });
    
    await batch.commit();
}

export const getWeightHistory = async (uid: string): Promise<WeightEntry[]> => {
    const historyCollectionRef = collection(db, USERS_COLLECTION, uid, WEIGHT_HISTORY_COLLECTION);
    const querySnapshot = await getDocs(historyCollectionRef);
    const history: WeightEntry[] = [];
    querySnapshot.forEach((doc) => {
        history.push(doc.data() as WeightEntry);
    });
    return history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};