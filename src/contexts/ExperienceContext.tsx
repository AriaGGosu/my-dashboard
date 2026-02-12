"use client";

import { createContext, useContext, type ReactNode } from "react";

export type ExperienceMode = "audio" | "plain";

type ExperienceContextValue = {
  mode: ExperienceMode;
};

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export function ExperienceProvider({
  mode,
  children,
}: {
  mode: ExperienceMode;
  children: ReactNode;
}) {
  return (
    <ExperienceContext.Provider value={{ mode }}>
      {children}
    </ExperienceContext.Provider>
  );
}

export function useExperience() {
  const ctx = useContext(ExperienceContext);
  return ctx ?? { mode: "plain" as ExperienceMode };
}
