import React from "react";
import { motion } from "framer-motion";

export default function Frame1() {
  return (
    <main className="max-w-[1013px] w-full mx-auto relative min-h-[652px] bg-figma-primary overflow-clip flex flex-col items-center">
      {/* Background Layers */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          className="w-full h-full object-cover absolute inset-0 z-[0]"
          src="https://media.base44.com/images/public/69b2e952528daefdb8ba4906/9788cc640_3062b4ba9_e499294bd1653e160a748d7d4da961fbf9f81ba4.png"
          alt="Background Layer 1"
        />
        <img
          className="w-full h-full object-cover absolute inset-0 z-[1]"
          src="https://media.base44.com/images/public/69b2e952528daefdb8ba4906/9788cc640_3062b4ba9_e499294bd1653e160a748d7d4da961fbf9f81ba4.png"
          alt="Background Layer 2"
        />
        <img
          className="w-full h-full object-cover absolute inset-0 z-[2]"
          src="https://media.base44.com/images/public/69b2e952528daefdb8ba4906/9788cc640_3062b4ba9_e499294bd1653e160a748d7d4da961fbf9f81ba4.png"
          alt="Background Overlay"
        />
      </div>

      {/* Main Content Column */}
      <div className="relative z-10 flex flex-col w-full max-w-[556px] pt-[clamp(16px,6.4vw,65px)] pb-[28px] px-4 md:px-0">

        {/* Hero Image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex justify-center mb-[2px] relative group"
        >
          <img
            src="https://media.base44.com/images/public/69b2e952528daefdb8ba4906/b1548cc98_3fea7dbff_67b3140ca13276426ed602886b544a9fa809adcc.png"
            className="w-full max-w-[333px] h-auto md:h-[462px] object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            alt="Hero Image"
          />
        </motion.div>

        {/* Status Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="flex items-center gap-[14px] pl-[14px] mb-[6px] h-4"
        >
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="w-1 h-1 rounded-[50%] bg-figma-primary shadow-[0px_0px_1px_0px_rgba(255,255,255,1.00),_0px_0px_1px_0px_rgba(255,255,255,1.00),_0px_0px_4px_0px_rgba(255,255,255,1.00),_0px_0px_8px_0px_rgba(255,255,255,1.00),_0px_0px_14px_0px_rgba(255,255,255,1.00),_0px_0px_25px_0px_rgba(255,255,255,1.00)] shrink-0"
          />
          <p
            className="text-figma-12 font-normal font-heading leading-figma-16 bg-clip-text shrink-0"
            style={{ WebkitTextFillColor: "transparent" }}
          >
            Connexion...
          </p>
        </motion.div>

        {/* Prompt Input Area */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="flex flex-row items-center gap-[13px] w-full mb-[6px]"
        >
          <div className="flex-1 h-14 rounded-[54px] border border-white/20 bg-figma-secondary/50 ring-1 ring-inset ring-white/10 shadow-2xl backdrop-blur-2xl flex items-center justify-between pl-[21px] pr-[24px] cursor-text transition-all duration-300 hover:border-white/30 hover:bg-figma-secondary/60">
            <p
              className="text-figma-14 font-normal font-heading leading-figma-18 bg-clip-text truncate mr-4"
              style={{ WebkitTextFillColor: "transparent" }}
            >
              Start the studio to generate...
            </p>
            <div className="flex items-center gap-[5px] shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
              <p className="text-figma-10 font-normal font-paragraph leading-figma-12 text-figma-text-3">
                ↳
              </p>
              <p
                className="text-figma-14 font-normal font-heading leading-figma-18 bg-clip-text"
                style={{ WebkitTextFillColor: "transparent" }}
              >
                Editorial
              </p>
            </div>
          </div>
          <button className="w-14 h-14 shrink-0 rounded-[44px] border border-white/20 bg-figma-secondary/50 ring-1 ring-inset ring-white/10 shadow-2xl backdrop-blur-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 hover:border-white/30 hover:bg-figma-secondary/60 active:scale-95">
            <img src="https://media.base44.com/images/public/69b2e952528daefdb8ba4906/53a4264d2_087a97e65_6235_41.svg" className="w-4 h-4" alt="Submit" />
          </button>
        </motion.div>

        {/* Generation Metadata */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="flex flex-row flex-wrap justify-start items-center gap-2 pl-[14px]"
        >
          {[
            { label: "CFG", value: "3.2" },
            { label: "SEED", value: "27618993" },
            { label: "FORMAT", value: "4:3" },
            { label: "PX", value: "1.6" },
            { label: "SAMPLER", value: "RES_2S" },
            { label: "SCHEDULER", value: "KL_OPTIMAL" },
            { label: "STEPS", value: "45" },
          ].map((item, i) => (
            <div key={i} className="flex flex-row justify-start items-start gap-1 shrink-0 grow-0 w-auto h-auto overflow-clip">
              <p className="text-figma-10 font-normal font-figma-banana-grotesk leading-figma-11 text-figma-text-1 shrink-0 grow-0 w-auto h-auto">
                {item.label}
              </p>
              <p className="text-figma-10 font-normal font-figma-banana-grotesk leading-figma-11 text-figma-text-2 shrink-0 grow-0 w-auto h-auto">
                {item.value}
              </p>
            </div>
          ))}
        </motion.div>

      </div>
    </main>
  );
}