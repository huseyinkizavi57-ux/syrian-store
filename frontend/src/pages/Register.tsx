import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../services/api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ ...form, email: form.email || undefined });
      navigate("/login");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto bg-white border rounded-xl p-6 mt-8">
      <h1 className="text-xl font-bold mb-4 text-center">إنشاء حساب</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input placeholder="الاسم الأول" className="w-1/2 border rounded-lg p-2.5 text-sm" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          <input placeholder="الاسم الأخير" className="w-1/2 border rounded-lg p-2.5 text-sm" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
        </div>
        <input type="tel" placeholder="رقم الهاتف (0912345678)" className="w-full border rounded-lg p-2.5 text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        <input type="email" placeholder="البريد الإلكتروني (اختياري)" className="w-full border rounded-lg p-2.5 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input type="password" placeholder="كلمة المرور (8 أحرف على الأقل)" className="w-full border rounded-lg p-2.5 text-sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-brand text-white rounded-lg py-2.5 font-bold disabled:opacity-50">
          {loading ? "جاري الإنشاء..." : "إنشاء حساب"}
        </button>
      </form>
      <p className="text-center mt-4 text-sm">
        لديك حساب؟ <Link to="/login" className="text-brand font-bold">تسجيل الدخول</Link>
      </p>
    </div>
  );
}
