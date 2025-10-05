import React, { useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile, HealthPlan, DailyLog, WeightEntry, ReminderSettings } from '../../types';
import { getHealthPlan, getDailyLog, getHistoricalLogs, getWeightHistory, saveHealthPlan, updateUserProfile } from '../../services/firestoreService';
import { auth } from '../../services/firebase';
import Spinner from '../ui/Spinner';
import Card from '../ui/Card';
import FoodLogger from './FoodLogger';
import ProgressChart from '../progress/ProgressChart';
import WeeklyCheckinModal from './WeeklyCheckinModal';
import WorkoutPlayer from '../workout/WorkoutPlayer';
import MealPlanCard from './MealPlanCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import useReminders from '../../hooks/useReminders';
import ReminderSettingsModal from './ReminderSettingsModal';

const LogoutIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

const PlayIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.2132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const BellIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const CalorieTracker: React.FC<{ dailyLog: DailyLog | null; plan: HealthPlan }> = ({ dailyLog, plan }) => {
    const consumed = dailyLog?.totalCalories || 0;
    const goal = plan.dailyCalorieGoal;
    const remaining = Math.max(0, goal - consumed);
    
    const data = [
        { name: 'Consumed', value: consumed },
        { name: 'Remaining', value: remaining }
    ];
    const COLORS = ['#10B981', '#e5e7eb']; // Green, Gray

    return (
        <Card className="flex flex-col items-center">
            <h3 className="text-lg font-semibold text-gray-700">Today's Calories</h3>
            <div className="w-48 h-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gray-800">{Math.round(consumed)}</span>
                    <span className="text-sm text-gray-500">kcal</span>
                </div>
            </div>
            <div className="text-center mt-2">
                <p className="text-gray-600">Goal: <span className="font-semibold">{goal} kcal</span></p>
            </div>
        </Card>
    );
};

