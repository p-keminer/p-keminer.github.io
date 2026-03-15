import { motion } from "framer-motion";
import Sha256CrackerPuzzle from "./Sha256CrackerPuzzle";

interface Sha256CrackerModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export default function Sha256CrackerModal({ onClose, onComplete }: Sha256CrackerModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 64,
        display: "flex",
        alignItems: "safe center",
        justifyContent: "center",
        overflowY: "auto",
        padding: 8,
        background: "rgba(2, 4, 10, 0.76)",
        backdropFilter: "blur(10px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <Sha256CrackerPuzzle
          onSolved={() => {
            onComplete();
            onClose();
          }}
          onClose={onClose}
        />
      </motion.div>
    </motion.div>
  );
}
