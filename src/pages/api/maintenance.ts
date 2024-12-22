import type { NextApiRequest, NextApiResponse } from 'next';
import db from 'lib/db';
import { MaintenanceEntry } from 'data/types';
import model from "data/model.json";
import { error } from 'console';
import { useFormState } from 'react-dom';
import is_request_authenticated from 'lib/cookie_auth';
// const dropDownColumns = referencesTablesKeys.map((table) => columnOptions[table as keyof typeof columnOptions]);

interface MaintenanceData {
    entries: MaintenanceEntry[];
    references: {[key: string]: string[]};
}

enum ErrorType {
    INVALID_FIELDS = 'INVALID_FIELDS',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    NOT_FOUND = 'NOT_FOUND',
    REFERENCE_ERROR = 'REFERENCE_ERROR',
    ALREADY_EXISTS = 'ALREADY_EXISTS',
    IMAT_ALREADY_STORED_WITH_DIFFERENT_PROPERTIES = 'IMAT_ALREADY_STORED_WITH_DIFFERENT_PROPERTIES',
    UNKNOWN = 'UNKNOWN',
    METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
    MAINTENANCE_RECORDS_EXIST = 'MAINTENANCE_RECORDS_EXIST',
    CANT_MODIFY_AVION_PROPERTIES = 'CANT_MODIFY_AVION_PROPERTIES',
    WRONG_DATA_TYPE = 'WRONG_DATA_TYPE'
}

type DatabaseResponseForId = {id: number} | undefined;

type ResponseData = {success: boolean, message?: string, data?: MaintenanceData} | {success: boolean, message: string, error_type: ErrorType} | {success: boolean, message: string, expected: string[]};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
    if (!is_request_authenticated(req, res)) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        switch (req.method) {
        case 'POST':
            return createMaintenance(req, res);
        case 'GET':
            return getAllMaintenances(res);
        case 'PUT':
            return updateMaintenance(req, res);
        case 'DELETE':
            return deleteMaintenance(req, res);
          default:
            res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
            return res.status(405).json({ success: false, message: 'Method Not Allowed', error_type: ErrorType.METHOD_NOT_ALLOWED });
        }
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Unknown internal error", error_type: ErrorType.UNKNOWN });
    }
}

const getAllMaintenances = (res: NextApiResponse<ResponseData>) => {
    try {
        const query = `
            SELECT 
                Maintenances.id, 
                Maintenances.cout, 
                Avions.imatriculation AS imat, 
                Modeles.libelle AS modele, 
                Exploitants.libelle AS expl, 
                Taches.libelle AS tache
            FROM Maintenances
            JOIN Avions ON Maintenances.Avion_FK = Avions.id
            JOIN Modeles ON Avions.Modele_FK = Modeles.id
            JOIN Exploitants ON Avions.Exploitant_FK = Exploitants.id
            JOIN Taches ON Maintenances.Tache_FK = Taches.id;
        `;

        // on construit un objet qui contient les valeurs possibles pour chaque colonne de reference
        const references: {[key: string]: string[]} = {};
        model.referencesTablesKeys.forEach((column) => {
            if (model.tables[column as keyof typeof model.tables].sqltable === "") {
                console.error(column, "is not associated to a reference table");
                return;
            }
            const query = `SELECT libelle FROM ${model.tables[column as keyof typeof model.tables].sqltable}`;
            const options: any = db.prepare(query).all();
            references[column] = options.map((option: any) => option.libelle);
        });

        const maintenances: any = db.prepare(query).all();
        return res.status(200).json({ success: true, data: {entries: maintenances, references: references} });
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ success: false, message: "internal error", error_type: ErrorType.INTERNAL_ERROR });
    }
}

