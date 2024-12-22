export interface MaintenanceEntry {
    id: number;
    imat: string;
    modele: string;
    expl: string;
    tache: string;
    cout: number;
}

export interface MaintenanceEntryOptional {
    id?: number;
    imat?: string;
    modele?: string;
    expl?: string;
    tache?: string;
    cout?: number;
}

export interface Tables {
    [key: string]: {
        text: string,
        type: string | number,
        sqltable: string
    }
}