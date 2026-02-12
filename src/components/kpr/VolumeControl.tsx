"use client";

import * as Slider from "@radix-ui/react-slider";
import { Volume2, VolumeX } from "lucide-react";
import { useAudioVolume } from "@/contexts/AudioVolumeContext";
import { cn } from "@/lib/utils";

type VolumeControlProps = {
  className?: string;
  /** Lado fijo: "left" | "right" */
  side?: "left" | "right";
};

export function VolumeControl({ className, side = "left" }: VolumeControlProps) {
  const { volume, setVolume } = useAudioVolume();
  const isMuted = volume === 0;

  const toggleMute = () => {
    setVolume(isMuted ? 100 : 0);
  };

  return (
    <div
      className={cn(
        "fixed top-1/2 z-40 -translate-y-1/2 flex flex-col items-center gap-3 py-4 px-3 rounded-md border border-[#EAEAEA20] bg-[#070707]/90 backdrop-blur-sm",
        side === "left" ? "left-4 lg:left-6" : "right-4 lg:right-6",
        className
      )}
      aria-label="Volume control"
    >
      <button
        type="button"
        onClick={toggleMute}
        className="p-1.5 rounded-full border border-[#EAEAEA30] text-[#EAEAEA] hover:bg-[#EAEAEA15] focus:outline-none focus:ring-2 focus:ring-[#EAEAEA40] focus:ring-offset-2 focus:ring-offset-[#070707] transition-colors"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4" strokeWidth={1.5} />
        ) : (
          <Volume2 className="w-4 h-4" strokeWidth={1.5} />
        )}
      </button>

      <Slider.Root
        className="relative flex items-center justify-center w-6 min-h-[120px] touch-none select-none"
        value={[volume]}
        onValueChange={([v]) => setVolume(v)}
        max={100}
        min={0}
        step={1}
        orientation="vertical"
        aria-label="Volume"
      >
        <Slider.Track className="relative w-1 flex-1 rounded-full bg-[#EAEAEA20]">
          <Slider.Range className="absolute left-0 right-0 rounded-full bg-[#EAEAEA]" style={{ bottom: 0, height: `${volume}%` }} />
        </Slider.Track>
        <Slider.Thumb className="block w-3 h-3 rounded-full bg-[#EAEAEA] border border-[#EAEAEA60] shadow-sm hover:bg-[#fff] focus:outline-none focus:ring-2 focus:ring-[#EAEAEA50] focus:ring-offset-2 focus:ring-offset-[#070707] transition-colors cursor-grab active:cursor-grabbing" />
      </Slider.Root>

      <span className="text-[10px] text-[#EAEAEA60] font-mono tracking-wider tabular-nums">
        {volume}%
      </span>
    </div>
  );
}
