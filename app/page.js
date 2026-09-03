import { getOrders } from '@/lib/db';
import OrderForm from '@/components/OrderForm';
import OrderCard from '@/components/OrderCard';

export const metadata = {
  title: 'SPX Tracking Dashboard',
  description: 'Quản lý và theo dõi mã vận đơn SPX Express theo phong cách Memphis Design.',
};

export default async function Home() {
  const orders = await getOrders();
  
  // Sắp xếp mới nhất lên đầu
  orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <main className="container">
      <div style={{ textAlign: 'center' }}>
        <h1 className="memphis-header">🚀 SPX TRACKING RADAR</h1>
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <OrderForm />
      </div>

      <div>
        <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '4px solid black', paddingBottom: '0.5rem' }}>
          <h2>DANH SÁCH ĐƠN HÀNG</h2>
          <span className="badge warning">Tổng: {orders.length}</span>
        </div>
        
        {orders.length === 0 ? (
          <div className="memphis-card pink" style={{ textAlign: 'center' }}>
            <h3>Chưa có mã vận đơn nào!</h3>
            <p>Hãy thêm mã ở form phía trên để bắt đầu theo dõi.</p>
          </div>
        ) : (
          <div className="grid">
            {orders.map((order) => (
              <OrderCard key={order.trackingNumber} order={order} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
