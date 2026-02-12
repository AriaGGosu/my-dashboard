import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { SectionLayout } from "@/components/layout/SectionLayout";
import { AboutVisual } from "@/components/visuals/AboutVisual";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { NarrativeParagraph } from "@/components/ui/narrative-text";
import { Layers } from "lucide-react";
import {
  TITLE_PAGE,
  TITLE_CLASS,
  BODY_CLASS,
  BODY_SMALL,
  LABEL_CLASS,
  CHIP_CLASS,
} from "@/lib/design-tokens";

const SEQUENCE = { stagger: 0.15, duration: 0.5 };
const skills = ["React", "TypeScript", "Three.js", "Framer Motion", "Tailwind", "Node.js", "WebGL", "GSAP"];
const tools = ["Figma", "Vite", "Git", "Vercel"];

export default function About() {
  const [skillsModalOpen, setSkillsModalOpen] = useState(false);

  return (
    <>
      <SectionLayout
        label={
          <motion.p
            className={`${LABEL_CLASS} mb-4`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0, duration: SEQUENCE.duration }}
          >
            ABOUT
          </motion.p>
        }
        title={
          <motion.h1
            className={`${TITLE_CLASS} ${TITLE_PAGE} mb-8`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: SEQUENCE.stagger * 1, duration: SEQUENCE.duration }}
          >
            This is where the story gets personal.
          </motion.h1>
        }
        visual={
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: SEQUENCE.stagger * 3, duration: SEQUENCE.duration }}
          >
            <AboutVisual />
          </motion.div>
        }
      >
        {/* Historia con animación narrativa */}
        <NarrativeParagraph
          lines={[
            "Every automation that replaces a human touch leaves a gap.",
            "My work lives in that gap: interfaces that breathe, micro-interactions that surprise, and experiences that people remember not because they were fast, but because they felt right.",
          ]}
          bodyClass={BODY_CLASS}
          className="mb-6"
        />
        {/* Menú a la derecha: Skills & Tools → abre modal */}
        <motion.div
          className="flex justify-end"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: SEQUENCE.stagger * 3, duration: SEQUENCE.duration }}
        >
          <Button
            variant="outline"
            className="body-font text-sm tracking-wider border-[#EAEAEA]/20 bg-[#070707] text-[#EAEAEA]/80 hover:bg-[#EAEAEA]/5 hover:border-[#EAEAEA]/30 hover:text-[#EAEAEA] gap-2"
            onClick={() => setSkillsModalOpen(true)}
          >
            <Layers className="size-4" />
            Skills & Tools
          </Button>
        </motion.div>
      </SectionLayout>

      <Modal open={skillsModalOpen} onClose={() => setSkillsModalOpen(false)} title="Skills & Tools">
        <p className={`${BODY_SMALL} mb-4`}>
          I blend design and code—from 3D and motion to responsive applications. Clean architecture, modern tooling.
        </p>
        <p className={`${LABEL_CLASS} text-xs mb-2`}>SKILLS</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {skills.map((s) => (
            <Badge
              key={s}
              variant="outline"
              className={`${CHIP_CLASS} tracking-wider text-[#EAEAEA]/90 border-[#EAEAEA]/25 px-3 py-1`}
            >
              {s}
            </Badge>
          ))}
        </div>
        <p className={`${LABEL_CLASS} text-xs mb-2`}>TOOLS</p>
        <div className="flex flex-wrap gap-2">
          {tools.map((t) => (
            <Badge
              key={t}
              variant="secondary"
              className={`${CHIP_CLASS} text-[#EAEAEA]/80 bg-[#070707] border border-[#EAEAEA]/20`}
            >
              {t}
            </Badge>
          ))}
        </div>
      </Modal>
    </>
  );
}
