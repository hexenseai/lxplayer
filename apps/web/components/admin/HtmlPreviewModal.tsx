"use client";

import React, { useMemo, useState } from 'react';

interface HtmlPreviewModalProps {
  htmlContent: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

function rewriteHtmlAssetUrls(html: string): string {
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const cdn = (process.env.NEXT_PUBLIC_CDN_URL || 'http://yodea.hexense.ai:9000/lxplayer').replace(/\/$/, '');
  const cdnOrigin = cdn.split('/').slice(0, 3).join('/');
  const cdnPathPrefix = cdn.replace(cdnOrigin, '').replace(/^\//, '');
  return (html || '').replace(/\s(src|href)=("|')([^"']+)(\2)/gi, (_m, attr, quote, url, endQuote) => {
    if (!url) return ` ${attr}=${quote}${url}${endQuote}`;
    if (/^data:/i.test(url) || /^blob:/i.test(url)) return ` ${attr}=${quote}${url}${endQuote}`;
    if (/^https?:\/\//i.test(url)) {
      try {
        const u = new URL(url);
        const origin = `${u.protocol}//${u.host}`;
        if (origin === cdnOrigin) {
          let objectPath = u.pathname.replace(/^\//, '');
          if (cdnPathPrefix && objectPath.startsWith(cdnPathPrefix + '/')) {
            objectPath = objectPath.slice(cdnPathPrefix.length + 1);
          }
          try { objectPath = decodeURIComponent(objectPath); } catch {}
          const redirect = `${api}/uploads/presign-get-object/${encodeURI(objectPath)}`;
          return ` ${attr}=${quote}${redirect}${endQuote}`;
        }
      } catch {}
      return ` ${attr}=${quote}${url}${endQuote}`;
    }
    const redirect = `${api}/uploads/presign-get-object/${encodeURI(url)}`;
    return ` ${attr}=${quote}${redirect}${endQuote}`;
  });
}

export function HtmlPreviewModal({ htmlContent, title, isOpen, onClose }: HtmlPreviewModalProps) {
  if (!isOpen) return null;
  const processed = useMemo(() => rewriteHtmlAssetUrls(htmlContent || ''), [htmlContent]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: processed }} />
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for managing modal state
export function useHtmlPreviewModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [title, setTitle] = useState('');

  const openModal = (content: string, modalTitle: string) => {
    setHtmlContent(content);
    setTitle(modalTitle);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    htmlContent,
    title,
    openModal,
    closeModal
  };
}
