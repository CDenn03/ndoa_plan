/**
 * Payment validation utilities
 * Shared between client and server for consistent validation
 */

export const MIN_PAYMENT_AMOUNT = 1
export const MAX_PAYMENT_AMOUNT = 10_000_000

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates a payment amount against business rules
 * @param amount - The payment amount in KES
 * @returns ValidationResult with valid flag and optional error message
 */
export function validatePaymentAmount(amount: number): ValidationResult {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return { valid: false, error: 'Amount must be a valid number' }
  }

  if (amount < MIN_PAYMENT_AMOUNT) {
    return { valid: false, error: `Amount must be at least ${MIN_PAYMENT_AMOUNT} KES` }
  }

  if (amount > MAX_PAYMENT_AMOUNT) {
    return { valid: false, error: `Amount cannot exceed ${MAX_PAYMENT_AMOUNT.toLocaleString()} KES` }
  }

  return { valid: true }
}
