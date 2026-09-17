import React, { useState } from 'react';
import { X, Award, CheckCircle2 } from 'lucide-react';

interface GuideRubricModalProps {
  isOpen: boolean;
  team: any;
  onClose: () => void;
  onSaveMarks: (data: { teamId: string; total: number; grade: string; comment: string }) => void;
}

export const GuideRubricModal: React.FC<GuideRubricModalProps> = ({
  isOpen,
  team,
  onClose,
  onSaveMarks
}) => {
  const [litScore, setLitScore] = useState(5);
  const [archScore, setArchScore] = useState(5);
  const [codeScore, setCodeScore] = useState(4);
  const [demoScore, setDemoScore] = useState(5);
  const [vivaScore, setVivaScore] = useState(4);
  const [comment, setComment] = useState('Excellent engineering methodology, functional prototype execution.');

  if (!isOpen || !team) return null;

  const total = Number(litScore) + Number(archScore) + Number(codeScore) + Number(demoScore) + Number(vivaScore);
  const grade = total >= 23 ? 'Grade O' : total >= 20 ? 'Grade A+' : total >= 17 ? 'Grade A' : 'Grade B';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveMarks({
      teamId: team.teamId,
      total,
      grade,
      comment
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#D8CCBA] animate-in zoom-in-95 duration-200 relative">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#75695A] hover:text-[#111111] p-1.5 rounded-lg hover:bg-[#EDE7DB] transition cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-[#111111] text-[#F8F5EE] flex items-center justify-center font-bold shadow-xs">
            <Award size={22} />
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-[#111111]">Formal Rubrics Scoring Entry</h3>
            <p className="text-xs text-[#75695A] font-semibold">{team.teamId} &bull; {team.title}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          
          {/* Rubrics Sliders/Selects */}
          <div className="space-y-3 bg-[#F8F5EE] p-4 rounded-2xl border border-[#D8CCBA] text-xs">
            
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#111111]">1. Literature Survey &amp; Prior Art (Max: 5)</span>
              <select
                value={litScore}
                onChange={(e) => setLitScore(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg border border-[#D8CCBA] font-bold bg-white text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
              >
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Marks</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-bold text-[#111111]">2. System Architecture &amp; Schematics (Max: 5)</span>
              <select
                value={archScore}
                onChange={(e) => setArchScore(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg border border-[#D8CCBA] font-bold bg-white text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
              >
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Marks</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-bold text-[#111111]">3. Code Quality &amp; Pipeline Modularity (Max: 5)</span>
              <select
                value={codeScore}
                onChange={(e) => setCodeScore(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg border border-[#D8CCBA] font-bold bg-white text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
              >
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Marks</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-bold text-[#111111]">4. Functional Prototype Demo (Max: 5)</span>
              <select
                value={demoScore}
                onChange={(e) => setDemoScore(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg border border-[#D8CCBA] font-bold bg-white text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
              >
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Marks</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-bold text-[#111111]">5. Viva Voce &amp; Technical Defense (Max: 5)</span>
              <select
                value={vivaScore}
                onChange={(e) => setVivaScore(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg border border-[#D8CCBA] font-bold bg-white text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
              >
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Marks</option>)}
              </select>
            </div>

          </div>

          {/* Total Marks & Grade Banner */}
          <div className="flex items-center justify-between p-3.5 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA]">
            <div>
              <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block">Computed Score</span>
              <span className="text-xl font-bold text-[#111111]">{total} <span className="text-xs text-[#75695A] font-bold">/ 25</span></span>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-bold text-xs shadow-2xs">
              {grade}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1">Guide Evaluative Remarks</label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#111111] hover:text-black bg-white border border-[#D8CCBA] rounded-xl hover:bg-[#EDE7DB] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={15} />
              <span>Record Evaluation Marks</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default GuideRubricModal;
