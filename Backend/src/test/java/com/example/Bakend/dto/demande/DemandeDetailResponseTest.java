package com.example.Bakend.dto.demande;

import com.example.Bakend.entity.Colis;
import com.example.Bakend.entity.DemandeTransport;
import com.example.Bakend.entity.Sac;
import com.example.Bakend.entity.enums.DemandeStatut;
import com.example.Bakend.entity.enums.SacStatut;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * DemandeDetailResponse : les colis doivent exposer le sac qui les porte,
 * faute de quoi la page commande_detail ne peut pas afficher la mission
 * freelance (carte Mission / lien vers le detail du sac).
 */
class DemandeDetailResponseTest {

    private Colis colis(BigDecimal poids) {
        Colis c = new Colis();
        c.setColisId(java.util.UUID.randomUUID());
        c.setPoidsKg(poids);
        c.setVolumeM3(new BigDecimal("1.5"));
        return c;
    }

    private DemandeTransport demande(List<Colis> colis) {
        DemandeTransport d = new DemandeTransport();
        d.setDemandeId(java.util.UUID.randomUUID());
        d.setStatut(DemandeStatut.GROUPEE);
        d.setColis(colis);
        return d;
    }

    @Test
    void colis_rattache_a_un_sac_expose_sac_id_et_statut() {
        Sac sac = new Sac();
        sac.setSacId(java.util.UUID.randomUUID());
        sac.setStatut(SacStatut.AFFECTE);
        Colis c = colis(new BigDecimal("3.5"));
        c.setSac(sac);

        DemandeDetailResponse resp = DemandeDetailResponse.from(demande(List.of(c)));

        DemandeDetailResponse.ColisItem item = resp.colis().get(0);
        assertEquals(sac.getSacId(), item.sacId());
        assertEquals("AFFECTE", item.sacStatut());

        // Niveau commande (liste des commandes sans 2e appel au sac)
        assertEquals(sac.getSacId(), resp.sacId());
        assertEquals("AFFECTE", resp.sacStatut());
    }

    @Test
    void colis_libre_n_a_pas_de_sac() {
        List<Colis> colisLibres = new ArrayList<>();
        colisLibres.add(colis(new BigDecimal("3.5")));

        DemandeDetailResponse resp = DemandeDetailResponse.from(demande(colisLibres));

        DemandeDetailResponse.ColisItem item = resp.colis().get(0);
        assertNull(item.sacId());
        assertNull(item.sacStatut());
        assertNull(resp.sacId());
        assertNull(resp.sacStatut());
        assertNull(resp.missionChauffeur());
    }

    @Test
    void demande_sans_colis_rend_une_liste_vide() {
        DemandeDetailResponse resp = DemandeDetailResponse.from(demande(new ArrayList<>()));
        assertTrue(resp.colis().isEmpty());
    }
}
