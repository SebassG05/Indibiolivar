import React, { useEffect, useState } from 'react';
import { Typography } from '@material-ui/core';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

function ParcelDropdown({ onSelect }) {
    const [parcels, setParcels] = useState([]);
    const [selected, setSelected] = useState('');
    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch('http://localhost:5000/api/parcelas/listar', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) setParcels(data.parcels);
            });
    }, []);
    return (
        <div style={{ margin: '16px 0' }}>
            <Typography variant="subtitle1">Selecciona una parcela guardada:</Typography>
            <Select
                value={selected}
                onChange={e => {
                    setSelected(e.target.value);
                    const parcel = parcels.find(p => p._id === e.target.value);
                    if (parcel && onSelect) onSelect(parcel);
                }}
                displayEmpty
                style={{ width: '100%' }}
            >
                <MenuItem value="">-- Selecciona --</MenuItem>
                {parcels.map(parcel => (
                    <MenuItem key={parcel._id} value={parcel._id}>{parcel.name}</MenuItem>
                ))}
            </Select>
        </div>
    );
}

export default ParcelDropdown;
