import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useApp } from '../context/AppContext';
import { ChatPanel } from './ChatPanel';

export function WorkspacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeConversationId, setActiveConversationId, conversations } = useApp();
  const chatId = searchParams.get('c');

  // Khôi phục hội thoại từ URL khi tải trang hoặc đồng bộ URL khi đổi hội thoại
  useEffect(() => {
    if (chatId && chatId !== activeConversationId) {
      // Nếu có chatId trên URL nhưng state chưa cập nhật
      const exists = conversations.some(c => c.id === chatId);
      if (exists) {
        setActiveConversationId(chatId);
      } else if (conversations.length > 0) {
        // Dữ liệu đã tải nhưng chatId không tồn tại (có thể vừa bị xóa)
        if (activeConversationId) {
          setSearchParams({ c: activeConversationId }, { replace: true });
        } else {
          setSearchParams({}, { replace: true });
        }
      } else {
        // Dữ liệu chưa tải xong, tạm thời set theo URL
        setActiveConversationId(chatId);
      }
    } else if (activeConversationId && activeConversationId !== chatId) {
      // Nếu có activeConversationId nhưng URL chưa có hoặc bị sai -> Cập nhật URL
      setSearchParams({ c: activeConversationId }, { replace: true });
    } else if (!chatId && !activeConversationId && conversations.length > 0) {
      // Đảm bảo xóa tham số 'c' khỏi URL nếu không có chat nào active
      if (searchParams.has('c')) {
         setSearchParams({}, { replace: true });
      }
    }
  }, [chatId, activeConversationId, setActiveConversationId, setSearchParams, conversations, searchParams]);

  return (
    <div className="flex flex-col h-full">

      <div className="flex-1 overflow-hidden">
        <ChatPanel />
      </div>
    </div>
  );
}
