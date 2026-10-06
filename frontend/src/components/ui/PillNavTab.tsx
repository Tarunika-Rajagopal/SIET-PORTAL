'use client';

import React, { useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { gsap } from 'gsap';

export interface PillNavTabProps {
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  to?: string;
  id?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  hoverColor?: string;
  ease?: string;
}

export const PillNavTab: React.FC<PillNavTabProps> = ({
  children,
  isActive = false,
  onClick,
  to,
  id,
  badge,
  icon,
  className = '',
  activeClassName = 'bg-black/10 text-[#111111] font-bold shadow-xs border border-black/15 backdrop-blur-md',
  inactiveClassName = 'text-[#111111]/75 font-bold hover:text-[#111111]',
  hoverColor = 'rgba(0, 0, 0, 0.08)',
  ease = 'power2.out'
}) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const circleRef = useRef<HTMLSpanElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const circle = circleRef.current;
    if (!container || !circle) return;

    const setupLayout = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width || 120;
      const h = rect.height || 38;
      const R = ((w * w) / 4 + h * h) / (2 * h);
      const D = Math.ceil(2 * R) + 4;
      const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 2;
      const originY = D - delta;

      circle.style.width = `${D}px`;
      circle.style.height = `${D}px`;
      circle.style.bottom = `-${delta}px`;

      gsap.set(circle, {
        xPercent: -50,
        scale: 0,
        transformOrigin: `50% ${originY}px`
      });

      tlRef.current?.kill();
      const tl = gsap.timeline({ paused: true });
      tl.to(circle, {
        scale: 1.25,
        xPercent: -50,
        duration: 0.28,
        ease,
        overwrite: 'auto'
      });
      tlRef.current = tl;
    };

    setupLayout();

    const ro = new ResizeObserver(setupLayout);
    ro.observe(container);

    return () => {
      ro.disconnect();
      tlRef.current?.kill();
    };
  }, [ease]);

  const handleMouseEnter = () => {
    tlRef.current?.play();
  };

  const handleMouseLeave = () => {
    tlRef.current?.reverse();
  };

  const sharedInner = (
    <>
      {/* GSAP Pill Expanding Hover Bubble */}
      <span
        ref={circleRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 bottom-0 rounded-full z-[1] block backdrop-blur-xs border border-black/10 shadow-2xs"
        style={{
          background: hoverColor,
          willChange: 'transform'
        }}
      />

      {/* Main Pill Content: Icon + Label */}
      <span className="relative z-[2] inline-flex items-center gap-2 font-bold">
        {icon}
        <span className="leading-tight tracking-[0.15px] font-bold">{children}</span>
      </span>

      {/* Optional Badge */}
      {badge && <span className="relative z-[2] ml-0.5">{badge}</span>}
    </>
  );

  const baseClasses = `relative overflow-hidden inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full cursor-pointer transition-all duration-200 select-none text-[13.5px] sm:text-[14px] ${
    isActive ? activeClassName : inactiveClassName
  } ${className}`.trim();

  if (to) {
    return (
      <NavLink
        to={to}
        id={id}
        ref={el => {
          containerRef.current = el;
        }}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={({ isActive: routerActive }) => {
          const isCurrent = isActive || routerActive;
          return `relative overflow-hidden inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full cursor-pointer transition-all duration-200 select-none text-[13.5px] sm:text-[14px] ${
            isCurrent ? activeClassName : inactiveClassName
          } ${className}`.trim();
        }}
      >
        {sharedInner}
      </NavLink>
    );
  }

  return (
    <button
      type="button"
      id={id}
      ref={el => {
        containerRef.current = el;
      }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={baseClasses}
    >
      {sharedInner}
    </button>
  );
};

export default PillNavTab;