const createMaintenance = (req: NextApiRequest, res: NextApiResponse<ResponseData>) => {
    Object.keys(req.body).forEach((key) => {
        console.log("key:", key, "type:", model.tables[key as keyof typeof model.tables]);
        //$ -----------------
        //$ trim all string values
        //$ -----------------
        if (typeof req.body[key] === 'string') {
            req.body[key] = req.body[key].trim();
        }
        //$ -----------------
        //$ if the value is an empty string, we set it to undefined
        //$ -----------------
        if (req.body[key] === '') {
            req.body[key] = undefined;
        }
        //$ -----------------
        //$ if the value is a number, we parse it
        //$ -----------------
        if (model.tables[key as keyof typeof model.tables]?.type === 'number') {
            req.body[key] = parseFloat(req.body[key]);
            if (Number.isNaN(req.body[key])) {
                return res.status(400).json({ success: false, message: 'Invalid fields, expected a number', expected: [key], error_type: ErrorType.WRONG_DATA_TYPE });
            }
        }
    });

    const { imat, modele, expl, tache, cout } = req.body;

    if (!imat || !modele || !expl || !tache || !cout) {
        return res.status(400).json({ success: false, message: 'Missing fields' , expected: ['imat', 'modele', 'expl', 'tache', 'cout'], error_type: ErrorType.INVALID_FIELDS });
    }

    try {
        // Check if the maintenance record already exists
        const checkMaintenanceQuery = db.prepare('SELECT * FROM Maintenances WHERE Avion_FK = (SELECT id FROM Avions WHERE imatriculation = ?) AND Tache_FK = (SELECT id FROM Taches WHERE libelle = ?)');
        const existingMaintenance: any = checkMaintenanceQuery.get(imat, tache);
        
        if(existingMaintenance) {
            return res.status(400).json({ success: false, message: 'Maintenance record already exists', error_type: ErrorType.ALREADY_EXISTS });
        }

        const insertQuery = `
            INSERT INTO Maintenances (cout, Avion_FK, Tache_FK)
            VALUES (
                ?, 
                (SELECT id FROM Avions WHERE imatriculation = ? AND Modele_FK = (SELECT id FROM Modeles WHERE libelle = ?) AND Exploitant_FK = (SELECT id FROM Exploitants WHERE libelle = ?)),
                (SELECT id FROM Taches WHERE libelle = ?)
            );
        `;

        const getModelId = db.prepare('SELECT id FROM Modeles WHERE libelle = ?');
        const getExploitantId = db.prepare('SELECT id FROM Exploitants WHERE libelle = ?');
        const getTacheId = db.prepare('SELECT id FROM Taches WHERE libelle = ?');

        const ModelId: number | undefined = (getModelId.get(modele) as DatabaseResponseForId)?.id;
        const ExploitantId: number | undefined = (getExploitantId.get(expl) as DatabaseResponseForId)?.id;
        const TacheId: number | undefined = (getTacheId.get(tache) as DatabaseResponseForId)?.id;

        if(!ModelId || !ExploitantId || !TacheId) {
            return res.status(400).json({ success: false, message: 'Invalid fields, a value in a reference table doesn\'t exist.', error_type: ErrorType.REFERENCE_ERROR });
        }

        const getAvion = db.prepare('SELECT id, Modele_FK, Exploitant_FK FROM Avions WHERE imatriculation = ?');
        const avion: any = getAvion.get(imat);
        if (avion !== undefined && (avion.Modele_FK !== ModelId || avion.Exploitant_FK !== ExploitantId)) {
            // return res.status(400).json({ success: false, message: 'Invalid fields, a plane with this imat exists but has different values for exploitant and/or modele.', error_type: ErrorType.IMAT_ALREADY_STORED_WITH_DIFFERENT_PROPERTIES });
        
            const updateAvionQuery = `
                UPDATE Avions
                SET Modele_FK = ?, Exploitant_FK = ?
                WHERE id = ?
            `;
            try {
                db.prepare(updateAvionQuery).run(ModelId, ExploitantId, avion.id);
            } catch (error: any) {
                console.error(error);
                return res.status(500).json({ success: false, message: 'Internal error', error_type: ErrorType.INTERNAL_ERROR });
            }
        }

        if(!avion) {
            const insertAvionQuery = `
                INSERT INTO Avions (imatriculation, Modele_FK, Exploitant_FK)
                VALUES (?, ?, ?);
            `;
            db.prepare(insertAvionQuery).run(imat, ModelId, ExploitantId);
        }

        db.prepare(insertQuery).run(cout, imat, modele, expl, tache);

    } catch (error: any) {
        return res.status(500).json({ success: false, message: "internal error" });
    }
    return res.status(200).json({ success: true, message: 'Maintenance created' });
}

