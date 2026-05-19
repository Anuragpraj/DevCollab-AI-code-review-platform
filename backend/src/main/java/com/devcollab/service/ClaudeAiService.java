package com.devcollab.service;

import com.devcollab.entity.AiReviewResult;
import com.devcollab.entity.CodeReview;
import com.devcollab.entity.ReviewComment;
import com.devcollab.repository.ReviewCommentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * AI Code Review Service using OpenRouter API.
 *
 * OpenRouter gives access to 100+ models (Claude, GPT-4, Gemini, Llama, etc.)
 * using ONE API key.  We try models in order — if the first fails (rate limit /
 * quota), we automatically fall back to the next one. That way the review
 * almost always completes even under load.
 *
 * Fallback chain (configurable in application.properties):
 *   1. anthropic/claude-3.5-sonnet   ← best quality
 *   2. anthropic/claude-3-haiku       ← fast + cheap
 *   3. google/gemini-flash-1.5        ← free tier available
 *   4. meta-llama/llama-3.1-8b-instruct ← open-source fallback
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ClaudeAiService {

    // ── OpenRouter config (set in application.properties) ────────────────────
    @Value("${openrouter.api-key}")
    private String apiKey;

    @Value("${openrouter.api-url:https://openrouter.ai/api/v1/chat/completions}")
    private String apiUrl;

    @Value("${openrouter.site-url:http://localhost:3000}")
    private String siteUrl;

    @Value("${openrouter.site-name:DevCollab}")
    private String siteName;

    /**
     * Comma-separated fallback model list.
     * First model is tried first; subsequent ones are fallbacks.
     */
    @Value("${openrouter.models:anthropic/claude-3.5-sonnet,anthropic/claude-3-haiku,google/gemini-flash-1.5,meta-llama/llama-3.1-8b-instruct:free}")
    private String modelsCsv;

    @Value("${openrouter.max-tokens:2048}")
    private int maxTokens;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ReviewCommentRepository commentRepository;

    // ── Public API ────────────────────────────────────────────────────────────

    @Async
    public CompletableFuture<AiReviewResult> reviewCode(CodeReview review) {
        long startTime = System.currentTimeMillis();
        log.info("Starting AI review for review ID: {}", review.getId());

        String prompt = buildReviewPrompt(review.getCodeContent(), review.getLanguage());
        String[] models = modelsCsv.split(",");

        // Try each model in order — return first success
        for (int i = 0; i < models.length; i++) {
            String model = models[i].trim();
            try {
                log.info("Trying model [{}/{}]: {}", i + 1, models.length, model);
                String rawResponse = callOpenRouter(prompt, model);
                AiReviewResult result = parseAiResponse(rawResponse, review, startTime, model);
                log.info("AI review done (model={}) in {}ms", model, System.currentTimeMillis() - startTime);
                return CompletableFuture.completedFuture(result);

            } catch (HttpClientErrorException.TooManyRequests e) {
                log.warn("Rate limited on model {}. Trying next...", model);
            } catch (HttpClientErrorException.Unauthorized e) {
                log.error("Invalid OpenRouter API key. Check OPENROUTER_API_KEY in .env");
                break; // No point retrying other models — key is wrong
            } catch (HttpServerErrorException e) {
                log.warn("Server error on model {}. Trying next... ({})", model, e.getStatusCode());
            } catch (Exception e) {
                log.warn("Failed on model {}: {}. Trying next...", model, e.getMessage());
            }
        }

        // All models failed — return graceful fallback
        log.error("All models failed for review ID: {}", review.getId());
        return CompletableFuture.completedFuture(buildFallbackResult(review, startTime));
    }

    // ── OpenRouter HTTP call ──────────────────────────────────────────────────

    private String callOpenRouter(String prompt, String model) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);
        // OpenRouter recommends these for tracking / free-tier eligibility
        headers.set("HTTP-Referer", siteUrl);
        headers.set("X-Title", siteName);

        // Build OpenAI-compatible request body (OpenRouter uses OpenAI format)
        ObjectNode requestBody = objectMapper.createObjectNode();
        requestBody.put("model", model);
        requestBody.put("max_tokens", maxTokens);

        // System prompt for better JSON compliance
        ArrayNode messages = objectMapper.createArrayNode();

        ObjectNode systemMsg = objectMapper.createObjectNode();
        systemMsg.put("role", "system");
        systemMsg.put("content",
            "You are an expert senior software engineer. " +
            "Always respond with valid JSON only — no markdown fences, no explanation outside JSON.");
        messages.add(systemMsg);

        ObjectNode userMsg = objectMapper.createObjectNode();
        userMsg.put("role", "user");
        userMsg.put("content", prompt);
        messages.add(userMsg);

        requestBody.set("messages", messages);

        // Force JSON output if model supports it
        ObjectNode responseFormat = objectMapper.createObjectNode();
        responseFormat.put("type", "json_object");
        requestBody.set("response_format", responseFormat);

        HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);
        ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);

        // OpenAI-format response: choices[0].message.content
        JsonNode responseJson = objectMapper.readTree(response.getBody());
        String content = responseJson.path("choices").path(0).path("message").path("content").asText();

        if (content.isEmpty()) {
            throw new RuntimeException("Empty response from model: " + model);
        }
        return content;
    }

    // ── Prompt builder ────────────────────────────────────────────────────────

    private String buildReviewPrompt(String code, String language) {
        String lang = (language != null && !language.isBlank()) ? language : "code";
        return String.format("""
            You are an expert senior software engineer performing a thorough code review.

            Analyze the following %s code carefully.

            Code to review:
            ```
            %s
            ```

            Respond with ONLY this exact JSON structure (no text outside JSON):
            {
              "summary": "2-3 sentence overall assessment of the code quality",
              "overallScore": <integer 0-100, higher is better quality>,
              "issues": [
                {
                  "lineNumber": <integer line number, or null if general>,
                  "type": "<BUG|SECURITY|BEST_PRACTICE|SUGGESTION>",
                  "severity": "<INFO|WARNING|ERROR|CRITICAL>",
                  "message": "<specific actionable description of the issue and exactly how to fix it>"
                }
              ]
            }

            Focus on:
            - Bugs and logical errors (type: BUG)
            - Security vulnerabilities: SQL injection, XSS, insecure auth, hardcoded secrets (type: SECURITY)
            - Performance bottlenecks (type: BEST_PRACTICE)
            - Code quality, maintainability, naming (type: SUGGESTION)
            
            Be specific, educational, and actionable. Return only JSON.
            """, lang, code);
    }

    // ── Response parser ───────────────────────────────────────────────────────

    private AiReviewResult parseAiResponse(String rawResponse, CodeReview review, long startTime, String modelUsed) {
        int bugCount = 0, securityCount = 0, bestPracticeCount = 0;
        String summary = "Code review completed by " + modelUsed + ".";
        int overallScore = 70;

        try {
            String cleaned = rawResponse.trim()
                    .replaceAll("(?s)```json\\s*", "")
                    .replaceAll("```\\s*", "")
                    .trim();

            // Handle case where model wraps in extra object
            if (cleaned.startsWith("{") && !cleaned.contains("\"issues\"")) {
                // Try to extract nested JSON
                JsonNode outer = objectMapper.readTree(cleaned);
                if (outer.has("result")) cleaned = outer.get("result").toString();
            }

            JsonNode json = objectMapper.readTree(cleaned);

            summary = json.path("summary").asText(summary);
            overallScore = json.path("overallScore").asInt(70);

            JsonNode issues = json.path("issues");
            List<ReviewComment> comments = new ArrayList<>();

            if (issues.isArray()) {
                for (JsonNode issue : issues) {
                    ReviewComment.CommentType type = mapIssueType(issue.path("type").asText("SUGGESTION"));
                    ReviewComment.Severity severity = mapSeverity(issue.path("severity").asText("INFO"));

                    if (type == ReviewComment.CommentType.AI_BUG) bugCount++;
                    else if (type == ReviewComment.CommentType.AI_SECURITY) securityCount++;
                    else bestPracticeCount++;

                    Integer lineNum = issue.path("lineNumber").isNull() ? null : issue.path("lineNumber").asInt();

                    comments.add(ReviewComment.builder()
                            .review(review)
                            .content(issue.path("message").asText())
                            .lineNumber(lineNum)
                            .type(type)
                            .severity(severity)
                            .build());
                }
                if (!comments.isEmpty()) {
                    commentRepository.saveAll(comments);
                    log.info("Saved {} AI comments for review ID: {}", comments.size(), review.getId());
                }
            }

        } catch (Exception e) {
            log.warn("Could not parse AI response JSON: {}. Raw: {}", e.getMessage(),
                    rawResponse.length() > 200 ? rawResponse.substring(0, 200) + "..." : rawResponse);
        }

        return AiReviewResult.builder()
                .review(review)
                .summary(summary)
                .rawResponse(rawResponse)
                .overallScore(overallScore)
                .bugCount(bugCount)
                .securityIssueCount(securityCount)
                .bestPracticeCount(bestPracticeCount)
                .processingTimeMs(System.currentTimeMillis() - startTime)
                .build();
    }

    private AiReviewResult buildFallbackResult(CodeReview review, long startTime) {
        return AiReviewResult.builder()
                .review(review)
                .summary("⚠️ AI review could not be completed — all models failed or rate limited. " +
                         "Please check your OPENROUTER_API_KEY in .env and try again.")
                .overallScore(0)
                .bugCount(0)
                .securityIssueCount(0)
                .bestPracticeCount(0)
                .processingTimeMs(System.currentTimeMillis() - startTime)
                .build();
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private ReviewComment.CommentType mapIssueType(String type) {
        return switch (type.toUpperCase()) {
            case "BUG"           -> ReviewComment.CommentType.AI_BUG;
            case "SECURITY"      -> ReviewComment.CommentType.AI_SECURITY;
            case "BEST_PRACTICE" -> ReviewComment.CommentType.AI_BEST_PRACTICE;
            default              -> ReviewComment.CommentType.AI_SUGGESTION;
        };
    }

    private ReviewComment.Severity mapSeverity(String severity) {
        return switch (severity.toUpperCase()) {
            case "CRITICAL" -> ReviewComment.Severity.CRITICAL;
            case "ERROR"    -> ReviewComment.Severity.ERROR;
            case "WARNING"  -> ReviewComment.Severity.WARNING;
            default         -> ReviewComment.Severity.INFO;
        };
    }
}
