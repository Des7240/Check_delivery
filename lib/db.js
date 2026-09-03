import { kv } from '@vercel/kv';

const ORDERS_KEY = 'spx_orders_list';

/**
 * Lấy danh sách tất cả các đơn hàng
 * @returns {Promise<Array>}
 */
export async function getOrders() {
  try {
    const orders = await kv.lrange(ORDERS_KEY, 0, -1);
    if (!orders) return [];
    
    // Vì lrange trả về mảng các tracking number (chuỗi), ta cần lấy thông tin chi tiết từng cái
    const detailedOrders = await Promise.all(
      orders.map(async (trackingNumber) => {
        const orderData = await kv.hgetall(`spx_order:${trackingNumber}`);
        return orderData;
      })
    );
    
    return detailedOrders.filter(Boolean); // Lọc bỏ null
  } catch (error) {
    console.error("Lỗi khi getOrders:", error);
    return []; // Trả về mảng rỗng nếu chưa setup KV hoặc có lỗi
  }
}

/**
 * Thêm một đơn hàng mới
 * @param {Object} orderData - Thông tin đơn hàng { trackingNumber, customerName, note }
 */
export async function addOrder(orderData) {
  const { trackingNumber, customerName, note } = orderData;
  if (!trackingNumber) throw new Error("Tracking number is required");

  // Kiểm tra xem đã có chưa
  const exists = await kv.hexists(`spx_order:${trackingNumber}`, 'trackingNumber');
  if (exists) {
    throw new Error("Đơn hàng này đã tồn tại trong hệ thống!");
  }

  const payload = {
    trackingNumber,
    customerName: customerName || 'Khách hàng',
    note: note || '',
    createdAt: Date.now()
  };

  await kv.hset(`spx_order:${trackingNumber}`, payload);
  await kv.lpush(ORDERS_KEY, trackingNumber);
  
  return payload;
}

/**
 * Xóa một đơn hàng
 * @param {string} trackingNumber - Mã vận đơn
 */
export async function deleteOrder(trackingNumber) {
  await kv.del(`spx_order:${trackingNumber}`);
  await kv.lrem(ORDERS_KEY, 0, trackingNumber); // Remove all occurrences
  return true;
}

/**
 * Lấy thông tin JSON trực tiếp từ API của SPX
 * @param {string} trackingNumber - Mã vận đơn (ví dụ: SPXVN...)
 */
export async function fetchSpxTracking(trackingNumber) {
  try {
    const res = await fetch(`https://spx.vn/api/v2/fleet_order/tracking/search?sls_tracking_number=${trackingNumber}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      },
      cache: 'no-store' // Không cache để luôn lấy trạng thái mới nhất
    });

    if (!res.ok) {
      throw new Error(`Lỗi HTTP: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error(`Lỗi lấy tracking SPX cho ${trackingNumber}:`, error);
    return { error: true, message: error.message };
  }
}
