package com.devcollab.repository;

import com.devcollab.entity.CodeReview;
import com.devcollab.entity.ReviewComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewCommentRepository extends JpaRepository<ReviewComment, Long> {
    List<ReviewComment> findByReviewOrderByLineNumberAscCreatedAtAsc(CodeReview review);
    List<ReviewComment> findByReviewAndTypeIn(CodeReview review, List<ReviewComment.CommentType> types);
    long countByReview(CodeReview review);
}
