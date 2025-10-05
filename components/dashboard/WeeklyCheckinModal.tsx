import React, { useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile, HealthPlan, WeightEntry } from '../../types';
import { updateUserWeightAndCheckin, saveHealthPlan, getWeightHistory } from '../../services/firestoreService';
import { generateHealthPlan } from '../../services/geminiService';
import Spinner from '../ui/Spinner';

interface WeeklyCheckinModalProps {
    user: FirebaseUser;
    profile: UserProfile;
    onClose: () => void;
    onPlanUpdated: (newProfile: UserProfile, newPlan: HealthPlan) => void;
}

const WeeklyCheckinModal: React.FC<WeeklyCheckinModalProps> = ({ user, profile, onClose, onPlanUpdated }) => {
    const [weight, setWeight] = useState(profile.weight.toString());
    const [weightUnit, setWeightUnit] = useState(profile.weightUnit);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const newWeight = parseFloat(weight);
        if (isNaN(newWeight) || newWeight <= 0) {
            setError('Please enter a valid weight.');
            setLoading(false);
            return;
        }

        try {
            // 1. Update weight in Firestore (profile & history)
            await updateUserWeightAndCheckin(user.uid, newWeight, weightUnit);

            // 2. Create updated profile object for AI
            const updatedProfile: UserProfile = {
                ...profile,
                weight: newWeight,
                weightUnit: weightUnit,
                lastCheckinDate: new Date().toISOString(),
            };
            
            // 3. Get fresh weight history for AI analysis
            const weightHistory = await getWeightHistory(user.uid);

            // 4. Generate new plan
            const newPlan = await generateHealthPlan(updatedProfile, weightHistory);
            
            // 5. Save new plan
            await saveHealthPlan(user.uid, newPlan);
            
            // 6. Notify dashboard and close
            onPlanUpdated(updatedProfile, newPlan);
            onClose();

        } catch (err) {
            console.error("Failed during check-in process:", err);
            setError("Could not update your plan. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                {loading ? (
                     <div className="text-center">
                        <Spinner />
                        <h2 className="text-2xl font-semibold text-gray-700 mt-4">Updating Your Plan...</h2>
                        <p className="text-gray-500 mt-2">Our AI is analyzing your progress to refine your journey.</p>
                    </div>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-center text-gray-800">Weekly Check-in</h2>
                        <p className="text-center text-gray-500 mt-2 mb-6">Update your current weight to get a new, adapted plan for the week.</p>
                        
                        {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4">{error}</p>}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Current Weight</label>
                                <div className="flex">
                                    <input 
                                        type="number" 
                                        value={weight} 
                                        onChange={(e) => setWeight(e.target.value)} 
                                        required 
                                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                                    />
                                    <select 
                                        value={weightUnit} 
                                        onChange={(e) => setWeightUnit(e.target.value as 'kg' | 'lbs')}
                                        className="mt-1 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 px-2"
                                    >
                                        <option value="kg">kg</option>
                                        <option value="lbs">lbs</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex space-x-4">
                                <button type="button" onClick={onClose} className="w-full bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition duration-300">
                                    Later
                                </button>
                                <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition duration-300">
                                    Update Plan
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default WeeklyCheckinModal;