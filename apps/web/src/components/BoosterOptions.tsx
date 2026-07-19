"use client";

import React, { useState } from 'react';

type Mode = 'micro' | 'full' | null;

interface BoosterOptionsProps {
  weakTopics: string[];
  examType: 'JEE' | 'NEET';
  onStartTest: (config: { mode: 'micro' | 'full', questionCount?: number, durationHours?: 1 | 2 | 3 }) => void;
  onSkip: () => void;
}

export const BoosterOptions: React.FC<BoosterOptionsProps> = ({ weakTopics, examType, onStartTest, onSkip }) => {
  const [selectedMode, setSelectedMode] = useState<Mode>(null);
  const [microCount, setMicroCount] = useState<number>(15);
  const [fullDuration, setFullDuration] = useState<1 | 2 | 3>(1);

  const handleStart = () => {
    if (selectedMode === 'micro') {
      onStartTest({ mode: 'micro', questionCount: microCount });
    } else if (selectedMode === 'full') {
      onStartTest({ mode: 'full', durationHours: fullDuration });
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-b-surface2 text-t-primary rounded-[16px] border border-s-stroke2/40 shadow-depth dark:shadow-[inset_0_0_0_1.5px_rgba(229,229,229,0.04),0_12px_32px_rgba(0,0,0,.22)]">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">🎯 Improvement Options Ready</h2>
      
      <div className="mb-6">
        <p className="text-sm text-t-secondary mb-2">Based on your analysis, {weakTopics.length} topics need work:</p>
        <ul className="list-disc pl-5 text-sm text-t-primary space-y-1">
          {weakTopics.map(topic => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-4 mb-6">
        <p className="font-semibold text-t-primary">Choose your practice mode:</p>
        
        {/* Micro Booster Option */}
        <div 
          className={`p-4 border rounded-[10px] cursor-pointer transition-colors ${selectedMode === 'micro' ? 'border-primary-01 bg-primary-01/10' : 'border-s-stroke2/60 hover:bg-b-surface1'}`}
          onClick={() => setSelectedMode('micro')}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-700">⚡ Micro Booster</h3>
              <p className="text-sm text-t-secondary">Quick targeted revision (15-30 Qs)</p>
            </div>
            {selectedMode === 'micro' && (
              <select 
                value={microCount} 
                onChange={(e) => setMicroCount(Number(e.target.value))}
                className="ml-4 h-9 border border-s-stroke2 rounded-[8px] px-2 text-sm bg-b-surface2 text-t-primary"
                onClick={e => e.stopPropagation()}
              >
                <option value={15}>15 Qs</option>
                <option value={20}>20 Qs</option>
                <option value={25}>25 Qs</option>
                <option value={30}>30 Qs</option>
              </select>
            )}
          </div>
        </div>

        {/* Full Improvement Test Option */}
        <div 
          className={`p-4 border rounded-[10px] cursor-pointer transition-colors ${selectedMode === 'full' ? 'border-primary-01 bg-primary-01/10' : 'border-s-stroke2/60 hover:bg-b-surface1'}`}
          onClick={() => setSelectedMode('full')}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-700">⏱️ Full Improvement Test</h3>
              <p className="text-sm text-t-secondary">Exam simulation on weak areas</p>
            </div>
            {selectedMode === 'full' && (
              <select 
                value={fullDuration} 
                onChange={(e) => setFullDuration(Number(e.target.value) as 1 | 2 | 3)}
                className="ml-4 h-9 border border-s-stroke2 rounded-[8px] px-2 text-sm bg-b-surface2 text-t-primary"
                onClick={e => e.stopPropagation()}
              >
                <option value={1}>1 Hour ({examType === 'JEE' ? '25' : '60'} Qs)</option>
                <option value={2}>2 Hours ({examType === 'JEE' ? '50' : '120'} Qs)</option>
                <option value={3}>3 Hours ({examType === 'JEE' ? '75' : '180'} Qs)</option>
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={handleStart}
          disabled={!selectedMode}
          className="flex-1 h-11 bg-primary-01 text-white py-2 rounded-[10px] font-semibold disabled:opacity-40 transition-colors hover:brightness-110"
        >
          Start Practice
        </button>
        <button 
          onClick={onSkip}
          className="flex-1 h-11 bg-b-surface1 text-t-primary py-2 rounded-[10px] border border-s-stroke2/60 font-semibold hover:bg-b-pop transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default BoosterOptions;
