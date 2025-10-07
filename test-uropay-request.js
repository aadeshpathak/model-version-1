import crypto from 'crypto';

const uropaySecret = 'MPRIJG8QEKWWYL6GELC5TGIWJGBMJT8SNJJFJXJ2ZVXT2EG9PI';
const hashedSecret = crypto.createHash('sha512').update(uropaySecret).digest('hex');

const orderData = {
  vpa: 'prathameshtwr3421@okicici',
  vpaName: 'PayMySociety',
  amount: 15000,
  merchantOrderId: `ORDER_test_${Date.now()}`,
  transactionNote: `Bill Payment - Monthly Bill`,
  customerName: 'Test User',
  customerEmail: 'test@example.com',
  notes: {
    billId: 'test',
    memberId: 'test-member'
  }
};

const authHeaders = {
  'X-API-KEY': '7RTNYJLGDJFK6BHS',
  'Authorization': `Bearer ${hashedSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Accept-Encoding': 'gzip, deflate, br'
};

console.log('=== UroPay API Request Debug ===');
console.log('URL: https://api.uropay.me/order/generate');
console.log('Method: POST');
console.log('Headers:', JSON.stringify(authHeaders, null, 2));
console.log('Body:', JSON.stringify(orderData, null, 2));
console.log('Hashed Secret:', hashedSecret);
console.log('Secret Length:', uropaySecret.length);
console.log('Hashed Secret Length:', hashedSecret.length);

// Test the request
async function testRequest() {
  try {
    const response = await fetch('https://api.uropay.me/order/generate', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(orderData)
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response Body:', responseText);

  } catch (error) {
    console.error('Request failed:', error);
  }
}

testRequest();