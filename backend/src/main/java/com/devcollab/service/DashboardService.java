package com.devcollab.service;

import com.devcollab.dto.DashboardDto;
import com.devcollab.entity.User;
import com.devcollab.repository.CodeReviewRepository;
import com.devcollab.repository.ReviewCommentRepository;
import com.devcollab.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final CodeReviewRepository reviewRepository;
    private final ReviewCommentRepository commentRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public DashboardDto getDashboardStats(User currentUser) {
        long totalReviews = reviewRepository.count();
        long myReviews = reviewRepository.countByAuthor(currentUser);
        Double avgScore = reviewRepository.avgScoreByAuthor(currentUser);

        // Language breakdown
        List<Object[]> langData = reviewRepository.countByLanguage();
        Map<String, Long> reviewsByLanguage = new LinkedHashMap<>();
        for (Object[] row : langData) {
            String lang = row[0] != null ? (String) row[0] : "Unknown";
            Long count = (Long) row[1];
            reviewsByLanguage.put(lang, count);
        }

        // Simulated issue type breakdown (would be aggregated from AI results in prod)
        Map<String, Long> issuesByType = new LinkedHashMap<>();
        issuesByType.put("Bug", 23L);
        issuesByType.put("Security", 12L);
        issuesByType.put("Best Practice", 34L);
        issuesByType.put("Suggestion", 45L);

        // Score history (last 7 entries)
        List<DashboardDto.ScoreOverTime> scoreHistory = generateScoreHistory();

        // Top reviewers
        List<DashboardDto.TopReviewer> topReviewers = userRepository.findAll().stream()
                .limit(5)
                .map(u -> DashboardDto.TopReviewer.builder()
                        .username(u.getUsername())
                        .fullName(u.getFullName())
                        .reviewCount(reviewRepository.countByAuthor(u))
                        .avgScore(reviewRepository.avgScoreByAuthor(u))
                        .build())
                .filter(r -> r.getReviewCount() > 0)
                .sorted(Comparator.comparingLong(DashboardDto.TopReviewer::getReviewCount).reversed())
                .collect(Collectors.toList());

        return DashboardDto.builder()
                .totalReviews(totalReviews)
                .myReviews(myReviews)
                .avgScore(avgScore != null ? Math.round(avgScore * 10.0) / 10.0 : null)
                .scoreHistory(scoreHistory)
                .reviewsByLanguage(reviewsByLanguage)
                .issuesByType(issuesByType)
                .topReviewers(topReviewers)
                .build();
    }

    private List<DashboardDto.ScoreOverTime> generateScoreHistory() {
        // In production, this would query aggregated real data grouped by week/day
        String[] dates = {"Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7"};
        double[] scores = {58, 63, 71, 68, 74, 79, 82};
        long[] counts = {3, 5, 4, 6, 5, 7, 8};

        List<DashboardDto.ScoreOverTime> history = new ArrayList<>();
        for (int i = 0; i < dates.length; i++) {
            history.add(DashboardDto.ScoreOverTime.builder()
                    .date(dates[i])
                    .avgScore(scores[i])
                    .reviewCount(counts[i])
                    .build());
        }
        return history;
    }
}
