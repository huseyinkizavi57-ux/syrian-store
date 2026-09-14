import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api, getApiErrorMessage } from "../services/api";

export default function Account() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await api.post("/users/me/change-password", form);
      setMessage("تم تغيير كلمة المرور بنجاح");
      setForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-bold mb-2">بياناتي</h2>
        <p className="text-sm text-gray-600">{user.firstName} {user.lastName}</p>
        <p className="text-sm text-gray-600">{user.phone}</p>
        {user.email && <p className="text-sm text-gray-600">{user.email}</p>}
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-bold mb-3">تغيير كلمة المرور</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <input type="password" placeholder="كلمة المرور الحالية" className="w-full border rounded-lg p-2.5 text-sm" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
          <input type="password" placeholder="كلمة المرور الجديدة" className="w-full border rounded-lg p-2.5 text-sm" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required />
          {message && <p className="text-green-600 text-sm">{message}</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="w-full bg-brand text-white rounded-lg py-2.5 font-bold">تحديث</button>
        </form>
      </div>
    </div>
  );
}
