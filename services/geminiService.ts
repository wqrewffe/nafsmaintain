import { GoogleGenAI, Type } from "@google/genai";
import type { UserProfile, HealthPlan, FoodLogItem, WeightEntry, MealPlanItem } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const mealPlanItemSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        calories: { type: Type.NUMBER },
        proteinGrams: { type: Type.NUMBER },
        carbsGrams: { type: Type.NUMBER },
        fatGrams: { type: Type.NUMBER },
        recipe: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["name", "description", "calories", "proteinGrams", "carbsGrams", "fatGrams", "recipe"]
};

export const generateHealthPlan = async (profile: UserProfile, weightHistory: WeightEntry[] = []): Promise<HealthPlan> => {
    const model = 'gemini-2.5-flash';
    const historyPrompt = weightHistory.length > 1
        ? `The user has completed a weekly check-in. Analyze their progress from their weight history and adjust the plan.
        - User's full weight history (date: YYYY-MM-DD, weight): ${JSON.stringify(weightHistory)}.
        - If progress is good, provide an encouraging message and a plan to maintain momentum.
        - If progress has stalled or reversed, adjust the plan. Suggest changes to diet (e.g., lower calories), introduce a more challenging workout, or suggest an intermittent fasting schedule like 16:8.
        `
        : 'This is the user\'s first plan.';

    const prompt = `
    You are an expert AI health and fitness coach. Generate a personalized weekly weight loss plan based on the following user data:
    - Age: ${profile.age}
    - Gender: ${profile.gender}
    - Current Weight: ${profile.weight} ${profile.weightUnit}
    - Height: ${profile.height} ${profile.heightUnit}
    - Activity Level: ${profile.activityLevel.replace('_', ' ')}
    - Available workout time per day: ${profile.workoutTime} minutes
    - Country: ${profile.country}

    ${historyPrompt}

    Provide a JSON object with the exact structure defined in the response schema. 
    The total calories of all meals in 'sampleMealPlan' should closely match the 'dailyCalorieGoal'.
    The plan should be realistic and sustainable.
    The workout plan must be designed to be performed between 6 AM and 6 PM.
    The sample meal plan MUST consist of common, culturally relevant dishes from the user's country (${profile.country}). For each meal, provide a simple recipe with clear steps.
    The workout plan should be diverse. For each exercise, provide EITHER 'sets' and 'reps' (for strength movements) OR 'durationSeconds' (for timed movements like cardio or holds). Ensure 'notes' provides clear instructions. For each exercise, if a relevant, high-quality instructional video link (e.g., from YouTube) is available, include it in the 'videoUrl' field.
    The 'intermittentFasting' field is optional. Only include it if you are recommending it as a new strategy for the user.
    `;

    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    dailyCalorieGoal: { type: Type.NUMBER },
                    macronutrientTargets: {
                        type: Type.OBJECT,
                        properties: {
                            proteinGrams: { type: Type.NUMBER },
                            carbsGrams: { type: Type.NUMBER },
                            fatGrams: { type: Type.NUMBER },
                        },
                        required: ["proteinGrams", "carbsGrams", "fatGrams"]
                    },
                    sampleMealPlan: {
                        type: Type.OBJECT,
                        properties: {
                            breakfast: mealPlanItemSchema,
                            lunch: mealPlanItemSchema,
                            dinner: mealPlanItemSchema,
                            snacks: { type: Type.ARRAY, items: mealPlanItemSchema },
                        },
                        required: ["breakfast", "lunch", "dinner", "snacks"]
                    },
                    workoutPlan: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            durationMinutes: { type: Type.NUMBER },
                            exercises: { 
                                type: Type.ARRAY, 
                                items: { 
                                    type: Type.OBJECT, 
                                    properties: { 
                                        name: { type: Type.STRING }, 
                                        sets: { type: Type.STRING, nullable: true }, 
                                        reps: { type: Type.STRING, nullable: true },
                                        durationSeconds: { type: Type.NUMBER, nullable: true }, 
                                        notes: { type: Type.STRING },
                                        videoUrl: { type: Type.STRING, nullable: true, description: "A URL to an instructional video for the exercise." }
                                    }, 
                                    required: ["name", "notes"] 
                                } 
                            },
                        },
                        required: ["title", "durationMinutes", "exercises"]
                    },
                    intermittentFasting: {
                        type: Type.OBJECT,
                        nullable: true,
                        properties: {
                            window: { type: Type.STRING, description: "e.g., 16:8 or 18:6" },
                            notes: { type: Type.STRING, description: "Brief explanation and tips" },
                        },
                    },
                },
                required: ["dailyCalorieGoal", "macronutrientTargets", "sampleMealPlan", "workoutPlan"]
            },
        },
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as HealthPlan;
    } catch (e) {
        console.error("Failed to parse health plan JSON:", e);
        throw new Error("Could not generate a valid health plan.");
    }
};