const MacronutrientTracker: React.FC<{ dailyLog: DailyLog | null; plan: HealthPlan }> = ({ dailyLog, plan }) => {
    const macrosConsumed = {
        protein: dailyLog?.totalProtein || 0,
        carbs: dailyLog?.totalCarbs || 0,
        fat: dailyLog?.totalFat || 0,
    };
    const macroGoals = {
        protein: plan.macronutrientTargets.proteinGrams,
        carbs: plan.macronutrientTargets.carbsGrams,
        fat: plan.macronutrientTargets.fatGrams,
    };

    const MacroBar: React.FC<{ name: string; consumed: number; goal: number; color: string; }> = ({ name, consumed, goal, color }) => {
        const percentage = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;
        return (
            <div>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">{name}</span>
                    <span className="text-xs text-gray-500">{Math.round(consumed)} / {goal}g</span>
                </div>
                <div className="overflow-hidden h-3 text-xs flex rounded-full bg-gray-200">
                    <div style={{ width: `${percentage}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${color} transition-all duration-1000 ease-out`}></div>
                </div>
            </div>
        );
    };

    return (
        <Card>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Macronutrients</h3>
            <div className="space-y-4">
                <MacroBar name="Protein" consumed={macrosConsumed.protein} goal={macroGoals.protein} color="bg-sky-500" />
                <MacroBar name="Carbohydrates" consumed={macrosConsumed.carbs} goal={macroGoals.carbs} color="bg-amber-500" />
                <MacroBar name="Fat" consumed={macrosConsumed.fat} goal={macroGoals.fat} color="bg-violet-500" />
            </div>
        </Card>
    );
}

const WorkoutPlan: React.FC<{ plan: HealthPlan; onStart: () => void }> = ({ plan, onStart }) => (
    <Card className="flex flex-col">
        <div className="flex-grow">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">{plan.workoutPlan.title}</h3>
            <p className="text-sm text-gray-500 mb-4">Duration: {plan.workoutPlan.durationMinutes} minutes</p>
            <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {plan.workoutPlan.exercises.map((ex, index) => (
                    <li key={index} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-semibold text-gray-800">{ex.name}</p>
                        <p className="text-sm text-gray-600">
                            {ex.durationSeconds ? `${ex.durationSeconds} seconds` : `Sets: ${ex.sets}, Reps: ${ex.reps}`}
                        </p>
                    </li>
                ))}
            </ul>
        </div>
        <button 
            onClick={onStart} 
            className="mt-6 w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition duration-300 flex items-center justify-center space-x-2"
        >
            <PlayIcon />
            <span>Start Workout</span>
        </button>
    </Card>
);

const IntermittentFastingPlan: React.FC<{ plan: HealthPlan }> = ({ plan }) => {
    if (!plan.intermittentFasting) return null;

    return (
        <Card>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Intermittent Fasting</h3>
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg">
                <p className="font-bold">Window: {plan.intermittentFasting.window}</p>
                <p className="text-sm mt-1">{plan.intermittentFasting.notes}</p>
            </div>
        </Card>
    );
};

const Dashboard: React.FC<{ user: FirebaseUser; profile: UserProfile }> = ({ user, profile: initialProfile }) => {
    const [profile, setProfile] = useState<UserProfile>(initialProfile);
    const [plan, setPlan] = useState<HealthPlan | null>(null);
    const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
    const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
    const [historicalLogs, setHistoricalLogs] = useState<DailyLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [activeWorkout, setActiveWorkout] = useState<HealthPlan['workoutPlan'] | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useReminders(profile);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const [fetchedPlan, fetchedLog, fetchedWeightHistory, fetchedHistoricalLogs] = await Promise.all([
                getHealthPlan(user.uid),
                getDailyLog(user.uid, new Date()),
                getWeightHistory(user.uid),
                getHistoricalLogs(user.uid)
            ]);
            setPlan(fetchedPlan);
            setDailyLog(fetchedLog);
            setWeightHistory(fetchedWeightHistory);
            setHistoricalLogs(fetchedHistoricalLogs);
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
        } finally {
            setLoading(false);
            setTimeout(() => setIsLoaded(true), 100); // Trigger animation
        }
    }, [user.uid]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);
    
    useEffect(() => {
        const lastCheckin = profile.lastCheckinDate ? new Date(profile.lastCheckinDate) : new Date(0);
        const now = new Date();
        const daysSinceCheckin = (now.getTime() - lastCheckin.getTime()) / (1000 * 3600 * 24);

        if (daysSinceCheckin > 7) {
            setShowCheckinModal(true);
        }
    }, [profile.lastCheckinDate]);

    const handleMealLogged = () => {
        Promise.all([
            getDailyLog(user.uid, new Date()),
            getHistoricalLogs(user.uid)
        ]).then(([newDailyLog, newHistoricalLogs]) => {
            setDailyLog(newDailyLog);
            setHistoricalLogs(newHistoricalLogs);
        });
    };

    const handleCheckinPlanUpdated = (newProfile: UserProfile, newPlan: HealthPlan) => {
        setProfile(newProfile);
        setPlan(newPlan);
        fetchDashboardData();
    }

    const handleMealPlanUpdate = async (newPlan: HealthPlan) => {
        setPlan(newPlan);
        await saveHealthPlan(user.uid, newPlan);
    }

    const handleSaveReminders = async (settings: ReminderSettings) => {
        const updatedProfile: UserProfile = { ...profile, reminderSettings: settings };
        await updateUserProfile(user.uid, { reminderSettings: settings });
        setProfile(updatedProfile);
    };

    const handleStartWorkout = () => {
        const currentHour = new Date().getHours();
        if (currentHour >= 6 && currentHour < 18) {
            if (plan) {
                setActiveWorkout(plan.workoutPlan);
            }
        } else {
            alert("Workouts can only be started between 6 AM and 6 PM. Please come back during your workout window!");
        }
    };

    const getAnimationStyle = (delay: number) => ({
        opacity: isLoaded ? 1 : 0,
        animationDelay: `${delay}ms`,
    });

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;
    }

    if (!plan) {
        return <div className="flex items-center justify-center min-h-screen"><p>Could not load your health plan. Please try again later.</p></div>;
    }

    return (
        <>
            {activeWorkout && (
                <WorkoutPlayer
                    workout={activeWorkout}
                    profile={profile}
                    onFinish={() => setActiveWorkout(null)}
                />
            )}
            {showCheckinModal && (
                <WeeklyCheckinModal 
                    user={user} 
                    profile={profile} 
                    onClose={() => setShowCheckinModal(false)}
                    onPlanUpdated={handleCheckinPlanUpdated}
                />
            )}
            {showReminderModal && (
                <ReminderSettingsModal 
                    profile={profile}
                    onClose={() => setShowReminderModal(false)}
                    onSave={handleSaveReminders}
                />
            )}
            <div className="min-h-screen bg-gray-100">
                <header className="bg-white shadow-md">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-green-600">Health Planner</h1>
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-700 hidden sm:block">Welcome, {profile.displayName}!</span>
                             <button onClick={() => setShowReminderModal(true)} className="text-gray-500 hover:text-green-600 transition" aria-label="Notification Settings">
                                <BellIcon />
                            </button>
                            <button onClick={() => auth.signOut()} className="text-gray-500 hover:text-green-600 transition" aria-label="Sign out">
                                <LogoutIcon />
                            </button>
                        </div>
                    </div>
                </header>
                <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Column 1 */}
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 space-y-6">
                                <div className={isLoaded ? 'animate-fadeInUp' : 'opacity-0'} style={getAnimationStyle(300)}>
                                    <FoodLogger user={user} onMealLogged={handleMealLogged} />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className={isLoaded ? 'animate-fadeInUp' : 'opacity-0'} style={getAnimationStyle(0)}>
                                    <CalorieTracker dailyLog={dailyLog} plan={plan} />
                                </div>
                                <div className={isLoaded ? 'animate-fadeInUp' : 'opacity-0'} style={getAnimationStyle(200)}>
                                    <MealPlanCard 
                                        plan={plan}
                                        profile={profile}
                                        user={user}
                                        onPlanUpdated={handleMealPlanUpdate}
                                    />
                                </div>
                            </div>
                             <div className="space-y-6">
                                <div className={isLoaded ? 'animate-fadeInUp' : 'opacity-0'} style={getAnimationStyle(100)}>
                                    <MacronutrientTracker dailyLog={dailyLog} plan={plan} />
                                </div>
                                <div className={isLoaded ? 'animate-fadeInUp' : 'opacity-0'} style={getAnimationStyle(400)}>
                                    {plan.intermittentFasting && <IntermittentFastingPlan plan={plan} />}
                                </div>
                            </div>
                        </div>

                        {/* Column 3 */}
                        <div className="space-y-6">
                            <div className={isLoaded ? 'animate-fadeInUp' : 'opacity-0'} style={getAnimationStyle(500)}>
                               <WorkoutPlan plan={plan} onStart={handleStartWorkout} />
                           </div>
                           <div className={isLoaded ? 'animate-fadeInUp' : 'opacity-0'} style={getAnimationStyle(600)}>
                                <Card>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Progress</h3>
                                    <ProgressChart weightHistory={weightHistory} historicalLogs={historicalLogs} />
                                </Card>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default Dashboard;