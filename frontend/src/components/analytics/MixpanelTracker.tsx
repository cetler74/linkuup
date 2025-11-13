import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import mixpanel, { trackPageView } from '../../utils/mixpanel';

/**
 * Component to track page views and route changes in Mixpanel
 * Should be placed inside the Router component
 */
export const MixpanelTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Small delay to ensure Mixpanel is fully initialized
    const timer = setTimeout(() => {
      // Track page view on route change
      const pageName = location.pathname || 'Unknown';
      
      console.log('📍 Route changed, tracking page view:', pageName);
      
      // Track custom page view event
      trackPageView(pageName, {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      });

      // Also track with Mixpanel's built-in page view tracking ($pageview)
      try {
        mixpanel.track('$pageview', {
          page: pageName,
          pathname: location.pathname,
          search: location.search,
        });
        // Force flush immediately (if method exists)
        if (typeof mixpanel.flush === 'function') {
          mixpanel.flush();
          console.log('✅ $pageview event sent and flushed');
        } else {
          console.log('✅ $pageview event sent (flush not available)');
        }
      } catch (error) {
        console.error('❌ Error tracking $pageview:', error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [location]);

  return null; // This component doesn't render anything
};

