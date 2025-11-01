"use client";

import React from "react";
// Import framer-motion. You'll need to install it:
// npm install framer-motion
// or
// yarn add framer-motion
import { motion } from "framer-motion";

/**
 * @function Loading
 * A full-screen loading component with a "curtain" reveal animation.
 * This is the default export for Next.js app/loading.js
 */
export default function Loading() {
  // Variants for the main screen animation (the "curtain")
  const screenVariants = {
    initial: {
      y: "-100%", // Start off-screen at the top
    },
    animate: {
      y: 0, // Animate to fill the screen
      transition: {
        duration: 0.8,
        ease: [0.83, 0, 0.17, 1], // A smooth cubic-bezier curve
      },
    },
    exit: {
      y: "100%", // Exit by sliding off-screen to the bottom
      transition: {
        duration: 0.8,
        ease: [0.83, 0, 0.17, 1],
        delay: 0.2, // Wait just a moment before exiting
      },
    },
  };

  // Variants for the content (logo, text) to fade in
  const contentVariants = {
    initial: {
      opacity: 0,
      y: 20,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: 0.5, // Fade in after the curtain is mostly up
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.3,
        ease: "easeIn",
      },
    },
  };

  return (
    <>
      {/* This <style> tag contains all the CSS for the loading screen. */}
      <style>{`
        body, html {
          /* We don't control body/html from here, 
             but we ensure our screen covers everything */
        }

        .loading-screen {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          
          /* --- Light Mode Colors (Default) --- */
          --loading-bg: #ffffff;
          --loading-text-primary: #000000;
          --loading-text-secondary: #4a4a4a;
          --progress-bar-bg: rgba(0, 0, 0, 0.1);
          --progress-bar-shimmer-color: rgba(0, 0, 0, 0.2);
          
          background-color: var(--loading-bg);
          z-index: 9999;
          overflow: hidden;
        }

        /* 2. Define dark mode overrides */
        @media (prefers-color-scheme: dark) {
          .loading-screen {
            --loading-bg: #000000;
            --loading-text-primary: #ffffff;
            --loading-text-secondary: #b0b0b0;
            --progress-bar-bg: rgba(255, 255, 255, 0.2);
            --progress-bar-shimmer-color: rgba(255, 255, 255, 0.8);
          }
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem; /* Space out the elements */
          /* Apply a clean system font stack to all content */
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .logo {
          font-size: 4.5rem; /* Large, confident logo */
          font-weight: 700;
          color: var(--loading-text-primary); /* Use variable */
          letter-spacing: -2px; /* Tighter letter spacing */
          margin: 0;
          /* font-family removed, inherits from .loading-content */
        }

        .loading-text {
          font-size: 1rem;
          color: var(--loading-text-secondary); /* Use variable */
          font-weight: 500;
          margin: 0;
          /* font-family removed, inherits from .loading-content */
        }
        
        /* Added progress bar styles */
        .progress-bar {
          width: 14rem; /* 224px */
          height: 6px;
          background-color: var(--progress-bar-bg); /* Use variable */
          border-radius: 3px;
          overflow: hidden;
          position: relative;
        }
        
        .progress-bar-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          width: 50%; /* Width of the shimmer gradient */
          height: 100%;
          /* Use variable */
          background: linear-gradient(90deg, transparent, var(--progress-bar-shimmer-color), transparent);
        }
      `}</style>

      <motion.div
        className="loading-screen"
        variants={screenVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <motion.div
          className="loading-content"
          variants={contentVariants}
        >
          <h1 className="logo">gathr</h1>
          {/* Replaced spinner with indeterminate progress bar */}
          <div className="progress-bar">
            <motion.div
              className="progress-bar-shimmer"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </div>
          <p className="loading-text">Gathering your finds...</p>
        </motion.div>
      </motion.div>
    </>
  );
}

