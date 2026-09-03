'use client';

import { useState, useEffect } from 'react';
import { refreshSpxTrackingAction, deleteOrderAction } from '@/app/actions';

export default function OrderCard({ order }) {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTracking = async () => {
    setLoading(true);
    setError('');
    const result = await refreshSpxTrackingAction(order.trackingNumber);
    if (result.error) {
      setError(result.error);
    } else {
      setTrackingData(result.data?.data || {});
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async () => {
    if (confirm(`Bạn có chắc chắn muốn xóa mã ${order.trackingNumber}?`)) {
      await deleteOrderAction(order.trackingNumber);
    }
  };

  // Cố gắng tìm trạng thái mới nhất từ JSON trả về
  let latestStatus = 'Đang tải trạng thái...';
  if (!loading && trackingData) {
    if (trackingData.tracking_list && trackingData.tracking_list.length > 0) {
      latestStatus = trackingData.tracking_list[0].message || trackingData.tracking_list[0].status;
    } else if (trackingData.status) {
      latestStatus = trackingData.status;
    } else if (Object.keys(trackingData).length === 0) {
      latestStatus = 'Hệ thống SPX đang chặn lấy dữ liệu tự động. Vui lòng bấm [🌐 XEM SPX] bên dưới.';
    } else {
      latestStatus = 'Đã có dữ liệu (Click Xem chi tiết SPX)';
    }
  }
  if (error) latestStatus = `Lỗi: ${error}`;

  return (
    <div className="memphis-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="flex-between">
        <h3 style={{ wordBreak: 'break-all' }}>{order.trackingNumber}</h3>
        <button className="memphis-button danger" onClick={handleDelete} style={{ padding: '0.25rem 0.75rem' }}>XÓA</button>
      </div>
      
      <div style={{ padding: '0.5rem', backgroundColor: '#eee', border: '2px solid black' }}>
        <strong>Tên KH:</strong> {order.customerName} <br />
        <strong>Ghi chú:</strong> {order.note}
      </div>

      <div className="tracking-step">
        <strong style={{ display: 'block', marginBottom: '4px' }}>Trạng thái hiện tại:</strong>
        {loading ? <span>⏳ Đang lấy dữ liệu SPX...</span> : <span>{latestStatus}</span>}
      </div>

      <div className="flex-gap" style={{ marginTop: 'auto' }}>
        <button className="memphis-button" onClick={fetchTracking} disabled={loading} style={{ flex: 1 }}>
          🔄 CẬP NHẬT
        </button>
        <a 
          href={`https://spx.vn/track?${order.trackingNumber}`} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ flex: 1, textDecoration: 'none' }}
        >
          <button className="memphis-button secondary" style={{ width: '100%' }}>
            🌐 XEM SPX
          </button>
        </a>
      </div>
    </div>
  );
}
