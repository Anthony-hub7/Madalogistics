package com.example.Bakend.entity;

import com.example.Bakend.entity.enums.ClasseValeur;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Catégorie de produit — referentiel dynamique versionne (V12).
 * Table : categorie_produit
 *
 * V15 : les prix ont été déplacés vers grille_tarifaire (liaison categorie_id).
 */
@Entity
@Table(name = "categorie_produit")
@Getter
@Setter
@NoArgsConstructor
public class CategorieProduit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "categorie_id", nullable = false, updatable = false)
    private UUID categorieId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private PMECliente pmeCliente;

    @Column(name = "libelle", nullable = false, length = 255)
    private String libelle;

    // --- Legacy A/B/C (double-ecriture, drop en V13) ---
    @Enumerated(EnumType.STRING)
    @Column(name = "classe_valeur", nullable = false, length = 1)
    private ClasseValeur classeValeur;

    // --- V12 : classe dynamique ---
    @Column(name = "classe_code", nullable = false, length = 20)
    private String classeCode;

    @Column(name = "justification", columnDefinition = "TEXT")
    private String justification;

    @Column(name = "actif", nullable = false)
    private Boolean actif = true;

    // --- V12 : seuils ML (JSONB, schema strict valide en Java) ---
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "seuils_ml", columnDefinition = "jsonb")
    private String seuilsMl;

    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @Column(name = "habilite_requis", nullable = false)
    private Boolean habiliteRequis = false;

    @Column(name = "ml_activable", nullable = false)
    private Boolean mlActivable = true;

    @OneToMany(mappedBy = "categorie")
    private List<Colis> colis = new ArrayList<>();
}
