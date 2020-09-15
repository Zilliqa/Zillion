import React, { useMemo } from 'react';
import { useTable, usePagination } from 'react-table';

import { getTxnLink } from '../util/utils';

import IconArrowLeft from './icons/arrow-left';
import IconArrowRight from './icons/arrow-right';


function Table({ columns, data, tableId }: any) {
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        prepareRow,
        page,
        canPreviousPage,
        canNextPage,
        pageOptions,
        nextPage,
        previousPage,
        setPageSize,
        state: { pageIndex, pageSize }
    } = useTable(
        {
            columns, 
            data,
            initialState: { pageIndex: 0, pageSize: 5 },
        },
        usePagination
    );
    
    return (
        <>
        <div className="pagination justify-content-end">
            <div>
                <button type="button" className="btn" onClick={() => previousPage()} disabled={!canPreviousPage}><IconArrowLeft className="pagination-icon"/></button>
                <button type="button" className="btn" onClick={() => nextPage()} disabled={!canNextPage}><IconArrowRight className="pagination-icon"/></button>
            </div>
            <span className="ml-2">Page {pageIndex + 1} of {pageOptions.length}</span>
        </div>
        <table id={tableId} className="table table-responsive-lg" {...getTableProps()}>
            <thead>
                {headerGroups.map(headerGroup => (
                    <tr {...headerGroup.getHeaderGroupProps()}>
                        {headerGroup.headers.map(column => (
                            <th scope="col" {...column.getHeaderProps()}>{column.render('Header')}</th>
                        ))}
                    </tr>
                ))}
            </thead>
            <tbody {...getTableBodyProps()}>
                {page.map((row, i) => {
                    prepareRow(row)
                    return (
                        <tr {...row.getRowProps()}>
                            {row.cells.map(cell => {
                                return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                            })}
                        </tr>
                    )
                })}
            </tbody>
        </table>
        </>
    );
}

function RecentTransactionsTable(props: any) {
    const networkURL = props.network;

    const columns = useMemo(
        () => [
            {
                Header: 'Transaction ID',
                accessor: 'txnId',
                Cell: ({ row }: any) => {
                    return (
                        <a href={getTxnLink(row.original.txnId, networkURL)} target="_blank" rel="noopener noreferrer">{row.original.txnId}</a>
                    );
                }
            }
        ], []
    );

    return (
        <Table columns={columns} data={props.data}></Table>
    );
}

export default RecentTransactionsTable;