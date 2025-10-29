/**
 * Component that highlights search terms within text
 */

import React from 'react';

interface HighlightedTextProps {
  text: string;
  highlight: string;
  className?: string;
}

/**
 * Escapes special regex characters in a string
 */
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, highlight, className }) => {
  if (!highlight || !highlight.trim()) {
    return <span className={className}>{text}</span>;
  }

  // Split text by the highlight term (case-insensitive)
  const escapedHighlight = escapeRegExp(highlight.trim());
  const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));

  return (
    <span className={className}>
      {/* eslint-disable @eslint-react/no-array-index-key */}
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={`${part}-${i}`} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={`${part}-${i}`}>{part}</span>
        ),
      )}
      {/* eslint-enable @eslint-react/no-array-index-key */}
    </span>
  );
};
