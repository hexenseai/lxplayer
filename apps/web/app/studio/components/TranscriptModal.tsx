'use client';

import React, { useState } from 'react';
import { Button } from '@lxplayer/ui';

interface TranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (transcript: string) => void;
  transcript: string;
  srt?: string;
  segments?: any[];
  loading: boolean;
  error: string | null;
}

export function TranscriptModal({ 
  isOpen, 
  onClose, 
  onApprove, 
  transcript, 
  srt,
  segments,
  loading, 
  error 
}: TranscriptModalProps) {
  const [editedTranscript, setEditedTranscript] = useState(transcript);
  const [selectedFormat, setSelectedFormat] = useState<'text' | 'srt'>('text');

  // Debug: Log transcript changes
  console.log('TranscriptModal - transcript prop:', transcript);
  console.log('TranscriptModal - editedTranscript state:', editedTranscript);
  console.log('TranscriptModal - loading:', loading);
  console.log('TranscriptModal - error:', error);

  // Update editedTranscript when transcript prop changes
  React.useEffect(() => {
    if (selectedFormat === 'text') {
      setEditedTranscript(transcript);
    } else if (selectedFormat === 'srt' && srt) {
      setEditedTranscript(srt);
    }
  }, [transcript, srt, selectedFormat]);

  // Update content when format changes
  React.useEffect(() => {
    if (selectedFormat === 'text') {
      setEditedTranscript(transcript);
    } else if (selectedFormat === 'srt' && srt) {
      setEditedTranscript(srt);
    }
  }, [selectedFormat]);

  const handleApprove = () => {
    onApprove(editedTranscript);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal Panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Transcript Önizleme
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {loading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Transcript oluşturuluyor...</p>
                </div>
              )}

              {/* Format Selection */}
              {!loading && !error && (transcript || srt) && (
                <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Format Seçin:</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedFormat('text')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        selectedFormat === 'text'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Plain Text
                    </button>
                    {srt && (
                      <button
                        onClick={() => setSelectedFormat('srt')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          selectedFormat === 'srt'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        SRT Format
                      </button>
                    )}
                  </div>
                  {segments && (
                    <span className="text-xs text-gray-500">
                      ({segments.length} segment)
                    </span>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Hata</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {transcript && !loading && !error && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Oluşturulan Transcript
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Gerekirse aşağıdaki metni düzenleyebilirsiniz. Onayladığınızda bu metin bölümün script alanına eklenecektir.
                    </p>
                    <div className="mb-2 p-2 bg-gray-100 rounded text-xs">
                      <strong>Debug:</strong> Transcript length: {transcript.length} | Edited length: {editedTranscript.length}
                    </div>
                    <textarea
                      value={editedTranscript}
                      onChange={(e) => setEditedTranscript(e.target.value)}
                      className="w-full h-64 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Transcript metni burada görünecek..."
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Bilgi</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>Bu transcript, seçilen video içeriğinden otomatik olarak oluşturulmuştur. Metni kontrol edin ve gerekirse düzenleyin.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {transcript && !loading && !error && (
              <Button
                onClick={handleApprove}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Onayla ve Ekle
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {transcript && !loading && !error ? 'İptal' : 'Kapat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
