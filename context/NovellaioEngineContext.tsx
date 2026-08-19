import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkDeviceProfile, DeviceProfile } from '../utils/hardwareDetector';
import { SoundscapeEngine } from '../utils/SoundscapeEngine';

interface EngineContextType {
  profile: DeviceProfile | null;
  loadingProfile: boolean;
  soundscape: SoundscapeEngine | null;
  activateSoundscape: () => void;
  triggerMoodSoundscape: (sentiment: 'tense' | 'calm' | 'mysterious' | 'heroic' | 'dark' | 'whimsical') => void;
  setSoundscapeVolume: (volume: number) => void;
}

const NovellaioEngineContext = createContext<EngineContextType | undefined>(undefined);

export const NovellaioEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<DeviceProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [soundscape, setSoundscape] = useState<SoundscapeEngine | null>(null);

  useEffect(() => {
    let mounted = true;
    checkDeviceProfile().then(detected => {
      if (mounted) {
        setProfile(detected);
        setLoadingProfile(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const activateSoundscape = () => {
    if (!profile) return;
    if (!soundscape) {
      const engine = new SoundscapeEngine(profile);
      engine.init();
      engine.transitionToMood('calm');
      setSoundscape(engine);
    } else {
      soundscape.init();
    }
  };

  const triggerMoodSoundscape = (sentiment: 'tense' | 'calm' | 'mysterious' | 'heroic' | 'dark' | 'whimsical') => {
    if (soundscape) {
      soundscape.transitionToMood(sentiment);
    }
  };

  const setSoundscapeVolume = (volume: number) => {
    if (soundscape) {
      soundscape.setVolume(volume);
    }
  };

  return (
    <NovellaioEngineContext.Provider
      value={{
        profile,
        loadingProfile,
        soundscape,
        activateSoundscape,
        triggerMoodSoundscape,
        setSoundscapeVolume,
      }}
    >
      {children}
    </NovellaioEngineContext.Provider>
  );
};

export const useNovellaioEngine = () => {
  const context = useContext(NovellaioEngineContext);
  if (!context) {
    throw new Error('useNovellaioEngine must be used within NovellaioEngineProvider');
  }
  return context;
};
