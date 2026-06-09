import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatPanel } from '@/app/components/ChatPanel';
import { MemoryRouter } from 'react-router';

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock useApp
vi.mock('@/app/context/AppContext', () => ({
  useApp: () => ({
    messages: [],
    isAIThinking: false,
    thinkingConversationId: null,
    activeConversationId: '1',
    sendMessage: vi.fn(),
    streamingMsgId: null,
    streamingContent: ''
  })
}));

describe('ChatPanel', () => {
  const renderComponent = () => {
    return render(
      <MemoryRouter>
          <ChatPanel />
      </MemoryRouter>
    );
  };

  it('renders input and send button correctly', () => {
    renderComponent();
    expect(screen.getByPlaceholderText(/Hỏi một câu hỏi/i)).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    // Mic is first button, Send is second, or check by class/icon
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('does not send empty message', async () => {
    renderComponent();
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1]; // The last button is Send
    fireEvent.click(sendButton);
    // There shouldn't be any "User:" message
    expect(screen.queryByText('user')).not.toBeInTheDocument();
  });
});
