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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#E2E8E4] animate-in zoom-in-95 duration-200 relative">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-mint-100 text-mint-800 flex items-center justify-center font-extrabold shadow-sm">
            <Award size={22} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Formal Rubrics Scoring Entry</h3>
            <p className="text-xs text-slate-500 font-semibold">{team.teamId} &bull; {team.title}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          
          {/* Rubrics Sliders/Selects */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
            
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">1. Literature Survey &amp; Prior Art (Max: 5)</span>
              <select
                value={litScore}
                onChange={(e) => setLitScore(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 font-bold bg-white text-mint-700 focus:outline-none"
              >
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Marks</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">2. System Architecture &amp; Schematics (Max: 5)</span>
              <select
                value={archScore}
                onChange={(e) => setArchScore(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 font-bold bg-white text-mint-700 focus:outline-none"
              >
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Marks</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">3. Code Quality &amp; Pipeline Modularity (Max: 5)</span>
              <select
                value={codeScore}
                onChange={(e) => setCodeScore(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 font-bold bg-white text-mint-700 focus:outline-none"
              >
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Marks</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">4. Functional Prototype Demo (Max: 5)</span>
              <select
                value={demoScore}
                onChange={(e) => setDemoScore(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 font-bold bg-white text-mint-700 focus:outline-none"
              >
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Marks</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">5. Viva Voce &amp; Technical Defense (Max: 5)</span>
              <select
                value={vivaScore}
                onChange={(e) => setVivaScore(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 font-bold bg-white text-mint-700 focus:outline-none"
              >
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Marks</option>)}
              </select>
            </div>

          </div>

          {/* Total Marks & Grade Banner */}
          <div className="flex items-center justify-between p-3.5 bg-mint-50 rounded-2xl border border-mint-200">
            <div>
              <span className="text-[10px] font-bold text-mint-800 uppercase tracking-wider block">Computed Score</span>
              <span className="text-xl font-extrabold text-mint-700">{total} <span className="text-xs text-slate-500 font-bold">/ 25</span></span>
            </div>
            <span className="px-3 py-1 rounded-full bg-mint-200 text-mint-900 font-extrabold text-xs shadow-sm">
              {grade}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Guide Evaluative Remarks</label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:border-mint-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
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
