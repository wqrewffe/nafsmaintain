import React, { useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { HealthPlan, MealPlanItem, UserProfile } from '../../types';
import { regenerateMeal } from '../../services/geminiService';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';

interface MealPlanCardProps {
    plan: HealthPlan;
    profile: UserProfile;
    user: FirebaseUser;
    onPlanUpdated: (newPlan: HealthPlan) => void;
}

type MealType = 'breakfast' | 'lunch' | 'dinner';
type LoadingMeal = { type: MealType | 'snack'; index?: number } | null;

const ChefHatIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a5 5 0 00-5 5v1h10V7a5 5 0 00-5-5zM3 11v6a2 2 0 002 2h10a2 2 0 002-2v-6H3z" />
        <path fillRule="evenodd" d="M10 0C8.343 0 7 1.343 7 3c0 .32.048.628.138.915A2.99 2.99 0 0110 2c1.657 0 3 1.343 3 3 0 .32-.048.628-.138.915A2.99 2.99 0 0110 4a2.99 2.99 0 01-2.862-2.085C7.048.628 7 .32 7 0h3zm-5 4a2 2 0 012-2h.138a2.99 2.99 0 015.724 0H13a2 2 0 012 2v1H5V4z" clipRule="evenodd" />
    </svg>
);

const SwapIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
);

const MealAccordion: React.FC<{
    meal: MealPlanItem;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    snackIndex?: number;
    icon: string;
    loading: boolean;
    onSwap: () => void;
}> = ({ meal, mealType, icon, loading, onSwap }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const MacroDetail: React.FC<{ label: string, value: number, color: string }> = ({ label, value, color }) => (
        <div className="text-center">
            <p className={`text-lg font-bold ${color}`}>{value}g</p>
            <p className="text-xs text-gray-500">{label}</p>
        </div>
    );

    return (
        <div className="border-b last:border-b-0">
            <button onClick={() => setIsExpanded(!isExpanded)} className="w-full text-left p-3 hover:bg-gray-50 transition">
                <div className="flex justify-between items-center">
                    <div className="flex items-center">
                        <span className="text-2xl mr-3">{icon}</span>
                        <div>
                            <p className="font-semibold text-gray-800">{meal.name}</p>
                            <p className="text-sm text-gray-500">{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</p>
                        </div>
                    </div>
                    <div className="flex items-center">
                         <span className="font-semibold text-green-600 mr-4">{meal.calories} kcal</span>
                         <span className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                </div>
            </button>
            {isExpanded && (
                <div className="p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-4">{meal.description}</p>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4 bg-white p-3 rounded-lg shadow-inner">
                        <MacroDetail label="Protein" value={meal.proteinGrams} color="text-sky-500" />
                        <MacroDetail label="Carbs" value={meal.carbsGrams} color="text-amber-500" />
                        <MacroDetail label="Fat" value={meal.fatGrams} color="text-violet-500" />
                    </div>

                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2 flex items-center"><ChefHatIcon /> Recipe</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 pl-2">
                            {meal.recipe && Array.isArray(meal.recipe) && meal.recipe.map((step, i) => <li key={i}>{step}</li>)}
                        </ul>
                    </div>
                    
                    <button 
                        onClick={onSwap}
                        disabled={loading}
                        className="mt-4 w-full flex items-center justify-center bg-green-100 text-green-700 font-bold py-2 px-4 rounded-lg hover:bg-green-200 transition disabled:bg-gray-200"
                    >
                        {loading ? <Spinner /> : <><SwapIcon /> Swap Meal</>}
                    </button>
                </div>
            )}
        </div>
    );
};


const MealPlanCard: React.FC<MealPlanCardProps> = ({ plan, profile, user, onPlanUpdated }) => {
    const [loadingMeal, setLoadingMeal] = useState<LoadingMeal>(null);
    const [error, setError] = useState('');

    const handleSwapMeal = async (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', snackIndex: number = 0) => {
        setLoadingMeal({ type: mealType, index: snackIndex });
        setError('');
        try {
            const newMeal = await regenerateMeal(profile, plan, mealType, snackIndex);
            
            const newPlan = { ...plan };
            if (mealType === 'snack') {
                newPlan.sampleMealPlan.snacks[snackIndex] = newMeal;
            } else {
                newPlan.sampleMealPlan[mealType] = newMeal;
            }
            onPlanUpdated(newPlan);
        } catch (e) {
            console.error("Failed to swap meal:", e);
            setError("Could not generate a new meal. Please try again.");
        } finally {
            setLoadingMeal(null);
        }
    };

    return (
        <Card>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Today's Meal Plan</h3>
            {error && <p className="bg-red-100 text-red-700 p-2 rounded-lg text-center text-sm mb-2">{error}</p>}
            <div className="border rounded-lg overflow-hidden">
                <MealAccordion 
                    meal={plan.sampleMealPlan.breakfast} 
                    mealType="breakfast" 
                    icon="☀️"
                    loading={loadingMeal?.type === 'breakfast'}
                    onSwap={() => handleSwapMeal('breakfast')}
                />
                <MealAccordion 
                    meal={plan.sampleMealPlan.lunch} 
                    mealType="lunch" 
                    icon="🥗"
                    loading={loadingMeal?.type === 'lunch'}
                    onSwap={() => handleSwapMeal('lunch')}
                />
                <MealAccordion 
                    meal={plan.sampleMealPlan.dinner} 
                    mealType="dinner" 
                    icon="🌙"
                    loading={loadingMeal?.type === 'dinner'}
                    onSwap={() => handleSwapMeal('dinner')}
                />
                {plan.sampleMealPlan.snacks.map((snack, index) => (
                    <MealAccordion 
                        key={index}
                        meal={snack} 
                        mealType="snack" 
                        icon="🍎"
                        loading={loadingMeal?.type === 'snack' && loadingMeal.index === index}
                        onSwap={() => handleSwapMeal('snack', index)}
                    />
                ))}
            </div>
        </Card>
    );
};

export default MealPlanCard;