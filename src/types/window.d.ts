interface FacebookSDK {
  /**
   * XFBML processing methods
   */
  XFBML: {
    /**
     * Parse and render XFBML elements in the specified container or entire document
     * @param element Optional container element to scope parsing
     */
    parse: (element?: HTMLElement) => void;
  };

  /**
   * Initialize the Facebook SDK
   * @param config Configuration object
   */
  init: (config: { 
    xfbml: boolean; 
    version: string;
    appId?: string;
    status?: boolean;
    cookie?: boolean;
    autoLogAppEvents?: boolean;
  }) => void;
  ui: (response:{
    display: string;
    method: string;
    href?: string;
  }) => void;
  /**
   * Event subscription system
   */
  Event: {
    /**
     * Subscribe to Facebook SDK events
     * @param eventName Event name (e.g., 'xfbml.render')
     * @param callback Event handler
     */
    subscribe: (eventName: string, callback: (response?: (unknown)) => void) => void;
  };

  /**
   * Facebook Login methods
   */
  login: (
    callback: (response: {
      authResponse: {
        accessToken: string;
        expiresIn: number;
        signedRequest: string;
        userID: string;
      };
      status: string;
    }) => void,
    options?: { scope?: string; return_scopes?: boolean }
  ) => void;

  /**
   * API request methods
   */
  api: <T>(path: string, callback: (response: T) => void) => void;
}

interface TwitterSDK {
  widgets: {
    /**
     * Load Twitter widgets in specified element or entire page
     * @param element Optional DOM element to scope widget loading
     */
    load: (element?: HTMLElement) => void;

    /**
     * Create an embedded Tweet
     * @param tweetId Twitter Tweet ID
     * @param element Container element
     * @param options Configuration options
     */
    createTweet: (
      tweetId: string,
      element: HTMLElement,
      options?: {
        align?: 'left' | 'right' | 'center';
        theme?: 'light' | 'dark';
        conversation?: 'none' | 'all';
      }
    ) => Promise<void>;

    /**
     * Create a timeline widget
     * @param element Container element
     * @param options Timeline configuration
     */
    createTimeline: (
      config: { 
        sourceType: 'profile' | 'likes' | 'list' | 'collection'; 
        screenName: string 
      },
      element: HTMLElement,
      options?: {

        userId?: string;
        listId?: string;
        height?: number; 
        theme?: string; 
        tweetLimit?: number
        customTimeline?: string[];
      },
    ) => Promise<void>;
  };

  /**
   * Ready state handler
   */
  ready: (callback: () => void) => void;

  /**
   * Update all Twitter widgets on page
   */
  updateAll: () => void;
}

interface LinkedInSDK {
  /**
   * Initialize the LinkedIn SDK
   */
  init: () => void;

  /**
   * Parse LinkedIn plugins in specified element or entire document
   * @param element Optional container element
   */
  showBadge: (element?: HTMLDivElement) => void
  /**
   * Share content via LinkedIn
   */
  Share: {
    /**
     * Open share dialog
     * @param config Share configuration
     */
    openShareDialog: (config: {
      url: string;
      text?: string;
      showCount?: boolean;
    }) => void;
  };

  /**
   * Authentication methods
   */
  User: {
    /**
     * Check if user is authenticated
     */
    isAuthenticated: () => Promise<boolean>;
    
    /**
     * Initiate authentication flow
     */
    authorize: () => void;
  };

  /**
   * Plugins API
   */
  Plugins: {
    /**
     * Create a LinkedIn Follow button
     */
    FollowCompany: (config: {
      companyId: string;
      counter?: 'top' | 'right' | 'none';
    }) => HTMLElement;
    
    /**
     * Create a LinkedIn Share button
     */
    ShareButton: (config: {
      url: string;
      text?: string;
      showCount?: boolean;
    }) => HTMLElement;
  };
}
  
declare global {
    interface Window {
        gtag: (...args: unknown[]) => void;
        hj: (...args: unknown[]) => void;
        fbq: (...args: unknown[]) => void;
        FB: FacebookSDK;
        fbAsyncInit?: () => void
        twttr: TwitterSDK& {
            _e: unknown[];
            ready: (fn: () => void) => void;
          };
        instgrm: {
          Embeds: {
            process: () => void
          }
        }
        IN: LinkedInSDK;
        Trustpilot: {
          load: (el?: HTMLElement) => void;
          loadFromElement: (el: HTMLElement, overwrite?: boolean) => void;
        };
        dataLayer: unknown[];
        LiveChatWidget: {
        on: (method: string, callback: () => void) => void;
        off: (event: string, callback?: () => void) => void;
        get: (property: string) => unknown;
        init: () => void;
        };
        _hsq: unknown[];
        optimizely: unknown;
        privy: unknown;
    }
}
  
export {}
  
  