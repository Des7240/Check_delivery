'use client';

import { useState } from 'react';
import { deleteOrderAction } from '@/app/actions';

/**
 * Format timestamp thành chuỗi ngày giờ dễ đọc
 * @param {number} ts - Unix timestamp (ms)
 * @returns {string}
 */
function formatTime(ts) {
  if (!ts || ts === 0) return 'Chưa kiểm tra';
  const d = new Date(Number(ts));
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export default function OrderCard({ order }) {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isDelivered = order.delivered === 'true';

  /**
   * Gọi API /api/track để scrape trạng thái mới nhất từ SPX
   */
  const fetchTracking = async () => {
    setLoading(true);
    setError('');
    setTrackingData(null);

    try {
      const res = await fetch(`/api/track?trackingNumber=${order.trackingNumber}`);
      const data = await res.json();

      if (data.success) {
        setTrackingData(data);
      } else {
        setError(data.error || 'Không lấy được trạng thái.');
      }
    } catch (err) {
      setError(`Lỗi kết nối: ${err.message}`);
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (confirm(`Bạn có chắc chắn muốn xóa mã ${order.trackingNumber}?`)) {
      await deleteOrderAction(order.trackingNumber);
    }
  };

  // Ưu tiên hiển thị: dữ liệu mới scrape > dữ liệu cache trong KV
  const displayStatus = trackingData?.currentStatus || order.lastStatus || '';
  const displaySteps = trackingData?.steps || (order.lastStatusDetail ? order.lastStatusDetail.split(' || ') : []);

  return (
    <div className={`memphis-card ${isDelivered ? 'teal' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div className="flex-between">
        <h3 style={{ wordBreak: 'break-all' }}>{order.trackingNumber}</h3>
        <div className="flex-gap" style={{ gap: '0.5rem' }}>
          {isDelivered && <span className="badge success">✅ ĐÃ GIAO</span>}
          <button className="memphis-button danger" onClick={handleDelete} style={{ padding: '0.25rem 0.75rem' }}>XÓA</button>
        </div>
      </div>

      {/* Thông tin khách hàng */}
      <div style={{ padding: '0.5rem', backgroundColor: isDelivered ? '#b8fff0' : '#eee', border: '2px solid black' }}>
        <strong>Tên KH:</strong> {order.customerName} <br />
        <strong>Ghi chú:</strong> {order.note}
      </div>

      {/* Trạng thái đã cache từ cron job hoặc lần cập nhật trước */}
      {displayStatus && !trackingData && (
        <div style={{ border: '3px solid black', padding: '1rem', backgroundColor: isDelivered ? '#d4ffee' : '#fffff0' }}>
          <span className={`badge ${isDelivered ? 'success' : 'warning'}`} style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
            📦 {displayStatus}
          </span>
          {displaySteps.length > 0 && displaySteps[0] !== '' && (
            <div style={{ marginTop: '0.75rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', borderBottom: '2px dashed black', paddingBottom: '0.25rem' }}>
                Hành trình:
              </strong>
              {displaySteps.slice(0, 5).map((step, i) => (
                <div key={i} className="tracking-step">
                  <span style={{ fontSize: '0.85rem' }}>{step}</span>
                </div>
              ))}
            </div>
          )}
          <small style={{ display: 'block', marginTop: '0.5rem', opacity: 0.7 }}>
            🕐 Cập nhật lần cuối: {formatTime(order.lastCheckedAt)}
          </small>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="memphis-card yellow" style={{ textAlign: 'center', padding: '1rem', boxShadow: 'none', marginBottom: 0 }}>
          <span style={{ fontSize: '1.2rem' }}>⏳</span> Đang mở trình duyệt ẩn để lấy trạng thái từ SPX...<br />
          <small>(Có thể mất 10-20 giây)</small>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="memphis-card pink" style={{ padding: '0.75rem', boxShadow: 'none', marginBottom: 0 }}>
          ❌ {error}
        </div>
      )}

      {/* Dữ liệu mới scrape về (ưu tiên hiện cái này nếu vừa bấm cập nhật) */}
      {trackingData && (
        <div style={{ border: '3px solid black', padding: '1rem', backgroundColor: '#f0fff0' }}>
          {trackingData.currentStatus && (
            <div style={{ marginBottom: '1rem' }}>
              <span className="badge success" style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                📦 {trackingData.currentStatus}
              </span>
            </div>
          )}
          {trackingData.steps && trackingData.steps.length > 0 && (
            <div>
              <strong style={{ display: 'block', marginBottom: '0.5rem', borderBottom: '2px dashed black', paddingBottom: '0.25rem' }}>
                Hành trình (Mới nhất):
              </strong>
              {trackingData.steps.map((step, i) => (
                <div key={i} className="tracking-step">
                  <span style={{ fontSize: '0.85rem' }}>{step}</span>
                </div>
              ))}
            </div>
          )}
          {trackingData.rawText && !trackingData.currentStatus && trackingData.steps?.length === 0 && (
            <div>
              <strong>Dữ liệu thô:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', maxHeight: '200px', overflow: 'auto', marginTop: '0.5rem', backgroundColor: '#fff', padding: '0.5rem', border: '1px solid #ccc' }}>
                {trackingData.rawText}
              </pre>
            </div>
          )}
          <small style={{ display: 'block', marginTop: '0.5rem', opacity: 0.7 }}>
            🕐 Vừa cập nhật lúc: {formatTime(Date.now())}
          </small>
        </div>
      )}

      {/* Nếu chưa có bất kỳ trạng thái nào */}
      {!displayStatus && !trackingData && !loading && !error && (
        <div style={{ padding: '0.75rem', backgroundColor: '#fff3cd', border: '2px solid black', textAlign: 'center' }}>
          ⚠️ Chưa có trạng thái. Bấm <strong>CẬP NHẬT</strong> hoặc đợi cron job tự động chạy.
        </div>
      )}

      {/* Các nút hành động */}
      <div className="flex-gap" style={{ marginTop: 'auto' }}>
        {!isDelivered && (
          <button
            className="memphis-button"
            onClick={fetchTracking}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? '⏳ ĐANG TẢI...' : '🔄 CẬP NHẬT'}
          </button>
        )}
        <a
          href={`https://spx.vn/track?${order.trackingNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ flex: 1, textDecoration: 'none' }}
        >
          <button className="memphis-button secondary" style={{ width: '100%' }}>
            🌐 MỞ SPX
          </button>
        </a>
      </div>
    </div>
  );
}
