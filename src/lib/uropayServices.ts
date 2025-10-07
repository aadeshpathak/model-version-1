export interface UroPayOrderResponse {
  code: number;
  status: string;
  message: string;
  data: {
    uroPayOrderId: string;
    orderStatus: string;
    upiString: string;
    qrCode: string;
    amountInRupees: string;
  };
}

export interface UroPayUpdateResponse {
  code: number;
  status: string;
  message: string;
  data: {
    uroPayOrderId: string;
    orderStatus: string;
  };
}

class UroPayService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:3001'; // Backend server URL
  }

  async generateOrder(billId: string, memberEmail: string): Promise<UroPayOrderResponse> {
    const response = await fetch(`${this.baseUrl}/api/uropay/generate-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ billId, memberEmail })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async updateOrder(uroPayOrderId: string, referenceNumber: string): Promise<UroPayUpdateResponse> {
    const response = await fetch(`${this.baseUrl}/api/uropay/update-order`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uroPayOrderId, referenceNumber })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}

export const uroPayService = new UroPayService();