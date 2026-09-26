import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import ProfileModal from '../components/common/ProfileModal';
import WeeklySubmissionManagementView from '../components/hod/WeeklySubmissionManagementView';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentUser, activeRole } = useAuth();
  const navigate = useNavigate();
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const role = (activeRole || currentUser?.role || '').toLowerCase();
  const isHod = role === 'hod';

  return (
    <div className="min-h-screen bg-[#F8F5EE] flex flex-col font-sans relative">
      {/* Existing Global Header Navigation */}
      <Header
        title={isHod ? "Department Head Workspace" : "Settings"}
        subtitle={isHod ? "Academic Milestone Governance & Portal Settings" : "Department of Computer Science and Engineering"}
        onOpenProfile={() => setProfileModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {isHod ? (
          <div>
            {/* Quick Navigation link back to HOD Workspace */}
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => navigate('/hod')}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#75695A] hover:text-[#111111] bg-white border border-[#D8CCBA] px-3.5 py-2 rounded-xl transition cursor-pointer shadow-2xs hover:bg-[#EDE7DB]"
              >
                <ArrowLeft size={15} />
                <span>Return to HOD Workspace</span>
              </button>
            </div>

            {/* HOD Weekly Submission Management */}
            <WeeklySubmissionManagementView />
          </div>
        ) : (
          /* Other roles: Keep empty as requested */
          <div className="min-h-[300px]" />
        )}
      </main>

      {/* Existing Global Profile Modal */}
      {profileModalOpen && (
        <ProfileModal onClose={() => setProfileModalOpen(false)} />
      )}
    </div>
  );
};

export default SettingsPage;
