import React from 'react';
import { Briefcase, Users, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { AdminFaculty } from '../../services/adminService';
import { ClassTeam } from '../../services/advisorService';

interface AdvisorGuidesWorkloadViewProps {
  guides: AdminFaculty[];
  teams: ClassTeam[];
  searchTerm: string;
  onShowToast: (msg: string) => void;
}

export const AdvisorGuidesWorkloadView: React.FC<AdvisorGuidesWorkloadViewProps> = ({
  guides,
  teams,
  searchTerm,
  onShowToast
}) => {
  const guideWorkloads = guides.map(g => {
    const assignedTeams = teams.filter(t => (t.guide || '').toLowerCase() === g.name.toLowerCase());
    const count = assignedTeams.length;
    const capacity = 4; // Standard SIET guide capacity
    const percentage = Math.min(100, Math.round((count / capacity) * 100));
    const isFull = count >= capacity;

    return {
      faculty: g,
      assignedTeams,
      count,
      capacity,
      percentage,
      isFull
    };
  });

  const filtered = guideWorkloads.filter(gw => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      gw.faculty.name.toLowerCase().includes(q) ||
      gw.faculty.email.toLowerCase().includes(q) ||
      (gw.faculty.designation || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Summary Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">
            Faculty Mentorship Load Matrix
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitor allocated team counts and remaining capacity across authorized department project guides.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="px-3 py-1 rounded-xl bg-gray-100 border border-gray-200 font-bold text-gray-700">
            Total Guides: {guides.length}
          </span>
          <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 font-bold text-emerald-800">
            Active Allocations: {teams.filter(t => t.guide && t.guide !== 'Unassigned').length} Teams
          </span>
        </div>
      </div>

      {/* Guides Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                <th scope="col" className="py-3.5 pl-5 pr-3">Faculty Name</th>
                <th scope="col" className="py-3.5 px-3">Designation & Dept</th>
                <th scope="col" className="py-3.5 px-3">Contact Email</th>
                <th scope="col" className="py-3.5 px-3">Workload / Capacity</th>
                <th scope="col" className="py-3.5 px-3">Assigned Teams</th>
                <th scope="col" className="py-3.5 pl-3 pr-5 text-right">Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Briefcase size={24} className="text-gray-400" />
                      <p className="font-bold text-gray-700">No matching faculty guides</p>
                      <p className="text-xs text-gray-400">Try adjusting your search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(({ faculty, assignedTeams, count, capacity, percentage, isFull }) => (
                  <tr key={faculty.email} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-4 pl-5 pr-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-gray-700 text-xs">
                          {faculty.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-900 text-sm">
                          {faculty.name}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-3 text-gray-600">
                      <p className="font-semibold text-gray-800">{faculty.designation || 'Assistant Professor'}</p>
                      <p className="text-[11px] text-gray-500">Dept. of Computer Science & Eng.</p>
                    </td>

                    <td className="py-4 px-3 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} className="text-gray-400" />
                        <span>{faculty.email}</span>
                      </div>
                    </td>

                    <td className="py-4 px-3 min-w-[160px]">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-semibold">
                          <span className="text-gray-700">{count} of {capacity} Teams</span>
                          <span className="text-gray-500">{percentage}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isFull ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      {assignedTeams.length === 0 ? (
                        <span className="text-gray-400 italic text-[11px]">No teams assigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {assignedTeams.map(t => (
                            <span 
                              key={t.teamId}
                              className="font-mono text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200"
                            >
                              {t.teamNo || t.teamId}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="py-4 pl-3 pr-5 text-right whitespace-nowrap">
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isFull
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {isFull ? 'Capacity Full' : `${capacity - count} Slots Open`}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdvisorGuidesWorkloadView;
