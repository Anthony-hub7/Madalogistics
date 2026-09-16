package com.example.Bakend.controller;

import com.example.Bakend.config.RoleRedirectMapper;
import com.example.Bakend.dto.auth.AgenceRecommandeeResponse;
import com.example.Bakend.dto.request.AgenceDossierRequest;
import com.example.Bakend.dto.request.ChauffeurDossierRequest;
import com.example.Bakend.dto.request.FinalisationAgenceRequest;
import com.example.Bakend.dto.request.InscriptionRequest;
import com.example.Bakend.dto.request.LoginRequest;
import com.example.Bakend.dto.response.AuthResponse;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.Utilisateur;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.repository.PMEClienteRepository;
import com.example.Bakend.repository.UtilisateurRepository;
import com.example.Bakend.security.CustomUserDetails;
import com.example.Bakend.security.JwtService;
import com.example.Bakend.security.SecurityUtils;
import com.example.Bakend.service.AgenceRecommandationService;
import com.example.Bakend.service.AgenceRegistrationService;
import com.example.Bakend.service.ChauffeurRegistrationService;
import com.example.Bakend.service.ClientRegistrationService;
import com.example.Bakend.service.RefreshTokenService;
import com.example.Bakend.service.TransfertAgenceService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Endpoints d'authentification : login, inscription, refresh, logout.
 * Le refresh token est stocké dans un cookie httpOnly (pas dans le body).
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final UtilisateurRepository utilisateurRepository;
    private final ClientRegistrationService clientRegistrationService;
    private final AgenceRegistrationService agenceRegistrationService;
    private final ChauffeurRegistrationService chauffeurRegistrationService;
    private final RoleRedirectMapper roleRedirectMapper;
    private final PMEClienteRepository pmeClienteRepository;
    private final com.example.Bakend.repository.ChauffeurRepository chauffeurRepository;
    private final AgenceRecommandationService agenceRecommandationService;
    private final TransfertAgenceService transfertAgenceService;

    public AuthController(AuthenticationManager authenticationManager,
                          JwtService jwtService,
                          RefreshTokenService refreshTokenService,
                          UtilisateurRepository utilisateurRepository,
                          ClientRegistrationService clientRegistrationService,
                          AgenceRegistrationService agenceRegistrationService,
                          ChauffeurRegistrationService chauffeurRegistrationService,
                          RoleRedirectMapper roleRedirectMapper,
                          PMEClienteRepository pmeClienteRepository,
                          com.example.Bakend.repository.ChauffeurRepository chauffeurRepository,
                          AgenceRecommandationService agenceRecommandationService,
                          TransfertAgenceService transfertAgenceService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.utilisateurRepository = utilisateurRepository;
        this.clientRegistrationService = clientRegistrationService;
        this.agenceRegistrationService = agenceRegistrationService;
        this.chauffeurRegistrationService = chauffeurRegistrationService;
        this.roleRedirectMapper = roleRedirectMapper;
        this.pmeClienteRepository = pmeClienteRepository;
        this.chauffeurRepository = chauffeurRepository;
        this.agenceRecommandationService = agenceRecommandationService;
        this.transfertAgenceService = transfertAgenceService;
    }

    /**
     * Liste publique des agences validées (pour inscription chauffeur rattaché).
     * Pas d'authentification requise.
     */
    @GetMapping("/public/agences")
    public ResponseEntity<List<Map<String, Object>>> listerAgences() {
        List<PMECliente> agences = pmeClienteRepository.findByStatutDossierAndNotPlateforme("VALIDEE");
        List<Map<String, Object>> result = agences.stream().map(a -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("tenantId", a.getTenantId());
            map.put("nom", a.getNomEntreprise());
            map.put("telephone", a.getTelephone());
            map.put("adresse", a.getAdresse());
            return map;
        }).toList();
        return ResponseEntity.ok(result);
    }

    /**
     * Statut public d'un dossier d'inscription agence (pour suivi sans authentification).
     * Retourne uniquement les informations non sensibles.
     */
    @GetMapping("/public/agences/dossier/{tenantId}")
    public ResponseEntity<Map<String, Object>> statutDossier(@PathVariable java.util.UUID tenantId) {
        PMECliente tenant = pmeClienteRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new com.example.Bakend.exception.ResourceNotFoundException("Dossier introuvable"));

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("tenantId", tenant.getTenantId());
        result.put("nomEntreprise", tenant.getNomEntreprise());
        result.put("statutDossier", tenant.getStatutDossier());
        result.put("motifRefus", tenant.getMotifRefus());
        return ResponseEntity.ok(result);
    }

    /**
     * Authentification : email + password → JWT access token + refresh cookie.
     * Pour les chauffeurs : inclut statutDossier, motifRefus, typeChauffeur, agenceNom.
     */
    @PostMapping("/login")
    @Transactional(readOnly = true)
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                              HttpServletResponse response) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        Utilisateur user = userDetails.getUtilisateur();

        String accessToken = jwtService.generateToken(user);
        String refreshToken = refreshTokenService.createRefreshToken(
                user.getUtilisateurId(),
                userDetails.getTenantId());

        addRefreshCookie(response, refreshToken);

        // Enrichir la reponse pour les chauffeurs
        String statutDossier = null;
        String motifRefus = null;
        String typeChauffeur = null;
        String agenceNom = null;
        if (user.getRole() == com.example.Bakend.entity.enums.Role.CHAUFFEUR) {
            var chauffeurOpt = chauffeurRepository.findByUtilisateurId(user.getUtilisateurId());
            if (chauffeurOpt.isPresent()) {
                var chauffeur = chauffeurOpt.get();
                statutDossier = chauffeur.getStatutDossier();
                motifRefus = chauffeur.getMotifRefus();
                typeChauffeur = chauffeur.getTypeChauffeur();
                // agenceCible est LAZY — initialisation dans la tx courante (@Transactional)
                if (chauffeur.getAgenceCible() != null) {
                    agenceNom = chauffeur.getAgenceCible().getNomEntreprise();
                }
            }
        }

        return ResponseEntity.ok(new AuthResponse(
                accessToken,
                user.getUtilisateurId(),
                userDetails.getTenantId(),
                user.getEmail(),
                user.getNom(),
                roleRedirectMapper.getRedirectPath(user.getRole()),
                statutDossier,
                motifRefus,
                typeChauffeur,
                agenceNom
        ));
    }

    /**
     * Inscription d'un client final (après validation admin SAAS).
     */
    @PostMapping("/inscription")
    public ResponseEntity<AuthResponse> inscription(@Valid @RequestBody InscriptionRequest request,
                                                    HttpServletResponse response) {
        AuthResponse authResponse = clientRegistrationService.inscrire(
                request.nom(),
                request.email(),
                request.motDePasse(),
                request.tenantId());

        // Le refresh token a été généré dans le service, on le recrée ici pour le cookie
        String refreshToken = refreshTokenService.createRefreshToken(
                authResponse.utilisateurId(),
                authResponse.tenantId());

        addRefreshCookie(response, refreshToken);

        return ResponseEntity.status(HttpStatus.CREATED).body(authResponse);
    }

    /**
     * Depot d'un dossier d'inscription agence (multipart : JSON + fichiers).
     * Le tenant est cree en statut EN_ATTENTE.
     */
    @PostMapping("/agences/dossier")
    public ResponseEntity<Map<String, Object>> deposerDossier(
            @RequestPart("dossier") @Valid AgenceDossierRequest dossier,
            @RequestPart("kbis") MultipartFile kbis,
            @RequestPart("attestation") MultipartFile attestation,
            @RequestPart(value = "assurance", required = false) MultipartFile assurance) throws IOException {

        // Validation taille fichiers (max 5 Mo)
        if (kbis.getSize() > 5 * 1024 * 1024) {
            throw new com.example.Bakend.exception.BusinessException("Le fichier KBIS ne doit pas depasser 5 Mo");
        }
        if (attestation.getSize() > 5 * 1024 * 1024) {
            throw new com.example.Bakend.exception.BusinessException("Le fichier attestation ne doit pas depasser 5 Mo");
        }
        if (assurance != null && assurance.getSize() > 5 * 1024 * 1024) {
            throw new com.example.Bakend.exception.BusinessException("Le fichier assurance ne doit pas depasser 5 Mo");
        }

        Map<String, Object> result = agenceRegistrationService.deposerDossier(
                dossier.raisonSociale(), dossier.nif(), dossier.stat(),
                dossier.email(), dossier.telephone(), dossier.adresse(), dossier.site(),
                kbis.getBytes(), attestation.getBytes(),
                assurance != null ? assurance.getBytes() : null);

        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    /**
     * Finalisation du compte administrateur apres validation du dossier agence.
     */
    @PostMapping("/agences/finaliser")
    public ResponseEntity<AuthResponse> finaliserCompte(
            @Valid @RequestBody FinalisationAgenceRequest request,
            HttpServletResponse response) {

        AuthResponse authResponse = agenceRegistrationService.finaliserCompte(
                request.tenantId(),
                request.prenom(),
                request.nom(),
                request.emailAdmin(),
                request.password());

        // Refresh token
        String refreshToken = refreshTokenService.createRefreshToken(
                authResponse.utilisateurId(),
                authResponse.tenantId());

        addRefreshCookie(response, refreshToken);

        return ResponseEntity.status(HttpStatus.CREATED).body(authResponse);
    }

    /**
     * Depot d'un dossier d'inscription chauffeur (multipart : JSON + permisScan).
     * Le chauffeur est cree en statut EN_ATTENTE.
     */
    @PostMapping("/chauffeurs/dossier")
    public ResponseEntity<Map<String, Object>> deposerDossierChauffeur(
            @RequestPart("dossier") @Valid ChauffeurDossierRequest dossier,
            @RequestPart(value = "permisScan", required = false) MultipartFile permisScan) throws IOException {

        if (permisScan != null && permisScan.getSize() > 5 * 1024 * 1024) {
            throw new com.example.Bakend.exception.BusinessException("Le fichier permis ne doit pas depasser 5 Mo");
        }

        Map<String, Object> result = chauffeurRegistrationService.deposerDossier(
                dossier.prenom(), dossier.nom(), dossier.cin(),
                dossier.dateNaissance(), dossier.sexe(),
                dossier.telephone(), dossier.email(), dossier.adresse(), dossier.motDePasse(),
                dossier.permisNumero(), dossier.permisCategorie(), dossier.permisCategories(),
                dossier.permisExpiration(), dossier.experienceAnnees(),
                dossier.typeChauffeur(), dossier.agenceId(),
                dossier.aVehiculeAssigne(), dossier.immatriculation(), dossier.typeVehicule(),
                dossier.marqueModele(), dossier.annee(), dossier.ptacTonnes(), dossier.capaciteVolumeM3(),
                permisScan != null ? permisScan.getBytes() : null);

        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    /**
     * Refresh : le cookie httpOnly est envoyé automatiquement par le navigateur.
     * Valide le refresh token, rotation, retourne un nouveau access token.
     */
    @PostMapping("/refresh")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, String>> refresh(@CookieValue(value = "refresh_token", defaultValue = "")
                                                       String refreshToken,
                                                       HttpServletResponse response) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Map<String, String> payload = refreshTokenService.validateRefreshToken(refreshToken);
        if (payload == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UUID userId = UUID.fromString(payload.get("userId"));
        UUID tenantId = payload.get("tenantId") != null && !payload.get("tenantId").isBlank()
                ? UUID.fromString(payload.get("tenantId")) : null;

        Utilisateur user = utilisateurRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable"));

        // Rotation du refresh token
        String newRefreshToken = refreshTokenService.rotateRefreshToken(refreshToken, userId, tenantId);
        addRefreshCookie(response, newRefreshToken);

        String newAccessToken = jwtService.generateToken(user);

        return ResponseEntity.ok(Map.of("accessToken", newAccessToken));
    }

    /**
     * Logout : supprime le refresh token de Redis + supprime le cookie.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(value = "refresh_token", defaultValue = "")
                                       String refreshToken,
                                       HttpServletResponse response) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenService.deleteRefreshToken(refreshToken);
        }

        ResponseCookie deleteCookie = ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, deleteCookie.toString());

        return ResponseEntity.noContent().build();
    }

    /**
     * Agences recommandées pour un client (scoring backend).
     * GET /api/auth/public/agences/recommandees?latCollecte=...&lonCollecte=...
     */
    @GetMapping("/public/agences/recommandees")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AgenceRecommandeeResponse>> agencesRecommandees(
            @RequestParam(required = false) Double latCollecte,
            @RequestParam(required = false) Double lonCollecte) {
        List<AgenceRecommandeeResponse> result = agenceRecommandationService.classer(latCollecte, lonCollecte);
        return ResponseEntity.ok(result);
    }

    /**
     * Transfert d'un client vers une autre agence (changement de tenant).
     * POST /api/auth/changer-agence
     */
    @PostMapping("/changer-agence")
    @Transactional
    public ResponseEntity<AuthResponse> changerAgence(
            @RequestBody Map<String, java.util.UUID> body,
            HttpServletResponse response) {
        CustomUserDetails user = SecurityUtils.getCurrentUser();
        if (user == null) {
            throw new BusinessException("Utilisateur non authentifié", 401);
        }
        java.util.UUID nouveauTenantId = body.get("tenantId");
        if (nouveauTenantId == null) {
            throw new BusinessException("Le champ tenantId est obligatoire", 400);
        }

        AuthResponse authResponse = transfertAgenceService.transferer(
                user.getUtilisateur().getUtilisateurId(), nouveauTenantId);

        String refreshToken = refreshTokenService.createRefreshToken(
                authResponse.utilisateurId(), authResponse.tenantId());
        addRefreshCookie(response, refreshToken);

        return ResponseEntity.ok(authResponse);
    }

    private void addRefreshCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from("refresh_token", refreshToken)
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(7 * 24 * 60 * 60) // 7 jours
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
