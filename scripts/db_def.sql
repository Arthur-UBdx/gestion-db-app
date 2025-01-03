CREATE TABLE Exploitants (id INTEGER PRIMARY KEY AUTOINCREMENT, libelle VARCHAR(32) NOT NULL);
CREATE TABLE Modeles (id INTEGER PRIMARY KEY AUTOINCREMENT, libelle VARCHAR(32) NOT NULL);
CREATE TABLE Taches (id INTEGER PRIMARY KEY AUTOINCREMENT, libelle VARCHAR(32) NOT NULL);

CREATE TABLE Avions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    imatriculation VARCHAR(16) NOT NULL,
    Modele_FK INTEGER NOT NULL,
    Exploitant_FK INTEGER NOT NULL,
    FOREIGN KEY (Modele_FK) REFERENCES Modeles(id)
    FOREIGN KEY (Exploitant_FK) REFERENCES Exploitants(id)
);

CREATE TABLE Maintenances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cout NUMERIC NOT NULL,
    Avion_FK INTEGER NOT NULL,
    Tache_FK INTEGER NOT NULL,
    FOREIGN KEY (Avion_FK) REFERENCES Avions(id),
    FOREIGN KEY (Tache_FK) REFERENCES Taches(id)
);