import React from "react";
import { motion } from "framer-motion";

export default function EntropyState3() {
  const specs = [
    { label: "CFG", value: "3.2" },
    { label: "SEED", value: "27618993" },
    { label: "FORMAT", value: "4:3" },
    { label: "PX", value: "1.6" },
    { label: "SAMPLER", value: "RES_2S" },
    { label: "SCHEDULER", value: "KL_OPTIMAL" },
    { label: "STEPS", value: "45" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-clip bg-black py-20 px-4 md:px-8">
      {/* Background Layers */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          className="absolute top-0 left-0 h-full w-full object-cover opacity-80 mix-blend-screen"
          src="https://media.base44.com/images/public/69b2e952528daefdb8ba4906/eeefe66bb_3cdd5b261_e499294bd1653e160a748d7d4da961fbf9f81ba4.png"
          alt=""
        />
        <img
          className="absolute top-0 left-0 h-full w-full object-cover opacity-60 mix-blend-overlay"
          src="https://media.base44.com/images/public/69b2e952528daefdb8ba4906/eeefe66bb_3cdd5b261_e499294bd1653e160a748d7d4da961fbf9f81ba4.png"
          alt=""
        />
        <img
          className="absolute top-0 left-0 h-full w-full object-cover"
          src="https://media.base44.com/images/public/69b2e952528daefdb8ba4906/eeefe66bb_3cdd5b261_e499294bd1653e160a748d7d4da961fbf9f81ba4.png"
          alt=""
        />
      </div>

      {/* Main Content Wrapper */}
      <motion.div
        className="relative z-10 flex w-full max-w-[699px] flex-col items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Image */}
        <motion.div variants={itemVariants} className="w-full max-w-[427px] mb-[29px]">
          <div className="relative w-full overflow-clip rounded-sm aspect-[427/593] shadow-2xl">
            <img
              className="absolute inset-0 h-full w-full object-cover object-center"
              src="https://media.base44.com/images/public/69b2e952528daefdb8ba4906/781376c63_9a4d5ea57_67b3140ca13276426ed602886b544a9fa809adcc.png"
              alt="Editorial Fashion Subject"
            />
          </div>
        </motion.div>

        {/* Input Section */}
        <motion.div variants={itemVariants} className="flex w-full flex-col">
          {/* Status Indicator */}
          <div className="mb-[9px] ml-[clamp(16px,2.9vw,42px)] flex items-center gap-[10px]">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="h-[5px] w-[5px] rounded-full bg-figma-primary shadow-[0px_0px_1px_0px_rgba(255,255,255,1.00),_0px_0px_1px_0px_rgba(255,255,255,1.00),_0px_0px_4px_0px_rgba(255,255,255,1.00),_0px_0px_8px_0px_rgba(255,255,255,1.00),_0px_0px_14px_0px_rgba(255,255,255,1.00),_0px_0px_25px_0px_rgba(255,255,255,1.00)]"
            />
            <p className="font-heading text-figma-14 font-normal leading-figma-18 text-figma-text-2">
              Connexion...
            </p>
          </div>

          {/* Input Row */}
          <div className="flex w-full flex-col sm:flex-row items-center gap-[20px]">
            {/* Fake Input Field */}
            <div className="relative flex min-h-[70px] w-full flex-1 items-center justify-between rounded-[54px] border border-white/10 bg-white/10 px-[30px] shadow-sm backdrop-blur-2xl transition-all hover:bg-white/[0.14] cursor-text">
              <p
                className="font-heading text-figma-20 font-normal leading-figma-26 truncate mr-4 text-figma-text-3"
              >
                Start the studio to generate...
              </p>

              <div className="flex items-center gap-[6px] shrink-0">
                <span className="font-figma-inter text-figma-14 font-normal leading-figma-17 text-figma-text-3">
                  ↳
                </span>
                <p
                  className="font-heading text-figma-20 font-normal leading-figma-26 text-figma-text-2"
                >
                  Editorial
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-[44px] border border-white/10 bg-white/10 shadow-sm backdrop-blur-2xl transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Submit generation"
            >
              <img className="h-[23px] w-[23px]" src="https://media.base44.com/images/public/69b2e952528daefdb8ba4906/929dd97d8_34548ba31_6339_94.svg" alt="" />
            </motion.button>
          </div>
        </motion.div>

        {/* Specs Footer */}
        <motion.div
          variants={itemVariants}
          className="mt-[18px] flex w-full flex-wrap items-center justify-center gap-x-[12px] gap-y-[8px] px-4 sm:px-0"
        >
          {specs.map((spec, index) => (
            <div key={index} className="flex items-center gap-[4px]">
              <span className="font-paragraph text-figma-12 font-normal leading-figma-13 text-figma-text-1 uppercase tracking-wider">
                {spec.label}
              </span>
              <span className="font-paragraph text-figma-12 font-normal leading-figma-13 text-figma-text-2">
                {spec.value}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </main>
  );
}