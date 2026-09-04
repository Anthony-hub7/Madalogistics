package com.example.Bakend.entity;

import com.example.Bakend.entity.enums.ClasseValeur;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Catégorie de produit avec classe de valeur (A/B/C).
 * Table : categorie_produit
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

    @Enumerated(EnumType.STRING)
    @Column(name = "classe_valeur", nullable = false, length = 1)
    private ClasseValeur classeValeur;

    @OneToMany(mappedBy = "categorie")
    private List<Colis> colis = new ArrayList<>();
}
