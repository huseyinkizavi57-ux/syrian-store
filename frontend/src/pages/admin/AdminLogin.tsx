import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { getApiErrorMessage } from "../../services/api";

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      setError(getApiErrorMessage(err, "بيانات الدخول غير صحيحة"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-sm w-full bg-white border rounded-xl p-6">
        <h1 className="text-xl font-bold mb-1 text-center">لوحة تحكم المدير</h1>
        <p className="text-xs text-gray-400 text-center mb-4">بيانات تطوير: owner@dev.local / DevOwner123!</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" placeholder="البريد الإلكتروني" className="w-full border rounded-lg p-2.5 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="كلمة المرور" className="w-full border rounded-lg p-2.5 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button disabled={loading} className="w-full bg-gray-900 text-white rounded-lg py-2.5 font-bold disabled:opacity-50">
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
