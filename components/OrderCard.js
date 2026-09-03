'use client';

import { useState } from 'react';
import { deleteOrderAction } from '@/app/actions';

export default function OrderCard({ order }) {
  const [showIframe, setShowIframe] = useState(false);

  const handleDelete = async () => {
    if (confirm(`Bạn có chắc chắn muốn xóa mã ${order.trackingNumber}?`)) {
      await deleteOrderAction(order.trackingNumber);
    }
  };

  return (
    <div className="memphis-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div className="flex-between">
        <h3 style={{ wordBreak: 'break-all' }}>{order.trackingNumber}</h3>
        <button className="memphis-button danger" onClick={handleDelete} style={{ padding: '0.25rem 0.75rem' }}>XÓA</button>
      </div>
      
      <div style={{ padding: '0.5rem', backgroundColor: '#eee', border: '2px solid black' }}>
        <strong>Tên KH:</strong> {order.customerName} <br />
        <strong>Ghi chú:</strong> {order.note}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button 
          className="memphis-button" 
          onClick={() => setShowIframe(!showIframe)} 
          style={{ width: '100%' }}
        >
          {showIframe ? 'ĐÓNG TRẠNG THÁI' : 'TẢI TRẠNG THÁI (TRỰC TIẾP)'}
        </button>

        {showIframe && (
          <div style={{
            width: '100%',
            height: '350px', // Chiều cao khung nhìn hiển thị
            overflow: 'hidden',
            border: '2px solid black',
            backgroundColor: 'white',
            position: 'relative'
          }}>
            {/* Iframe Clipping - Đẩy iframe lên trên để giấu header/search bar của SPX */}
            <iframe 
              src={`https://spx.vn/track?${order.trackingNumber}`}
              style={{
                position: 'absolute',
                top: '-180px', // Kéo lên trên 180px để giấu đi phần thanh tìm kiếm của SPX
                left: '0',
                width: '100%',
                height: '800px', // Để iframe đủ dài để có thể cuộn bên trong (nếu cần)
                border: 'none'
              }}
              scrolling="yes"
            />
          </div>
        )}

        <a 
          href={`https://spx.vn/track?${order.trackingNumber}`} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          <button className="memphis-button secondary" style={{ width: '100%' }}>
            🌐 MỞ TRANG SPX
          </button>
        </a>
      </div>
    </div>
  );
}
