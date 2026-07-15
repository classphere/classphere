/**
 * razorpay.ts
 * Placeholder service for Razorpay integration.
 * Currently, institutes are placed on an 'active' free trial.
 * This file will be populated once GST, bank accounts, and Razorpay credentials are set up.
 */

export class RazorpayService {
  constructor() {
    // TODO: Initialize Razorpay instance here
  }

  /**
   * Creates a subscription in Razorpay.
   */
  async createSubscription(planId: string, totalCount: number) {
    throw new Error("Razorpay integration not yet implemented");
  }

  /**
   * Verifies a Razorpay webhook signature.
   */
  verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
    throw new Error("Razorpay integration not yet implemented");
  }
}

export const razorpayService = new RazorpayService();
