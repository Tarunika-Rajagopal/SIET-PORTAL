import React, { useState } from 'react';
import { X, UserPlus, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AdminService } from '../../services/adminService';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBatch?: string;
  defaultClass?: string;
  onSuccess: (message: string) => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  defaultBatch = "2023-2027 (III Year)",
  defaultClass = "CSE-B",
  onSuccess
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('student@123');
  const [batch, setBatch] = useState(defaultBatch);
  const [classSection, setClassSection] = useState(defaultClass);
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState('Direct semester candidate enrollment');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rollNo.trim() || !email.trim() || !password.trim()) {
      setError('All fields including password are required.');
      return;
    }

    const res = AdminService.addStudent({
      name: name.trim(),
      rollNo: rollNo.trim(),
      email: email.trim(),
      password: password.trim(),
      batch,
      classSection
    }, reason);

    if (!res.success) {
      setError(res.message);
      return;
    }

    onSuccess(`Candidate ${name} (${rollNo}) registered successfully.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#D8CCBA] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-[#D8CCBA] flex items-center justify-between bg-[#F8F5EE]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#111111] text-[#F8F5EE] flex items-center justify-center font-bold shadow-sm">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#111111]">Register New Candidate</h3>
              <p className="text-xs text-[#75695A]">Provide student credentials for direct portal login</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-[#EDE7DB] text-[#75695A] hover:text-[#111111] flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#111111] font-semibold mb-1">
                Student Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl focus:outline-none focus:border-[#111111] font-medium text-[#111111]"
              />
            </div>

            <div>
              <label className="block text-[#111111] font-semibold mb-1">
                Register Number / Roll No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl focus:outline-none focus:border-[#111111] font-mono font-bold text-[#111111]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#111111] font-semibold mb-1">
              Institutional Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl focus:outline-none focus:border-[#111111] font-mono text-[#111111]"
            />
          </div>

          <div>
            <label className="block text-[#111111] font-semibold mb-1">
              Portal Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl focus:outline-none focus:border-[#111111] font-mono text-[#111111]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#75695A] hover:text-[#111111]"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className="text-[10px] text-[#75695A] mt-0.5 block">Student can log in directly with this password</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#111111] font-semibold mb-1">Academic Batch</label>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
              >
                <option value="2023-2027 (III Year)">2023-2027 (III Year)</option>
                <option value="2024-2028 (II Year)">2024-2028 (II Year)</option>
                <option value="2022-2026 (IV Year)">2022-2026 (IV Year)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#111111] font-semibold mb-1">Class Section</label>
              <select
                value={classSection}
                onChange={(e) => setClassSection(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
              >
                <option value="CSE-A">CSE-A</option>
                <option value="CSE-B">CSE-B</option>
                <option value="CSE-C">CSE-C</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#111111] font-semibold mb-1">
              Enrollment Reason (Audit Trail) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl focus:outline-none focus:border-[#111111] font-medium text-[#111111]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D8CCBA]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[#75695A] font-medium hover:bg-[#EDE7DB] hover:text-[#111111] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-semibold rounded-xl shadow-sm transition flex items-center gap-2 active:scale-95"
            >
              <UserPlus size={14} />
              <span>Register Candidate</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default AddStudentModal;
