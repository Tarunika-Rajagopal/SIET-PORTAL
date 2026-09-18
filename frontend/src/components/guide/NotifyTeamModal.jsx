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
        className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#D8CCBA] overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notify-modal-title"
      >
        {/* Header */}
        <div className="bg-[#F8F5EE] px-6 py-4 border-b border-[#D8CCBA] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-center shrink-0 shadow-xs">
              <Bell size={20} />
            </div>
            <div>
              <h3 id="notify-modal-title" className="text-sm font-serif font-bold text-[#111111] tracking-wide">
                Issue Consultation Notice
              </h3>
              <p className="text-[11px] text-[#75695A] font-semibold">Team #{team.teamNumber} &bull; {team.projectTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#75695A] hover:text-[#111111] p-1.5 rounded-lg hover:bg-[#EDE7DB] transition cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Target Milestone Week */}
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-amber-700" />
              <span>Target Milestone Week in Student Submissions:</span>
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {Array.from({ length: currentWeek + 1 }, (_, i) => i).map((wk) => (
                <button
                  key={wk}
                  type="button"
                  onClick={() => setWeekNumber(wk)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    weekNumber === wk
                      ? 'bg-[#111111] border-[#111111] text-[#F8F5EE] shadow-xs'
                      : 'bg-[#F8F5EE] border-[#D8CCBA] text-[#111111] hover:bg-[#EDE7DB]'
                  }`}
                >
                  Week {wk}{wk === currentWeek ? ' (Current)' : ''}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#75695A] mt-1">
              Notice will be dispatched and displayed directly in the student's <strong>Week {weekNumber}</strong> milestone view.
            </p>
          </div>

          {/* Quick timing presets */}
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1.5 flex items-center gap-1.5">
              <Clock size={13} className="text-amber-700" />
              <span>Select Consultation Timing Preset:</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIMING_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTiming(preset)}
                  className={`text-left p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    timing === preset
                      ? 'bg-[#EDE7DB] border-[#D8CCBA] text-[#111111] shadow-xs'
                      : 'bg-[#F8F5EE] border-[#D8CCBA] text-[#111111] hover:bg-[#EDE7DB]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{preset}</span>
                    {timing === preset && <Check size={14} className="text-[#111111]" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom timing input */}
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1">
              Custom Time / Day (if different)
            </label>
            <input
              type="text"
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              placeholder="e.g. Wednesday at 2:30 PM"
              className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:bg-white"
            />
          </div>

          {/* Meeting location */}
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1 flex items-center gap-1.5">
              <MapPin size={13} className="text-amber-700" />
              <span>Consultation Location</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Faculty Cabin 204"
              className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:bg-white"
            />
          </div>

          {/* Instructions / Agenda comment */}
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1 flex items-center gap-1.5">
              <MessageSquare size={13} className="text-amber-700" />
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
              className="w-full p-3 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:bg-white transition"
            />
            {error && <p className="text-[11px] text-rose-600 font-semibold mt-1">{error}</p>}
          </div>

          {/* Notification History Preview */}
          {team.notificationHistory && team.notificationHistory.length > 0 && (
            <div className="border-t border-[#D8CCBA] pt-3">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#75695A] uppercase tracking-wider mb-2">
                <History size={12} />
                <span>Prior Meeting Records</span>
              </div>
              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {team.notificationHistory.map((h, i) => (
                  <div key={i} className="bg-[#F8F5EE] border border-[#D8CCBA] p-2.5 rounded-xl text-[11px]">
                    <div className="flex justify-between font-bold text-[#111111]">
                      <span>{h.timing} &bull; {h.location}</span>
                      <span className="text-[10px] text-[#75695A] font-normal">{h.date}</span>
                    </div>
                    <p className="text-[#75695A] truncate mt-0.5">{h.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#D8CCBA]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#111111] hover:text-black bg-white border border-[#D8CCBA] rounded-xl hover:bg-[#EDE7DB] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-[#F8F5EE] bg-[#111111] hover:bg-[#292725] rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
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
