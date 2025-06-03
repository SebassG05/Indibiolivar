import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import MapboxTraffic from '@mapbox/mapbox-gl-traffic';
import mapboxgl from 'mapbox-gl';
import React from 'react';
import xml2js from 'xml2js'; // Añadir para parsear XML

import geocoder from '@plugins/geocoder.plugin';
import marker from '@plugins/marker.plugin';
import Minimap from '@plugins/minimap.plugin';

import { ACCESS_TOKEN } from '@/config';
import '@styles/map.style.css';
import emitter from '@utils/events.utils';
import { mapStyles } from '@utils/map.utils';

const styles = {
    root: {
        width: '100%',
        position: 'fixed',
        top: 64,
        bottom: 0
    }
};

class Canvas extends React.Component {
    constructor(props) {
        super(props);
        this.mapContainer = React.createRef();
        this.state = {
            map: null,
            draw: null,
            minimap: null,
            popup: null,
            gettingPoint: null,
            tempId: null,
            styleCode: Object.values(mapStyles)[1].substring(16),
            accessGranted: false,
            points: [],
            userLayers: [],
            userSources: []
        };
    }

    flyToGeometry(map, geometry) {
        const type = geometry.type;
        let coordinates;
        console.log(geometry)

        if (type === 'FeatureCollection') {
            const firstFeature = geometry.features[0];
            coordinates = firstFeature.geometry.coordinates;
        } else if (type === 'Feature') {
            coordinates = geometry.geometry.coordinates;
        } else {
            coordinates = geometry.coordinates;
        }

        if (geometry.type === 'Polygon') {
            console.log(coordinates[0][0])
            console.log(coordinates[0][0][1], coordinates[0][0][0])
            this.state.map.flyTo({
                center: [coordinates[0][0][0], coordinates[0][0][1]],
                zoom: 15
            });
        } else if (geometry.type === 'Point') {
            this.state.map.flyTo({
                center: [coordinates[0][0], coordinates[0][1]],
                zoom: 17
            });
        }
    }

    removeTempLayer = () => {
        const layers = this.state.map.getStyle().layers;
        this.setState({
            map: null
        })
        layers.map(layer => {
            if (layer.id === 'custom-temp-point') {
                this.state.map.removeLayer('custom-temp-point');
                this.state.map.removeSource('custom-temp-point');
            }
            return true;
        });

        if (this.state.popup && this.state.popup.isOpen()) {
            this.state.popup.remove();
        }
    }

    removeAllLayer = () => {
        const layers = this.state.map.getStyle().layers;
        layers.map(layer => {
            if (layer.id.includes('-points')) {
                this.state.map.removeLayer(layer.id);
                this.state.map.removeSource(layer.source);
            }
            return true;
        });

        layers.map(layer => {
            if (layer.id.includes('-boundary')) {
                this.state.map.removeLayer(layer.id);
                this.state.map.removeSource(layer.source);
            }
            return true;
        });

        if (this.state.popup && this.state.popup.isOpen()) {
            this.state.popup.remove();
        }

        emitter.emit('handleDatasetRemove');
    }
    
