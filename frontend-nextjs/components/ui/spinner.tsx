"use client";

import React from "react";

interface SpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 28,
  color = "#ffffff",
  className = "",
}) => {
  const blades = 8;
  const bladeWidth = size * 0.14;
  const bladeHeight = size * 0.35;
  const gap = size * 0.2;
  const duration = 0.8;

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {[...Array(blades)].map((_, i) => {
        const rotate = (360 / blades) * i;

        return (
          <div className="bg-black/50 dark:bg-white/50"
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: bladeWidth,
              height: bladeHeight,
              // backgroundColor: color,
              borderRadius: bladeWidth / 2,
              transform: `
                translate(-50%, calc(-100% - ${gap}px))
                rotate(${rotate}deg)
              `,
              transformOrigin: `center ${bladeHeight + gap}px`,
              animation: `mac-fade ${duration}s linear infinite`,
              animationDelay: `-${(duration / blades) * (blades - i)}s`, // 👈 fixed direction
            }}
          />
        );
      })}

      <style jsx>{`
        @keyframes mac-fade {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0.15;
          }
        }
      `}</style>
    </div>
  );
};