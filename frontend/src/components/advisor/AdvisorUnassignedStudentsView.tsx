import React from 'react';
import { Users, UserPlus, AlertCircle, Mail, GraduationCap, ArrowRight } from 'lucide-react';
import { AdminStudent } from '../../services/adminService';

interface AdvisorUnassignedStudentsViewProps {
  unassignedStudents: AdminStudent[];
  searchTerm: string;
  onCreateTeam: () => void;
  onShowToast: (msg: string) => void;
}

export const AdvisorUnassignedStudentsView: React.FC<AdvisorUnassignedStudentsViewProps> = ({
  unassignedStudents,
  searchTerm,
  onCreateTeam,
  onShowToast
}) => {
  const filtered = unassignedStudents.filter(s => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <AlertCircle size={20} />
          </div>
          <div>
            <h3 className="font-bold text-amber-950 text-sm">
              {unassignedStudents.length} Students Awaiting Team Allocation
            </h3>
            <p className="text-xs text-amber-800 mt-0.5">
              These students have not yet joined any project team. Form new teams or assign them to teams with open member capacity.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCreateTeam}
          className="px-4 py-2 rounded-xl bg-black text-white font-bold text-xs hover:bg-gray-800 transition flex items-center gap-2 shrink-0 self-start sm:self-auto cursor-pointer shadow-xs"
        >
          <UserPlus size={14} />
          <span>Create New Team</span>
        </button>
      </div>

      {/* Unassigned Students Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                <th scope="col" className="py-3.5 pl-5 pr-3">Roll Number</th>
                <th scope="col" className="py-3.5 px-3">Student Name</th>
                <th scope="col" className="py-3.5 px-3">Official Email</th>
                <th scope="col" className="py-3.5 px-3">Batch & Class</th>
                <th scope="col" className="py-3.5 px-3">Allocation Status</th>
                <th scope="col" className="py-3.5 pl-3 pr-5 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users size={24} className="text-gray-400" />
                      <p className="font-bold text-gray-700">
                        {searchTerm ? 'No matching unassigned students' : 'All students are assigned to teams'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {searchTerm ? 'Try a different search query' : 'Great job! 100% team allocation achieved for this section.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.rollNo} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 pl-5 pr-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                        {student.rollNo}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-gray-900">
                      {student.name}
                    </td>
                    <td className="py-3.5 px-3 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} className="text-gray-400" />
                        <span>{student.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-gray-600">
                      {student.batch || '2023-2027'} &bull; {student.classSection || 'CSE-B'}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-300 bg-amber-50 text-amber-800">
                        Unallocated
                      </span>
                    </td>
                    <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={onCreateTeam}
                        className="px-3 py-1.5 rounded-xl border border-gray-300 font-bold text-xs bg-white text-gray-800 hover:bg-gray-50 transition cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Assign</span>
                        <ArrowRight size={12} />
                      </button>
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

export default AdvisorUnassignedStudentsView;
