import { useEffect } from 'react';
import type { UserProfile } from '../types';

const useReminders = (profile: UserProfile | null) => {
    useEffect(() => {
        if (!profile?.reminderSettings) {
            return;
        }

        const checkReminders = () => {
            if (Notification.permission !== 'granted') {
                return;
            }

            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            
            const { reminderSettings, lastCheckinDate } = profile;

            if (reminderSettings.breakfast?.enabled && reminderSettings.breakfast.time === currentTime) {
                new Notification('Breakfast Time! ☀️', { body: 'Time to log your breakfast and fuel your day!', icon: '/vite.svg' });
            }
            if (reminderSettings.lunch?.enabled && reminderSettings.lunch.time === currentTime) {
                new Notification('Lunch Break! 🥗', { body: 'Don\'t forget to log your lunch.', icon: '/vite.svg' });
            }
            if (reminderSettings.dinner?.enabled && reminderSettings.dinner.time === currentTime) {
                new Notification('Dinner is Served! 🌙', { body: 'Time to log your final meal of the day.', icon: '/vite.svg' });
            }
            if (reminderSettings.workout?.enabled && reminderSettings.workout.time === currentTime) {
                new Notification('Time to Work Out! 💪', { body: 'Your scheduled workout is starting now. Let\'s get moving!', icon: '/vite.svg' });
            }
            if (reminderSettings.checkin?.enabled && lastCheckinDate) {
                const lastCheckin = new Date(lastCheckinDate);
                const daysSinceCheckin = (now.getTime() - lastCheckin.getTime()) / (1000 * 3600 * 24);
                
                if (daysSinceCheckin >= 7 && now.getHours() === 12 && now.getMinutes() === 0) {
                     new Notification('Weekly Check-in Time! 📈', { body: 'It\'s time to update your weight and get a new plan for the week.', icon: '/vite.svg' });
                }
            }
        };

        const intervalId = setInterval(checkReminders, 30000);

        return () => clearInterval(intervalId);

    }, [profile]);
};

export default useReminders;
