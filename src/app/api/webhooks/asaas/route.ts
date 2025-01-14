import { NextRequest, NextResponse } from 'next/server'
import { PaymentService } from '@/modules/payment/services/paymentService'

export async function POST(req: NextRequest) {
  try {
    const paymentService = PaymentService.getInstance()
    const body = await req.json()

    await paymentService.handleWebhook(body)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
