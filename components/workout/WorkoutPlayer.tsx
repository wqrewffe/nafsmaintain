import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { HealthPlan, UserProfile } from '../../types';
import { PauseIcon, PlayIcon, CloseIcon, VideoCameraIcon } from './icons';
import RaindropEffect from './RaindropEffect';

interface WorkoutPlayerProps {
    workout: HealthPlan['workoutPlan'];
    profile: UserProfile;
    onFinish: () => void;
}

interface WorkoutSummary {
    totalDuration: number;
    activeDuration: number;
    restDuration: number;
    caloriesBurned: number;
}

const REST_DURATION = 15; // seconds
const READY_DURATION = 5; // seconds
const COMPLETED_DURATION = 3; // seconds

type Status = 'ready' | 'exercising' | 'resting' | 'rep-based' | 'completed' | 'finished';

const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
};

const CircularProgress: React.FC<{ progress: number, size: number, strokeWidth: number }> = ({ progress, size, strokeWidth }) => {
    const center = size / 2;
    const radius = center - strokeWidth / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg width={size} height={size} className="-rotate-90">
            <circle
                stroke="#374151" // gray-700
                fill="transparent"
                strokeWidth={strokeWidth}
                r={radius}
                cx={center}
                cy={center}
            />
            <circle
                stroke="#10B981" // green-500
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                r={radius}
                cx={center}
                cy={center}
                className="transition-all duration-1000"
            />
        </svg>
    );
};

