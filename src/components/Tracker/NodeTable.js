import React from 'react';
import MaterialTable from 'material-table';

const NodeTable = ({ name, data }) => {
  const columns = [
    { field: 'lineNum', title: 'Line Num' },
    { field: 'port', title: 'Port' },
    { field: 'pid', title: 'PID' },
    { field: 'bin', title: 'Bin version' },
    { field: 'fcv', title: 'FCV version' },
    { field: 'state', title: 'State' },
    { field: 'syncSource', title: 'Sync Source' },
  ];

  const Table = ({ name, columns, data }) => {
    return (
      <MaterialTable
        title={name}
        data={data}
        columns={columns}
        options={{ search: false, filtering: false }}
      />
    );
  };

  return (
    <div>
      <Table name={name} columns={columns} data={data} />
    </div>
  );
}

export default NodeTable;
