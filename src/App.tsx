import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Routes, Route } from "react-router-dom";
import { ReactLenis } from "lenis/react";
import { SiteLayout } from "./components/layout/SiteLayout";
import Hero from "./components/hero/Hero";
import LoadingScreen from "./components/loading/LoadingScreen";
import ExperienceChoiceDialog from "./components/loading/ExperienceChoiceDialog";
import { ExperienceProvider, type ExperienceMode } from "./contexts/ExperienceContext";
import { AudioVolumeProvider } from "./contexts/AudioVolumeContext";
import { CustomCursor } from "./components/kpr/CustomCursor";
import About from "./pages/About";
import Works from "./pages/Works";
import Contact from "./pages/Contact";
import Article from "./pages/Article";
import KPRLanding from "./pages/KPRLanding";
import Valentine from "./pages/Valentine";

function App() {
  const [experienceMode, setExperienceMode] = useState<ExperienceMode | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const showDialog = experienceMode === null;
  const showLoading = experienceMode !== null && isLoading;

  const handleChooseExperience = (mode: ExperienceMode) => {
    setExperienceMode(mode);
    setIsLoading(true);
  };

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  return (
    <Routes>
      {/* Valentine: ruta raíz — lo primero que se ve al entrar */}
      <Route path="/" element={<Valentine />} />

      {/* Main app: con experience choice, loading, etc. */}
      <Route path="/home/*" element={
        <AnimatePresence mode="wait">
          {showDialog ? (
            <ExperienceChoiceDialog key="choice" onChoose={handleChooseExperience} />
          ) : showLoading ? (
            <LoadingScreen key="loading" onComplete={handleLoadingComplete} />
          ) : experienceMode !== null && !isLoading ? (
            <ExperienceProvider key="main" mode={experienceMode}>
              <AudioVolumeProvider>
                <ReactLenis root options={{ lerp: 0.08, duration: 1.2 }}>
                  <CustomCursor />
                  <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <Routes>
                    <Route path="/" element={<KPRLanding />} />
                    <Route path="/portfolio" element={<SiteLayout />}>
                      <Route index element={<Hero />} />
                      <Route path="about" element={<About />} />
                      <Route path="works" element={<Works />} />
                      <Route path="article" element={<Article />} />
                      <Route path="contact" element={<Contact />} />
                    </Route>
                  </Routes>
                  </motion.div>
                </ReactLenis>
              </AudioVolumeProvider>
            </ExperienceProvider>
          ) : null}
        </AnimatePresence>
      } />
    </Routes>
  );
}

export default App;
