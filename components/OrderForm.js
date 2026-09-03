'use client';

import { useState } from 'react';
import { createOrderAction } from '@/app/actions';

export default function OrderForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const formData = new FormData(e.target);
    const result = await createOrderAction(formData);
    
    if (result.error) {
      setMessage(`❌ ${result.error}`);
    } else {
      setMessage('✅ Đã thêm đơn hàng thành công!');
      e.target.reset();
    }
    
    setLoading(false);
  };

  return (
    <div className="memphis-card yellow">
      <h2 style={{ marginBottom: '1rem' }}>Thêm Đơn Hàng SPX Mới</h2>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          name="trackingNumber" 
          placeholder="Mã vận đơn (SPXVN...)" 
          className="memphis-input" 
          required 
        />
        <div className="flex-gap">
          <input 
            type="text" 
            name="customerName" 
            placeholder="Tên khách hàng/người nhận" 
            className="memphis-input" 
          />
          <input 
            type="text" 
            name="note" 
            placeholder="Ghi chú thêm" 
            className="memphis-input" 
          />
        </div>
        <button 
          type="submit" 
          className="memphis-button primary" 
          disabled={loading}
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          {loading ? 'Đang thêm...' : 'THÊM MÃ VẬN ĐƠN'}
        </button>
      </form>
      {message && <div style={{ marginTop: '1rem', fontWeight: 'bold' }}>{message}</div>}
    </div>
  );
}
