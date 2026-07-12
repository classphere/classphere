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
    <div className="p-6 max-w-lg mx-auto bg-white rounded-[10px] shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">🎯 Improvement Options Ready</h2>
      
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">Based on your analysis, {weakTopics.length} topics need work:</p>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          {weakTopics.map(topic => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-4 mb-6">
        <p className="font-semibold text-gray-800">Choose your practice mode:</p>
        
        {/* Micro Booster Option */}
        <div 
          className={`p-4 border rounded-[10px] cursor-pointer transition-colors ${selectedMode === 'micro' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
          onClick={() => setSelectedMode('micro')}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-700">⚡ Micro Booster</h3>
              <p className="text-sm text-gray-600">Quick targeted revision (15-30 Qs)</p>
            </div>
            {selectedMode === 'micro' && (
              <select 
                value={microCount} 
                onChange={(e) => setMicroCount(Number(e.target.value))}
                className="ml-4 border rounded p-1 text-sm bg-white"
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
          className={`p-4 border rounded-[10px] cursor-pointer transition-colors ${selectedMode === 'full' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
          onClick={() => setSelectedMode('full')}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-700">⏱️ Full Improvement Test</h3>
              <p className="text-sm text-gray-600">Exam simulation on weak areas</p>
            </div>
            {selectedMode === 'full' && (
              <select 
                value={fullDuration} 
                onChange={(e) => setFullDuration(Number(e.target.value) as 1 | 2 | 3)}
                className="ml-4 border rounded p-1 text-sm bg-white"
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
          className="flex-1 bg-blue-600 text-white py-2 rounded-[10px] font-semibold disabled:bg-blue-300 transition-colors"
        >
          Start Practice
        </button>
        <button 
          onClick={onSkip}
          className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-[10px] font-semibold hover:bg-gray-200 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default BoosterOptions;
