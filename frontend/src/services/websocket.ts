import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let stompClient: Client | null = null;

export const connectWebSocket = (
  reviewId: number,
  onComment: (comment: any) => void,
  onAiComplete: (result: any) => void,
  onStatusUpdate: (status: string) => void,
  onUserPresence: (msg: any) => void
) => {
  const wsUrl = process.env.REACT_APP_WS_URL || 'http://localhost:8080';

  stompClient = new Client({
    webSocketFactory: () => new SockJS(`${wsUrl}/ws`),
    reconnectDelay: 5000,
    onConnect: () => {
      console.log('WebSocket connected for review:', reviewId);

      // Subscribe to new comments
      stompClient?.subscribe(`/topic/review/${reviewId}/comments`, (msg) => {
        onComment(JSON.parse(msg.body));
      });

      // Subscribe to AI review completion
      stompClient?.subscribe(`/topic/review/${reviewId}/ai-complete`, (msg) => {
        onAiComplete(JSON.parse(msg.body));
      });

      // Subscribe to status changes
      stompClient?.subscribe(`/topic/review/${reviewId}/status`, (msg) => {
        onStatusUpdate(msg.body.replace(/"/g, ''));
      });

      // Subscribe to user presence
      stompClient?.subscribe(`/topic/review/${reviewId}/users`, (msg) => {
        onUserPresence(JSON.parse(msg.body));
      });
    },
    onDisconnect: () => console.log('WebSocket disconnected'),
    onStompError: (frame) => console.error('STOMP error:', frame),
  });

  stompClient.activate();
  return stompClient;
};

export const sendPresence = (reviewId: number, userId: number, username: string, action: 'join' | 'leave') => {
  if (stompClient?.connected) {
    stompClient.publish({
      destination: `/app/review/${reviewId}/${action}`,
      body: JSON.stringify({ userId, username, action: action.toUpperCase() }),
    });
  }
};

export const disconnectWebSocket = () => {
  stompClient?.deactivate();
  stompClient = null;
};
