// M-Pesa Daraja API client
// Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate

const MPESA_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke'

// ─── Token cache ──────────────────────────────────────────────────────────────
// Daraja tokens expire after 1 hour. Cache to avoid re-fetching on every call.

let _cachedToken: string | null = null
let _tokenExpiresAt = 0

async function getAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiresAt - 60_000) {
    return _cachedToken
  }

  const key = process.env.MPESA_CONSUMER_KEY!
  const secret = process.env.MPESA_CONSUMER_SECRET!
  const credentials = Buffer.from(`${key}:${secret}`).toString('base64')

  const res = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  })

  if (!res.ok) throw new Error(`M-Pesa token fetch failed: ${res.status}`)
  const data = await res.json()

  _cachedToken = data.access_token
  _tokenExpiresAt = Date.now() + (Number(data.expires_in) * 1000)
  return _cachedToken!
}

// ─── STK Push ─────────────────────────────────────────────────────────────────

export interface StkPushOptions {
  phone: string         // Format: 2547XXXXXXXX (no +)
  amount: number        // Integer KES
  accountRef: string    // e.g. wedding ID — shown on M-Pesa receipt
  description: string   // Shown to payer
  callbackUrl?: string  // Defaults to MPESA_CALLBACK_URL env var
}

export interface StkPushResult {
  merchantRequestId: string
  checkoutRequestId: string
  responseCode: string
  responseDescription: string
  customerMessage: string
}

export async function initiateStkPush(opts: StkPushOptions): Promise<StkPushResult> {
  const token = await getAccessToken()
  const shortcode = process.env.MPESA_SHORTCODE!
  const passkey = process.env.MPESA_PASSKEY!
  const callbackUrl = opts.callbackUrl ?? process.env.MPESA_CALLBACK_URL!

  if (!shortcode || !passkey || !callbackUrl) {
    throw new Error('Missing M-Pesa environment variables: MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL')
  }

  // Generate timestamp: YYYYMMDDHHmmss
  const now = new Date()
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')

  // Password = base64(shortcode + passkey + timestamp)
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')

  // Normalise phone: strip leading + or 0, ensure starts with 254
  const normPhone = opts.phone
    .replace(/^\+/, '')
    .replace(/^0/, '254')

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(opts.amount), // must be integer
    PartyA: normPhone,
    PartyB: shortcode,
    PhoneNumber: normPhone,
    CallBackURL: callbackUrl,
    AccountReference: opts.accountRef.substring(0, 12), // max 12 chars
    TransactionDesc: opts.description.substring(0, 13), // max 13 chars
  }

  const res = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`STK Push failed (${res.status}): ${err}`)
  }

  const data = await res.json()

  if (data.ResponseCode !== '0') {
    throw new Error(`STK Push rejected: ${data.ResponseDescription}`)
  }

  return {
    merchantRequestId: data.MerchantRequestID,
    checkoutRequestId: data.CheckoutRequestID,
    responseCode: data.ResponseCode,
    responseDescription: data.ResponseDescription,
    customerMessage: data.CustomerMessage,
  }
}

// ─── STK Query (check payment status) ────────────────────────────────────────

export async function queryStkStatus(checkoutRequestId: string): Promise<{
  resultCode: string
  resultDesc: string
}> {
  const token = await getAccessToken()
  const shortcode = process.env.MPESA_SHORTCODE!
  const passkey = process.env.MPESA_PASSKEY!

  const now = new Date()
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')

  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')

  const res = await fetch(`${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  })

  const data = await res.json()
  return { resultCode: data.ResultCode, resultDesc: data.ResultDesc }
}

// ─── Validate callback source IP ─────────────────────────────────────────────
// Safaricom's published IP ranges for production callbacks.
// Use in the callback route to reject spoofed requests.

const SAFARICOM_IPS = new Set([
  '196.201.214.200',
  '196.201.214.206',
  '196.201.213.114',
  '196.201.214.207',
  '196.201.214.208',
  '196.201.213.44',
  '196.201.212.127',
  '196.201.212.138',
  '196.201.212.129',
  '196.201.212.136',
  '196.201.212.74',
  '196.201.212.69',
])

export function isSafaricomIp(ip: string): boolean {
  if (process.env.NODE_ENV !== 'production') return true // allow all in dev/sandbox
  return SAFARICOM_IPS.has(ip)
}
