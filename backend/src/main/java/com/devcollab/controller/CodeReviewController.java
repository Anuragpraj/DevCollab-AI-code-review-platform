package com.devcollab.controller;

import com.devcollab.dto.ReviewDto;
import com.devcollab.entity.User;
import com.devcollab.service.CodeReviewService;
import com.devcollab.service.UserDetailsServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@Tag(name = "Code Reviews", description = "Submit and manage code reviews")
@SecurityRequirement(name = "bearerAuth")
public class CodeReviewController {

    private final CodeReviewService reviewService;
    private final UserDetailsServiceImpl userDetailsService;

    @PostMapping
    @Operation(summary = "Submit code for review")
    public ResponseEntity<ReviewDto.ReviewResponse> createReview(
            @Valid @RequestBody ReviewDto.CreateReviewRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userDetailsService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.createReview(request, user));
    }

    @GetMapping
    @Operation(summary = "Get all reviews (paginated)")
    public ResponseEntity<ReviewDto.PagedReviewResponse> getAllReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(reviewService.getAllReviews(page, size));
    }

    @GetMapping("/my")
    @Operation(summary = "Get my reviews")
    public ResponseEntity<ReviewDto.PagedReviewResponse> getMyReviews(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        User user = userDetailsService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(reviewService.getMyReviews(user, page, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get review by ID")
    public ResponseEntity<ReviewDto.ReviewResponse> getReview(@PathVariable Long id) {
        return ResponseEntity.ok(reviewService.getReview(id));
    }

    @PostMapping("/{id}/ai-review")
    @Operation(summary = "Trigger AI review by Claude")
    public ResponseEntity<ReviewDto.ReviewResponse> triggerAiReview(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userDetailsService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(reviewService.triggerAiReview(id, user));
    }

    @PostMapping("/{id}/comments")
    @Operation(summary = "Add a comment to a review")
    public ResponseEntity<ReviewDto.CommentInfo> addComment(
            @PathVariable Long id,
            @Valid @RequestBody ReviewDto.AddCommentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userDetailsService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.addComment(id, request, user));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update review status")
    public ResponseEntity<ReviewDto.ReviewResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userDetailsService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(reviewService.updateStatus(id, status, user));
    }
}
