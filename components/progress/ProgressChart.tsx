import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { WeightEntry, DailyLog, FoodLogItem } from '../../types';

interface ProgressChartProps {
    weightHistory: WeightEntry[];
    historicalLogs: DailyLog[];
}

interface DayData {
    date: Date;
    log: DailyLog | null;
    weightEntry: WeightEntry | null;
}

const DayDetailModal: React.FC<{ dayData: DayData; onClose: () => void }> = ({ dayData, onClose }) => {
    const { date, log, weightEntry } = dayData;

    const MealItem: React.FC<{ item: FoodLogItem }> = ({ item }) => (
        <div className="p-3 bg-gray-100 rounded-lg">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-semibold text-gray-800">{item.mealType}</p>
                    <p className="text-sm text-gray-600">{item.description}</p>
                </div>
                <p className="text-sm font-medium text-green-600">{item.totalCalories} kcal</p>
            </div>
        </div>
    );
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                {log || weightEntry ? (
                    <div className="space-y-4">
                        {log && (
                             <div>
                                <h4 className="font-semibold text-gray-700 mb-2">Nutrition Summary</h4>
                                <div className="grid grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-green-700">{log.totalCalories}</p>
                                        <p className="text-sm text-green-600">Calories</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-green-700">{log.totalProtein}g</p>
                                        <p className="text-sm text-green-600">Protein</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-green-700">{log.totalCarbs}g</p>
                                        <p className="text-sm text-green-600">Carbs</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-green-700">{log.totalFat}g</p>
                                        <p className="text-sm text-green-600">Fat</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {weightEntry && (
                            <div>
                                <h4 className="font-semibold text-gray-700 mb-2">Weight Log</h4>
                                <p className="text-center bg-blue-50 p-4 rounded-lg text-2xl font-bold text-blue-700">{weightEntry.weight} {weightEntry.weightUnit}</p>
                            </div>
                        )}
                        {log && log.meals.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-700 mb-2">Meals Logged</h4>
                                <div className="space-y-3">
                                    {log.meals.map((meal, index) => <MealItem key={index} item={meal} />)}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-8">No data logged for this day.</p>
                )}
            </div>
        </div>
    );
};

const ProgressChart: React.FC<ProgressChartProps> = ({ weightHistory, historicalLogs }) => {
    const [chartType, setChartType] = useState<'weight' | 'macros' | 'calendar'>('weight');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDayData, setSelectedDayData] = useState<DayData | null>(null);

    const weightData = weightHistory.map(entry => ({
        date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: entry.weight,
    }));
    const weightUnit = weightHistory[0]?.weightUnit || 'weight';

    const macroData = historicalLogs.map(log => ({
        date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Protein: log.totalProtein,
        Carbs: log.totalCarbs,
        Fat: log.totalFat,
    }));

    const renderWeightChart = () => {
        if (weightData.length < 2) return <p className="text-center text-gray-500 p-4">Log your weight to see progress.</p>;
        return (
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <LineChart data={weightData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="weight" stroke="#10B981" activeDot={{ r: 8 }} name={`Weight (${weightUnit})`} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const renderMacrosChart = () => {
        if (macroData.length < 2) return <p className="text-center text-gray-500 p-4">Log meals to see macro trends.</p>;
        return (
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <LineChart data={macroData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} label={{ value: 'Grams', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(0)}g`} />
                        <Legend />
                        <Line type="monotone" dataKey="Protein" stroke="#3b82f6" name="Protein" />
                        <Line type="monotone" dataKey="Carbs" stroke="#f97316" name="Carbs" />
                        <Line type="monotone" dataKey="Fat" stroke="#8b5cf6" name="Fat" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const renderCalendarView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const handleDayClick = (day: number) => {
            const date = new Date(year, month, day);
            const dateString = date.toISOString().split('T')[0];
            const log = historicalLogs.find(l => l.date === dateString) || null;
            const weightEntry = weightHistory.find(w => w.date === dateString) || null;
            setSelectedDayData({ date, log, weightEntry });
        };

        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return (
             <div>
                <div className="flex items-center justify-between mb-2">
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 rounded-full hover:bg-gray-100">&lt;</button>
                    <h4 className="font-semibold text-gray-700">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 rounded-full hover:bg-gray-100">&gt;</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {dayNames.map(d => <div key={d} className="font-medium text-gray-500">{d}</div>)}
                    {blanks.map(b => <div key={`blank-${b}`}></div>)}
                    {days.map(day => {
                        const dateString = new Date(year, month, day).toISOString().split('T')[0];
                        const log = historicalLogs.find(l => l.date === dateString);
                        
                        let bgColor = 'bg-gray-100 hover:bg-gray-200';
                        if (log) {
                            bgColor = 'bg-green-200 hover:bg-green-300';
                        }
                        if (weightHistory.find(w => w.date === dateString)) {
                             bgColor += ' border-2 border-blue-400';
                        }

                        return (
                            <button key={day} onClick={() => handleDayClick(day)} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${bgColor}`}>
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const TabButton: React.FC<{ tabName: 'weight' | 'macros' | 'calendar'; children: React.ReactNode }> = ({ tabName, children }) => (
        <button
            onClick={() => setChartType(tabName)}
            className={`flex-1 text-center px-4 py-2 text-sm font-medium transition-colors duration-200 ${chartType === tabName ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'}`}
        >
            {children}
        </button>
    );

    return (
        <div>
            {selectedDayData && <DayDetailModal dayData={selectedDayData} onClose={() => setSelectedDayData(null)} />}
            <div className="flex border-b border-gray-200 mb-4">
                <TabButton tabName="weight">Weight</TabButton>
                <TabButton tabName="macros">Macros</TabButton>
                <TabButton tabName="calendar">Calendar</TabButton>
            </div>
            
            {chartType === 'weight' && renderWeightChart()}
            {chartType === 'macros' && renderMacrosChart()}
            {chartType === 'calendar' && renderCalendarView()}
        </div>
    );
};

export default ProgressChart;