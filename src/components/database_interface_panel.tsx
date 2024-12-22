"use client";

import React, { use, useEffect } from "react";

import styles from "components/styles/database_interface_panel.module.scss";

import MaintenanceList from "./maintenance_list";
import { MaintenanceEntry, MaintenanceEntryOptional, Tables} from "data/types";

import model from "data/model.json"
import axios from "axios";

export interface SelectOption {
    text: string;
    value: string;
}

enum FilterModes {
    text_startsWith = "startsWith",
    text_includes = "includes",
    number_lessThanOrEqual = "<=",
    number_greaterThanOrEqual = ">=",
    number_equal = "="
}

enum ReferenceTableOperations {
    create = "create",
    modify = "modify",
    delete = "delete"
}

const stringToFilterMode = (string: string) => {
    switch (string) {
        case "startsWith":
            return FilterModes.text_startsWith;
        case "includes":
            return FilterModes.text_includes;
        case "min":
            return FilterModes.number_greaterThanOrEqual;
        case "max":
            return FilterModes.number_lessThanOrEqual;
        case "eq":
            return FilterModes.number_equal;
        default:
            return FilterModes.text_startsWith;
    }
}

// un input de type select qui prend en paramètre une liste d'options
const SelectModular: React.FC<{ options: SelectOption[], onChange: (e: any) => void, className?: string }> = ({ options, onChange, className }) => {
    return (
        <select onChange={onChange}>
            {options.map((option) => (
                <option key={option.value} value={option.value} className={className}>{option.text}</option>
            ))}
        </select>
    )
}

const request = async (url: string, method: string, body: any) => {
    try {
        const response = await axios({
            url: url,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            data: body
        });
        return response;
    } catch (error: any) {
        // console.error("request error:", error);
        return error.response;
    }
};


