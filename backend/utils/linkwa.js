const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = process.env.LINKWA_BASE_URL || 'https://linkwa.co.zw/api/v1/third-party';

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.LINKWA_API_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

/**
 * Create a Linkwa payment link.
 * Returns { success, checkoutUrl, externalPaymentLinkId, shortUrl, raw }
 */
async function createPaymentLink({ amount, name, description, returnUrl, phone, email }) {
  try {
    const body = {
      amount: Number(amount),
      currency_code: 'USD',
      payment_link_name: name,
      description: description || '',
      return_url: returnUrl,
      stock: 1,
    };

    if (phone || email) {
      body.autofill_contact_details = {};
      if (phone) body.autofill_contact_details.phone_number = phone;
      if (email) body.autofill_contact_details.email = email;
    }

    const res = await axios.post(`${BASE_URL}/payment-links`, body, {
      headers: authHeaders(),
      timeout: 20000,
    });

    const product = res.data?.product || res.data?.payment_link || res.data || {};
    return {
      success: true,
      checkoutUrl: product.checkout_url || product.checkoutUrl,
      externalPaymentLinkId: product.external_payment_link_id || product.externalPaymentLinkId,
      shortUrl: product.short_url || product.shortUrl,
      raw: res.data,
    };
  } catch (error) {
    const body = error?.response?.data || {};
    console.error('[Linkwa] createPaymentLink error:', error.message, body);
    return { success: false, message: body.message || error.message, raw: body };
  }
}

/**
 * Get payment status for a link + payment reference.
 */
async function getPaymentStatus(shortUrl, paymentReference) {
  try {
    const res = await axios.get(
      `${BASE_URL}/payment-links/${shortUrl}/payments/${paymentReference}/status`,
      { headers: authHeaders(), timeout: 20000 }
    );
    return { success: true, ...res.data };
  } catch (error) {
    const body = error?.response?.data || {};
    console.error('[Linkwa] getPaymentStatus error:', error.message, body);
    return { success: false, message: body.message || error.message, raw: body };
  }
}

/**
 * Verify webhook HMAC-SHA256 signature.
 */
function verifySignature(rawBody, signature) {
  const secret = process.env.LINKWA_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Linkwa] No webhook secret set — skipping signature check');
    return true;
  }
  if (!signature) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = {
  createPaymentLink,
  getPaymentStatus,
  verifySignature,
};
