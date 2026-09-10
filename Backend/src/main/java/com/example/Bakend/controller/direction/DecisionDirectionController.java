package com.example.Bakend.controller.direction;

import com.example.Bakend.dto.direction.DecisionResponse;
import com.example.Bakend.entity.enums.TypeAlgorithme;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.decision.DecisionLectureService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/direction/decisions")
@PreAuthorize("hasRole('DIRECTION')")
public class DecisionDirectionController {

    private final DecisionLectureService decisionLectureService;

    public DecisionDirectionController(DecisionLectureService decisionLectureService) {
        this.decisionLectureService = decisionLectureService;
    }

    @GetMapping
    public List<DecisionResponse> lister(
            @RequestParam(required = false) UUID hubId,
            @RequestParam(required = false) TypeAlgorithme type) {
        return decisionLectureService.lister(requireTenantId(), hubId, type).stream()
                .map(DecisionResponse::new)
                .toList();
    }

    private UUID requireTenantId() {
        UUID tenantId = SecurityUtils.getTenantId();
        if (tenantId == null) {
            throw new BusinessException(
                    "Contexte tenant manquant : l'opération requiert un utilisateur DIRECTION rattaché à une agence",
                    403);
        }
        return tenantId;
    }
}
