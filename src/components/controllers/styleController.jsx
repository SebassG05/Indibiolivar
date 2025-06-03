/* Written by Ye Liu */

import React, { useState, useEffect } from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import Icon from '@material-ui/core/Icon';
import Slide from '@material-ui/core/Slide';
import emitter from '@utils/events.utils';
import { mapStyles } from '@utils/map.utils';
import '@styles/styleController.style.css';

const styles = {
  root: {
    position: 'fixed',
    top: 74,
    right: 10,
    borderRadius: 9,
    width: 340,
    margin: 0,
    zIndex: 900,
    boxShadow: '-6px 6px 15px rgba(0, 0, 0, 0.15)'
  },
  header: {
    backgroundColor: 'rgba(255,82,82,255)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px 8px 24px'
  },
  closeBtn: {
    fontSize: 22
  },
  grid: {
    padding: 16
  },
  stylePreview: {
    width: 64,
    height: 64,
    borderRadius: 4,
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'border 0.2s'
  },
  selected: {
    border: '2px solid #ff5252'
  }
};

const StyleController = () => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const openListener = emitter.addListener('openStyleController', () => setOpen(true));
    const closeListener = emitter.addListener('closeAllController', () => setOpen(false));
    return () => {
      emitter.removeListener(openListener);
      emitter.removeListener(closeListener);
    };
  }, []);

  const handleStyleClick = (key) => {
    setSelected(key);
    emitter.emit('setMapStyle', key);
    setOpen(false);
  };

  return (
    <Slide direction="left" in={open} mountOnEnter unmountOnExit>
      <Card style={styles.root}>
        <div style={styles.header}>
          <div>
            <Typography variant="h6" style={{ color: 'white', fontWeight: 600 }}>Estilo de Mapas</Typography>
            <Typography variant="body2" style={{ color: 'white', opacity: 0.8 }}>Elige el estilo de mapas</Typography>
          </div>
          <IconButton style={styles.closeBtn} aria-label="Close" onClick={() => setOpen(false)}>
            <Icon fontSize="inherit">chevron_right</Icon>
          </IconButton>
        </div>
        <CardContent style={{ paddingBottom: 16 }}>
          <Grid container spacing={2} style={styles.grid}>
            {Object.keys(mapStyles).map((key) => (
              <Grid item xs={3} key={key} style={{ display: 'flex', justifyContent: 'center' }}>
                <img
                  src={`./static/assets/${key}.png`}
                  alt={key}
                  style={{
                    ...styles.stylePreview,
                    ...(selected === key ? styles.selected : {})
                  }}
                  onClick={() => handleStyleClick(key)}
                />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Slide>
  );
};

export default StyleController;
