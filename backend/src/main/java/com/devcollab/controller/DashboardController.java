package com.devcollab.controller;

import com.devcollab.dto.DashboardDto;
import com.devcollab.entity.User;
import com.devcollab.service.DashboardService;
import com.devcollab.service.UserDetailsServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Analytics and team metrics")
@SecurityRequirement(name = "bearerAuth")
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserDetailsServiceImpl userDetailsService;

    @GetMapping("/stats")
    @Operation(summary = "Get dashboard stats and analytics")
    public ResponseEntity<DashboardDto> getDashboardStats(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userDetailsService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(dashboardService.getDashboardStats(user));
    }
}
