import React, { useState } from 'react';
import { Bell, MapPin, Clock, MessageSquare, History, X, Check, Calendar } from 'lucide-react';
import { StudentService } from '../../services/studentService';

const TIMING_PRESETS = [
  "Tomorrow at 10:30 AM",
  "Today at 3:00 PM",
  "During 4th period today (11:15 AM)",
  "Lab hours (2:00 PM - 4:00 PM)"
];

export const NotifyTeamModal = ({ isOpen, onClose, team, onNotify }) => {
  const currentWeek = StudentService.getCurrentAcademicWeek();
  const [weekNumber, setWeekNumber] = useState(currentWeek);
  const [timing, setTiming] = useState(team?.notifiedTiming || "Today at 3:00 PM");
  const [location, setLocation] = useState(team?.notifiedLocation || "Faculty Cabin 204");
  const [comment, setComment] = useState(team?.notifiedComment || "");
  const [error, setError] = useState("");

  if (!isOpen || !team) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError("Please include specific discussion points or materials to bring.");
      return;
    }

    const success = onNotify(team.teamId, {
      timing: timing.trim() || "Today at 3:00 PM",
      location: location.trim() || "Faculty Cabin 204",
      comment: comment.trim(),
      weekNumber: Number(weekNumber)
    });

    if (success !== false) {
      setError("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-modal border border-[#E2E8E4] overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notify-modal-title"
      >
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-[#E2E8E4] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0 shadow-xs">
              <Bell size={20} />
            </div>
            <div>
              <h3 id="notify-modal-title" className="text-sm font-extrabold text-slate-900 tracking-wide">
                Issue Consultation Notice
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">Team #{team.teamNumber} &bull; {team.projectTitle}</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Target Milestone Week */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-amber-600" />
              <span>Target Milestone Week in Student Submissions:</span>
            </label>
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4, 5].map((wk) => (
                <button
                  key={wk}
                  type="button"
                  onClick={() => setWeekNumber(wk)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-black transition cursor-pointer ${
                    weekNumber === wk
                      ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                      : 'bg-slate-50 border-[#E2E8E4] text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Week {wk}{wk === currentWeek ? ' (Current)' : ''}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Notice will be dispatched and displayed directly in the student's <strong>Week {weekNumber}</strong> milestone view.
            </p>
          </div>

          {/* Quick timing presets */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Clock size={13} className="text-amber-600" />
              <span>Select Consultation Timing Preset:</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIMING_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTiming(preset)}
                  className={`text-left p-2.5 rounded-xl border text-xs font-semibold transition ${
                    timing === preset
                      ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                      : 'bg-slate-50 border-[#E2E8E4] text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{preset}</span>
                    {timing === preset && <Check size={14} className="text-amber-600" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom timing input */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1">
              Custom Time / Day (if different)
            </label>
            <input
              type="text"
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              placeholder="e.g. Wednesday at 2:30 PM"
              className="w-full px-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          {/* Meeting location */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1 flex items-center gap-1.5">
              <MapPin size={13} className="text-amber-600" />
              <span>Consultation Location</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Faculty Cabin 204"
              className="w-full px-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          {/* Instructions / Agenda comment */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1 flex items-center gap-1.5">
              <MessageSquare size={13} className="text-amber-600" />
              <span>Instructions &amp; Deliverables to Bring <span className="text-rose-600">*</span></span>
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. Bring raw benchmark comparison of camera feeds or circuit board schematics..."
              className="w-full p-3 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white transition"
            />
            {error && <p className="text-[11px] text-rose-600 font-semibold mt-1">{error}</p>}
          </div>

          {/* Notification History Preview */}
          {team.notificationHistory && team.notificationHistory.length > 0 && (
            <div className="border-t border-[#E2E8E4] pt-3">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <History size={12} />
                <span>Prior Meeting Records</span>
              </div>
              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {team.notificationHistory.map((h, i) => (
                  <div key={i} className="bg-amber-50/50 border border-amber-200/60 p-2.5 rounded-xl text-[11px]">
                    <div className="flex justify-between font-bold text-amber-900">
                      <span>{h.timing} &bull; {h.location}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{h.date}</span>
                    </div>
                    <p className="text-slate-600 truncate mt-0.5">{h.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E2E8E4]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-[#E2E8E4] rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
            >
              <Bell size={14} />
              <span>Send Notice to Team</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotifyTeamModal;
