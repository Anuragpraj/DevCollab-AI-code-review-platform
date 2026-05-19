package com.devcollab.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "review_comments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReviewComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id", nullable = false)
    private CodeReview review;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column
    private Integer lineNumber;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CommentType type = CommentType.HUMAN;

    @Enumerated(EnumType.STRING)
    private Severity severity;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    public enum CommentType {
        HUMAN, AI_BUG, AI_SECURITY, AI_BEST_PRACTICE, AI_SUGGESTION
    }

    public enum Severity {
        INFO, WARNING, ERROR, CRITICAL
    }
}
