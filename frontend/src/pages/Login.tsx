import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../services/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(phone, password);
      navigate("/");
    } catch (err) {
      setError(getApiErrorMessage(err, "رقم الهاتف أو كلمة المرور غير صحيحة"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto bg-white border rounded-xl p-6 mt-8">
      <h1 className="text-xl font-bold mb-4 text-center">تسجيل الدخول</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="tel"
          placeholder="رقم الهاتف (0912345678)"
          className="w-full border rounded-lg p-2.5 text-sm"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          className="w-full border rounded-lg p-2.5 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-brand text-white rounded-lg py-2.5 font-bold disabled:opacity-50">
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
      </form>
      <div className="flex justify-between mt-4 text-sm">
        <Link to="/forgot-password" className="text-brand">نسيت كلمة المرور؟</Link>
        <Link to="/register" className="text-brand">إنشاء حساب</Link>
      </div>
    </div>
  );
}
