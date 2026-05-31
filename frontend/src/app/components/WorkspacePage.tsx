import { ChatPanel } from './ChatPanel';

export function WorkspacePage() {

  return (
    <div className="flex flex-col h-full">

      <div className="flex-1 overflow-hidden">
        <ChatPanel />
      </div>
    </div>
  );
}
