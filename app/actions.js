'use server';

import { getOrders, addOrder, deleteOrder, updateOrderStatus } from '@/lib/db';
import { scrapeSpxTracking } from '@/lib/spxScraper';
import { revalidatePath } from 'next/cache';

/**
 * Server Action: Thêm đơn hàng
 */
export async function createOrderAction(formData) {
  const trackingNumber = formData.get('trackingNumber')?.toString().trim();
  const customerName = formData.get('customerName')?.toString().trim();
  const note = formData.get('note')?.toString().trim();

  if (!trackingNumber) {
    return { error: 'Vui lòng nhập mã vận đơn!' };
  }

  try {
    await addOrder({ trackingNumber, customerName, note });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Server Action: Xóa đơn hàng
 */
export async function deleteOrderAction(trackingNumber) {
  try {
    await deleteOrder(trackingNumber);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Server Action: Refresh SPX Tracking (Fetch trực tiếp API của SPX)
 */
export async function refreshSpxTrackingAction(trackingNumber) {
  try {
    const data = await scrapeSpxTracking(trackingNumber);
    if (data.success) {
      // Lưu lại trạng thái cuối cùng vào DB
      await updateOrderStatus(trackingNumber, {
        currentStatus: data.currentStatus,
        steps: data.steps
      });
      // Bắt buộc load lại trang để component server fetch dữ liệu mới
      revalidatePath('/');
    }
    return { success: true, data };
  } catch (error) {
    return { error: error.message };
  }
}
