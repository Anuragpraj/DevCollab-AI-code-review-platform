package com.devcollab.service;

import com.devcollab.dto.ReviewDto;
import com.devcollab.entity.AiReviewResult;
import com.devcollab.entity.CodeReview;
import com.devcollab.entity.ReviewComment;
import com.devcollab.entity.User;
import com.devcollab.repository.CodeReviewRepository;
import com.devcollab.repository.ReviewCommentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CodeReviewService {

    private final CodeReviewRepository reviewRepository;
    private final ReviewCommentRepository commentRepository;
    private final ClaudeAiService claudeAiService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ReviewDto.ReviewResponse createReview(ReviewDto.CreateReviewRequest request, User author) {
        CodeReview review = CodeReview.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .codeContent(request.getCodeContent())
                .language(request.getLanguage())
                .githubPrUrl(request.getGithubPrUrl())
                .author(author)
                .status(CodeReview.ReviewStatus.PENDING)
                .build();

        CodeReview saved = reviewRepository.save(review);
        log.info("Created review ID: {} by user: {}", saved.getId(), author.getUsername());
        return mapToResponse(saved);
    }

    @Transactional
    public ReviewDto.ReviewResponse triggerAiReview(Long reviewId, User currentUser) {
        CodeReview review = getReviewById(reviewId);
        review.setStatus(CodeReview.ReviewStatus.AI_REVIEWING);
        reviewRepository.save(review);

        // Notify collaborators via WebSocket
        messagingTemplate.convertAndSend(
                "/topic/review/" + reviewId + "/status",
                "AI_REVIEWING"
        );

        // Async AI call
        claudeAiService.reviewCode(review).thenAccept(aiResult -> {
            updateWithAiResult(review.getId(), aiResult);
        });

        return mapToResponse(review);
    }

    @Transactional
    public void updateWithAiResult(Long reviewId, AiReviewResult aiResult) {
        CodeReview review = getReviewById(reviewId);
        review.setAiReviewResult(aiResult);
        review.setAiScore(aiResult.getOverallScore());
        review.setStatus(CodeReview.ReviewStatus.AI_DONE);
        reviewRepository.save(review);

        // Broadcast completion via WebSocket
        messagingTemplate.convertAndSend(
                "/topic/review/" + reviewId + "/ai-complete",
                mapAiResult(aiResult)
        );
        log.info("AI review saved for review ID: {}", reviewId);
    }

    @Transactional
    public ReviewDto.CommentInfo addComment(Long reviewId, ReviewDto.AddCommentRequest request, User author) {
        CodeReview review = getReviewById(reviewId);
        ReviewComment comment = ReviewComment.builder()
                .review(review)
                .author(author)
                .content(request.getContent())
                .lineNumber(request.getLineNumber())
                .type(ReviewComment.CommentType.HUMAN)
                .build();

        ReviewComment saved = commentRepository.save(comment);

        ReviewDto.CommentInfo commentInfo = mapCommentToDto(saved);

        // Broadcast to all collaborators
        messagingTemplate.convertAndSend("/topic/review/" + reviewId + "/comments", commentInfo);

        return commentInfo;
    }

    @Transactional(readOnly = true)
    public ReviewDto.ReviewResponse getReview(Long id) {
        return mapToResponse(getReviewById(id));
    }

    @Transactional(readOnly = true)
    public ReviewDto.PagedReviewResponse getAllReviews(int page, int size) {
        Page<CodeReview> reviewPage = reviewRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
        return ReviewDto.PagedReviewResponse.builder()
                .reviews(reviewPage.getContent().stream().map(this::mapToResponse).collect(Collectors.toList()))
                .page(page)
                .size(size)
                .totalElements(reviewPage.getTotalElements())
                .totalPages(reviewPage.getTotalPages())
                .build();
    }

    @Transactional(readOnly = true)
    public ReviewDto.PagedReviewResponse getMyReviews(User user, int page, int size) {
        Page<CodeReview> reviewPage = reviewRepository.findByAuthorOrderByCreatedAtDesc(user, PageRequest.of(page, size));
        return ReviewDto.PagedReviewResponse.builder()
                .reviews(reviewPage.getContent().stream().map(this::mapToResponse).collect(Collectors.toList()))
                .page(page)
                .size(size)
                .totalElements(reviewPage.getTotalElements())
                .totalPages(reviewPage.getTotalPages())
                .build();
    }

    @Transactional
    public ReviewDto.ReviewResponse updateStatus(Long reviewId, String status, User currentUser) {
        CodeReview review = getReviewById(reviewId);
        review.setStatus(CodeReview.ReviewStatus.valueOf(status));
        reviewRepository.save(review);

        messagingTemplate.convertAndSend("/topic/review/" + reviewId + "/status", status);
        return mapToResponse(review);
    }

    // ---- Mapping helpers ----

    private CodeReview getReviewById(Long id) {
        return reviewRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Review not found with ID: " + id));
    }

    public ReviewDto.ReviewResponse mapToResponse(CodeReview review) {
        List<ReviewComment> comments = commentRepository.findByReviewOrderByLineNumberAscCreatedAtAsc(review);

        return ReviewDto.ReviewResponse.builder()
                .id(review.getId())
                .title(review.getTitle())
                .description(review.getDescription())
                .codeContent(review.getCodeContent())
                .language(review.getLanguage())
                .status(review.getStatus())
                .author(mapAuthor(review.getAuthor()))
                .aiScore(review.getAiScore())
                .aiResult(review.getAiReviewResult() != null ? mapAiResult(review.getAiReviewResult()) : null)
                .comments(comments.stream().map(this::mapCommentToDto).collect(Collectors.toList()))
                .commentCount(comments.size())
                .githubPrUrl(review.getGithubPrUrl())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }

    private ReviewDto.AuthorInfo mapAuthor(User user) {
        if (user == null) return null;
        return ReviewDto.AuthorInfo.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }

    private ReviewDto.AiResultSummary mapAiResult(AiReviewResult r) {
        return ReviewDto.AiResultSummary.builder()
                .summary(r.getSummary())
                .overallScore(r.getOverallScore())
                .bugCount(r.getBugCount())
                .securityIssueCount(r.getSecurityIssueCount())
                .bestPracticeCount(r.getBestPracticeCount())
                .processingTimeMs(r.getProcessingTimeMs())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private ReviewDto.CommentInfo mapCommentToDto(ReviewComment c) {
        return ReviewDto.CommentInfo.builder()
                .id(c.getId())
                .content(c.getContent())
                .lineNumber(c.getLineNumber())
                .type(c.getType())
                .severity(c.getSeverity())
                .author(c.getAuthor() != null ? mapAuthor(c.getAuthor()) : null)
                .createdAt(c.getCreatedAt())
                .build();
    }
}
