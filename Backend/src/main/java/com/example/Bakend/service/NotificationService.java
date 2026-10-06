package com.example.Bakend.service;

import com.example.Bakend.dto.notification.NotificationResponse;
import com.example.Bakend.entity.Notification;
import com.example.Bakend.entity.PMECliente;
import com.example.Bakend.entity.Sac;
import com.example.Bakend.exception.ResourceNotFoundException;
import com.example.Bakend.repository.NotificationRepository;
import com.example.Bakend.security.CustomUserDetails;
import com.example.Bakend.security.SecurityUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Notifications minimales : broadcast par role et par tenant, lues en polling.
 * Pas de push temps reel (hors scope V1 incident).
 */
@Service
public class NotificationService {

    public static final String ROLE_GESTIONNAIRE = "GESTIONNAIRE";
    public static final String ROLE_CLIENT = "CLIENT_FINAL";
    public static final String TYPE_INCIDENT_DECLARE = "INCIDENT_DECLARE";
    public static final String TYPE_SAC_ANNULE = "SAC_ANNULE";

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    /** Emet un broadcast vers un role du tenant. */
    @Transactional
    public void diffuser(PMECliente tenant, String role, String type,
                         String titre, String message, Sac sac) {
        Notification n = new Notification();
        n.setPmeCliente(tenant);
        n.setDestinataireRole(role);
        n.setType(type);
        n.setTitre(titre);
        n.setMessage(message);
        n.setSac(sac);
        notificationRepository.save(n);
    }

    /** Notifications visibles par le role de l'utilisateur courant (polling cloche). */
    @Transactional(readOnly = true)
    public List<NotificationResponse> lister(UUID tenantId, boolean nonLues) {
        String role = roleCourant();
        return notificationRepository.rechercher(tenantId, role, nonLues).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long compterNonLues(UUID tenantId) {
        return notificationRepository.compterNonLues(tenantId, roleCourant());
    }

    /** Nombre d'alertes recentes pour un sac (idempotence du signalement). */
    @Transactional(readOnly = true)
    public long compterRecentes(UUID tenantId, UUID sacId, String type,
                                java.time.LocalDateTime depuis) {
        return notificationRepository.compterRecentes(tenantId, sacId, type, depuis);
    }

    /** Marque une notification comme lue (meme tenant obligatoire). */
    @Transactional
    public void marquerLue(UUID tenantId, UUID notificationId) {
        Notification n = notificationRepository.findById(notificationId)
                .filter(x -> x.getPmeCliente() != null
                        && x.getPmeCliente().getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Notification introuvable : " + notificationId));
        n.setLu(true);
        notificationRepository.save(n);
    }

    /** Marque toutes les notifications du role courant comme lues. */
    @Transactional
    public int toutMarquerLues(UUID tenantId) {
        List<Notification> list = notificationRepository.rechercher(tenantId, roleCourant(), true);
        for (Notification n : list) {
            n.setLu(true);
        }
        notificationRepository.saveAll(list);
        return list.size();
    }

    private String roleCourant() {
        CustomUserDetails user = SecurityUtils.getCurrentUser();
        if (user == null || user.getUtilisateur() == null || user.getUtilisateur().getRole() == null) {
            return null;
        }
        return user.getUtilisateur().getRole().name();
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getNotificationId(),
                n.getType(),
                n.getTitre(),
                n.getMessage(),
                n.getSac() != null ? n.getSac().getSacId() : null,
                n.isLu(),
                n.getCreatedAt());
    }
}