    add3dLayer = () => {
        var layers = this.state.map.getStyle().layers;
        for (var layer in layers) {
            if (layer.type === 'symbol' && layer.layout['text-field']) {
                var labelLayerId = layer.id;
                break;
            }
        }

        if (this.state.map.getLayer('3d-buildings')) {
            this.state.map.moveLayer('3d-buildings', labelLayerId);
            return;
        }

        this.state.map.addLayer({
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 12,
            'paint': {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': [
                    "interpolate", ["linear"], ["zoom"],
                    15, 0,
                    15.05, ["get", "height"]
                ],
                'fill-extrusion-base': [
                    "interpolate", ["linear"], ["zoom"],
                    15, 0,
                    15.05, ["get", "min_height"]
                ],
                'fill-extrusion-opacity': .6
            }
        }, labelLayerId);
    }

    removeTempPoint = () => {
        this.state.draw.delete(this.state.tempId);
        this.setState({
            tempId: null
        });
    }

    saveUserLayersAndSources = () => {
        const map = this.state.map;
        if (!map) return;
        const layers = map.getStyle().layers || [];
        const sources = map.getStyle().sources || {};
        const baseSources = ['composite', 'mapbox'];
        // Filtra todas las capas que no sean del mapa base ni background/water y tengan fuente válida
        const userLayers = layers.filter(layer => {
            return !baseSources.includes(layer.source) &&
                !layer.id.startsWith('background') &&
                !layer.id.startsWith('water') &&
                layer.source && sources[layer.source];
        }).map(layer => ({ ...layer }));
        // Guarda solo fuentes válidas
        const userSources = userLayers.map(layer => {
            return {
                id: layer.source,
                source: JSON.parse(JSON.stringify(sources[layer.source]))
            };
        });
        this.setState({ userLayers, userSources });
    };

    restoreUserLayersAndSources = () => {
        const map = this.state.map;
        if (!map) return;
        // Añade fuentes primero
        this.state.userSources.forEach(({ id, source }) => {
            if (!map.getSource(id)) {
                map.addSource(id, source);
            }
        });
        // Añade capas después, siempre al final (encima de todo)
        this.state.userLayers.forEach(layer => {
            if (!map.getLayer(layer.id)) {
                const { id, type, source, layout, paint, filter, minzoom, maxzoom, ...rest } = layer;
                const layerDef = { id, type, source, layout, paint, filter, minzoom, maxzoom };
                Object.keys(layerDef).forEach(key => {
                    if (layerDef[key] === undefined) delete layerDef[key];
                });
                map.addLayer(layerDef);
            }
        });
    };

    componentDidMount() {
        mapboxgl.accessToken = ACCESS_TOKEN;

        if (!mapboxgl.supported()) {
            alert('Your browser does not support Mapbox GL');
            return;
        }

        const map = new mapboxgl.Map({
            container: this.mapContainer.current,
            style: Object.values(mapStyles)[0],
            center: [-4.835985, 37.701896],
            zoom: 7,
            antialias: true
        });

                        // Agregar puntos al mapa
                        this.state.points.forEach((point) => {
                            const el = document.createElement('div');
                            el.className = 'marker';
                            el.style.width = '20px';
                            el.style.height = '20px';
                            el.style.backgroundColor = '#ff4081';
                            el.style.borderRadius = '50%';
                            el.style.cursor = 'pointer';
                
                            // Agregar evento al hacer clic en el marcador
                            el.addEventListener('click', () => {
                                const link = document.createElement('a');
                                link.href = point.file; // Ruta al archivo PDF
                                link.download = point.id + '.pdf'; // Nombre del archivo a descargar
                                console.log(link)
                                link.click();
                            });
                
                            // Agregar marcador al mapa
                            new mapboxgl.Marker(el)
                                .setLngLat(point.coordinates)
                                .addTo(map);
                        });
        

        const draw = new MapboxDraw({
            controls: {
                combine_features: false,
                uncombine_features: false
            }
        });

        const minimap = new Minimap({
            center: map.getCenter(),
            style: Object.values(mapStyles)[0]
        });

        map.addControl(new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl,
            localGeocoder: geocoder,
            placeholder: 'Search Address',
            marker: {
                color: 'red'
            }
        }), 'top-left');

        map.addControl(new mapboxgl.NavigationControl(), 'top-left');
        map.addControl(new mapboxgl.GeolocateControl(), 'top-left');
        map.addControl(new MapboxTraffic({
            trafficSource: new RegExp('/*/')
        }), 'top-left');
        map.addControl(draw, 'top-left');
        map.addControl(minimap, 'bottom-left');

        const popup = new mapboxgl.Popup({
            closeButton: false,
            anchor: 'bottom'
        }).setHTML('<div id="popup-container"></div>');

        document.getElementsByClassName('mapboxgl-ctrl-geocoder--input')[0].setAttribute('type', 'search-box');

        map.on('load', () => {
            this.add3dLayer();
            // Hide loader
            document.getElementById('loader-wrapper').classList.add('loaded');        
            
        });

        map.on('zoomend', () => {
            const zoomLevel = map.getZoom();
            emitter.emit('setMapZoom', zoomLevel);
        });

        map.on('draw.create', e => {
            if (!this.state.gettingPoint) {
                return;
            }

            // Save temp id
            this.setState({
                tempId: e.features[0].id
            });

            // Set point
            emitter.emit('setPoint', e.features[0], this.state.styleCode, this.state.map.getZoom());


            // Reset state
            this.setState({
                gettingPoint: false
            })
        });

        this.setMapStyleListener = emitter.addListener('setMapStyle', key => {
            if (this.state.map) {
                this.saveUserLayersAndSources();
                // Actualiza el estado styleCode y localStorage ANTES de cambiar el style
                localStorage.setItem('selectedMapStyle', key);
                this.setState({ styleCode: key }, () => {
                    this.state.map.setStyle(mapStyles[key]);
                    this.state.map.once('style.load', () => {
                        this.restoreUserLayersAndSources();
                    });
                });
            }
        });

    // Escuchar el evento para cambiar la visibilidad de las capas
        this.toggleLayerVisibilityListener = emitter.addListener('toggleLayerVisibility', (layerId, visible) => {
            if (this.state.map.getLayer(layerId)) {
                this.state.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
            }
        });

        // Escuchar el evento para cambiar la transparencia de las capas
        this.changeLayerTransparencyListener = emitter.addListener('changeLayerTransparency', (layerId, transparency) => {
            if (this.state.map.getLayer(layerId)) {
                this.state.map.setPaintProperty(layerId, 'raster-opacity', transparency);
            }
        });

        this.displayDatasetListener = emitter.addListener('displayDataset', (id, geometry) => {
            if (this.state.map.getSource(id)) {
                this.state.map.removeSource(id);
            }

            map.addSource(id, {
                'type': 'geojson',
                'data': geometry
            });

            map.addLayer({
                'id': id + '-boundary',
                'type': 'fill',
                'source': id,
                'paint': {
                    'fill-color': '#888888',
                    'fill-opacity': 0.4
                },
                'filter': ['==', '$type', 'Polygon']
            });

            map.addLayer({
                'id': id + '-points',
                'type': 'circle',
                'source': id,
                'paint': {
                    'circle-radius': 6,
                    'circle-color': '#B42222'
                },
                'filter': ['==', '$type', 'Point']
            });

            this.flyToGeometry(map, geometry);
        });

        this.removeDatasetListener = emitter.addListener('removeDataset', e => {
            const layerIds = [e + '-boundary', e + '-points'];

            layerIds.forEach(layerId => {
                if (this.state.map.getLayer(layerId)) {
                    this.state.map.removeLayer(layerId);
                }
            });

            if (this.state.map.getSource(e)) {
                this.state.map.removeSource(e);
            }
        });

        this.displayTempLayerListener = emitter.addListener('displayTempLayer', e => {
            // Eliminar capas anteriores si existen
            if (this.state.map.getLayer('maxent-heatmap')) {
                this.state.map.removeLayer('maxent-heatmap');
            }
            if (this.state.map.getSource('maxent-heatmap')) {
                this.state.map.removeSource('maxent-heatmap');
            }
            if (this.state.map.getLayer('maxent-occurrences')) {
                this.state.map.removeLayer('maxent-occurrences');
            }
            if (this.state.map.getSource('maxent-occurrences')) {
                this.state.map.removeSource('maxent-occurrences');
            }
            // Añadir heatmap primero
            this.state.map.addSource('maxent-heatmap', {
                type: 'geojson',
                data: e.geometry
            });
            this.state.map.addLayer({
                id: 'maxent-heatmap',
                type: 'heatmap',
                source: 'maxent-heatmap',
                maxzoom: 12,
                paint: {
                    'heatmap-weight': [
                        'interpolate', ['linear'], ['get', 'weight'],
                        0, 0,
                        1, 1
                    ],
                    'heatmap-intensity': [
                        'interpolate', ['linear'], ['zoom'],
                        0, 1,
                        12, 3
                    ],
                    'heatmap-color': [
                        'interpolate', ['linear'], ['heatmap-density'],
                        0, 'rgba(33,102,172,0)',
                        0.2, 'rgb(103,169,207)',
                        0.4, 'rgb(209,229,240)',
                        0.6, 'rgb(253,219,199)',
                        0.8, 'rgb(239,138,98)',
                        1, 'rgb(178,24,43)'
                    ],
                    'heatmap-radius': [
                        'interpolate', ['linear'], ['zoom'],
                        0, 8,
                        12, 24
                    ],
                    'heatmap-opacity': [
                        'interpolate', ['linear'], ['zoom'],
                        7, 1,
                        12, 0.6
                    ]
                }
            });
            // Añadir capa de puntos encima del heatmap
            this.state.map.addSource('maxent-occurrences', {
                type: 'geojson',
                data: e.geometry
            });
            this.state.map.addLayer({
                id: 'maxent-occurrences',
                type: 'circle',
                source: 'maxent-occurrences',
                paint: {
                    'circle-radius': 6,
                    'circle-color': '#1976d2',
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#fff'
                }
            });
            // Centrar el mapa SIEMPRE en toda España (incluyendo Canarias y Baleares)
            this.state.map.fitBounds([
                [-18.2, 27.6], // Suroeste (Islas Canarias)
                [4.5, 43.9]    // Noreste (Pirineos, Baleares)
            ], { padding: 40 });
        });

        this.setState({
            map: map,
            draw: draw,
            minimap: minimap,
            popup: popup
        });

        emitter.on('moveURL', this.handleURLMoved);

    }

    splitAssetName = (assetPath) => {
        const parts = assetPath.split('/'); // Dividimos el path por "/"
        let lastPart = parts[parts.length - 1]; // Tomamos la última parte del path
    
        // Si el nombre comienza con "0", lo removemos
        if (lastPart.startsWith('0')) {
            lastPart = lastPart.substring(1); // Eliminar el primer carácter ("0")
        }
        
        return lastPart; // Devolver la última parte procesada
    };

    // Comprueba si la URL tiene el parámetro LAYERS
    hasLayersParam = (url) => {
        return /[?&]LAYERS=/i.test(url);
    };

    // Obtiene las capas disponibles de GetCapabilities
    fetchWMSLayersFromGetCapabilities = async (baseUrl) => {
        let url = baseUrl;
        if (!url.endsWith('?') && !url.endsWith('&')) {
            url += url.includes('?') ? '&' : '?';
        }
        url += 'SERVICE=WMS&REQUEST=GetCapabilities';
        try {
            const response = await fetch(url);
            const text = await response.text();
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(text);
            // Busca las capas en el XML (WMS 1.1.1 y 1.3.0)
            let layers = [];
            try {
                // WMS 1.3.0
                var capability = result && result.WMS_Capabilities && result.WMS_Capabilities.Capability && result.WMS_Capabilities.Capability[0];
                if (capability && capability.Layer) {
                    layers = this.extractLayerNames(capability.Layer);
                }
            } catch (e) {}
            if (layers.length === 0) {
                try {
                    // WMS 1.1.1
                    var capability2 = result && result.WMT_MS_Capabilities && result.WMT_MS_Capabilities.Capability && result.WMT_MS_Capabilities.Capability[0];
                    if (capability2 && capability2.Layer) {
                        layers = this.extractLayerNames(capability2.Layer);
                    }
                } catch (e) {}
            }
            return layers;
        } catch (e) {
            console.error('Error al obtener GetCapabilities:', e);
            return [];
        }
    };

    // Extrae los nombres de capa de la estructura XML
    extractLayerNames = (layerArray) => {
        let names = [];
        for (const layer of layerArray) {
            if (layer.Name && layer.Name[0]) {
                names.push(layer.Name[0]);
            }
            if (layer.Layer) {
                names = names.concat(this.extractLayerNames(layer.Layer));
            }
        }
        return names;
    };

    // Prompt simple para seleccionar capa (puedes mejorar con un modal)
    async promptLayerSelection(layers) {
        const layerList = layers.map((l, i) => `${i + 1}: ${l}`).join('\n');
        const choice = window.prompt(`Selecciona el número de la capa WMS a cargar:\n${layerList}`);
        const idx = parseInt(choice, 10) - 1;
        if (idx >= 0 && idx < layers.length) {
            return layers[idx];
        }
        return null;
    }

    // Modifica handleURLMoved para automatizar selección de LAYERS
    handleURLMoved = async (movedURL) => {
        console.log('Received moved data:', movedURL);
    
        if (typeof movedURL === 'object' && movedURL.type === 'wms' && movedURL.url) {
            let wmsUrl = movedURL.url;
            // Si falta LAYERS, obtener GetCapabilities y pedir selección
            if (!this.hasLayersParam(wmsUrl)) {
                const layers = await this.fetchWMSLayersFromGetCapabilities(wmsUrl);
                if (!layers.length) {
                    emitter.emit('showSnackbar', 'error', 'No se encontraron capas WMS en GetCapabilities');
                    return;
                }
                const selectedLayer = await this.promptLayerSelection(layers);
                if (!selectedLayer) {
                    emitter.emit('showSnackbar', 'error', 'No se seleccionó ninguna capa WMS');
                    return;
                }
                // Añade el parámetro LAYERS
                wmsUrl += (wmsUrl.includes('?') ? (wmsUrl.endsWith('?') || wmsUrl.endsWith('&') ? '' : '&') : '?') + 'LAYERS=' + encodeURIComponent(selectedLayer) + '&';
            }
            // Asegura que la URL termina en '?' o '&'
            if (!wmsUrl.endsWith('?') && !wmsUrl.endsWith('&')) {
                wmsUrl += wmsUrl.includes('?') ? '&' : '?';
            }
            // Elimina la capa WMS anterior si existe
            if (this.state.map.getLayer('wms-active')) {
                this.state.map.removeLayer('wms-active');
            }
            if (this.state.map.getSource('wms-active')) {
                this.state.map.removeSource('wms-active');
            }
            // Añade la nueva capa WMS como raster
            this.state.map.addSource('wms-active', {
                type: 'raster',
                tiles: [
                    `${wmsUrl}SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&SRS=EPSG:3857&STYLES=&FORMAT=image/png&TRANSPARENT=true&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}`
                ],
                tileSize: 256
            });
            this.state.map.addLayer({
                id: 'wms-active',
                type: 'raster',
                source: 'wms-active',
                paint: { 'raster-opacity': 0.8 }
            });
            emitter.emit('showSnackbar', 'success', `Capa WMS cargada`);
            return;
        }
        // ...existing code para assets/GeoJSON...
        const mapUrl = movedURL[0];
        const layerId = movedURL[2];
        const polygon = movedURL[3];
        const minValue = movedURL[4];
        const maxValue = movedURL[5];
        this.setState({ url: mapUrl });
        console.log(layerId);
        emitter.emit('newLayer', {
            id: layerId,
            url: mapUrl,
            visible: true,
            transparency: 100,
            min: minValue,
            max: maxValue
        });
        console.log(movedURL)
        emitter.emit('showSnackbar', 'success', `The layer '${this.splitAssetName(layerId)}' has been loaded`);
        this.state.map.addLayer({
            'id': layerId,
            'type': 'raster',
            'source': {
                'type': 'raster',
                'tiles': [
                    mapUrl
                ],
                'tileSize': 256
            },
            'paint': {
                'raster-opacity': 0.8
            }
        });
        if (polygon && polygon.type === 'Polygon') {
            this.flyToGeometry(this.state.map, polygon)
        } else {
            console.error('Invalid or missing GeoJSON Polygon in movedURL[3]');
        }
        console.log(this.state.url);
    };
    // ...existing code...
    
    componentWillUnmount() {
        emitter.removeListener(this.setMapStyleListener);
        emitter.removeListener(this.displayDatasetListener);
        emitter.removeListener(this.removeDatasetListener);
        emitter.removeListener(this.displayTempLayerListener);
        emitter.removeListener(this.toggleLayerVisibilityListener);
        emitter.removeListener(this.changeLayerTransparencyListener);  
    }

    render() {
        return (
            <div>
            <div id="map" style={styles.root} ref={this.mapContainer}/>

                            </div>
        );
    }
}

export default Canvas;