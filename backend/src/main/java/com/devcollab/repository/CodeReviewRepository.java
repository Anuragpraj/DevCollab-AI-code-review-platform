package com.devcollab.repository;

import com.devcollab.entity.CodeReview;
import com.devcollab.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CodeReviewRepository extends JpaRepository<CodeReview, Long> {

    Page<CodeReview> findByAuthorOrderByCreatedAtDesc(User author, Pageable pageable);

    Page<CodeReview> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT cr FROM CodeReview cr WHERE cr.author = :author AND cr.createdAt >= :since")
    List<CodeReview> findRecentByAuthor(@Param("author") User author, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(cr) FROM CodeReview cr WHERE cr.author = :author")
    long countByAuthor(@Param("author") User author);

    @Query("SELECT AVG(cr.aiScore) FROM CodeReview cr WHERE cr.author = :author AND cr.aiScore IS NOT NULL")
    Double avgScoreByAuthor(@Param("author") User author);

    @Query("SELECT cr.language, COUNT(cr) FROM CodeReview cr GROUP BY cr.language ORDER BY COUNT(cr) DESC")
    List<Object[]> countByLanguage();

    @Query("SELECT cr FROM CodeReview cr WHERE cr.status = :status ORDER BY cr.createdAt DESC")
    List<CodeReview> findByStatus(@Param("status") CodeReview.ReviewStatus status);
}
