package com.example.Bakend.service;

import com.example.Bakend.dto.response.AuthResponse;
import com.example.Bakend.entity.ClientFinal;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.Utilisateur;
import com.example.Bakend.exception.BusinessException;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.ClientFinalRepository;
import com.example.Bakend.repository.PMEClienteRepository;
import com.example.Bakend.repository.UtilisateurRepository;
import com.example.Bakend.security.JwtService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Transfert d'un client vers une autre agence (changement de tenant).
 * Crée ou récupère le ClientFinal dans le tenant cible, met à jour l'utilisateur, réémet le JWT.
 */
@Service
@Transactional
public class TransfertAgenceService {

    private final UtilisateurRepository utilisateurRepository;
    private final PMEClienteRepository pmeClienteRepository;
    private final ClientFinalRepository clientFinalRepository;
    private final JwtService jwtService;

    public TransfertAgenceService(UtilisateurRepository utilisateurRepository,
                                  PMEClienteRepository pmeClienteRepository,
                                  ClientFinalRepository clientFinalRepository,
                                  JwtService jwtService) {
        this.utilisateurRepository = utilisateurRepository;
        this.pmeClienteRepository = pmeClienteRepository;
        this.clientFinalRepository = clientFinalRepository;
        this.jwtService = jwtService;
    }

    public AuthResponse transferer(UUID utilisateurId, UUID nouveauTenantId) {
        Utilisateur user = utilisateurRepository.findById(utilisateurId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));

        PMECliente nouveauTenant = pmeClienteRepository.findByTenantId(nouveauTenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Agence introuvable : " + nouveauTenantId));

        if (!"VALIDEE".equals(nouveauTenant.getStatutDossier())) {
            throw new BusinessException("Cette agence n'est pas encore validée");
        }

        ClientFinal cf = clientFinalRepository
                .findByPmeClienteTenantIdAndNom(nouveauTenantId, user.getNom())
                .orElseGet(() -> {
                    ClientFinal newCf = new ClientFinal();
                    newCf.setPmeCliente(nouveauTenant);
                    newCf.setNom(user.getNom());
                    return clientFinalRepository.save(newCf);
                });

        user.setPmeCliente(nouveauTenant);
        user.setClientFinal(cf);
        utilisateurRepository.save(user);

        String newToken = jwtService.generateToken(user);

        return new AuthResponse(
                newToken,
                user.getUtilisateurId(),
                nouveauTenantId,
                user.getEmail(),
                user.getNom(),
                "/client/nouvelle_commande"
        );
    }
}
