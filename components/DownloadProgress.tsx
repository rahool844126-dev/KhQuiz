import React from 'react';
import ProgressBar from './ProgressBar';

interface DownloadProgressProps {
  progress: number;
  message: string;
}

const DownloadProgress: React.FC<DownloadProgressProps> = ({ progress, message }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="w-full max-w-md bg-surface-base p-8 rounded-card shadow-2xl text-center m-4">
        <h2 className="text-2xl font-bold text-text-base mb-4">Aapka Offline Quiz Ban Raha Hai</h2>
        <p className="text-text-muted mb-6 min-h-[24px]">{message}</p>
        <ProgressBar current={progress} total={100} />
      </div>
    </div>
  );
};

export default DownloadProgress;