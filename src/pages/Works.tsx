import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { CornerPlus } from "@/components/ui/tech-card";
import { SectionLayout } from "@/components/layout/SectionLayout";
import { WorksVisual } from "@/components/visuals/WorksVisual";
import { NarrativeParagraph } from "@/components/ui/narrative-text";
import {
  TITLE_PAGE,
  TITLE_CLASS,
  BODY_CLASS,
  BODY_SMALL,
  LABEL_CLASS,
  CHIP_CLASS,
} from "@/lib/design-tokens";

const SEQUENCE = { stagger: 0.12, duration: 0.5 };
const projects = [
  { title: "Project Alpha", desc: "3D experience and motion. Where the interface becomes a space.", tags: ["Three.js", "React", "GSAP"], year: "2024" },
  { title: "Project Beta", desc: "Dashboard and data viz. Making numbers feel like a story.", tags: ["TypeScript", "Tailwind"], year: "2024" },
  { title: "Project Gamma", desc: "Landing and micro-interactions. Every scroll tuned to the moment.", tags: ["Framer Motion", "Vite"], year: "2023" },
];

export default function Works() {
  return (
    <SectionLayout
      label={
        <motion.p
          className={`${LABEL_CLASS} mb-4`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0, duration: SEQUENCE.duration }}
        >
          WORKS
        </motion.p>
      }
      title={
        <motion.h1
          className={`${TITLE_CLASS} ${TITLE_PAGE} mb-8`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: SEQUENCE.stagger * 1, duration: SEQUENCE.duration }}
        >
          Proof that emotion belongs in the machine.
        </motion.h1>
      }
      visual={
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: SEQUENCE.stagger * 3, duration: SEQUENCE.duration }}
        >
          <WorksVisual />
        </motion.div>
      }
    >
      <NarrativeParagraph
        lines={[
          "Selected projects where UI, animation, and intent come together—",
          "so users don't just complete a task, they feel something.",
        ]}
        bodyClass={BODY_CLASS}
        className="mb-6"
      />
      <motion.div
        className="grid gap-4 sm:grid-cols-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: SEQUENCE.stagger * 3, duration: SEQUENCE.duration }}
      >
        {projects.map((p) => (
          <div
            key={p.title}
            className="relative border border-[#EAEAEA]/20 bg-[#070707] p-4 sm:p-5 h-full flex flex-col hover:border-[#EAEAEA]/30 transition-colors"
          >
            <CornerPlus className="-top-px -left-px -translate-x-1/2 -translate-y-1/2" />
            <CornerPlus className="-top-px -right-px translate-x-1/2 -translate-y-1/2" />
            <CornerPlus className="-bottom-px -left-px -translate-x-1/2 translate-y-1/2" />
            <CornerPlus className="-bottom-px -right-px translate-x-1/2 translate-y-1/2" />
            <p className={`${LABEL_CLASS} text-[10px] mb-1`}>{p.year}</p>
            <h2 className={`${TITLE_CLASS} text-lg mb-2`}>{p.title}</h2>
            <p className={`${BODY_SMALL} mb-3 flex-1`}>{p.desc}</p>
            <div className="flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <Badge key={t} variant="outline" className={`${CHIP_CLASS} text-[#EAEAEA]/80 border-[#EAEAEA]/25`}>
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </SectionLayout>
  );
}
