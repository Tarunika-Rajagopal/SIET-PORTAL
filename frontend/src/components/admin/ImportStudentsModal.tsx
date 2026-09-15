import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { AdminService } from '../../services/adminService';

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBatch?: string;
  defaultClass?: string;
  onSuccess: (message: string) => void;
}

export const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({
  isOpen,
  onClose,
  defaultBatch = "2023-2027 (III Year)",
  defaultClass = "CSE-B",
  onSuccess
}) => {
  if (!isOpen) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<Array<{
    name: string;
    rollNo: string;
    email: string;
    password?: string;
    batch: string;
    classSection: string;
  }>>([]);
  const [reason, setReason] = useState('Bulk student registration via institutional spreadsheet upload');
  const [error, setError] = useState('');

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Name,Register Number,Email,Password,Batch,Class\n" +
      "Arun Kumar,714023104801,arun.k@srishakthi.ac.in,student@123,2023-2027 (III Year),CSE-B\n" +
      "Bhavana S,714023104802,bhavana.s@srishakthi.ac.in,student@123,2023-2027 (III Year),CSE-B\n" +
      "Deepak R,714023104803,deepak.r@srishakthi.ac.in,student@123,2023-2027 (III Year),CSE-B\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "SIET_Students_Roster_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        setError('The selected file is empty or does not contain data rows.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes('name'));
      const rollIdx = headers.findIndex(h => h.includes('roll') || h.includes('reg') || h.includes('number'));
      const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));
      const pwdIdx = headers.findIndex(h => h.includes('pass') || h.includes('pwd'));
      const batchIdx = headers.findIndex(h => h.includes('batch') || h.includes('year'));
      const classIdx = headers.findIndex(h => h.includes('class') || h.includes('sec'));

      if (nameIdx === -1 || rollIdx === -1 || emailIdx === -1) {
        setError('Missing required header columns. File must contain Name, Register Number, and Email.');
        return;
      }

      const rows: Array<any> = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length <= 1) continue;

        const name = cols[nameIdx] || '';
        const rollNo = cols[rollIdx] || '';
        const email = cols[emailIdx] || '';
        const password = pwdIdx !== -1 && cols[pwdIdx] ? cols[pwdIdx] : 'student@123';
        const b = batchIdx !== -1 && cols[batchIdx] ? cols[batchIdx] : defaultBatch;
        const c = classIdx !== -1 && cols[classIdx] ? cols[classIdx] : defaultClass;

        if (name && rollNo && email) {
          rows.push({
            name,
            rollNo,
            email,
            password,
            batch: b,
            classSection: c
          });
        }
      }

      if (rows.length === 0) {
        setError('No valid candidate rows could be parsed from the file.');
      } else {
        setParsedRows(rows);
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedRows.length === 0) {
      setError('Please upload and parse a valid spreadsheet first.');
      return;
    }

    const res = AdminService.importStudents(parsedRows, reason);
    onSuccess(`Successfully imported ${res.addedCount} students into the roster.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-[#E2E8E4] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-[#E2E8E4] flex items-center justify-between bg-mint-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-mint-500 text-white flex items-center justify-center font-bold shadow-sm">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Import Students from Spreadsheet</h3>
              <p className="text-xs text-slate-500">Batch upload candidates via .csv or Excel export</p>
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
        <form onSubmit={handleImportSubmit} className="p-6 space-y-4 text-xs">
          
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Download Template Banner */}
          <div className="p-4 rounded-2xl bg-[#EFF3F1] border border-[#E2E8E4] flex items-center justify-between">
            <div>
              <span className="font-extrabold text-slate-800 block text-xs">Need the standard column format?</span>
              <span className="text-[11px] text-slate-500">Headers: Name, Register Number, Email, Password, Batch, Class</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-[#E2E8E4] text-mint-900 font-bold hover:bg-mint-50 flex items-center gap-1.5 transition text-[11px] shrink-0"
            >
              <Download size={13} className="text-mint-600" />
              <span>Download Template</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-mint-300 hover:border-mint-500 bg-mint-50/20 hover:bg-mint-50/50 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-12 h-12 rounded-2xl bg-mint-100 text-mint-800 flex items-center justify-center font-bold">
              <UploadCloud size={24} />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-sm">
                {fileName ? fileName : "Click to browse or drop CSV file here"}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Comma-separated file (.csv) with student roster records
              </p>
            </div>
          </div>

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span className="flex items-center gap-1.5 text-mint-800">
                  <CheckCircle2 size={15} className="text-mint-600" />
                  <span>Ready to import {parsedRows.length} candidates</span>
                </span>
                <span className="text-[11px] text-slate-500">Showing first 3 rows</span>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-[#E2E8E4] overflow-hidden max-h-36 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-2">Reg No</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {parsedRows.slice(0, 3).map((r, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-mono font-bold text-mint-900">{r.rollNo}</td>
                        <td className="p-2 font-bold text-slate-800">{r.name}</td>
                        <td className="p-2 text-slate-500 font-mono">{r.email}</td>
                        <td className="p-2 font-bold text-slate-700">{r.classSection}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Reason Input */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Import Justification (Audit Trail) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Official semester student roster sync"
              className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl focus:outline-none focus:border-mint-500 font-medium"
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
              disabled={parsedRows.length === 0}
              className="px-5 py-2 bg-mint-500 hover:bg-mint-600 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <FileSpreadsheet size={14} />
              <span>Finalize Import ({parsedRows.length})</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default ImportStudentsModal;
