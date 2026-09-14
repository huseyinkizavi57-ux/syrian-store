import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";

type Stats = {
  userCount: number; productCount: number; orderCount: number; newOrders: number;
  lowStockVariants: number; totalRevenue: number; totalPayments: number; paymentCount: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    adminApi.get("/admin/dashboard").then((r) => setStats(r.data.data));
  }, []);

  if (!stats) return <p>جاري التحميل...</p>;

  const cards = [
    { label: "المستخدمون", value: stats.userCount },
    { label: "المنتجات النشطة", value: stats.productCount },
    { label: "إجمالي الطلبات", value: stats.orderCount },
    { label: "طلبات جديدة", value: stats.newOrders },
    { label: "منتجات قليلة المخزون", value: stats.lowStockVariants },
    { label: "عدد عمليات الدفع الناجحة", value: stats.paymentCount },
    { label: "إجمالي الإيرادات", value: `${stats.totalRevenue.toLocaleString("ar-SY")} ل.س` },
    { label: "إجمالي المدفوعات المؤكدة", value: `${stats.totalPayments.toLocaleString("ar-SY")} ل.س` },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">لوحة القيادة</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="text-2xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
