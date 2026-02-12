"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type AudioVolumeContextValue = {
  volume: number;
  setVolume: (value: number) => void;
};

const AudioVolumeContext = createContext<AudioVolumeContextValue | null>(null);

export function AudioVolumeProvider({ children }: { children: ReactNode }) {
  const [volume, setVolumeState] = useState(100);

  const setVolume = useCallback((value: number) => {
    setVolumeState(Math.max(0, Math.min(100, value)));
  }, []);

  return (
    <AudioVolumeContext.Provider value={{ volume, setVolume }}>
      {children}
    </AudioVolumeContext.Provider>
  );
}

export function useAudioVolume() {
  const ctx = useContext(AudioVolumeContext);
  return ctx ?? { volume: 100, setVolume: () => {} };
}
