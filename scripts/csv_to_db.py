# script python pour importer les données du fichier csv dans la base de données
import sqlite3
import csv

# Database file
DATABASE_FILE = "maintenance.db"
CSV_FILE = "TP VBA - Interface.csv"

# Connect to the database
conn = sqlite3.connect(DATABASE_FILE)
cursor = conn.cursor()

# Helper function to insert and retrieve ID
def get_or_create(table, libelle):
    cursor.execute(f"SELECT id FROM {table} WHERE libelle = ?", (libelle,))
    result = cursor.fetchone()
    if result:
        return result[0]
    cursor.execute(f"INSERT INTO {table} (libelle) VALUES (?)", (libelle,))
    return cursor.lastrowid

# Read data from CSV
with open(CSV_FILE, "r") as file:
    reader = csv.DictReader(file)

    for row in reader:
        # Get or create IDs for Exploitant, Modele, and Tache
        exploitant_id = get_or_create("Exploitants", row["Exploitant"])
        modele_id = get_or_create("Modeles", row["Modele"])
        tache_id = get_or_create("Taches", row["Tache"])

        # Handle Avion entry
        cursor.execute(
            """
            SELECT id FROM Avions WHERE imatriculation = ?
            """,
            (row["Immatriculation"],),
        )
        avion_id = cursor.fetchone()
        if not avion_id:
            cursor.execute(
                """
                INSERT INTO Avions (imatriculation, Modele_FK, Exploitant_FK)
                VALUES (?, ?, ?)
                """,
                (row["Immatriculation"], modele_id, exploitant_id),
            )
            avion_id = cursor.lastrowid
        else:
            avion_id = avion_id[0]

        # Insert Maintenance entry
        cursor.execute(
            """
            INSERT INTO Maintenances (cout, Avion_FK, Tache_FK)
            VALUES (?, ?, ?)
            """,
            (row["Cout"], avion_id, tache_id),
        )

# Commit changes and close connection
conn.commit()
conn.close()

print("Data transfer completed successfully!")
