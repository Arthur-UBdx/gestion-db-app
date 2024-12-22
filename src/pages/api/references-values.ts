import type { NextApiRequest, NextApiResponse } from 'next';
import db from 'lib/db';
import { MaintenanceEntry } from 'data/types';
import model from "data/model.json";
import is_request_authenticated from 'lib/cookie_auth';

type ResponseData = {success: boolean, message?: string, error_type?: ErrorType};

enum ErrorType {
    NOT_FOUND = "NOT_FOUND",
    INVALID_FIELDS = "INVALID_FIELDS",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    ALREADY_EXISTS = "ALREADY_EXISTS",
    METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED",
    REFERENCE_USED = "REFERENCE_USED"
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
    if (!is_request_authenticated(req, res)) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        switch (req.method) {
        case 'POST':
            return create_ref_table_entry(req, res);
        case 'PUT':
            return modify_ref_table_entry(req, res);
        case 'DELETE':
            return remove_ref_table_entry(req, res);
        default:
            res.setHeader('Allow', ['POST', 'PUT', 'DELETE']);
            return res.status(405).json({ success: false, message: 'Method Not Allowed', error_type: ErrorType.METHOD_NOT_ALLOWED });
        }
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

const create_ref_table_entry = (req: NextApiRequest, res: NextApiResponse<ResponseData>) => {
    const { table, value } = req.body;

    if (!table || !value) {
        return res.status(400).json({ success: false, message: 'Missing required fields: table and or value', error_type: ErrorType.INVALID_FIELDS });
    }

    if (!model.referencesTablesKeys.includes(table)) {
        return res.status(400).json({ success: false, message: `Invalid table name. Allowed tables are: ${model.referencesTablesKeys.join(', ')}`, error_type: ErrorType.NOT_FOUND });
    }

    // check for type correctness
    const tableDefinition = model.tables[table as keyof typeof model.tables];
    const expectedType = tableDefinition?.type;

    if (expectedType === "text" && typeof value !== "string") {
        return res.status(400).json({ success: false, message: `Invalid value type. Expected text for table ${table}`, error_type: ErrorType.INVALID_FIELDS });
    }

    if (expectedType === "number" && typeof value !== "number") {
        return res.status(400).json({ success: false, message: `Invalid value type. Expected number for table ${table}`, error_type: ErrorType.INVALID_FIELDS });
    }


    try {
        //test if the value already exists
        const selectQuery = `SELECT * FROM ${model.tables[table as keyof typeof model.tables].sqltable} WHERE libelle = ?`;
        const existing = db.prepare(selectQuery).get(value);

        if (existing) {
            return res.status(400).json({ success: false, message: `${value} already exists in ${table}`, error_type: ErrorType.ALREADY_EXISTS });
        }

        // Prepare the dynamic query
        const insertQuery = `INSERT INTO ${model.tables[table as keyof typeof model.tables].sqltable} (libelle) VALUES (?)`;

        // Execute the insert query with the provided value
        db.prepare(insertQuery).run(value);

        return res.status(200).json({ success: true, message: `${value} successfully added to ${table}` });
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal error while creating entry', error_type: ErrorType.INTERNAL_ERROR });
    }
};


const remove_ref_table_entry = (req: NextApiRequest, res: NextApiResponse<ResponseData>) => {
    const { table, value } = req.body;

    if (!table || !value) {
        return res.status(400).json({ success: false, message: 'Missing required fields: table and value', error_type: ErrorType.INVALID_FIELDS });
    }

    if (!model.referencesTablesKeys.includes(table)) {
        return res.status(400).json({ success: false, message: `Invalid table name. Allowed tables are: ${model.referencesTablesKeys.join(', ')}`, error_type: ErrorType.NOT_FOUND });
    }

    try {
        //test if the value already exists
        const selectQuery = `SELECT * FROM ${model.tables[table as keyof typeof model.tables].sqltable} WHERE libelle = ?`;
        const existing = db.prepare(selectQuery).get(value);
        console.log(existing);

        if (!existing) {
            return res.status(400).json({ success: false, message: `${value} does not exist in ${table}`, error_type: ErrorType.NOT_FOUND });
        }

        // Check if the value is used as a foreign key in any other table
        const value_id = existing["id" as keyof typeof existing];
        const checkReferenceUsage = `SELECT * FROM ${model.tables[table as keyof typeof model.tables].sqltable} WHERE id = ?`;
        const referenceUsage = db.prepare(checkReferenceUsage).get(value_id);
        
        if (referenceUsage) {
            return res.status(400).json({ success: false, message: `${value} is used as a foreign key in another table`, error_type: ErrorType.REFERENCE_USED });
        }

        // Prepare the dynamic query
        const deleteQuery = `DELETE FROM ${model.tables[table as keyof typeof model.tables].sqltable} WHERE libelle = ?`;

        // Execute the insert query with the provided value
        db.prepare(deleteQuery).run(value);

        return res.status(200).json({ success: true, message: `${value} successfully removed from ${table}` });
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal error while removing entry', error_type: ErrorType.INTERNAL_ERROR });
    }
}

const modify_ref_table_entry = (req: NextApiRequest, res: NextApiResponse<ResponseData>) => {
    const { table, value, newValue } = req.body;

    if (!table || !value || !newValue) {
        return res.status(400).json({ success: false, message: 'Missing required fields: table, value and newValue', error_type: ErrorType.INVALID_FIELDS });
    }

    if (!model.referencesTablesKeys.includes(table)) {
        return res.status(400).json({ success: false, message: `Invalid table name. Allowed tables are: ${model.referencesTablesKeys.join(', ')}`, error_type: ErrorType.NOT_FOUND });
    }

    try {
        //test if the value already exists
        const selectQuery = `SELECT * FROM ${model.tables[table as keyof typeof model.tables].sqltable} WHERE libelle = ?`;
        const existing = db.prepare(selectQuery).get(value);

        if (!existing) {
            return res.status(400).json({ success: false, message: `${value} does not exist in ${table}`, error_type: ErrorType.NOT_FOUND });
        }

        // Prepare the dynamic query
        const updateQuery = `UPDATE ${model.tables[table as keyof typeof model.tables].sqltable} SET libelle = ? WHERE libelle = ?`;

        // Execute the insert query with the provided value
        db.prepare(updateQuery).run(newValue, value);

        return res.status(200).json({ success: true, message: `${value} successfully updated to ${newValue} in ${table}` });
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal error while updating entry', error_type: ErrorType.INTERNAL_ERROR });
    }
}