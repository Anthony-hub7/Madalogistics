package com.example.Bakend.controller;

import com.example.Bakend.config.RoleRedirectMapper;
import com.example.Bakend.dto.request.AgenceDossierRequest;
import com.example.Bakend.dto.request.ChauffeurDossierRequest;
import com.example.Bakend.dto.request.FinalisationAgenceRequest;
import com.example.Bakend.dto.request.InscriptionRequest;
import com.example.Bakend.dto.request.LoginRequest;
import com.example.Bakend.dto.response.AuthResponse;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.Utilisateur;
import com.example.Bakend.repository.PMEClienteRepository;
import com.example.Bakend.repository.UtilisateurRepository;
import com.example.Bakend.security.CustomUserDetails;
import com.example.Bakend.security.JwtService;
import com.example.Bakend.service.AgenceRegistrationService;
import com.example.Bakend.service.ChauffeurRegistrationService;
import com.example.Bakend.service.ClientRegistrationService;
import com.example.Bakend.service.RefreshTokenService;
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

    public AuthController(AuthenticationManager authenticationManager,
                          JwtService jwtService,
                          RefreshTokenService refreshTokenService,
                          UtilisateurRepository utilisateurRepository,
                          ClientRegistrationService clientRegistrationService,
                          AgenceRegistrationService agenceRegistrationService,
                          ChauffeurRegistrationService chauffeurRegistrationService,
                          RoleRedirectMapper roleRedirectMapper,
                          PMEClienteRepository pmeClienteRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.utilisateurRepository = utilisateurRepository;
        this.clientRegistrationService = clientRegistrationService;
        this.agenceRegistrationService = agenceRegistrationService;
        this.chauffeurRegistrationService = chauffeurRegistrationService;
        this.roleRedirectMapper = roleRedirectMapper;
        this.pmeClienteRepository = pmeClienteRepository;
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
     * Authentification : email + password → JWT access token + refresh cookie.
     */
    @PostMapping("/login")
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

        return ResponseEntity.ok(new AuthResponse(
                accessToken,
                user.getUtilisateurId(),
                userDetails.getTenantId(),
                user.getEmail(),
                user.getNom(),
                roleRedirectMapper.getRedirectPath(user.getRole())
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
