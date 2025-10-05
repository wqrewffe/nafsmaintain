
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from './services/firebase';
// Fix: UserProfile is a type defined in types.ts and not exported from firestoreService.ts
import { getUserProfile } from './services/firestoreService';
import type { UserProfile } from './types';

import Login from './components/auth/Login';
import OnboardingForm from './components/onboarding/OnboardingForm';
import Dashboard from './components/dashboard/Dashboard';
import Spinner from './components/ui/Spinner';

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setCheckingProfile(true);
        try {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUserProfile(null);
        } finally {
          setCheckingProfile(false);
        }
      } else {
        setUserProfile(null);
        setCheckingProfile(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
  };

  if (loading || (user && checkingProfile)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!userProfile) {
    return <OnboardingForm user={user} onOnboardingComplete={handleOnboardingComplete} />;
  }

  return <Dashboard user={user} profile={userProfile} />;
};

export default App;
