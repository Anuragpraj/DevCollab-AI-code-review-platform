package com.devcollab.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_review_results")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AiReviewResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id", nullable = false)
    private CodeReview review;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String rawResponse;

    @Column
    private Integer overallScore;

    @Column
    private Integer bugCount;

    @Column
    private Integer securityIssueCount;

    @Column
    private Integer bestPracticeCount;

    @Column
    private Long processingTimeMs;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