const updateMaintenance = (req: NextApiRequest, res: NextApiResponse<ResponseData>) => {
    Object.keys(req.body).forEach((key) => {
        if (typeof req.body[key] === 'string') {
            req.body[key] = req.body[key].trim();
        }
        if (req.body[key] === '') {
            req.body[key] = undefined;
        }if (model.tables[key as keyof typeof model.tables]?.type === 'number') {
            req.body[key] = parseFloat(req.body[key]);
            if (Number.isNaN(req.body[key])) {
                return res.status(400).json({ success: false, message: 'Invalid fields, expected a number', expected: [key], error_type: ErrorType.WRONG_DATA_TYPE });
            }
        }
    });

    const { id, imat, modele, expl, tache, cout } = req.body;

    if (!id || !imat || !modele || !expl || !tache || !cout) {
        return res.status(400).json({ success: false, message: 'Missing fields', expected: ['id', 'imat', 'modele', 'expl', 'tache', 'cout'], error_type: ErrorType.INVALID_FIELDS });
    }

    try {
        // Check if the modified maintenance record already exists
        const checkMaintenanceQuery = db.prepare('SELECT * FROM Maintenances WHERE Avion_FK = (SELECT id FROM Avions WHERE imatriculation = ?) AND Tache_FK = (SELECT id FROM Taches WHERE libelle = ?)');
        const existingModifiedMaintenance: any = checkMaintenanceQuery.get(imat, tache);
        
        if(existingModifiedMaintenance && existingModifiedMaintenance.id !== id) {
            return res.status(400).json({ success: false, message: 'Maintenance record already exists', error_type: ErrorType.ALREADY_EXISTS });
        }

        // Check if the maintenance record exists
        const getMaintenanceQuery = db.prepare('SELECT * FROM Maintenances WHERE id = ?');
        const existingMaintenance: any = getMaintenanceQuery.get(id);
        
        if (!existingMaintenance) {
            return res.status(404).json({ success: false, message: 'Maintenance record not found.', error_type: ErrorType.NOT_FOUND });
        }

        // Get the foreign key IDs for the new values
        const getModelId = db.prepare('SELECT id FROM Modeles WHERE libelle = ?');
        const getExploitantId = db.prepare('SELECT id FROM Exploitants WHERE libelle = ?');
        const getTacheId = db.prepare('SELECT id FROM Taches WHERE libelle = ?');

        const ModelId: number | undefined = (getModelId.get(modele) as DatabaseResponseForId)?.id;
        const ExploitantId: number | undefined = (getExploitantId.get(expl) as DatabaseResponseForId)?.id;
        const TacheId: number | undefined = (getTacheId.get(tache) as DatabaseResponseForId)?.id;

        if (!ModelId || !ExploitantId || !TacheId) {
            return res.status(400).json({ success: false, message: 'Invalid fields, a value in a reference table doesn\'t exist.', error_type: ErrorType.REFERENCE_ERROR });
        }

        // Check if the plane with this imat exists, and if it matches the given `modele` and `exploitant`
        const getAvion = db.prepare('SELECT id, Modele_FK, Exploitant_FK FROM Avions WHERE imatriculation = ?');
        const avion: any = getAvion.get(imat);
        
        if (avion !== undefined && (avion.Modele_FK !== ModelId || avion.Exploitant_FK !== ExploitantId)) {
            // return res.status(400).json({ success: false, message: 'Invalid fields, the plane with this imat has different values for exploitant and/or modele.', error_type: ErrorType.IMAT_ALREADY_STORED_WITH_DIFFERENT_PROPERTIES });
        
            //modification de l'avion
            const updateAvionQuery = `
                UPDATE Avions
                SET Modele_FK = ?, Exploitant_FK = ?
                WHERE id = ?
            `;
            try {
                db.prepare(updateAvionQuery).run(ModelId, ExploitantId, avion.id);
            } catch (error: any) {
                console.error(error);
                return res.status(500).json({ success: false, message: 'Internal error', error_type: ErrorType.INTERNAL_ERROR });
            }
        }

        // si pas d'avion existe alors on le cree
        if(!avion) {
            const insertAvionQuery = `
                INSERT INTO Avions (imatriculation, Modele_FK, Exploitant_FK)
                VALUES (?, ?, ?);
            `;
            db.prepare(insertAvionQuery).run(imat, ModelId, ExploitantId);
        }

        // Update the maintenance record with the new data
        const updateQuery = `
            UPDATE Maintenances 
            SET 
                cout = ?, 
                Avion_FK = (SELECT id FROM Avions WHERE imatriculation = ? AND Modele_FK = ? AND Exploitant_FK = ?), 
                Tache_FK = (SELECT id FROM Taches WHERE libelle = ?)
            WHERE id = ?;
        `;
        db.prepare(updateQuery).run(cout, imat, ModelId, ExploitantId, tache, id);

        //Check if there are any remaining maintenance records for the same Avion
        const checkRemainingMaintenanceQuery = db.prepare('SELECT COUNT(*) AS count FROM Maintenances WHERE Avion_FK = ?');
        const remainingMaintenance = (checkRemainingMaintenanceQuery.get(existingMaintenance.Avion_FK) as {[key: string]: number});
        // console.log("remainingMaintenance", remainingMaintenance);
        //If no remaining maintenance records exist, delete the Avion
        if (remainingMaintenance.count === 0) {
            console.log("suppression de l'avion ", existingMaintenance.Avion_FK);
            const deleteAvionQuery = db.prepare('DELETE FROM Avions WHERE id = ?');
            deleteAvionQuery.run(existingMaintenance.Avion_FK);
            return res.status(200).json({ success: true, message: 'Maintenance modified and old associated Avion removed' });
        }

        return res.status(200).json({ success: true, message: 'Maintenance record updated successfully.' });
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal error', error_type: ErrorType.INTERNAL_ERROR });
    }
};

