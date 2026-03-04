import { useState, useEffect, useRef } from 'react';
import { useGameConfig } from '../../config/GameConfigContext.tsx';

interface CategorySection {
  group: string;
  elementId: string;
}

interface Props {
  sections: CategorySection[];
  containerRef: React.RefObject<HTMLElement | null>;
}

export default function ScrollProgressRail({ sections, containerRef }: Props) {
  const { filterColors } = useGameConfig();
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!containerRef.current || sections.length === 0) return;

    // Track which sections are visible
    const visibleSections = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleSections.delete(entry.target.id);
          }
        }

        // Find the most visible section
        let bestIdx = 0;
        let bestRatio = 0;
        for (const [id, ratio] of visibleSections) {
          const idx = sections.findIndex((s) => s.elementId === id);
          if (idx >= 0 && ratio > bestRatio) {
            bestRatio = ratio;
            bestIdx = idx;
          }
        }
        setActiveIndex(bestIdx);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], root: null },
    );

    for (const section of sections) {
      const el = document.getElementById(section.elementId);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [sections, containerRef]);

  // Track overall scroll progress
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleScroll() {
      if (!container) return;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      if (scrollHeight > 0) {
        setScrollProgress(scrollTop / scrollHeight);
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef]);

  if (sections.length <= 1) return null;

  return (
    <div className="fixed right-2 top-1/2 z-20 hidden -translate-y-1/2 lg:flex flex-col items-center gap-0">
      {/* Overall progress line */}
      <div className="absolute inset-y-0 w-px bg-edge-700/20">
        <div
          className="w-full bg-gold-600/40 transition-all duration-200"
          style={{ height: `${scrollProgress * 100}%` }}
        />
      </div>

      {sections.map((section, i) => {
        const isActive = i === activeIndex;
        const dotColor = filterColors[section.group]?.dot ?? 'bg-edge-400';
        return (
          <button
            key={section.elementId}
            onClick={() => {
              document.getElementById(section.elementId)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
            }}
            className="relative z-10 flex items-center gap-2 py-1.5 group"
            title={section.group}
          >
            <span
              className={`rounded-full transition-all duration-200 ${dotColor} ${
                isActive
                  ? 'h-2.5 w-2.5 opacity-100 shadow-[0_0_6px_currentColor]'
                  : 'h-1.5 w-1.5 opacity-40 group-hover:opacity-70'
              }`}
            />
            {/* Label on hover */}
            <span className={`absolute right-full mr-3 whitespace-nowrap font-label text-[10px] font-semibold tracking-wider uppercase transition-opacity ${
              isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-40'
            }`}>
              {section.group}
            </span>
          </button>
        );
      })}
    </div>
  );
}
