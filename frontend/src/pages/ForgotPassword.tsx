import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getApiErrorMessage } from "../services/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/auth/password/forgot", { phone });
      setMessage("إذا كان الرقم مسجلاً، تم إرسال رمز التحقق (راجع الرسائل النصية)");
      setStep("reset");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/auth/password/reset", { phone, code, newPassword });
      navigate("/login");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="max-w-sm mx-auto bg-white border rounded-xl p-6 mt-8">
      <h1 className="text-xl font-bold mb-4 text-center">استعادة كلمة المرور</h1>
      {step === "request" ? (
        <form onSubmit={requestCode} className="space-y-3">
          <input type="tel" placeholder="رقم الهاتف" className="w-full border rounded-lg p-2.5 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="w-full bg-brand text-white rounded-lg py-2.5 font-bold">إرسال رمز التحقق</button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="space-y-3">
          {message && <p className="text-green-600 text-sm">{message}</p>}
          <input placeholder="رمز التحقق (6 أرقام)" className="w-full border rounded-lg p-2.5 text-sm" value={code} onChange={(e) => setCode(e.target.value)} required />
          <input type="password" placeholder="كلمة المرور الجديدة" className="w-full border rounded-lg p-2.5 text-sm" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="w-full bg-brand text-white rounded-lg py-2.5 font-bold">تعيين كلمة المرور</button>
        </form>
      )}
    </div>
  );
}
