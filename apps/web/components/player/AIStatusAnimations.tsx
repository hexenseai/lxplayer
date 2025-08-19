"use client";
import React from 'react';
import { motion } from 'framer-motion';

interface AIStatusAnimationsProps {
  isTTSPlaying: boolean;
  isMicrophoneActive: boolean;
}

export function AIStatusAnimations({ isTTSPlaying, isMicrophoneActive }: AIStatusAnimationsProps) {
  return (
    <div className="flex items-center space-x-3">
      {/* AI Status Animations */}
      <div className="flex items-center space-x-2">
        {/* AI Speaking Animation */}
        {isTTSPlaying && (
          <motion.div 
            className="flex items-center space-x-2 text-purple-400"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 h-4 bg-purple-400 rounded-full"
                  animate={{
                    scaleY: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
            <motion.span 
              className="text-xs font-medium"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              AI Konuşuyor
            </motion.span>
          </motion.div>
        )}
        
        {/* AI Listening Animation */}
        {isMicrophoneActive && (
          <motion.div 
            className="flex items-center space-x-2 text-blue-400"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative">
              <motion.div
                className="w-3 h-3 bg-blue-400 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [1, 0.3, 1]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div
                className="absolute top-0 left-0 w-3 h-3 bg-blue-400 rounded-full"
                animate={{
                  scale: [1, 2, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
            </div>
            <motion.span 
              className="text-xs font-medium"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              AI Dinliyor
            </motion.span>
          </motion.div>
        )}
        
        {/* AI Ready Animation */}
        {!isTTSPlaying && !isMicrophoneActive && (
          <motion.div 
            className="flex items-center space-x-2 text-green-400"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="w-2 h-2 bg-green-400 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.span 
              className="text-xs font-medium"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              AI Hazır
            </motion.span>
          </motion.div>
        )}
      </div>
      
      {/* Microphone Status */}
      {isMicrophoneActive && (
        <motion.div 
          className="flex items-center space-x-1 text-red-400"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="w-2 h-2 bg-red-400 rounded-full"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <span className="text-xs">Mikrofon Aktif</span>
        </motion.div>
      )}
    </div>
  );
}
