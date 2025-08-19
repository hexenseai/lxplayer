"use client";

import { useHtmlPreviewModal } from './HtmlPreviewModal';

interface HtmlPreviewButtonProps {
  htmlContent: string;
  title: string;
}

export function HtmlPreviewButton({ htmlContent, title }: HtmlPreviewButtonProps) {
  const { openModal } = useHtmlPreviewModal();

  const handleClick = () => {
    openModal(htmlContent, title);
  };

  return (
    <button
      onClick={handleClick}
      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
    >
      HTML Önizle
    </button>
  );
}
