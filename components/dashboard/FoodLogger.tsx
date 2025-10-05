import React, { useState, useRef, useEffect } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { analyzeMealImage } from '../../services/geminiService';
import { addFoodLog } from '../../services/firestoreService';
import type { FoodLogItem } from '../../types';
import Spinner from '../ui/Spinner';
import Card from '../ui/Card';
import { CloseIcon } from '../workout/icons';
import FoodPyramid from './FoodPyramid';

interface FoodLoggerProps {
    user: FirebaseUser;
    onMealLogged: () => void;
}

type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

const mealSlots: { type: MealType; startHour: number; endHour: number; icon: string; time: string; }[] = [
    { type: 'Breakfast', startHour: 6, endHour: 10, icon: '☀️', time: '6am - 10am' },
    { type: 'Lunch', startHour: 13, endHour: 15, icon: '🥗', time: '1pm - 3pm' },
    { type: 'Dinner', startHour: 19, endHour: 21, icon: '🌙', time: '7pm - 9pm' },
    { type: 'Snack', startHour: 0, endHour: 24, icon: '🍎', time: 'Anytime' },
];

const getActiveSlot = (): MealType | null => {
    const currentHour = new Date().getHours();
    for (const slot of mealSlots) {
        if (slot.type !== 'Snack' && currentHour >= slot.startHour && currentHour < slot.endHour) {
            return slot.type;
        }
    }
    return null;
};

// --- Inlined Components for this feature ---

const CameraIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const FolderIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
);

interface CameraCaptureProps {
    onCapture: (base64DataUrl: string) => void;
    onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mediaStream: MediaStream;

        const startCamera = async () => {
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
                setLoading(false);
            } catch (err) {
                console.error("Error accessing camera:", err);
                setError("Could not access the camera. Please check permissions and try again.");
                setLoading(false);
            }
        };

        startCamera();

        return () => {
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                const dataUrl = canvas.toDataURL('image/jpeg');
                onCapture(dataUrl);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${loading || error ? 'hidden' : ''}`}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {loading && <Spinner />}
            {error && <p className="text-white text-center p-4">{error}</p>}
            
            <button
                onClick={onClose}
                className="absolute top-5 right-5 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
                aria-label="Close camera"
            >
                <CloseIcon className="w-8 h-8" />
            </button>

            {!loading && !error && (
                <div className="absolute bottom-10 flex justify-center w-full">
                    <button
                        onClick={handleCapture}
                        className="w-20 h-20 bg-white rounded-full border-4 border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white"
                        aria-label="Capture photo"
                    />
                </div>
            )}
        </div>
    );
};


const FoodLogger: React.FC<FoodLoggerProps> = ({ user, onMealLogged }) => {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<Omit<FoodLogItem, 'timestamp' | 'imageUrl' | 'mealType'> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeSlot, setActiveSlot] = useState<MealType | null>(getActiveSlot());
    const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveSlot(getActiveSlot());
        }, 60000); // Check every minute
        return () => clearInterval(timer);
    }, []);

    const resetState = () => {
        setImagePreview(null);
        setAnalysis(null);
        setError('');
        setSelectedMealType(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleImageAnalysis = async (base64Image: string, mimeType: string) => {
        setLoading(true);
        setError('');
        try {
            const result = await analyzeMealImage(base64Image, mimeType);
            setAnalysis(result);
        } catch (err) {
            setError('Could not analyze the image. Please try another one.');
            console.error(err);
            setImagePreview(null);
            setSelectedMealType(null);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const dataUrl = reader.result as string;
                setImagePreview(dataUrl);
                const base64 = dataUrl.split(',')[1];
                await handleImageAnalysis(base64, selectedFile.type);
            };
            reader.readAsDataURL(selectedFile);
            setAnalysis(null);
            setError('');
        }
    };

    const handleLogMeal = async () => {
        if (!analysis || !selectedMealType) return;
        setLoading(true);
        try {
            const newLog: FoodLogItem = {
                ...analysis,
                mealType: selectedMealType,
                timestamp: new Date(),
            };
            await addFoodLog(user.uid, newLog);
            resetState();
            onMealLogged();
        } catch (err) {
            setError('Failed to log meal. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    const handleSelectUpload = (mealType: MealType) => {
        resetState();
        setSelectedMealType(mealType);
        fileInputRef.current?.click();
    };

    const handleSelectCamera = (mealType: MealType) => {
        resetState();
        setSelectedMealType(mealType);
        setIsCameraOpen(true);
    };

    const handleCapture = async (base64DataUrl: string) => {
        setIsCameraOpen(false);
        setImagePreview(base64DataUrl);
        const base64Image = base64DataUrl.split(',')[1];
        const mimeType = base64DataUrl.match(/:(.*?);/)?.[1] || 'image/jpeg';
        await handleImageAnalysis(base64Image, mimeType);
    };

    const renderMealSlot = (slot: typeof mealSlots[0]) => {
        const isSnack = slot.type === 'Snack';
        const isActive = activeSlot === slot.type || isSnack;
        const buttonClasses = isActive
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed';
        const cardClasses = isActive ? 'border-green-300' : 'border-gray-200 bg-gray-50';

        return (
            <div key={slot.type} className={`p-4 rounded-lg border-2 text-center flex flex-col justify-between ${cardClasses}`}>
                <div>
                    <span className="text-3xl" role="img" aria-label={slot.type}>{slot.icon}</span>
                    <h4 className="font-semibold text-gray-800 mt-2">{slot.type}</h4>
                    <p className="text-xs text-gray-500">{slot.time}</p>
                </div>
                 <div className="mt-4 flex justify-center space-x-2">
                    <button
                        onClick={() => handleSelectUpload(slot.type)}
                        disabled={!isActive}
                        className={`p-3 rounded-full transition duration-300 ${buttonClasses}`}
                        aria-label={`Upload photo for ${slot.type}`}
                    >
                        <FolderIcon className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => handleSelectCamera(slot.type)}
                        disabled={!isActive}
                        className={`p-3 rounded-full transition duration-300 ${buttonClasses}`}
                        aria-label={`Use camera for ${slot.type}`}
                    >
                        <CameraIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <Card>
            {isCameraOpen && <CameraCapture onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Log Your Meals</h3>
            {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4">{error}</p>}
            
            <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {mealSlots.map(renderMealSlot)}
            </div>
            
            {imagePreview && selectedMealType && (
                <div className="mt-6 pt-6 border-t">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div>
                             <h4 className="text-md font-semibold text-gray-700 mb-2">Analyzing {selectedMealType}...</h4>
                             <img src={imagePreview} alt="Meal preview" className="w-full rounded-md shadow-md" />
                        </div>
                        <div>
                            {loading && !analysis && (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <Spinner/>
                                    <p className="mt-2 text-gray-600">Analyzing your meal...</p>
                                </div>
                            )}
                            {analysis && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="text-md font-bold text-gray-800 text-center">{analysis.description}</h4>
                                    <p className="text-2xl font-light text-green-600 my-2 text-center">{analysis.totalCalories} <span className="text-sm">calories</span></p>
                                    
                                    <FoodPyramid
                                        proteinGrams={analysis.macronutrients.proteinGrams}
                                        carbsGrams={analysis.macronutrients.carbsGrams}
                                        fatGrams={analysis.macronutrients.fatGrams}
                                    />

                                    <div className="flex space-x-2 mt-4">
                                        <button onClick={resetState} className="w-full bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">
                                            Cancel
                                        </button>
                                        <button onClick={handleLogMeal} disabled={loading} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
                                            {loading ? 'Logging...' : `Log ${selectedMealType}`}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default FoodLogger;