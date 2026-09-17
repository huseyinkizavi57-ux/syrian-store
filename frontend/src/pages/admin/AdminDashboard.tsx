import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import { getApiErrorMessage } from "../../services/api";

type Stats = {
  userCount: number;
  productCount: number;
  orderCount: number;
  newOrders: number;
  lowStockVariants: number;
  totalRevenue: number;
  totalPayments: number;
  paymentCount: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function getAuthHeader() {
    const token = localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  useEffect(() => {
    setLoading(true);
    adminApi
      .get("/admin/dashboard", { headers: getAuthHeader() })
      .then((r) => setStats(r.data.data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 text-sm font-medium">
        جاري تحميل بيانات لوحة القيادة...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "إجمالي الإيرادات", value: `${Number(stats.totalRevenue).toLocaleString("ar-SY")} ل.س`, highlight: "text-emerald-600" },
    { label: "إجمالي المدفوعات المؤكدة", value: `${Number(stats.totalPayments).toLocaleString("ar-SY")} ل.س`, highlight: "text-emerald-600" },
    { label: "إجمالي الطلبات", value: stats.orderCount, highlight: "text-blue-600" },
    { label: "طلبات جديدة", value: stats.newOrders, highlight: "text-indigo-600" },
    { label: "المنتجات النشطة", value: stats.productCount, highlight: "text-gray-800" },
    { label: "المستخدمون", value: stats.userCount, highlight: "text-gray-800" },
    { label: "منتجات قليلة المخزون", value: stats.lowStockVariants, highlight: stats.lowStockVariants > 0 ? "text-rose-600" : "text-gray-800" },
    { label: "عمليات الدفع الناجحة", value: stats.paymentCount, highlight: "text-teal-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">لوحة القيادة</h1>
        <p className="text-xs text-gray-500 mt-0.5">نظرة عامة سريعة على مؤشرات المتجر والمبيعات</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition">
            <p className="text-xs font-medium text-gray-500">{c.label}</p>
            <p className={`text-2xl font-bold mt-2 ${c.highlight}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}