import { scrapeSpxTracking } from '@/lib/spxScraper';
import { updateOrderStatus } from '@/lib/db';

export const maxDuration = 60;

/**
 * API Route: GET /api/track?trackingNumber=SPXVN...
 * Dùng headless browser để bóc tách trạng thái đơn hàng từ web SPX.
 * Sau khi lấy xong sẽ tự động lưu cache vào KV.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const trackingNumber = searchParams.get('trackingNumber');

  if (!trackingNumber) {
    return Response.json(
      { error: 'Thiếu mã vận đơn (trackingNumber)' },
      { status: 400 }
    );
  }

  try {
    const data = await scrapeSpxTracking(trackingNumber);

    // Lưu cache trạng thái vào KV sau khi scrape thành công
    if (data.success) {
      await updateOrderStatus(trackingNumber, {
        currentStatus: data.currentStatus || '',
        steps: data.steps || []
      });
    }

    return Response.json(data);
  } catch (error) {
    console.error('API track error:', error);
    return Response.json(
      { error: 'Lỗi hệ thống khi lấy trạng thái', message: error.message },
      { status: 500 }
    );
  }
}
