'use server';

import { getOrders, addOrder, deleteOrder, fetchSpxTracking } from '@/lib/db';
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
    const data = await fetchSpxTracking(trackingNumber);
    return { success: true, data };
  } catch (error) {
    return { error: error.message };
  }
}
