
import React, { useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile } from '../../types';
import { generateHealthPlan } from '../../services/geminiService';
import { saveUserProfile, saveHealthPlan } from '../../services/firestoreService';
import Spinner from '../ui/Spinner';

interface OnboardingFormProps {
    user: FirebaseUser;
    onOnboardingComplete: (profile: UserProfile) => void;
}

const countries = ["Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo, Democratic Republic of the","Congo, Republic of the","Costa Rica","Cote d'Ivoire","Croatia","Cuba","Cyprus","Czechia","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Korea, North","Korea, South","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];

const OnboardingForm: React.FC<OnboardingFormProps> = ({ user, onOnboardingComplete }) => {
    const [formData, setFormData] = useState({
        weight: '',
        weightUnit: 'kg',
        height: '',
        heightUnit: 'cm',
        age: '',
        gender: 'male',
        activityLevel: 'lightly_active',
        workoutTime: '30',
        country: 'United States',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const profile: UserProfile = {
            uid: user.uid,
            displayName: user.displayName || 'User',
            email: user.email || '',
            weight: parseFloat(formData.weight),
            weightUnit: formData.weightUnit as 'kg' | 'lbs',
            height: parseFloat(formData.height),
            heightUnit: formData.heightUnit as 'cm' | 'ft',
            age: parseInt(formData.age, 10),
            gender: formData.gender as 'male' | 'female' | 'other',
            activityLevel: formData.activityLevel as 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active',
            workoutTime: parseInt(formData.workoutTime, 10),
            country: formData.country,
        };

        try {
            await saveUserProfile(profile);
            const plan = await generateHealthPlan(profile);
            await saveHealthPlan(user.uid, plan);
            onOnboardingComplete(profile);
        } catch (err: any) {
            setError('Failed to create your personalized plan. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
                <Spinner />
                <h2 className="text-2xl font-semibold text-gray-700 mt-4">Crafting Your Personalized Plan...</h2>
                <p className="text-gray-500 mt-2">Our AI is analyzing your data to create the perfect health journey for you.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">
                <h1 className="text-3xl font-bold text-center text-gray-800">Tell Us About Yourself</h1>
                <p className="text-center text-gray-500 mt-2 mb-6">This information helps us create your personalized plan.</p>
                
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Weight</label>
                            <div className="flex">
                                <input type="number" name="weight" value={formData.weight} onChange={handleChange} required className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                                <select name="weightUnit" value={formData.weightUnit} onChange={handleChange} className="mt-1 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 px-2">
                                    <option value="kg">kg</option>
                                    <option value="lbs">lbs</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Height</label>
                             <div className="flex">
                                <input type="number" name="height" value={formData.height} onChange={handleChange} required className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                                <select name="heightUnit" value={formData.heightUnit} onChange={handleChange} className="mt-1 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 px-2">
                                    <option value="cm">cm</option>
                                    <option value="ft">ft</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Age</label>
                            <input type="number" name="age" value={formData.age} onChange={handleChange} required className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Gender</label>
                            <select name="gender" value={formData.gender} onChange={handleChange} required className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500">
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Country</label>
                        <select name="country" value={formData.country} onChange={handleChange} required className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500">
                            {countries.map(country => (
                                <option key={country} value={country}>{country}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Activity Level</label>
                        <select name="activityLevel" value={formData.activityLevel} onChange={handleChange} required className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500">
                            <option value="sedentary">Sedentary (little or no exercise)</option>
                            <option value="lightly_active">Lightly Active (light exercise/sports 1-3 days/week)</option>
                            <option value="moderately_active">Moderately Active (moderate exercise/sports 3-5 days/week)</option>
                            <option value="very_active">Very Active (hard exercise/sports 6-7 days a week)</option>
                        </select>
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700">Daily Time for Workouts (minutes)</label>
                        <input type="number" name="workoutTime" value={formData.workoutTime} onChange={handleChange} required className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                    </div>

                    <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition duration-300 mt-4">
                        Generate My Plan
                    </button>
                </form>
            </div>
        </div>
    );
};

export default OnboardingForm;
