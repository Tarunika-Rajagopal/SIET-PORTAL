'use client';

import React, { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import portalBackgroundImage from "@/assets/Gemini_Generated_Image_y1z7qsy1z7qsy1z7.png";

export interface GrainientBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  backgroundImage?: string;
  overlayClassName?: string;
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
}

export const DEEP_TEAL_PALETTE = {
  color1: "#5CE1E6",
  color2: "#176B7A",
  color3: "#0B3C49",
};

const GrainientBackground = forwardRef<HTMLDivElement, GrainientBackgroundProps>(
  (
    {
      children,
      className,
      backgroundImage = portalBackgroundImage,
      overlayClassName,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        data-slot="portal-background"
        className={cn("relative isolate min-h-screen w-full", className)}
        {...props}
      >
        {/* Full-viewport fixed Background Image */}
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none"
        >
          <img
            src={backgroundImage}
            alt=""
            className="fixed inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
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