export default function DatabaseInterfacePanel() {
    //$ ------------------------
    //$ elements contient les données de la table et est de la forme
    //$ [
    //$     {id: number, column1: string, column2: number, ...},
    //$ ]
    //$ referenceTables contient les noms colonnes de la table et est de la forme:
    //$ {
    //$     column1: [string, string, ...],
    //$     column2: [string, string, ...],
    //$     ...
    //$ }
    //$ ------------------------
    const [elements, setElements] = React.useState<MaintenanceEntry[] | undefined>(undefined);
    const [referenceTables, setReferenceTables] = React.useState<{[key:string]: string[]} | undefined>(undefined);
    
    //$ ------------------------
    //$ requêtes de données et tables de référence
    //$ GET api/maintenance
    //$ ------------------------
    useEffect(() => {
        const fetchData = async () => {
            const response = await request("api/maintenance", "GET", {});
            if (response.status === 200) {
                // console.log(response.data.data);
                setElements(response.data.data.entries);
                setReferenceTables(response.data.data.references);
            } else {
                alert("Erreur lors de la récupération des données");
            }
        }
        fetchData().catch((error) => console.error(error));
    }, []);

    
    // useEffect(() => {
    //     if(referenceTables == undefined) {
    //         return;
    //     }

    //     const defaultReferenceTables: Partial<DefaultReferenceTables> = {}
    //     for (const key of reftables_model_keys) {
    //         const value: string[] = referenceTables[key as keyof typeof referenceTables];
    //         if (value?.length > 0) {
    //             const first_value = value[0];
    //             if (first_value) {
    //                 defaultReferenceTables[key as keyof DefaultReferenceTables] = first_value;
    //                 continue;
    //             }
    //         }
    //         // erreur
    //         console.log("Erreur lors de la récupération des options par défaut.", (value || []).length == 0 ? "Options de dropdownMenu vides" :"");
    //         return;
    //     }
    //     setDefaultReferenceTables(defaultReferenceTables as DefaultReferenceTables);
    // }, [referenceTables]);

    // useEffect(() => {
    //     setEntryFields(defaultReferenceTables);
    // }, [defaultReferenceTables])

    //  ------------------------ // 
    //    Gestion des filtres    //
    //  ------------------------ // 
    const [elementsFiletered, setElementsFiltered] = React.useState<MaintenanceEntry[] | undefined>(undefined);
    const [filterColumn, setFilterColumn] = React.useState<string>("none");
    const [filterInput, setFilterInput] = React.useState<JSX.Element | undefined>(undefined);
    const [filterValue, setFilterValue] = React.useState<string>("");
    const [filterMode, setFilterMode] = React.useState<FilterModes>(FilterModes.text_startsWith); // true = startsWith, false = includes
    
    // on change le filtre quand on change le choix de colonne (ou les donnees)
    useEffect(() => {
        if (referenceTables === undefined) {
            setFilterInput(<div className="loading-text">Chargement...</div>);
            return;
        }
        setElementsFiltered(undefined);
        // si aucune colonne n'est selectionnee pour le filtre
        if (filterColumn === "none") {
            setFilterInput(undefined);
            setFilterValue("");
            return;
        }

        // si la colonne selectionnee est une table de reference
        if (model.referencesTablesKeys.includes(filterColumn)) {
            const options = referenceTables[filterColumn as keyof typeof referenceTables].map((option) => {return {text: option, value: option}});
            setFilterInput(<SelectModular options={options} onChange={(e) => {setFilterValue(e.target.value)}}/>);
            setFilterValue(options[0].value || "");

        // si le type de la colonne selectionnee est un nombre
        } else if (model.tables[filterColumn as keyof typeof model.tables]?.type === "number") {
            setFilterInput(
                (
                    <div>
                        <input type='number' onChange={(e) => {setFilterValue(e.target.value)}}/>
                        <select onChange={(e) => {setFilterMode(stringToFilterMode(e.target.value));}}>
                            <option value="min">Supérieur ou égal à</option>
                            <option value="max">Inférieur ou égal à</option>
                            <option value="eq">Égal à</option>
                        </select>
                    </div>
                ));
            setFilterValue("0");
            setFilterMode(FilterModes.number_greaterThanOrEqual);

        // si le type de la colonne selectionnee est un texte est n'est pas une table de reference
        } else {
            setFilterInput(
                (
                    <div>
                        <input type='text' onChange={(e) => {setFilterValue(e.target.value)}} placeholder="Filtre"/>
                        <select onChange={(e) => {setFilterMode(stringToFilterMode(e.target.value));}}>
                            <option value="startsWith">Commence par</option>
                            <option value="includes">Contient</option>
                        </select>
                    </div>
                ));
            setFilterValue("");
            setFilterMode(FilterModes.text_startsWith);
        }
    }, [filterColumn, elements, referenceTables]);
    
    // on change le filtrage quand la valeur du filtre change
    useEffect(() => {
        let filtered: MaintenanceEntry[] | undefined = undefined;
        // si aucun filtre ou colonne n'est selectionne
        if (filterColumn === "none" || filterValue === "none" || elements === undefined) {
            setElementsFiltered(elements);
            return;
        }
        // si la colonne selectionnee est une table de reference
        if(model.referencesTablesKeys.includes(filterColumn)) {
            filtered = elements.filter((element: MaintenanceEntry) => element[filterColumn as keyof MaintenanceEntry] === filterValue);

        // si le type de la colonne selectionnee est un nombre
        } else if (model.tables[filterColumn as keyof typeof model.tables]?.type === "number") {
            const number_filter_function = (object:number, filter_input:number) => {
                switch (filterMode) {
                    case FilterModes.number_equal:
                        return object === filter_input;
                    case FilterModes.number_greaterThanOrEqual:
                        return object >= filter_input;
                    case FilterModes.number_lessThanOrEqual:
                        return object <= filter_input;
                    default:
                        return object >= filter_input;
                }
            }
            if (filterValue === "") {
                filtered = elements;
            } else {
                filtered = elements.filter((element: MaintenanceEntry) => number_filter_function(parseFloat(`${element[filterColumn as keyof MaintenanceEntry]}`), parseFloat(filterValue)));;
            }
        } else {
            if (filterValue === "") {
                filtered = elements;
            } else {
                const text_filter_function = filterMode === FilterModes.text_startsWith ?
                (object:string, filter_input:string) => {return object.startsWith(filter_input);}:
                (object:string, filter_input:string) => {return object.includes(filter_input)};
                filtered = elements.filter((element: MaintenanceEntry) => text_filter_function(`${element[filterColumn as keyof MaintenanceEntry]}`, filterValue));
            }
        }
        setElementsFiltered(filtered);
    }, [filterValue, filterMode, elements]);
    //  ------------------------ // 

    //  ------------------------ //
    //   Gestion de la selection //
    //  ------------------------ //

    //$ ------------------------
    //$ selectedId contient l'id de la ligne sélectionnée, -1 si aucune ligne n'est sélectionnée
    //$ entryFields contient les champs de la ligne sélectionnée	
    //$ ------------------------
    const [selectedId, setSelectedId] = React.useState<number>(-1);
    const [entryFields, setEntryFields] = React.useState<MaintenanceEntryOptional|undefined>(undefined);

    //$ ------------------------
    //$ si la selection à changé
    //$ on met à jour les champs de l'entrée
    //$ ------------------------
    useEffect(() => {
        if (elements === undefined || referenceTables === undefined) {
            return;
        }
        //$ si aucune ligne n'est selectionnée
        if (selectedId === -1) {
            setEntryFields(undefined);
            return;
        }
        const element = elements.find((element) => element.id === selectedId)
        if (element === undefined) {
            return;
        }
        setEntryFields(element);
    }, [selectedId]);

    //$ ------------------------
    //$ handler de l'input de l'entrée
    //$ on met a jour les champs de l'entree, e est de cette forme:
    //$ {target: 
    //$     {
    //$          id: string,    // le nom de la colonne
    //$          value: string  // la valeur à mettre à jour
    //$     }
    //$     ...
    //$ }
    //$ ------------------------
    const onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        const column = e.target.id as keyof typeof entryFields;
        const value = e.target.value;
        if (model.tables[e.target.id as keyof typeof model.tables].type === "number") {
            setEntryFields((prev) => {return {...prev, [column]: parseFloat(value)}});
        } else {
            setEntryFields((prev) => {return {...prev, [column]: value}});
        }
    }

    //$ ------------------------
    //$ Fonction qui crée un input ou un select en fonction du type de la colonne
    //$ si les données ne sont pas encore chargées
    //$ on affiche un message de chargement
    //$ sinon on crée un input ou un select en fonction du type de la colonne
    //$ ------------------------
    const selection_field_column = (column: {text: string, value: string}) => {
        
        //$ ------------------------
        //$ si les tables de références ne sont pas encore chargées
        //$ on affiche un message de chargement
        //$ ------------------------
        if (referenceTables === undefined) {
            return <div className="loading-text">Chargement...</div>;
        }

        //$ ------------------------
        //$ Si les entryFields sont undefined alors
        //$ on generere un objet avec des champs soit vides 
        //$ soit avec la premiere valeur de la table de reference si la colonne est une table de reference
        //$ ------------------------
        if (entryFields === undefined) {
            const defaultEntryFields: MaintenanceEntryOptional = Object.fromEntries(Object.keys(model.tables).map((key) => {
                if (model.referencesTablesKeys.includes(key)) {
                    return [key, referenceTables[key as keyof typeof referenceTables]?.[0] || ""];
                } else {
                    return [key, ""];
                }
            }))
            setEntryFields(defaultEntryFields);
            return <div className="loading-text">Chargement...</div>;
        }
    
        //$ ------------------------
        //$ si la colonne est une table de référence
        //$ on crée un select avec les options de la table
        //$ ------------------------
        if (model.referencesTablesKeys.includes(column.value)) {
            return (
                <select 
                    id={column.value} 
                    value={entryFields[column.value as keyof typeof entryFields]}
                    onChange={onChangeHandler as any}
                >
                    {/* On map toutes les options possibles dans des tags <option> pour faire la liste déroulante */}
                    {referenceTables[column.value as keyof typeof referenceTables]?.map((option, index) => (
                        <option value={option} key={index}>{option}</option>
                    ))}
                </select>
            );
        //$ ------------------------
        //$ si la colonne n'est pas une table de référence
        //$ on crée un input
        //$ ------------------------
        } else {
            return (
                <input  
                    type='text' 
                    id={column.value}
                    value={entryFields[column.value as keyof typeof entryFields] || ""}
                    onChange={onChangeHandler}
                />
            );
        }
    };
    // ------------------------ //
    
    // -------------------------- //
    // Gestion des tables de ref  //
    // -------------------------- //
    const [selectedReftableOperation, setSelectedRefTableOperation] = React.useState<ReferenceTableOperations>(ReferenceTableOperations.create);
    const [refTableOperationForm, setRefTableOperationForm] = React.useState<JSX.Element | undefined>(undefined);
    const [refTableState, setRefTableState] = React.useState({
        selectedTable: undefined,
        selectedKey: undefined,
        entry: undefined,
    });

    //$ ------------------------
    //$ Quand les tables de reference sont chargées
    //$ on met à jour refTableState
    //$ ------------------------
    useEffect(() => {
        if (referenceTables === undefined) {
            return;
        }
        setRefTableState({...refTableState, selectedTable: Object.keys(referenceTables)[0]} as any);
    }, [referenceTables]);

    //$ ------------------------
    //$ Fonction qui crée un input ou un select en fonction de l'opération
    //$ si les tables de références ne sont pas encore chargées
    //$ on affiche un message de chargement
    //$ sinon on crée un input ou un select en fonction de l'opération
    //$ ------------------------
    const reftableOperation = (operation: ReferenceTableOperations): JSX.Element => {
        if(referenceTables === undefined || model.referencesTablesKeys.length === 0) {
            return <p className="loading-text">Chargement...</p>;
        }
        switch (operation) {
            case ReferenceTableOperations.create:
                return (
                    <form onSubmit={(e) => e.preventDefault()} className={styles.ref_table_field}>
                        {/* On met toutes les tables de reference dans un select*/}
                        <SelectModular 
                            options={model.referencesTablesKeys.map((key) => {return {text: model.tables[key as keyof typeof model.tables].text, value: key}})}
                            onChange={(e: any) => {setRefTableState({...refTableState, selectedTable: e.target.value})}}
                        />
                        
                        {/* Input pour la valeur à ajouter dans la table de reference*/}
                        <input 
                            type="text" 
                            onChange={(e) => setRefTableState({...refTableState, entry: e.target.value} as any)}
                            placeholder={refTableState.selectedTable? model.tables[refTableState.selectedTable as keyof typeof model.tables].text: ""} 
                            data-is-table-selected={refTableState.selectedTable !== undefined}
                        />
                        
                        {/* Bouton de validation */}
                        <button disabled={refTableState.selectedTable === undefined || refTableState.entry === "" || refTableState.entry === undefined} className={styles.deactivable_button} onClick={addReferenceTableEntry}>
                            <span>Veuillez sélectionner une table et renseigner le libellé</span>
                            Valider
                        </button>
                    </form>
                );
            case ReferenceTableOperations.modify:
                return (
                    <form onSubmit={(e) => e.preventDefault()} className={styles.ref_table_field}>
                        
                        {/* Input pour choisir dans quelle table on va modifier la reference/libellé */}
                        <SelectModular 
                            options={model.referencesTablesKeys.map((key) => {return {text: model.tables[key as keyof typeof model.tables].text, value: key}})} 
                            onChange={(e: any) => {setRefTableState({...refTableState, selectedTable: e.target.value})}}
                        />
                        
                        {/* Input pour choisir quelle libellé on va modifier*/}
                        <SelectModular 
                            options={referenceTables[refTableState.selectedTable || Object.keys(referenceTables)[0]].map((libelle) => {return {text: libelle, value: libelle}})} 
                            onChange={(e: any) => {setRefTableState({...refTableState, selectedKey: e.target.value})}}
                        />
                        
                        {/* Input pour rentrer la nouvelle valeur*/}
                        <input 
                            type="text"
                            onChange={(e) => setRefTableState({...refTableState, entry: e.target.value} as any)}
                            placeholder={"Nouvelle valeur"} 
                            data-is-table-selected={refTableState.selectedTable !== undefined}
                        />
                        
                        {/* Bouton de validation */}
                        <button 
                            disabled={refTableState.selectedTable === undefined || refTableState.entry === "" || refTableState.entry === undefined} 
                            className={styles.deactivable_button} 
                            onClick={modifyReferenceTableEntry}
                        >
                            <span>Veuillez sélectionner une table et renseigner le libellé</span>
                            Valider
                        </button>
                    </form>
                );
            case ReferenceTableOperations.delete:
                return (
                    <form onSubmit={(e) => e.preventDefault()} className={styles.ref_table_field}>
                        {/* Input pour choisir dans quelle table on va supprimer la reference/libellé */}
                        <SelectModular 
                            options={model.referencesTablesKeys.map((key) => {return {text: model.tables[key as keyof typeof model.tables].text, value: key}})} 
                            onChange={(e: any) => {setRefTableState({...refTableState, selectedTable: e.target.value})}}
                        />
                        
                        {/* Input pour choisir quelle libellé on va supprimer*/}
                        <SelectModular 
                            options={referenceTables[refTableState.selectedTable || Object.keys(referenceTables)[0]].map((libelle) => {return {text: libelle, value: libelle}})} 
                            onChange={(e: any) => {setRefTableState({...refTableState, selectedKey: e.target.value})}}
                        />
                        
                        {/* Bouton de validation */}
                        <button 
                            disabled={refTableState.selectedTable === undefined || refTableState.selectedKey === undefined} 
                            className={styles.deactivable_button} 
                            onClick={deleteReferenceTableEntry}
                        >
                            <span>Veuillez sélectionner une table et renseigner le libellé</span>
                            Valider
                        </button>
                    </form>
                );
            default:
                return <p style={{color: "red"}}>Erreur</p>

        }
    }

    useEffect(() => {
        setRefTableOperationForm(reftableOperation(selectedReftableOperation));
    }, [selectedReftableOperation, referenceTables, refTableState]);
    

    // ------------------------ //
    
    // -------------------------- //
    //    Gestion des requetes    //
    // -------------------------- //
    const saveChanges = async () => {
        if (entryFields === undefined) {
            return;
        }
        const response:any = await request("api/maintenance", "PUT", entryFields);
        if (response.status === 200) {
            alert("Modifications enregistrées");
            window.location.reload();
        } else {
            console.error(response);
            switch (response.data.error_type) {
                case("INVALID_FIELDS"):
                    alert("Les champs de l'entrée ne sont pas valides voire vides");
                    break;
                case("IMAT_ALREADY_STORED_WITH_DIFFERENT_PROPERTIES"):
                    alert("Un véhicule avec la même immatriculation est déjà stocké avec des propriétés différentes");
                    break;
                case("WRONG_DATA_TYPE"):
                    alert("Les types de données ne correspondent pas");
                    break;
                case("REFERENCE_ERROR"):
                    alert("Un des champs de l'entrée ne correspond pas à une valeur de la table de référence");
                    break;
                case("NOT_FOUND"):
                    alert("La maintenance à modifier n'existe pas");
                    break;
                default:
                    alert("Erreur lors de l'ajout de l'entrée");
            }
        }
    }
    
    const deleteEntry = async () => {
        if (entryFields === undefined) {
            return;
        }
        const response:any = await request("api/maintenance", "DELETE", entryFields);
        if (response.status === 200) {
            alert("Entrée supprimée");
            window.location.reload();
        } else {
            console.error(response);
            switch (response.data.error_type) {
                case("INVALID_FIELDS"):
                    alert("Les champs de l'entrée ne sont pas valides voire vides");
                    break;
                case("NOT_FOUND"):
                    alert("La maintenance à modifier n'existe pas");
                    break;
                default:
                    alert("Erreur lors de l'ajout de l'entrée");
            }
        }
    }
    
    const createEntry = async () => {
        const response:any = await request("api/maintenance", "POST", entryFields);
        if (response.status === 200) {
            alert("Entrée ajoutée");
            window.location.reload();
        } else {
            console.error(response);
            switch (response.data.error_type) {
                case("INVALID_FIELDS"):
                    alert("Les champs de l'entrée ne sont pas valides voire vides");
                    break;
                case("IMAT_ALREADY_STORED_WITH_DIFFERENT_PROPERTIES"):
                    alert("Un véhicule avec la même immatriculation est déjà stocké avec des propriétés différentes");
                    break;
                case("WRONG_DATA_TYPE"):
                    alert("Les types de données ne correspondent pas");
                    break;
                case("REFERENCE_ERROR"):
                    alert("Un des champs de l'entrée ne correspond pas à une valeur de la table de référence");
                    break;
                default:
                    alert("Erreur lors de l'ajout de l'entrée");
            }
        }
    }
    
    const addReferenceTableEntry = async () => {
        if (refTableState.entry === undefined || refTableState.selectedTable === undefined) {
            return;
        }
        const response:any = await request("api/references-values", "POST", {table: refTableState.selectedTable, value: refTableState.entry});
        if (response.status === 200) {
            alert("Entrée ajoutée");
            window.location.reload();
        } else {
            console.error(response);
            switch (response.data.error_type) {
                case("NOT_FOUND"):
                    alert("La table de référence n'existe pas");
                    break;
                case("INVALID_FIELDS"):
                    alert("Les champs de l'entrée ne sont pas valides voire vides");
                    break;
                case("ALREADY_EXISTS"):
                    alert("L'entrée existe déjà dans la table de référence");
                    break;
                default:
                    alert("Erreur lors de l'ajout de l'entrée");
            }
        }
    }

    const modifyReferenceTableEntry = async () => {
        if (refTableState.entry === undefined || refTableState.selectedTable === undefined || refTableState.selectedKey === undefined) {
            return;
        }
        const response:any = await request("api/references-values", "PUT", {table: refTableState.selectedTable, newValue: refTableState.entry, value: refTableState.selectedKey});
        if (response.status === 200) {
            alert("Entrée modifiée");
            window.location.reload();
        } else {
            console.error(response);
            switch (response.data.error_type) {
                case("NOT_FOUND"):
                    alert("La table de référence ou la référence n'existe pas");
                    break;
                case("INVALID_FIELDS"):
                    alert("Les champs de l'entrée ne sont pas valides voire vides");
                    break;
                default:
                    alert("Erreur lors de l'ajout de l'entrée");
            }
        }
    }

    const deleteReferenceTableEntry = async () => {
        if (refTableState.selectedTable === undefined || refTableState.selectedKey === undefined) {
            return;
        }
        const response:any = await request("api/references-values", "DELETE", {table: refTableState.selectedTable, value: refTableState.selectedKey});
        if (response.status === 200) {
            alert("Entrée supprimée");
            window.location.reload();
        } else {
            console.error(response);
            switch (response.data.error_type) {
                case("NOT_FOUND"):
                    alert("La table de référence ou la référence n'existe pas");
                    break;
                case("INVALID_FIELDS"):
                    alert("Les champs de l'entrée ne sont pas valides voire vides");
                    break;
                case("REFERENCE_USED"):
                    alert("La référence est impossible à supprimer car est utilisée dans un élément de maintenance");
                    break;
                default:
                    alert("Erreur lors de l'ajout de l'entrée");
            }
        }
    }
    // -------------------------- //

    // return (
    //     <div/>
    // )

    return (
        <div className={styles.page}>
            <h1>&lt; Interface base de données de maintenance &gt;</h1>
            <div className={styles.header}>
                <div>
                    {/* Champ de modification/création/suppression d'entrée */}
                    <form onSubmit={(e) => e.preventDefault()} className={styles.selection_field}>
                        {Object.keys(model.tables).map((table_key, index) => (
                            <div className={styles.column_container} key={index}>
                                <label>{model.tables[table_key as keyof typeof model.tables].text}</label>
                                {selection_field_column({text: model.tables[table_key as keyof typeof model.tables].text, value: table_key})}
                            </div>
                        ))}
                    </form>
                    
                    {/* Boutons de modification/création/suppression d'entrée */}
                    <form onSubmit={(e) => e.preventDefault()} className={styles.buttons_field}>
                        <button disabled={selectedId === -1} className={styles.deactivable_button} onClick={saveChanges}>
                            <span>Une ligne doit être sélectionnée pour pouvoir être modifiée</span>
                            Enregistrer les modifications
                        </button>
                        <button disabled={selectedId === -1} className={styles.deactivable_button} onClick={deleteEntry}>
                            <span>Une ligne doit être sélectionnée pour pouvoir être supprimée</span>
                            Supprimer la ligne
                        </button>
                        <span/>
                        <button className={styles.deactivable_button} onClick={createEntry}>
                            Ajouter une nouvelle ligne
                        </button>
                    </form>

                    {/* Boutons de modification/création/suppression de libellés */}
                    <div className={styles.modify_ref_tables_div_container}>
                        <form onSubmit={(e) => e.preventDefault()}>
                            <SelectModular options={[
                                {text: "Créer un nouveau", value: ReferenceTableOperations.create},
                                {text: "Modifier un(e)", value: ReferenceTableOperations.modify},
                                {text: "Supprimer un(e)", value: ReferenceTableOperations.delete}
                            ]} onChange={(e: any) => setSelectedRefTableOperation(e.target.value)}/>
                        </form>
                        {refTableOperationForm}
                    </div>
                </div>
            </div>
            <div className={styles.list_container}>
                <div className={styles.filter_form_container}>
                    <form onSubmit={(e) => e.preventDefault()} className={styles.ref_table_field}>
                        <p>Filtrer par:</p>
                        {/* champ de sélection de colonne de filtre 
                                """Object.keys(model.tables).map((key) => {return {text: model.tables[key as keyof typeof model.tables].text, value: key}})"""
                            est la liste de colonnes avec leur texte et leur ident (value) ex: {text: "Immatriculation", value: "imat"}
                        */}
                        <SelectModular 
                            options={[{text:"Aucun", value:"none"}].concat(Object.keys(model.tables).map((key) => {return {text: model.tables[key as keyof typeof model.tables].text, value: key}}))} 
                            onChange={(e: any) => setFilterColumn(e.target.value)}
                        />
                        {filterInput}
                    </form>
                </div>
                <MaintenanceList columns={Object.keys(model.tables).map((key) => {return {text: model.tables[key as keyof typeof model.tables].text, value: key}})} items_list={elementsFiletered} changeSelectedId={setSelectedId}/>
            </div>
        </div>
    )
}