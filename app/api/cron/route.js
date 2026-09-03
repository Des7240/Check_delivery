import { getPendingOrders, updateOrderStatus } from '@/lib/db';
import { scrapeSpxTracking } from '@/lib/spxScraper';

export const maxDuration = 60;

// Số đơn tối đa xử lý mỗi lần chạy cron (mỗi đơn ~15s, giới hạn 60s)
const MAX_ORDERS_PER_RUN = 3;

/**
 * API Route: GET /api/cron
 * Cron job tự động lấy trạng thái SPX cho các đơn chưa giao thành công.
 * Mỗi lần chạy xử lý tối đa 3 đơn (vì mỗi đơn mất ~15-20s scrape).
 * Bảo vệ bằng CRON_SECRET để chỉ Vercel hoặc dịch vụ cron mới gọi được.
 */
export async function GET(request) {
  // Xác thực bảo mật: chỉ cho phép Vercel cron hoặc request có secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pendingOrders = await getPendingOrders();

    if (pendingOrders.length === 0) {
      return Response.json({
        message: 'Không có đơn hàng nào cần cập nhật.',
        processed: 0
      });
    }

    // Sắp xếp: đơn chưa check bao giờ lên đầu, rồi đến đơn check lâu nhất
    pendingOrders.sort((a, b) => (a.lastCheckedAt || 0) - (b.lastCheckedAt || 0));

    // Chỉ xử lý tối đa MAX_ORDERS_PER_RUN đơn mỗi lần chạy
    const ordersToProcess = pendingOrders.slice(0, MAX_ORDERS_PER_RUN);
    const results = [];

    for (const order of ordersToProcess) {
      try {
        const scrapeResult = await scrapeSpxTracking(order.trackingNumber);

        if (scrapeResult.success) {
          const updateResult = await updateOrderStatus(order.trackingNumber, {
            currentStatus: scrapeResult.currentStatus || '',
            steps: scrapeResult.steps || []
          });

          results.push({
            trackingNumber: order.trackingNumber,
            status: 'updated',
            currentStatus: scrapeResult.currentStatus,
            isDelivered: updateResult.isDelivered
          });
        } else {
          results.push({
            trackingNumber: order.trackingNumber,
            status: 'error',
            error: scrapeResult.error
          });
        }
      } catch (err) {
        results.push({
          trackingNumber: order.trackingNumber,
          status: 'error',
          error: err.message
        });
      }
    }

    return Response.json({
      message: `Đã xử lý ${results.length}/${pendingOrders.length} đơn chưa giao.`,
      processed: results.length,
      totalPending: pendingOrders.length,
      results
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return Response.json(
      { error: 'Lỗi cron job', message: error.message },
      { status: 500 }
    );
  }
}
