export interface FrinextOrderResponse {
  status: boolean;
  message: string;
  result?: {
    orderId: string;
    payment_url: string;
  };
}

export interface FrinextStatusResponse {
  status: string;
  message: string;
  result?: {
    txnStatus: string;
    resultInfo: string;
    orderId: string;
    status: string;
    amount: string;
    date: string;
    utr: string;
  };
}

class FrinextService {
  private apiToken: string;
  private baseUrl: string;

  constructor() {
    this.apiToken = import.meta.env.VITE_FRINEXT_API_TOKEN || '9f8bece0a67e98e7ccf71778e60cf43f';
    this.baseUrl = 'https://frinext.com/api';
  }

  async createOrder(
    amount: number,
    orderId: string,
    customerMobile: string,
    redirectUrl: string,
    remark1?: string,
    remark2?: string
  ): Promise<FrinextOrderResponse> {
    const payload = new URLSearchParams({
      customer_mobile: customerMobile,
      user_token: this.apiToken,
      amount: amount.toString(),
      order_id: orderId,
      redirect_url: redirectUrl,
      ...(remark1 && { remark1 }),
      ...(remark2 && { remark2 })
    });

    const response = await fetch(`${this.baseUrl}/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: payload.toString()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: FrinextOrderResponse = await response.json();

    if (!result.status) {
      throw new Error(result.message || 'Order creation failed');
    }

    return result;
  }

  async checkOrderStatus(orderId: string): Promise<FrinextStatusResponse> {
    const payload = new URLSearchParams({
      user_token: this.apiToken,
      order_id: orderId
    });

    const response = await fetch(`${this.baseUrl}/check-order-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: payload.toString()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: FrinextStatusResponse = await response.json();
    return result;
  }

  // Generate unique order ID
  generateOrderId(billId: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `BILL_${billId}_${timestamp}_${random}`;
  }
}

export const frinextService = new FrinextService();