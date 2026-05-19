package com.devcollab.dto;

import com.devcollab.entity.CodeReview;
import com.devcollab.entity.ReviewComment;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class ReviewDto {

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateReviewRequest {
        @NotBlank(message = "Title is required")
        @Size(max = 200)
        private String title;

        private String description;

        @NotBlank(message = "Code content is required")
        private String codeContent;

        @Size(max = 50)
        private String language;

        private String githubPrUrl;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ReviewResponse {
        private Long id;
        private String title;
        private String description;
        private String codeContent;
        private String language;
        private CodeReview.ReviewStatus status;
        private AuthorInfo author;
        private Integer aiScore;
        private AiResultSummary aiResult;
        private List<CommentInfo> comments;
        private long commentCount;
        private String githubPrUrl;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AuthorInfo {
        private Long id;
        private String username;
        private String fullName;
        private String avatarUrl;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AiResultSummary {
        private String summary;
        private Integer overallScore;
        private Integer bugCount;
        private Integer securityIssueCount;
        private Integer bestPracticeCount;
        private Long processingTimeMs;
        private LocalDateTime createdAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CommentInfo {
        private Long id;
        private String content;
        private Integer lineNumber;
        private ReviewComment.CommentType type;
        private ReviewComment.Severity severity;
        private AuthorInfo author;
        private LocalDateTime createdAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AddCommentRequest {
        @NotBlank
        private String content;
        private Integer lineNumber;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PagedReviewResponse {
        private List<ReviewResponse> reviews;
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;
    }
}
