// Note: Platform import removed as this is a web-only implementation

export interface RevenueCatConfig {
  apiKey: string;
  baseUrl: string;
}

export interface PurchaseRequest {
  productId: string;
  userId: string;
  userEmail: string;
  planId: string;
  planName: string;
  price: number;
  currency: string;
}

export interface PurchaseResponse {
  success: boolean;
  transactionId?: string;
  subscriptionId?: string;
  error?: string;
  redirectUrl?: string;
}

export interface SubscriptionStatus {
  isActive: boolean;
  planId?: string;
  planName?: string;
  expiresAt?: string;
  isTrial?: boolean;
  trialEndsAt?: string;
}

class RevenueCatService {
  private config: RevenueCatConfig;
  private isInitialized = false;

  constructor() {
    this.config = {
      apiKey: import.meta.env.VITE_REVENUECAT_API_KEY || '',
      baseUrl: import.meta.env.VITE_REVENUECAT_BASE_URL || 'https://api.revenuecat.com/v1'
    };
  }

  async initialize(): Promise<boolean> {
    if (!this.config.apiKey) {
      console.error('RevenueCat API key not configured');
      return false;
    }

    this.isInitialized = true;
    return true;
  }

  async createCustomer(userId: string, userEmail: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/subscribers/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          app_user_id: userId,
          email: userEmail
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error creating RevenueCat customer:', error);
      return false;
    }
  }

  async initiatePurchase(purchaseRequest: PurchaseRequest): Promise<PurchaseResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Create customer first
      const customerCreated = await this.createCustomer(
        purchaseRequest.userId,
        purchaseRequest.userEmail
      );

      if (!customerCreated) {
        return {
          success: false,
          error: 'Failed to create customer account'
        };
      }

      // For web integration, we'll redirect to RevenueCat's hosted checkout
      const checkoutUrl = this.generateCheckoutUrl(purchaseRequest);
      
      return {
        success: true,
        redirectUrl: checkoutUrl
      };
    } catch (error) {
      console.error('Error initiating purchase:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private generateCheckoutUrl(purchaseRequest: PurchaseRequest): string {
    const params = new URLSearchParams({
      app_user_id: purchaseRequest.userId,
      email: purchaseRequest.userEmail,
      product_id: purchaseRequest.productId,
      plan_name: purchaseRequest.planName,
      price: purchaseRequest.price.toString(),
      currency: purchaseRequest.currency,
      return_url: `${window.location.origin}/payment/success`,
      cancel_url: `${window.location.origin}/join?step=pricing`
    });

    return `${this.config.baseUrl}/checkout?${params.toString()}`;
  }

  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/subscribers/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return { isActive: false };
      }

      const data = await response.json();
      const subscriptions = data.subscriber?.subscriptions || {};
      
      // Find the first active subscription
      const activeSubscription = Object.values(subscriptions).find((sub: any) => sub.is_active);
      const subscription = activeSubscription || null;

      return {
        isActive: subscription?.is_active || false,
        planId: subscription?.product_id,
        planName: subscription?.product_name,
        expiresAt: subscription?.expires_date,
        isTrial: subscription?.is_trial_period || false,
        trialEndsAt: subscription?.trial_end_date
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return { isActive: false };
    }
  }

  async handleWebhook(webhookData: any): Promise<boolean> {
    // Handle RevenueCat webhooks for subscription updates
    try {
      // Verify webhook signature if needed
      // Process subscription events (created, renewed, cancelled, etc.)
      
      console.log('Processing RevenueCat webhook:', webhookData);
      return true;
    } catch (error) {
      console.error('Error processing webhook:', error);
      return false;
    }
  }
}

export const revenueCatService = new RevenueCatService();
export default revenueCatService;
