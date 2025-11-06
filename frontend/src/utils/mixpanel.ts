import mixpanel from "mixpanel-browser";

// Initialize Mixpanel with explicit configuration
const MIXPANEL_TOKEN = '47c0b008d22647e850fbccf27494cc37';

// Initialize Mixpanel immediately
mixpanel.init(MIXPANEL_TOKEN, {
  autocapture: true,
  record_sessions_percent: 100,
  api_host: 'https://api-eu.mixpanel.com',
  debug: true, // Always enable debug in development
  ignore_dnt: true, // Track even if Do Not Track is enabled
  batch_requests: true, // Batch requests for efficiency
  batch_size: 1, // Send immediately (batch size of 1)
  batch_flush_interval_ms: 0, // Don't wait, send immediately
  loaded: (mixpanelInstance) => {
    console.log('✅ Mixpanel initialized successfully');
    console.log('Mixpanel instance:', mixpanelInstance);
    console.log('Mixpanel config:', {
      token: MIXPANEL_TOKEN,
      api_host: 'https://api-eu.mixpanel.com',
      debug: true,
    });
    
    // Test event immediately after initialization
    setTimeout(() => {
      try {
        console.log('📊 Sending test event...');
        mixpanelInstance.track('Mixpanel Test Event', {
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          url: window.location.href,
        });
        // Force flush immediately (if method exists)
        if (typeof mixpanelInstance.flush === 'function') {
          mixpanelInstance.flush();
          console.log('✅ Test event sent and flushed');
        } else {
          console.log('✅ Test event sent (flush not available)');
        }
      } catch (error) {
        console.error('❌ Error sending test event:', error);
      }
    }, 1000);
  },
});

// Verify Mixpanel is initialized
console.log('🔍 Mixpanel initialization status:', mixpanel.__loaded);

// Export mixpanel instance
export default mixpanel;

// Helper function to track page views
export const trackPageView = (pageName: string, additionalProperties?: Record<string, any>) => {
  try {
    console.log('📊 Tracking page view:', pageName);
    mixpanel.track('Page View', {
      page: pageName,
      ...additionalProperties,
    });
    // Force flush to send immediately (if method exists)
    if (typeof mixpanel.flush === 'function') {
      mixpanel.flush();
      console.log('✅ Page view tracked and flushed');
    } else {
      console.log('✅ Page view tracked (flush not available)');
    }
  } catch (error) {
    console.error('❌ Error tracking page view:', error);
  }
};

// Test function to manually trigger an event
export const testMixpanel = () => {
  console.log('🧪 Testing Mixpanel...');
  console.log('Mixpanel loaded:', mixpanel.__loaded);
  console.log('Mixpanel token:', MIXPANEL_TOKEN);
  console.log('Mixpanel config:', mixpanel.get_config());
  
  try {
    mixpanel.track('Manual Test Event', {
      test: true,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });
    // Force flush to send immediately (if method exists)
    if (typeof mixpanel.flush === 'function') {
      mixpanel.flush();
      console.log('✅ Manual test event sent and flushed');
    } else {
      console.log('✅ Manual test event sent (flush not available)');
    }
    
    // Check if there are pending requests
    console.log('Pending requests:', mixpanel.__request_queue || 'No queue');
  } catch (error) {
    console.error('❌ Error in manual test:', error);
  }
};

