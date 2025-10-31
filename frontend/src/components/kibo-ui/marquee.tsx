import React from 'react';

// Simple utility function to combine class names
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

interface MarqueeProps {
  className?: string;
  children: React.ReactNode;
  direction?: 'left' | 'right';
  speed?: 'slow' | 'normal' | 'fast';
  pauseOnHover?: boolean;
}

export const Marquee: React.FC<MarqueeProps> = ({
  className,
  children,
  direction = 'left',
  speed = 'normal',
  pauseOnHover = true,
}) => {
  const speedClasses = {
    slow: 'animate-marquee-slow',
    normal: 'animate-marquee',
    fast: 'animate-marquee-fast',
  };

  return (
    <div
      className={cn(
        'relative flex w-full overflow-hidden',
        className
      )}
    >
      <div
        className={cn(
          'flex shrink-0',
          direction === 'left' ? speedClasses[speed] : 'animate-marquee-reverse',
          pauseOnHover && 'hover:[animation-play-state:paused]'
        )}
      >
        {children}
      </div>
    </div>
  );
};

interface MarqueeContentProps {
  className?: string;
  children: React.ReactNode;
}

export const MarqueeContent: React.FC<MarqueeContentProps> = ({
  className,
  children,
}) => {
  return (
    <>
      <div className={cn('flex', className)}>
        {children}
      </div>
      <div className={cn('flex', className)} aria-hidden="true">
        {children}
      </div>
    </>
  );
};

interface MarqueeFadeProps {
  side: 'left' | 'right';
  className?: string;
}

export const MarqueeFade: React.FC<MarqueeFadeProps> = ({
  side,
  className,
}) => {
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-0 z-10 h-full w-20',
        side === 'left' ? 'left-0 bg-gradient-to-r from-background to-transparent' : 'right-0 bg-gradient-to-l from-background to-transparent',
        className
      )}
    />
  );
};

interface MarqueeItemProps {
  className?: string;
  children: React.ReactNode;
}

export const MarqueeItem: React.FC<MarqueeItemProps> = ({
  className,
  children,
}) => {
  return (
    <div className={cn('flex-shrink-0', className)}>
      {children}
    </div>
  );
};