export const regenerateMeal = async (
    profile: UserProfile, 
    plan: HealthPlan, 
    mealTypeToReplace: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    snackIndex: number = 0
): Promise<MealPlanItem> => {
    const model = 'gemini-2.5-flash';
    
    const { sampleMealPlan, dailyCalorieGoal, macronutrientTargets } = plan;
    const allMeals = [sampleMealPlan.breakfast, sampleMealPlan.lunch, sampleMealPlan.dinner, ...sampleMealPlan.snacks];
    
    let mealToReplace: MealPlanItem;
    if(mealTypeToReplace === 'snack') {
        mealToReplace = sampleMealPlan.snacks[snackIndex];
    } else {
        mealToReplace = sampleMealPlan[mealTypeToReplace];
    }

    const otherMeals = allMeals.filter(meal => meal !== mealToReplace);
    const consumed = otherMeals.reduce((acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.proteinGrams,
        carbs: acc.carbs + meal.carbsGrams,
        fat: acc.fat + meal.fatGrams,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const remainingBudget = {
        calories: dailyCalorieGoal - consumed.calories,
        protein: macronutrientTargets.proteinGrams - consumed.protein,
        carbs: macronutrientTargets.carbsGrams - consumed.carbs,
        fat: macronutrientTargets.fatGrams - consumed.fat,
    };

    const prompt = `
    You are an AI health coach. The user wants to replace a meal in their daily plan.
    - User Profile: ${JSON.stringify({ country: profile.country, age: profile.age, gender: profile.gender })}
    - Meal Type to Generate: ${mealTypeToReplace}
    - Previous Meal (to avoid suggesting the same thing): "${mealToReplace.name}"
    - Nutritional Budget for this new meal: 
        - Approximately ${remainingBudget.calories.toFixed(0)} calories.
        - Protein: ~${remainingBudget.protein.toFixed(0)}g
        - Carbs: ~${remainingBudget.carbs.toFixed(0)}g
        - Fat: ~${remainingBudget.fat.toFixed(0)}g

    Generate a single new meal suggestion that is culturally relevant for the user's country (${profile.country}).
    The meal must fit within the provided nutritional budget.
    Provide the response as a single JSON object with the exact structure defined in the response schema.
    Include a simple, step-by-step recipe.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: mealPlanItemSchema,
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as MealPlanItem;
    } catch (e) {
        console.error("Failed to parse regenerated meal JSON:", e);
        throw new Error("Could not generate a new meal suggestion.");
    }
};


export const analyzeMealImage = async (base64Image: string, mimeType: string): Promise<Omit<FoodLogItem, 'timestamp' | 'imageUrl' | 'mealType'>> => {
    const model = 'gemini-2.5-flash';
    const prompt = `Analyze the food in this image. Provide a short description of the meal and estimate its total calories, protein, carbohydrates, and fat in grams. Return the data as a JSON object with the exact structure defined in the response schema.`;

    const imagePart = {
        inlineData: {
            data: base64Image,
            mimeType: mimeType,
        },
    };

    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING },
                    totalCalories: { type: Type.NUMBER },
                    macronutrients: {
                        type: Type.OBJECT,
                        properties: {
                            proteinGrams: { type: Type.NUMBER },
                            carbsGrams: { type: Type.NUMBER },
                            fatGrams: { type: Type.NUMBER },
                        },
                        required: ["proteinGrams", "carbsGrams", "fatGrams"]
                    },
                },
                required: ["description", "totalCalories", "macronutrients"]
            },
        },
    });

    try {
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        return parsed as Omit<FoodLogItem, 'timestamp' | 'imageUrl' | 'mealType'>;
    } catch (e) {
        console.error("Failed to parse meal analysis JSON:", e);
        throw new Error("Could not analyze the meal image.");
    }
};