const WorkoutPlayer: React.FC<WorkoutPlayerProps> = ({ workout, profile, onFinish }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [status, setStatus] = useState<Status>('ready');
    const [timeLeft, setTimeLeft] = useState(READY_DURATION);
    const [isPaused, setIsPaused] = useState(false);
    const [summary, setSummary] = useState<WorkoutSummary | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const playerRef = useRef<HTMLDivElement>(null);
    const startTimeRef = useRef<Date | null>(null);

    const currentExercise = workout.exercises[currentIndex];
    const nextExercise = workout.exercises[currentIndex + 1];

    useEffect(() => {
        const elem = playerRef.current;
        if (elem) {
            elem.requestFullscreen().catch(err => {
                console.error("Fullscreen request failed:", err);
            });
            startTimeRef.current = new Date();
        }
        return () => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        };
    }, []);

    useEffect(() => {
        if (isPaused || status === 'finished') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    // Transition to the next state
                    if (status === 'ready') {
                        const exercise = workout.exercises[0];
                        if (exercise.durationSeconds) {
                            setStatus('exercising');
                            setTimeLeft(exercise.durationSeconds);
                        } else {
                            setStatus('rep-based');
                        }
                    } else if (status === 'exercising') {
                        setStatus('completed');
                        setTimeLeft(COMPLETED_DURATION);
                    } else if (status === 'resting') {
                        setCurrentIndex(prevIndex => prevIndex + 1);
                        const newExercise = workout.exercises[currentIndex + 1];
                         if (newExercise.durationSeconds) {
                            setStatus('exercising');
                            setTimeLeft(newExercise.durationSeconds);
                        } else {
                            setStatus('rep-based');
                        }
                    } else if (status === 'completed') {
                        if (nextExercise) {
                            setStatus('resting');
                            setTimeLeft(REST_DURATION);
                        } else {
                             // Calculate summary here
                            const endTime = new Date();
                            const totalDuration = startTimeRef.current ? Math.round((endTime.getTime() - startTimeRef.current.getTime()) / 1000) : 0;
                             
                            // Estimate active time by summing exercise durations (rep-based estimated at 45s)
                            const activeDuration = workout.exercises.reduce((acc, ex) => acc + (ex.durationSeconds || 45), 0);
                            const restDuration = (workout.exercises.length - 1) * REST_DURATION;

                            const weightInKg = profile.weightUnit === 'lbs' ? profile.weight * 0.453592 : profile.weight;
                            const MET_VALUE = 5; // General calisthenics, moderate effort
                            const caloriesBurned = Math.round(MET_VALUE * weightInKg * (activeDuration / 3600));

                            setSummary({ totalDuration, activeDuration, restDuration, caloriesBurned });
                            setStatus('finished');
                        }
                    }
                    return 0; // Prevent negative numbers
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isPaused, status, workout.exercises, currentIndex, nextExercise, profile]);

    const handleNextRepBased = () => {
        setStatus('completed');
        setTimeLeft(COMPLETED_DURATION);
    }

    const handleShare = () => {
        if (!summary) return;
        const shareText = `I just finished the "${workout.title}" workout in ${formatTime(summary.totalDuration)} with AI Health Planner! 🔥 I burned an estimated ${summary.caloriesBurned} calories. #AIHealthPlanner #FitnessJourney`;
        navigator.clipboard.writeText(shareText).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const renderContent = () => {
        switch(status) {
            case 'ready':
                return (
                    <div className="text-center">
                        <p className="text-2xl text-gray-400 mb-4">GET READY</p>
                        <h2 className="text-5xl md:text-7xl font-bold">{workout.exercises[0].name}</h2>
                        <p className="text-9xl font-mono font-bold mt-8">{timeLeft}</p>
                    </div>
                );
            case 'exercising':
                const duration = currentExercise.durationSeconds || 0;
                const progress = ((duration - timeLeft) / duration) * 100;
                return (
                    <div className="text-center flex flex-col items-center">
                        <div className="relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <p className="text-9xl font-mono font-bold">{timeLeft}</p>
                            </div>
                            <CircularProgress progress={progress} size={300} strokeWidth={20} />
                        </div>
                        <h2 className="text-5xl md:text-7xl font-bold mt-8">{currentExercise.name}</h2>
                        {currentExercise.videoUrl && (
                            <a 
                                href={currentExercise.videoUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={() => setIsPaused(true)}
                                className="mt-4 inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-full text-white bg-gray-700 hover:bg-gray-600 transition"
                            >
                                <VideoCameraIcon className="w-6 h-6 mr-2" />
                                Watch Tutorial
                            </a>
                        )}
                        <p className="text-xl text-gray-400 mt-4 max-w-lg">{currentExercise.notes}</p>
                    </div>
                );
            case 'rep-based':
                 return (
                    <div className="text-center flex flex-col items-center">
                        <h2 className="text-5xl md:text-7xl font-bold">{currentExercise.name}</h2>
                        <p className="text-9xl font-mono font-bold my-4">{currentExercise.sets} x {currentExercise.reps}</p>
                        {currentExercise.videoUrl && (
                            <a 
                                href={currentExercise.videoUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mb-4 inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-full text-white bg-gray-700 hover:bg-gray-600 transition"
                            >
                                <VideoCameraIcon className="w-6 h-6 mr-2" />
                                Watch Tutorial
                            </a>
                        )}
                        <p className="text-xl text-gray-400 max-w-lg">{currentExercise.notes}</p>
                         <button onClick={handleNextRepBased} className="mt-8 bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-2xl transition">
                            Done
                        </button>
                    </div>
                );
            case 'resting':
                return (
                    <div className="text-center">
                        <p className="text-2xl text-gray-400 mb-4">REST</p>
                        <p className="text-9xl font-mono font-bold">{timeLeft}</p>
                         {nextExercise && (
                            <p className="text-3xl mt-8">Next Up: <span className="font-bold text-green-400">{nextExercise.name}</span></p>
                        )}
                    </div>
                );
            case 'completed':
                return (
                    <div className="text-center flex flex-col items-center justify-center animate-fade-in-pop">
                        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold">Well Done!</h2>
                        {currentExercise && <p className="text-xl text-gray-400 mt-2">{currentExercise.name} completed.</p>}
                    </div>
                );
            case 'finished':
                if (!summary) return null;
                const pieData = [
                    { name: 'Active', value: summary.activeDuration },
                    { name: 'Rest', value: summary.restDuration },
                ];
                const COLORS = ['#10B981', '#6B7280'];
                return (
                    <div className="text-center w-full max-w-4xl mx-auto">
                        <h2 className="text-5xl font-bold">Workout Summary</h2>
                        <p className="text-xl text-green-400 mt-2">Great job finishing the {workout.title}!</p>
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                           <div className="w-full h-64 md:h-80">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatTime(value)} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                           </div>
                           <div className="space-y-4 text-left">
                                <div className="p-4 bg-gray-800 rounded-lg">
                                    <p className="text-gray-400 text-sm">TOTAL DURATION</p>
                                    <p className="text-3xl font-bold">{formatTime(summary.totalDuration)}</p>
                                </div>
                                <div className="p-4 bg-gray-800 rounded-lg">
                                    <p className="text-gray-400 text-sm">ACTIVE TIME</p>
                                    <p className="text-3xl font-bold">{formatTime(summary.activeDuration)}</p>
                                </div>
                                <div className="p-4 bg-gray-800 rounded-lg">
                                    <p className="text-gray-400 text-sm">EST. CALORIES BURNED</p>
                                    <p className="text-3xl font-bold">{summary.caloriesBurned} kcal</p>
                                </div>
                           </div>
                        </div>
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                             <button onClick={handleShare} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition w-full sm:w-auto">
                                {isCopied ? 'Copied!' : 'Share Your Success'}
                            </button>
                            <button onClick={onFinish} className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition w-full sm:w-auto">
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                );
        }
    }

    return (
        <div ref={playerRef} className="fixed inset-0 bg-gray-900 text-white z-50 flex flex-col items-center justify-center p-4 overflow-hidden">
            <RaindropEffect />
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            <style>{`
                @keyframes fade-in-pop {
                    0% { opacity: 0; transform: scale(0.8); }
                    100% { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in-pop {
                    animation: fade-in-pop 0.5s ease-out forwards;
                }
            `}</style>
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                {status !== 'finished' && (
                    <button onClick={onFinish} className="absolute top-5 right-5 text-gray-400 hover:text-white">
                        <CloseIcon className="w-10 h-10" />
                    </button>
                )}
                <div className="flex-grow flex items-center justify-center w-full">
                    {renderContent()}
                </div>
                {(status === 'exercising' || status === 'resting') && (
                    <button onClick={() => setIsPaused(p => !p)} className="mb-8 text-gray-400 hover:text-white">
                        {isPaused ? <PlayIcon className="w-16 h-16" /> : <PauseIcon className="w-16 h-16" />}
                    </button>
                )}
            </div>
        </div>
    );
};

export default WorkoutPlayer;
