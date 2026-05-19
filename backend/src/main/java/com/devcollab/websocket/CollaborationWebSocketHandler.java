package com.devcollab.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;

@Controller
@RequiredArgsConstructor
public class CollaborationWebSocketHandler {

    /**
     * User joins a review session — broadcast to all participants
     * Client sends to: /app/review/{reviewId}/join
     * Broadcasts to: /topic/review/{reviewId}/users
     */
    @MessageMapping("/review/{reviewId}/join")
    @SendTo("/topic/review/{reviewId}/users")
    public UserPresenceMessage handleJoin(
            @DestinationVariable String reviewId,
            UserPresenceMessage message,
            SimpMessageHeaderAccessor headerAccessor) {
        message.setAction("JOINED");
        message.setTimestamp(LocalDateTime.now().toString());
        return message;
    }

    /**
     * User leaves a review session
     * Client sends to: /app/review/{reviewId}/leave
     * Broadcasts to: /topic/review/{reviewId}/users
     */
    @MessageMapping("/review/{reviewId}/leave")
    @SendTo("/topic/review/{reviewId}/users")
    public UserPresenceMessage handleLeave(
            @DestinationVariable String reviewId,
            UserPresenceMessage message) {
        message.setAction("LEFT");
        message.setTimestamp(LocalDateTime.now().toString());
        return message;
    }

    /**
     * Cursor position update — broadcast to collaborators
     * Client sends to: /app/review/{reviewId}/cursor
     * Broadcasts to: /topic/review/{reviewId}/cursors
     */
    @MessageMapping("/review/{reviewId}/cursor")
    @SendTo("/topic/review/{reviewId}/cursors")
    public CursorPositionMessage handleCursorMove(
            @DestinationVariable String reviewId,
            CursorPositionMessage message) {
        return message;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UserPresenceMessage {
        private Long userId;
        private String username;
        private String avatarUrl;
        private String action; // JOINED | LEFT
        private String timestamp;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CursorPositionMessage {
        private Long userId;
        private String username;
        private int lineNumber;
        private int column;
        private String color;
    }
}
