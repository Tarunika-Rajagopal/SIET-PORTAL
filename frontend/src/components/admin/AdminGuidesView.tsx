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
    <div className="space-y-6 font-sans">
      
      {/* Top Filter and Actions Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#D8CCBA] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-serif font-bold text-[#111111]">
              Approved Capstone Guides ({guides.length})
            </h2>
            <span className="text-xs text-[#111111] bg-[#F8F5EE] border border-[#D8CCBA] px-2.5 py-0.5 rounded-full font-medium">
              Research Mentorship
            </span>
          </div>
          <p className="text-xs text-[#75695A] mt-0.5">Faculty research mentors supervising student capstone projects</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          {/* Domain Filter */}
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="ALL">All Domains</option>
            <option value="AI">AI & Deep Learning</option>
            <option value="Smart">Smart Grids & IoT</option>
            <option value="Edge">Edge Computing & NLP</option>
            <option value="Cloud">Cloud & Cybersecurity</option>
          </select>

          {/* Single Search Bar */}
          <div className="relative w-full sm:w-60">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search guide or domain..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs focus:outline-none focus:border-[#111111] text-[#111111] placeholder-[#75695A]/60"
            />
          </div>

          {/* Manage Button */}
          <button
            onClick={() => setIsManageMode(!isManageMode)}
            className={`px-3.5 py-2 rounded-xl font-medium transition flex items-center gap-1.5 text-xs ${
              isManageMode
                ? 'bg-[#111111] text-white border border-[#111111] shadow-xs'
                : 'bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA]'
            }`}
          >
            <RotateCw size={13} className={isManageMode ? 'text-white' : 'text-[#75695A]'} />
            <span>{isManageMode ? 'Done Managing' : 'Manage'}</span>
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Refresh page"
            className="p-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#75695A] hover:text-[#111111] border border-[#D8CCBA] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Refresh page"
          >
            <RefreshCw size={14} />
          </button>

        </div>
      </div>

      {/* Guides Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#D8CCBA] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EDE7DB] text-[#75695A] uppercase tracking-wider font-semibold border-b border-[#D8CCBA]">
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
            <tbody className="divide-y divide-[#D8CCBA] font-normal">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isManageMode ? 7 : 6} className="p-8 text-center text-[#75695A]">
                    No technical guides match the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-[#F8F5EE]/60 transition">
                    <td className="p-4">
                      <div className="font-bold text-[#111111]">{g.name}</div>
                      <span className="text-[11px] text-[#75695A] font-mono">{g.email}</span>
                    </td>
                    <td className="p-4 text-[#292725]">{g.designation}</td>
                    <td className="p-4 text-[#111111] font-medium">{g.specialization}</td>
                    <td className="p-4 font-bold text-[#111111]">
                      {g.teamsCount} Teams ({g.teamsCount * 4} Students)
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-[#EDE7DB] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#111111]"
                            style={{ width: `${(g.teamsCount / g.maxQuota) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-[11px] font-medium text-[#75695A]">{g.teamsCount} / {g.maxQuota}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium uppercase border ${
                        g.teamsCount >= g.maxQuota ? 'bg-[#EDE7DB] text-[#75695A] border-[#D8CCBA]' : 'bg-[#F8F5EE] text-[#111111] border-[#D8CCBA]'
                      }`}>
                        {g.teamsCount >= g.maxQuota ? 'Full Quota' : 'Available'}
                      </span>
                    </td>

                    {isManageMode && (
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenRevoke(g)}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl font-medium transition flex items-center gap-1 text-xs mx-auto"
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
