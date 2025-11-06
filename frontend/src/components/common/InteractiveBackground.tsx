import React, { useEffect, useRef, useState } from 'react';

interface InteractiveBackgroundProps {
  className?: string;
  opacity?: number;
  isPaused?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  size: number;
  color: string;
}


const InteractiveBackground: React.FC<InteractiveBackgroundProps> = ({ 
  className = '', 
  opacity = 0.3,
  isPaused = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoverTarget, setHoverTarget] = useState<{ x: number; y: number } | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);
  const shouldAnimateRef = useRef(true);
  // Initialize with branding colors: Blue (#1E90FF), White (#FFFFFF), Red (#FF5A5F)
  const getRandomBrandingColor = () => {
    const brandingColors = ['#1E90FF', '#FFFFFF', '#FF5A5F']; // Blue, White, Red
    return brandingColors[Math.floor(Math.random() * brandingColors.length)];
  };
  
  const initialColor = getRandomBrandingColor();
  const [currentBgColor, setCurrentBgColor] = useState(initialColor);
  const containerRef = useRef<HTMLDivElement>(null);
  const targetBgColorRef = useRef(initialColor);
  const bgColorTransitionRef = useRef(1); // 0 = current, 1 = target (for smooth transition)
  const lastColorChangeRef = useRef(0); // Track last color change time for throttling
  
  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 }; // Default to white
  };

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      setIsInteracting(true);
      shouldAnimateRef.current = true;
      
      setTimeout(() => {
        setIsInteracting(false);
      }, 1500);
    };

    // Track card hover positions via custom event
    const handleCardHover = (e: CustomEvent) => {
      if (e.detail && e.detail.hovered && e.detail.x && e.detail.y) {
        setHoverTarget({ x: e.detail.x, y: e.detail.y });
        
        // Randomly change background color when card is hovered (use branding colors)
        const brandingColors = ['#1E90FF', '#FFFFFF', '#FF5A5F']; // Blue, White, Red
        const randomColor = brandingColors[Math.floor(Math.random() * brandingColors.length)];
        targetBgColorRef.current = randomColor;
        bgColorTransitionRef.current = 0; // Start transition
        lastColorChangeRef.current = Date.now();
      } else if (e.detail && e.detail.hovered === false) {
        setHoverTarget(null);
        // Use branding colors
        const brandingColors = ['#1E90FF', '#FFFFFF', '#FF5A5F']; // Blue, White, Red
        const randomColor = brandingColors[Math.floor(Math.random() * brandingColors.length)];
        targetBgColorRef.current = randomColor;
        bgColorTransitionRef.current = 0;
        lastColorChangeRef.current = Date.now();
      }
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    // Track input focus (pause animation)
    const handleInputFocus = () => {
      setIsInteracting(true);
      shouldAnimateRef.current = false;
    };
    
    const handleInputBlur = () => {
      setTimeout(() => {
        setIsInteracting(false);
        shouldAnimateRef.current = true;
      }, 500);
    };

    // Listen for card hover events
    window.addEventListener('cardHover', handleCardHover as EventListener);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('focusin', handleInputFocus);
    document.addEventListener('focusout', handleInputBlur);

    return () => {
      window.removeEventListener('cardHover', handleCardHover as EventListener);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('focusin', handleInputFocus);
      document.removeEventListener('focusout', handleInputBlur);
    };
  }, []);

  // Initialize particles
  useEffect(() => {
    const particleCount = 25;
    particlesRef.current = Array.from({ length: particleCount }, (_, i) => ({
      x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 0,
      y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : 0,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      targetX: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 0,
      targetY: typeof window !== 'undefined' ? Math.random() * window.innerHeight : 0,
      size: 1 + Math.random() * 2,
      // Use branding colors: Blue (#1E90FF), White (#FFFFFF), Red (#FF5A5F)
      color: i % 3 === 0 ? 'rgba(30, 144, 255, 0.4)' : i % 3 === 1 ? 'rgba(255, 90, 95, 0.3)' : 'rgba(255, 255, 255, 0.2)'
    }));
  }, []);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const animate = () => {
      if (!ctx) return;
      
      const shouldAnimate = !isPaused && !isInteracting && shouldAnimateRef.current;
      
      // Slow down animation when interacting or paused
      if (shouldAnimate) {
        timeRef.current += 0.01;
      } else {
        timeRef.current += 0.002; // Very slow when paused
      }

      
      // Smooth color transition
      if (bgColorTransitionRef.current < 1) {
        bgColorTransitionRef.current += 0.08; // Smooth transition speed
        if (bgColorTransitionRef.current > 1) {
          bgColorTransitionRef.current = 1;
        }
        
        // Interpolate between current and target color
        const current = hexToRgb(currentBgColor);
        const target = hexToRgb(targetBgColorRef.current);
        const t = bgColorTransitionRef.current;
        
        const r = Math.round(current.r + (target.r - current.r) * t);
        const g = Math.round(current.g + (target.g - current.g) * t);
        const b = Math.round(current.b + (target.b - current.b) * t);
        
        const interpolatedColor = `rgb(${r}, ${g}, ${b})`;
        
        // Update container div background directly (bypasses React batching)
        if (containerRef.current) {
          containerRef.current.style.backgroundColor = interpolatedColor;
        }
        
        // Update current color when transition is complete
        if (bgColorTransitionRef.current >= 1) {
          setCurrentBgColor(targetBgColorRef.current);
          if (containerRef.current) {
            containerRef.current.style.backgroundColor = targetBgColorRef.current;
          }
        }
        
        ctx.fillStyle = interpolatedColor;
      } else {
        // Use hex color for final state
        const finalColor = hexToRgb(currentBgColor);
        const finalColorString = `rgb(${finalColor.r}, ${finalColor.g}, ${finalColor.b})`;
        if (containerRef.current) {
          containerRef.current.style.backgroundColor = currentBgColor;
        }
        ctx.fillStyle = finalColorString;
      }
      
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    animate();
    setIsLoaded(true);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [opacity, isPaused, isInteracting, mousePos, hoverTarget, scrollY, currentBgColor]);

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 z-0 pointer-events-none ${className}`}
      style={{ 
        background: currentBgColor,
        transition: 'background-color 0.3s ease'
      }}
    >
      <canvas
        ref={canvasRef}
        className={`w-full h-full transition-opacity duration-1000 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          background: 'transparent',
          display: 'block'
        }}
      />
    </div>
  );
};

export default InteractiveBackground;
