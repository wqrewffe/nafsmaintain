import React from 'react';

interface FoodPyramidProps {
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
}

const FoodPyramid: React.FC<FoodPyramidProps> = ({ proteinGrams, carbsGrams, fatGrams }) => {
    const totalGrams = proteinGrams + carbsGrams + fatGrams;

    if (totalGrams === 0) {
        return <div className="text-center text-gray-500 py-4">No macronutrient data to display.</div>;
    }

    const carbPercent = (carbsGrams / totalGrams) * 100;
    const proteinPercent = (proteinGrams / totalGrams) * 100;
    const fatPercent = (fatGrams / totalGrams) * 100;

    const sections = [
        { name: 'Fat', percent: fatPercent, value: fatGrams, color: 'bg-violet-500', textColor: 'text-violet-700', delay: 1000 },
        { name: 'Protein', percent: proteinPercent, value: proteinGrams, color: 'bg-sky-500', textColor: 'text-sky-700', delay: 500 },
        { name: 'Carbs', percent: carbPercent, value: carbsGrams, color: 'bg-amber-500', textColor: 'text-amber-700', delay: 0 },
    ];

    return (
        <div className="my-4 flex justify-center items-center h-64">
            <div className="relative w-64 h-full" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}>
                <div className="w-full h-full flex flex-col-reverse">
                    {sections.map(section => (
                         <div
                            key={section.name}
                            className={`w-full ${section.color} animate-fillUp`}
                            style={{ height: `${section.percent}%`, animationDelay: `${section.delay}ms` }}
                        />
                    ))}
                </div>
                 {/* Labels */}
                <div className="absolute inset-0 flex flex-col-reverse">
                     {sections.map(section => (
                         <div
                            key={`${section.name}-label`}
                            className="w-full flex items-center justify-center animate-fadeIn"
                            style={{ height: `${section.percent}%`, animationDelay: `${section.delay + 700}ms`, opacity: 0 }}
                         >
                            <div className="text-center bg-white/70 backdrop-blur-sm p-1 rounded-md">
                                <p className={`font-bold text-lg ${section.textColor}`}>{section.name}</p>
                                <p className="text-sm text-gray-700">{Math.round(section.value)}g</p>
                            </div>
                         </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FoodPyramid;
