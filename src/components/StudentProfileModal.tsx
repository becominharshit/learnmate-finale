import React, { useState, useEffect } from 'react';
import {
  X,
  GraduationCap,
  Target,
  Sparkles,
  CheckCircle2,
  School,
  Building2,
  Globe,
  Clock
} from 'lucide-react';
import {
  StudentAcademicProfile,
  EducationStage,
  ExamTypeId
} from '../types/study';
import { studyStorage } from '../services/storageService';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileSaved: (profile: StudentAcademicProfile) => void;
}

const EXAM_OPTIONS: { id: ExamTypeId; label: string; badge: string }[] = [
  { id: 'jee_main', label: 'JEE Main', badge: 'Engineering UG' },
  { id: 'jee_advanced', label: 'JEE Advanced', badge: 'IIT Entrance' },
  { id: 'neet_ug', label: 'NEET UG', badge: 'Medical UG' },
  { id: 'cuet', label: 'CUET UG / PG', badge: 'Central Universities' },
  { id: 'board_exams', label: 'Board Exams (CBSE / ICSE / State)', badge: 'Class 10 & 12' },
  { id: 'university_exams', label: 'University / College Semester Exams', badge: 'B.Tech / B.Sc / MBBS / BA' },
  { id: 'general_practice', label: 'General Practice & Concept Mastery', badge: 'Self-Paced' }
];

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileSaved
}) => {
  const [profile, setProfile] = useState<StudentAcademicProfile>(() =>
    studyStorage.getStudentProfile()
  );
  const [subjectsInput, setSubjectsInput] = useState<string>('');
  const [weakAreasInput, setWeakAreasInput] = useState<string>('');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = studyStorage.getStudentProfile();
      setProfile(current);
      setSubjectsInput(current.subjectsStudied.join(', '));
      setWeakAreasInput(current.weakAreas.join(', '));
      setSavedNotice(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSchoolStage = profile.educationStage === 'school';

  const handleStageChange = (stage: EducationStage) => {
    setProfile((prev) => ({
      ...prev,
      educationStage: stage,
      targetExam:
        stage === 'college' && prev.targetExam === 'board_exams'
          ? 'university_exams'
          : stage === 'school' && prev.targetExam === 'university_exams'
          ? 'board_exams'
          : prev.targetExam
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSubjects = subjectsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedWeakAreas = weakAreasInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updated: StudentAcademicProfile = {
      ...profile,
      subjectsStudied:
        parsedSubjects.length > 0 ? parsedSubjects : ['Physics', 'Mathematics', 'Chemistry'],
      weakAreas: parsedWeakAreas,
      updatedAt: new Date().toISOString()
    };

    studyStorage.saveStudentProfile(updated);
    setSavedNotice(true);
    onProfileSaved(updated);
    setTimeout(() => {
      onClose();
    }, 550);
  };

  return (
    <div
      data-testid="student-profile-modal"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-3xl w-full overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-purple-50/50 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-md">
                Personalized Learning Identity
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                Student Academic Profile &amp; Exam Goals
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 border border-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                data-testid="profile-fullname-input"
                placeholder="e.g., Aarav Sharma"
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Current Education Stage
              </label>
              <select
                value={profile.educationStage}
                onChange={(e) => handleStageChange(e.target.value as EducationStage)}
                data-testid="profile-stage-select"
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="school">School Student (Class 9–12)</option>
                <option value="college">Undergraduate / College Student</option>
                <option value="self_learner">Self-Learner / Competitive Aspirant</option>
              </select>
            </div>
          </div>

          {/* Conditional Academic Fields: School vs College */}
          {isSchoolStage ? (
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/70 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                <School className="w-4 h-4 text-blue-600" />
                <span>School Academic Details (Class 9–12)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Class / Grade
                  </label>
                  <select
                    value={profile.schoolClass}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        schoolClass: e.target.value as StudentAcademicProfile['schoolClass']
                      })
                    }
                    data-testid="profile-school-class-select"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                  >
                    <option value="Class 9">Class 9</option>
                    <option value="Class 10">Class 10</option>
                    <option value="Class 11">Class 11</option>
                    <option value="Class 12">Class 12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Academic Stream
                  </label>
                  <select
                    value={profile.stream}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        stream: e.target.value as StudentAcademicProfile['stream']
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                  >
                    <option value="PCM">Science — PCM</option>
                    <option value="PCB">Science — PCB</option>
                    <option value="PCMB">Science — PCMB</option>
                    <option value="Commerce">Commerce</option>
                    <option value="Arts / Humanities">Arts / Humanities</option>
                    <option value="Foundation">Foundation (Class 9/10)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    School Board
                  </label>
                  <select
                    value={profile.schoolBoard}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        schoolBoard: e.target.value as StudentAcademicProfile['schoolBoard']
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE / ISC">ICSE / ISC</option>
                    <option value="State Board">State Board</option>
                    <option value="IB / Cambridge">IB / Cambridge</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={profile.academicYear}
                    onChange={(e) => setProfile({ ...profile, academicYear: e.target.value })}
                    placeholder="2026–2027"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  School Name (Optional)
                </label>
                <input
                  type="text"
                  value={profile.schoolName}
                  onChange={(e) => setProfile({ ...profile, schoolName: e.target.value })}
                  placeholder="e.g., Delhi Public School / Kendriya Vidyalaya"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
                />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/70 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Undergraduate / University Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Year of Study
                  </label>
                  <select
                    value={profile.collegeYear}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        collegeYear: e.target.value as StudentAcademicProfile['collegeYear']
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Course / Degree Program
                  </label>
                  <input
                    type="text"
                    value={profile.degreeCourse}
                    onChange={(e) => setProfile({ ...profile, degreeCourse: e.target.value })}
                    placeholder="e.g., B.Tech CSE / AI, B.Sc, MBBS, BA"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    College / University
                  </label>
                  <input
                    type="text"
                    value={profile.universityName}
                    onChange={(e) => setProfile({ ...profile, universityName: e.target.value })}
                    placeholder="e.g., IIT / NIT / Delhi University"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Target Examination & Learning Goals */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Target className="w-4 h-4 text-blue-600" />
              <span>Target Examination &amp; Preparation Focus</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Examination (Auto-personalizes Practice Simulator)
                </label>
                <select
                  value={profile.targetExam}
                  onChange={(e) =>
                    setProfile({ ...profile, targetExam: e.target.value as ExamTypeId })
                  }
                  data-testid="profile-target-exam-select"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900"
                >
                  {EXAM_OPTIONS.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.label} ({exam.badge})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Exam Year
                </label>
                <input
                  type="text"
                  value={profile.targetExamYear}
                  onChange={(e) => setProfile({ ...profile, targetExamYear: e.target.value })}
                  placeholder="2027"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subjects Being Studied (comma-separated)
                </label>
                <input
                  type="text"
                  value={subjectsInput}
                  onChange={(e) => setSubjectsInput(e.target.value)}
                  placeholder="Physics, Mathematics, Chemistry"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Topics / Weak Areas to Improve (comma-separated)
                </label>
                <input
                  type="text"
                  value={weakAreasInput}
                  onChange={(e) => setWeakAreasInput(e.target.value)}
                  placeholder="Conditional Probability, Bayes Theorem, Integration"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  Preferred Study Language
                </label>
                <select
                  value={profile.preferredLanguage}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      preferredLanguage: e.target.value as StudentAcademicProfile['preferredLanguage']
                    })
                  }
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                >
                  <option value="English">English</option>
                  <option value="Hindi + English (Hinglish)">Hindi + English (Hinglish)</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Bengali">Bengali</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Daily Study Goal (Minutes)
                </label>
                <input
                  type="number"
                  min={15}
                  max={600}
                  value={profile.dailyStudyMinutesGoal}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      dailyStudyMinutesGoal: Number(e.target.value) || 90
                    })
                  }
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Personal Goal Statement
              </label>
              <textarea
                rows={2}
                value={profile.personalGoalStatement}
                onChange={(e) =>
                  setProfile({ ...profile, personalGoalStatement: e.target.value })
                }
                placeholder="Describe what you are working toward this semester or exam season..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {savedNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Profile saved! Personalizing your dashboard &amp; exam simulator...
            </div>
          )}

          <div className="pt-3 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="profile-save-btn"
              className="h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Save Personalized Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
