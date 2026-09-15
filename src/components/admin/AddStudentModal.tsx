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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#E2E8E4] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-[#E2E8E4] flex items-center justify-between bg-mint-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-mint-500 text-white flex items-center justify-center font-bold shadow-sm">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Register New Candidate</h3>
              <p className="text-xs text-slate-500">Provide student credentials for direct portal login</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Student Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tarunika Rajgopal"
                className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl focus:outline-none focus:border-mint-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Register Number / Roll No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="e.g. 714023104112"
                className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl focus:outline-none focus:border-mint-500 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Institutional Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. candidate@srishakthi.ac.in"
              className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl focus:outline-none focus:border-mint-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Portal Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter login password..."
                className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl focus:outline-none focus:border-mint-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Student can log in directly with this password</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Academic Batch</label>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl font-bold focus:outline-none focus:border-mint-500"
              >
                <option value="2023-2027 (III Year)">2023-2027 (III Year)</option>
                <option value="2024-2028 (II Year)">2024-2028 (II Year)</option>
                <option value="2022-2026 (IV Year)">2022-2026 (IV Year)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Class Section</label>
              <select
                value={classSection}
                onChange={(e) => setClassSection(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl font-bold focus:outline-none focus:border-mint-500"
              >
                <option value="CSE-A">CSE-A</option>
                <option value="CSE-B">CSE-B</option>
                <option value="CSE-C">CSE-C</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Enrollment Reason (Audit Trail) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Lateral entry candidate or direct admission"
              className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl focus:outline-none focus:border-mint-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8E4]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-2"
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