const deleteMaintenance = (req: NextApiRequest, res: NextApiResponse<ResponseData>) => {
    const { id: maintenanceId } = req.body;

    if (!maintenanceId) {
        return res.status(400).json({ success: false, message: 'Missing maintenance ID', error_type: ErrorType.INVALID_FIELDS });
    }

    try {
        // Step 1: Retrieve the associated Avion by getting the Avion_FK from the Maintenance record
        const getMaintenanceQuery = db.prepare('SELECT Avion_FK FROM Maintenances WHERE id = ?');
        const maintenance = getMaintenanceQuery.get(maintenanceId);

        if (!maintenance) {
            return res.status(404).json({ success: false, message: 'Maintenance record not found', error_type: ErrorType.NOT_FOUND });
        }

        const avionId = (maintenance as {[key: string]: number}).Avion_FK;

        // Step 2: Delete the maintenance record
        const deleteMaintenanceQuery = db.prepare('DELETE FROM Maintenances WHERE id = ?');
        const deleteResult = deleteMaintenanceQuery.run(maintenanceId);

        // Step 3: Check if there are any remaining maintenance records for the same Avion
        const checkRemainingMaintenanceQuery = db.prepare('SELECT COUNT(*) AS count FROM Maintenances WHERE Avion_FK = ?');
        const remainingMaintenance = (checkRemainingMaintenanceQuery.get(avionId) as {[key: string]: number});

        // Step 4: If no remaining maintenance records exist, delete the Avion
        if (remainingMaintenance.count === 0) {
            const deleteAvionQuery = db.prepare('DELETE FROM Avions WHERE id = ?');
            deleteAvionQuery.run(avionId);
            return res.status(200).json({ success: true, message: 'Maintenance deleted and associated Avion removed' });
        }

        return res.status(200).json({ success: true, message: 'Maintenance deleted successfully' });
        
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal error', error_type: ErrorType.INTERNAL_ERROR });
    }
};