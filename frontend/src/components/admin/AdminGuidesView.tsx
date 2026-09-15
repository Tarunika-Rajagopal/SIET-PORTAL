import React, { useState, useEffect } from 'react';
import { Briefcase, Search, RotateCw, CheckCircle2, UserMinus, RefreshCw } from 'lucide-react';
import { AdminService, AdminFaculty } from '../../services/adminService';
import AdminReasonModal from './AdminReasonModal';

interface AdminGuidesViewProps {
  onShowToast: (msg: string) => void;
}

export const AdminGuidesView: React.FC<AdminGuidesViewProps> = ({ onShowToast }) => {
  const [faculties, setFaculties] = useState<AdminFaculty[]>(() => AdminService.getFaculties());
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [isManageMode, setIsManageMode] = useState(false);

  // Reason modal for revoking guide role
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [facultyToRevoke, setFacultyToRevoke] = useState<AdminFaculty | null>(null);

  useEffect(() => {
    return AdminService.subscribe(() => {
      setFaculties(AdminService.getFaculties());
    });
  }, []);

  // Filter only faculty assigned as Guides
  const guides = faculties.filter(f => f.role === 'Guide' || f.role === 'Advisor & Guide');

  const filtered = guides.filter(g => {
    const matchesDomain = domainFilter === 'ALL' || (g.specialization && g.specialization.includes(domainFilter));
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm.trim() ||
      g.name.toLowerCase().includes(q) ||
      g.email.toLowerCase().includes(q) ||
      (g.specialization && g.specialization.toLowerCase().includes(q));

    return matchesDomain && matchesSearch;
  });

  const handleOpenRevoke = (g: AdminFaculty) => {
    setFacultyToRevoke(g);
    setReasonModalOpen(true);
  };

  const handleConfirmRevoke = (reason: string) => {
    if (!facultyToRevoke) return;
    AdminService.removeGuide(facultyToRevoke.email, reason);
    onShowToast(`Removed Project Guide role for ${facultyToRevoke.name}.`);
    setReasonModalOpen(false);
    setFacultyToRevoke(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Filter and Actions Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-card border border-[#E2E8E4] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900">
              Approved Capstone Guides ({guides.length})
            </h2>
            <span className="text-xs text-mint-700 bg-mint-50 border border-mint-200 px-2.5 py-0.5 rounded-full font-bold">
              Research Mentorship
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Faculty research mentors supervising student capstone projects</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          {/* Domain Filter */}
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="px-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-mint-500"
          >
            <option value="ALL">All Domains</option>
            <option value="AI">AI & Deep Learning</option>
            <option value="Smart">Smart Grids & IoT</option>
            <option value="Edge">Edge Computing & NLP</option>
            <option value="Cloud">Cloud & Cybersecurity</option>
          </select>

          {/* Single Search Bar */}
          <div className="relative w-full sm:w-60">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search guide or domain..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:border-mint-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Manage Button */}
          <button
            onClick={() => setIsManageMode(!isManageMode)}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 text-xs ${
              isManageMode
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                : 'bg-[#EFF3F1] hover:bg-mint-100 text-slate-700 border border-[#E2E8E4]'
            }`}
          >
            <RotateCw size={13} className={isManageMode ? 'text-amber-700' : 'text-slate-500'} />
            <span>{isManageMode ? 'Done Managing' : 'Manage'}</span>
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Refresh page"
            className="p-2 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-600 hover:text-slate-900 border border-[#E2E8E4] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Refresh page"
          >
            <RefreshCw size={14} />
          </button>

        </div>
      </div>

      {/* Guides Table */}
      <div className="bg-white rounded-3xl shadow-card border border-[#E2E8E4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] text-slate-500 uppercase tracking-wider font-bold border-b border-[#E2E8E4]">
              <tr>
                <th className="p-4">Guide Name</th>
                <th className="p-4">Designation</th>
                <th className="p-4">Research Domain</th>
                <th className="p-4">Assigned Teams</th>
                <th className="p-4">Quota Utilization</th>
                <th className="p-4">Status</th>
                {isManageMode && <th className="p-4 text-center">Manage Role</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4] font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isManageMode ? 7 : 6} className="p-8 text-center text-slate-400">
                    No technical guides match the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-mint-50/40 transition">
                    <td className="p-4">
                      <div className="font-extrabold text-slate-900">{g.name}</div>
                      <span className="text-[11px] text-slate-400 font-mono">{g.email}</span>
                    </td>
                    <td className="p-4 text-slate-700">{g.designation}</td>
                    <td className="p-4 text-slate-800 font-semibold">{g.specialization}</td>
                    <td className="p-4 font-bold text-slate-900">
                      {g.teamsCount} Teams ({g.teamsCount * 4} Students)
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${g.teamsCount >= g.maxQuota ? 'bg-amber-500' : 'bg-mint-500'}`}
                            style={{ width: `${(g.teamsCount / g.maxQuota) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500">{g.teamsCount} / {g.maxQuota}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                        g.teamsCount >= g.maxQuota ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-mint-100 text-mint-900 border-mint-200'
                      }`}>
                        {g.teamsCount >= g.maxQuota ? 'Full Quota' : 'Available'}
                      </span>
                    </td>

                    {isManageMode && (
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenRevoke(g)}
                          className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold transition flex items-center gap-1 text-xs mx-auto"
                        >
                          <UserMinus size={13} />
                          <span>Remove Guide</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mandatory Reason Modal for Guide Removal */}
      <AdminReasonModal
        isOpen={reasonModalOpen}
        title="Revoke Project Guide Role"
        subtitle="Mandatory reason required for audit trail recording"
        targetDescription={facultyToRevoke ? `${facultyToRevoke.name} • ${facultyToRevoke.teamsCount} Active Teams` : ''}
        confirmLabel="Confirm Revocation"
        isDanger={true}
        onClose={() => setReasonModalOpen(false)}
        onConfirm={handleConfirmRevoke}
      />

    </div>
  );
};

export default AdminGuidesView;
