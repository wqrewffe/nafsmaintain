import React, { useState } from 'react';
import type { UserProfile, ReminderSettings } from '../../types';
import Spinner from '../ui/Spinner';
import { CloseIcon } from '../workout/icons';

interface ReminderSettingsModalProps {
    profile: UserProfile;
    onClose: () => void;
    onSave: (settings: ReminderSettings) => Promise<void>;
}

const defaultSettings: ReminderSettings = {
    breakfast: { enabled: false, time: '08:00' },
    lunch: { enabled: false, time: '13:00' },
    dinner: { enabled: false, time: '19:00' },
    workout: { enabled: false, time: '17:00' },
    checkin: { enabled: true },
};

const ReminderSettingsModal: React.FC<ReminderSettingsModalProps> = ({ profile, onClose, onSave }) => {
    const [settings, setSettings] = useState<ReminderSettings>({
        ...defaultSettings,
        ...profile.reminderSettings,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleToggle = (key: keyof ReminderSettings) => {
        setSettings(prev => ({
            ...prev,
            [key]: { ...prev[key], enabled: !prev[key].enabled },
        }));
    };

    const handleTimeChange = (key: 'breakfast' | 'lunch' | 'dinner' | 'workout', time: string) => {
        setSettings(prev => ({
            ...prev,
            [key]: { ...prev[key], time: time },
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        setError('');
        
        // FIX: Replaced `Object.values` with a safer `Object.keys` pattern to ensure correct type inference.
        // The original `Object.values(settings).some(s => s.enabled)` caused a type error because the type of `s` was inferred as `unknown`.
        const isAnyReminderEnabled = (Object.keys(settings) as Array<keyof ReminderSettings>).some(key => settings[key].enabled);

        if (isAnyReminderEnabled && Notification.permission !== 'granted') {
            try {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    setError('Notifications are blocked. Please enable them in your browser settings to receive reminders.');
                }
            } catch (err) {
                 setError('Could not request notification permissions.');
            }
        }
        
        try {
            await onSave(settings);
            onClose();
        } catch (err) {
            setError('Failed to save settings. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const ReminderRow: React.FC<{
        label: string;
        settingKey: keyof ReminderSettings;
        hasTime?: boolean;
    }> = ({ label, settingKey, hasTime = true }) => {
        const setting = settings[settingKey];
        return (
            <div className="flex items-center justify-between py-3 border-b last:border-b-0">
                <span className="text-gray-700">{label}</span>
                <div className="flex items-center space-x-4">
                    {hasTime && (
                        <input
                            type="time"
                            disabled={!setting.enabled}
                            value={(setting as any).time}
                            onChange={(e) => handleTimeChange(settingKey as any, e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        />
                    )}
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={setting.enabled}
                            onChange={() => handleToggle(settingKey)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-green-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Notification Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-4 text-sm">{error}</p>}

                <div className="space-y-2">
                    <ReminderRow label="Breakfast Reminder ☀️" settingKey="breakfast" />
                    <ReminderRow label="Lunch Reminder 🥗" settingKey="lunch" />
                    <ReminderRow label="Dinner Reminder 🌙" settingKey="dinner" />
                    <ReminderRow label="Workout Reminder 💪" settingKey="workout" />
                    <ReminderRow label="Weekly Check-in Reminder 📈" settingKey="checkin" hasTime={false} />
                </div>
                
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition duration-300 disabled:bg-green-300"
                    >
                        {loading ? <Spinner /> : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReminderSettingsModal;