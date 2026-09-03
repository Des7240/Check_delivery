import { kv } from '@vercel/kv';

const ORDERS_KEY = 'spx_orders_list';

// Các từ khóa xác định đơn hàng đã giao thành công
const DELIVERED_KEYWORDS = [
  'giao thành công',
  'đã giao',
  'giao hàng thành công',
  'delivered',
  'hoàn tất',
  'successfully delivered'
];

/**
 * Lấy danh sách tất cả các đơn hàng (kèm trạng thái đã cache)
 * @returns {Promise<Array>}
 */
export async function getOrders() {
  try {
    const orders = await kv.lrange(ORDERS_KEY, 0, -1);
    if (!orders) return [];

    const detailedOrders = await Promise.all(
      orders.map(async (trackingNumber) => {
        const orderData = await kv.hgetall(`spx_order:${trackingNumber}`);
        return orderData;
      })
    );

    return detailedOrders.filter(Boolean);
  } catch (error) {
    console.error('Lỗi khi getOrders:', error);
    return [];
  }
}

/**
 * Thêm một đơn hàng mới
 * @param {Object} orderData - { trackingNumber, customerName, note }
 */
export async function addOrder(orderData) {
  const { trackingNumber, customerName, note } = orderData;
  if (!trackingNumber) throw new Error('Tracking number is required');

  const exists = await kv.hexists(`spx_order:${trackingNumber}`, 'trackingNumber');
  if (exists) {
    throw new Error('Đơn hàng này đã tồn tại trong hệ thống!');
  }

  const payload = {
    trackingNumber,
    customerName: customerName || 'Khách hàng',
    note: note || '',
    createdAt: Date.now(),
    lastStatus: '',
    lastStatusDetail: '',
    lastCheckedAt: 0,
    delivered: 'false'
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
  await kv.lrem(ORDERS_KEY, 0, trackingNumber);
  return true;
}

/**
 * Cập nhật trạng thái đơn hàng vào KV (cache lại để hiển thị nhanh)
 * @param {string} trackingNumber - Mã vận đơn
 * @param {Object} statusData - { currentStatus, steps }
 */
export async function updateOrderStatus(trackingNumber, statusData) {
  const { currentStatus, steps } = statusData;

  const isDelivered = DELIVERED_KEYWORDS.some(kw =>
    (currentStatus || '').toLowerCase().includes(kw) ||
    (steps || []).some(s => s.toLowerCase().includes(kw))
  );

  const updatePayload = {
    lastStatus: currentStatus || '',
    lastStatusDetail: (steps || []).join(' || '),
    lastCheckedAt: Date.now(),
    delivered: isDelivered ? 'true' : 'false'
  };

  await kv.hset(`spx_order:${trackingNumber}`, updatePayload);

  return { ...updatePayload, isDelivered };
}

/**
 * Lấy danh sách đơn hàng CHƯA giao thành công (để cron job xử lý)
 * @returns {Promise<Array>}
 */
export async function getPendingOrders() {
  const orders = await getOrders();
  return orders.filter(o => o.delivered !== 'true');
}
