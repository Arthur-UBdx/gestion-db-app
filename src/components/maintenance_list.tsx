"use client";

import React, { useCallback, useEffect } from "react";

import styles from "components/styles/maintenance_list.module.scss";

import { SelectOption } from "components/database_interface_panel";
import { MaintenanceEntry } from "data/types";
import Spinner from "./spinner";

export interface MaintenanceListProps {
    columns: SelectOption[];
    items_list: MaintenanceEntry[] | undefined;
    changeSelectedId: (id: number) => void;
}

export interface SortParams {
    column?: keyof MaintenanceEntry;
    backwards_sort: boolean;
}

function sort_entries(entries: MaintenanceEntry[], column: keyof MaintenanceEntry, backwards_sort?: boolean) : MaintenanceEntry[] {
    const sorted = entries.sort((a, b) => {
        const valA = a[column as keyof MaintenanceEntry];
        const valB = b[column as keyof MaintenanceEntry];

        if (typeof valA === "number" && typeof valB === "number") {
            return valA - valB;
        } else if (typeof valA === "string" && typeof valB === "string") {
            return valA.localeCompare(valB);
        }

        return 0; // If types are mismatched or not sortable
    });

    return backwards_sort ? sorted.reverse() : sorted;
}

function MaintenanceItem(props: MaintenanceEntry & {selected_id: number; onSelect: (id: number) => void}) : JSX.Element {
    const entries: string[] = [props.imat, props.modele, props.expl, props.tache, `${props.cout}`];
    const [selected, setSelected] = React.useState(false);

    useEffect(() => {
        setSelected(props.selected_id === props.id ? true : false);
    }, [props.selected_id])

    const handleDeselect = () => {
        if (props.selected_id === props.id) {
            props.onSelect(-1);
        }
    }

    return (
        <div className={styles.list_element} data-selected={selected}>
            <div>
                <input type="radio" name="selected" checked={selected} value={props.id.toString()} onChange={() => props.onSelect(props.id)} onClick={handleDeselect}/>
                <span className={styles.radio_button}/>
            </div>
            {entries.map((entry, column_index) => (
                <p key={`${props.id}-${column_index}`}>{entry}</p>
            ))}
        </div>
    )
}

export default function MaintenanceList(props: MaintenanceListProps) {
    const [sortedItemsList, setSortedItemsList] = React.useState<MaintenanceEntry[] | undefined>(props.items_list);
    const [sortParams, setSortParams] = React.useState<SortParams>({column: undefined, backwards_sort: false});
    
    const sorter_callback = (column: keyof MaintenanceEntry) => {
        return () => {
            setSortParams((prevState) => {
                if (props.items_list === undefined) {
                    return prevState;
                }
                const isSameColumn = prevState.column === column;
                setSortedItemsList(sort_entries(props.items_list, column, isSameColumn? !prevState.backwards_sort : false));
                // console.log("sorting along:", sortParams.column, " backwards:", sortParams.backwards_sort);
                return {column, backwards_sort: isSameColumn? !prevState.backwards_sort : false};
            });
        }
    }

    useEffect(() => {
        if (props.items_list === undefined) {
            return;
        }
        // console.log("items_list changed");
        setSortedItemsList(sort_entries(props.items_list, sortParams.column as keyof MaintenanceEntry, sortParams.backwards_sort));
    } , [props.items_list]);


    const [selectedId, setSelectedId] = React.useState<number>(-1);
    useEffect(() => {
        props.changeSelectedId(selectedId);
    }, [selectedId]);

    if(props.items_list === undefined || sortedItemsList === undefined) {
        return (
            <div className={styles.list}>
                <div className={styles.no_elements}>
                    <Spinner/>
                </div>
                {/* <p className={styles.no_elements}>No items to display</p> */}
            </div>
        )
    }   

    return (
        <div className={styles.list}>
            <div>
                {props.columns.map((column, index) => (<button key={index} onClick={sorter_callback(column.value as keyof MaintenanceEntry)}>{`${column.text} ${sortParams.column===column.value? sortParams.backwards_sort? "\u21E9" : "\u21E7" : ""}`}</button>))}
            </div>
            <form className={styles.elements_container}>
                {sortedItemsList.map((item) => (<MaintenanceItem key={item.id} {...item} selected_id={selectedId} onSelect={setSelectedId}/>))}
            </form>
        </div>
    )
}