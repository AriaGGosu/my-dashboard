import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SectionLayout } from "@/components/layout/SectionLayout";
import { ContactVisual } from "@/components/visuals/ContactVisual";
import { NarrativeParagraph } from "@/components/ui/narrative-text";
import { Mail, Linkedin, Github } from "lucide-react";
import { TITLE_PAGE, TITLE_CLASS, BODY_CLASS, LABEL_CLASS } from "@/lib/design-tokens";

const SEQUENCE = { stagger: 0.15, duration: 0.5 };

export default function Contact() {
  return (
    <SectionLayout
      label={
        <motion.p
          className={`${LABEL_CLASS} mb-4`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0, duration: SEQUENCE.duration }}
        >
          CONTACT
        </motion.p>
      }
      title={
        <motion.h1
          className={`${TITLE_CLASS} ${TITLE_PAGE} mb-8`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: SEQUENCE.stagger * 1, duration: SEQUENCE.duration }}
        >
          The last chapter is yours to write.
        </motion.h1>
      }
      visual={
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: SEQUENCE.stagger * 3, duration: SEQUENCE.duration }}
        >
          <ContactVisual />
        </motion.div>
      }
    >
      <NarrativeParagraph
        lines={[
          "If you believe that interfaces should feel as much as they function—",
          "whether it's a product, a campaign, or something we haven't named yet—let's build it together.",
        ]}
        bodyClass={BODY_CLASS}
        className="mb-8"
      />
      <motion.div
        className="flex flex-wrap gap-4"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: SEQUENCE.stagger * 3, duration: SEQUENCE.duration }}
      >
        <Button
          variant="outline"
          size="lg"
          className="body-font text-base tracking-wider border border-[#EAEAEA]/20 bg-[#070707] text-[#EAEAEA] shadow-none hover:bg-[#070707] hover:border-[#EAEAEA]/30 transition-colors gap-2"
        >
          <Mail className="size-4" />
          Email
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="body-font text-base tracking-wider border border-[#EAEAEA]/20 bg-[#070707] text-[#EAEAEA] shadow-none hover:bg-[#070707] hover:border-[#EAEAEA]/30 transition-colors gap-2"
        >
          <Linkedin className="size-4" />
          LinkedIn
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="body-font text-base tracking-wider border border-[#EAEAEA]/20 bg-[#070707] text-[#EAEAEA] shadow-none hover:bg-[#070707] hover:border-[#EAEAEA]/30 transition-colors gap-2"
        >
          <Github className="size-4" />
          GitHub
        </Button>
      </motion.div>
    </SectionLayout>
  );
}
