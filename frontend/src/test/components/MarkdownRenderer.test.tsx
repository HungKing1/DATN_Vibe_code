import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MarkdownRenderer } from '@/app/components/MarkdownRenderer';

// Mock useApp
vi.mock('@/app/context/AppContext', () => ({
  useApp: () => ({
    openReference: vi.fn()
  })
}));

describe('MarkdownRenderer', () => {
  it('renders markdown text correctly', () => {
    render(<MarkdownRenderer content="Hello **World**" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('World')).toBeInTheDocument();
    expect(screen.getByText('World').tagName).toBe('STRONG');
  });

  it('renders citation links correctly', () => {
    const content = 'This is a [citation](citation:123)';
    render(<MarkdownRenderer content={content} onCitationClick={() => {}} />);
    const link = screen.getByText('citation');
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe('A');
  });
});
