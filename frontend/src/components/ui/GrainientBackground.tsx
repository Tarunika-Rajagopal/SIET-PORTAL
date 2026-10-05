'use client';

import React, { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import Grainient, { type GrainientProps } from "./Grainient";

export interface GrainientBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  color1?: string;
  color2?: string;
  color3?: string;
  timeSpeed?: number;
  colorBalance?: number;
  warpStrength?: number;
  warpFrequency?: number;
  warpSpeed?: number;
  warpAmplitude?: number;
  blendAngle?: number;
  blendSoftness?: number;
  rotationAmount?: number;
  noiseScale?: number;
  grainAmount?: number;
  grainScale?: number;
  grainAnimated?: boolean;
  contrast?: number;
  gamma?: number;
  saturation?: number;
  centerX?: number;
  centerY?: number;
  zoom?: number;
  lightMode?: boolean;
  overlayClassName?: string;
}

export const DEEP_TEAL_PALETTE = {
  color1: "#5CE1E6", // Radiant cyan-aqua highlight
  color2: "#176B7A", // Core Deep Teal (requested hex: #176B7A)
  color3: "#0B3C49", // Deep oceanic teal baseline
};

const GrainientBackground = forwardRef<HTMLDivElement, GrainientBackgroundProps>(
  (
    {
      children,
      className,
      color1 = DEEP_TEAL_PALETTE.color1,
      color2 = DEEP_TEAL_PALETTE.color2,
      color3 = DEEP_TEAL_PALETTE.color3,
      timeSpeed = 0.25,
      colorBalance = 0.0,
      warpStrength = 1.0,
      warpFrequency = 5.0,
      warpSpeed = 2.0,
      warpAmplitude = 50.0,
      blendAngle = 0.0,
      blendSoftness = 0.05,
      rotationAmount = 500.0,
      noiseScale = 2.0,
      grainAmount = 0.1,
      grainScale = 2.0,
      grainAnimated = false,
      contrast = 1.5,
      gamma = 1.0,
      saturation = 1.0,
      centerX = 0.0,
      centerY = 0.0,
      zoom = 0.9,
      lightMode = false,
      overlayClassName,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        data-slot="grainient-background"
        className={cn("relative isolate min-h-screen w-full", className)}
        {...props}
      >
        {/* Full-viewport fixed WebGL Grainient Canvas */}
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
        >
          <Grainient
            color1={color1}
            color2={color2}
            color3={color3}
            timeSpeed={timeSpeed}
            colorBalance={colorBalance}
            warpStrength={warpStrength}
            warpFrequency={warpFrequency}
            warpSpeed={warpSpeed}
            warpAmplitude={warpAmplitude}
            blendAngle={blendAngle}
            blendSoftness={blendSoftness}
            rotationAmount={rotationAmount}
            noiseScale={noiseScale}
            grainAmount={grainAmount}
            grainScale={grainScale}
            grainAnimated={grainAnimated}
            contrast={contrast}
            gamma={gamma}
            saturation={saturation}
            centerX={centerX}
            centerY={centerY}
            zoom={zoom}
            lightMode={lightMode}
            className="w-full h-full"
          />
          {overlayClassName && (
            <div className={cn("absolute inset-0 pointer-events-none", overlayClassName)} />
          )}
        </div>

        {children}
      </div>
    );
  }
);

GrainientBackground.displayName = "GrainientBackground";

export default GrainientBackground;
export { GrainientBackground };
