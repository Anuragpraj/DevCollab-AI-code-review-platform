package com.devcollab.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class DashboardDto {
    private long totalReviews;
    private long myReviews;
    private Double avgScore;
    private long totalComments;
    private List<ScoreOverTime> scoreHistory;
    private Map<String, Long> reviewsByLanguage;
    private Map<String, Long> issuesByType;
    private List<TopReviewer> topReviewers;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ScoreOverTime {
        private String date;
        private Double avgScore;
        private long reviewCount;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TopReviewer {
        private String username;
        private String fullName;
        private long reviewCount;
        private Double avgScore;
    }
}
