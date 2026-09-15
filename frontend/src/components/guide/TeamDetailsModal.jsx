import React from 'react';
import { X, Users, Code, ExternalLink, Github, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export const TeamDetailsModal = ({ isOpen, onClose, team }) => {
  if (!isOpen || !team) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-modal border border-[#E2E8E4] overflow-hidden transform transition-all flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-details-title"
      >
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-[#E2E8E4] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-xl bg-mint-100 text-mint-900 border border-mint-200 font-extrabold text-xs">
              Team #{team.teamNumber}
            </span>
            <div>
              <h3 id="team-details-title" className="text-sm font-extrabold text-slate-900 truncate max-w-md">
                {team.projectTitle}
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                {team.class}-{team.section} &bull; Batch {team.batch} &bull; Advisor: {team.advisor}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs">
          {/* Status & Links Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#EFF3F1]/60 border border-[#E2E8E4]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 text-[11px]">Title Status:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[11px] inline-flex items-center gap-1 border ${
                team.titleStatus === 'Approved'
                  ? 'bg-mint-100 text-mint-900 border-mint-200'
                  : team.titleStatus === 'Pending'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}>
                {team.titleStatus === 'Approved' && <CheckCircle2 size={12} className="text-mint-700" />}
                {team.titleStatus === 'Pending' && <Clock size={12} className="text-amber-600" />}
                {team.titleStatus === 'Rejected' && <AlertCircle size={12} className="text-rose-600" />}
                <span>{team.titleStatus}</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              {team.githubUrl && (
                <a
                  href={team.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-bold text-[11px] hover:underline"
                >
                  <Github size={13} />
                  <span>GitHub Repository</span>
                  <ExternalLink size={10} />
                </a>
              )}
              {team.liveDemoUrl && (
                <a
                  href={team.liveDemoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-mint-700 hover:underline font-bold text-[11px]"
                >
                  <ExternalLink size={13} />
                  <span>Live Staging Demo</span>
                </a>
              )}
            </div>
          </div>

          {/* Abstract */}
          <div>
            <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5 mb-1.5 text-xs">
              <FileText size={14} className="text-mint-600" />
              <span>Project Abstract</span>
            </h4>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-[#E2E8E4] text-slate-700 leading-relaxed text-xs">
              {team.abstract || team.projectDescription}
            </div>
          </div>

          {/* Problem Statement vs Proposed Solution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#EFF3F1]/70 border border-[#E2E8E4]">
              <span className="font-extrabold text-slate-700 text-[11px] block uppercase tracking-wider mb-1.5">
                Target Problem Statement
              </span>
              <p className="text-slate-800 leading-relaxed">{team.problemStatement}</p>
            </div>

            <div className="p-4 rounded-xl bg-mint-50/70 border border-mint-200">
              <span className="font-extrabold text-mint-900 text-[11px] block uppercase tracking-wider mb-1.5">
                Proposed Solution Architecture
              </span>
              <p className="text-slate-800 leading-relaxed">{team.proposedSolution}</p>
            </div>
          </div>

          {/* Tech Stack Pills */}
          <div>
            <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5 mb-2 text-xs">
              <Code size={14} className="text-mint-600" />
              <span>Technology Stack &amp; Hardware</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {team.technologiesUsed?.map((tech, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg bg-mint-50 text-mint-900 font-bold text-[11px] border border-mint-200">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Full Team Roster Table */}
          <div>
            <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5 mb-2 text-xs">
              <Users size={14} className="text-mint-600" />
              <span>Enrolled Students ({team.members?.length || 4} Students)</span>
            </h4>
            <div className="border border-[#E2E8E4] rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] text-slate-600 font-bold border-b border-[#E2E8E4] uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Roll No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Institutional Email</th>
                    <th className="p-3">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8E4] font-medium">
                  {team.members?.map((m, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <td className="p-3 font-mono font-bold text-slate-900">{m.rollNo}</td>
                      <td className="p-3 font-extrabold text-slate-900 flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {m.name === team.teamLeader && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-mint-100 text-mint-900 border border-mint-200 font-extrabold uppercase">
                            Lead
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-[11px]">{m.email}</td>
                      <td className="p-3 text-slate-600 font-mono text-[11px]">{m.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#F8FAF9] px-6 py-3.5 border-t border-[#E2E8E4] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-[#E2E8E4] rounded-xl hover:bg-slate-50 transition"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamDetailsModal;
