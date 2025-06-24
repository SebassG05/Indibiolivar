from flask import Flask, jsonify, request
from werkzeug.utils import secure_filename
from flask_cors import CORS
import geopandas as gpd
import pandas as pd
import zipfile
# from ria import RIA # Commented out
import ee
import requests
import os
import tempfile
import json
import math
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=[
    "https://gobiolivar.evenor-tech.com",
    "http://localhost:3001",
    "http://localhost:3200",
    "http://localhost:5001",
    "https://indibiolivar.evenor-tech.com",
])
# ria = RIA() # Commented out

ee.Authenticate(auth_mode="gcloud")
ee.Initialize(project='soil-values-predictor')

@app.route('/api/', methods=['GET'])
def index():
    return "Estas en Biolivar"

def format_cadastral_ref(ref, delimiter=','):
    # Asumiendo que ref tiene el formato '29076A00200929'
    provincia = ref[0:2]
    municipio = ref[2:5]
    # 'A' es omitido según el ejemplo
    poligono = ref[6:9]  # Saltando 'A' que está en posición 5
    parcela = ref[9:14]
    return f"{provincia}{delimiter}{municipio}{delimiter}0{delimiter}0{delimiter}{poligono}{delimiter}{parcela}"


@app.route('/cadastral/<ref>', methods=['GET'])
def get_cadastral_data(ref):
    recinto_num = request.args.get('recintoNum', '')
    base_info_url = 'https://sigpac.mapama.gob.es/fega/serviciosvisorsigpac/layerinfo/recinto/'
    geojson_url = 'https://sigpac.mapama.gob.es/fega/ServiciosVisorSigpac/query/recintos/'

    # Obtener el ID para la URL de info y geojson
    id_info = format_cadastral_ref(ref)
    id_geojson = format_cadastral_ref(ref, delimiter='/')

    try:
        # Primera llamada para obtener información básica
        add=''
        if recinto_num:
            add += f",{recinto_num}"
        print(f"{base_info_url}{id_info}"+add)
        info_response = requests.get(f"{base_info_url}{id_info}"+add)
        info_response.raise_for_status()
        info_data = info_response.json()
        parts = id_geojson.split('/')
        print(f"{geojson_url}{id_geojson}.geojson")

        # Seleccionar los trozos primero, segundo, quinto y sexto
        selected_parts = [parts[0], parts[1], parts[4], parts[5]]

        # Quitar ceros a la izquierda
        cleaned_parts = [int(part) for part in selected_parts]
        
        print(info_data)
        # Enviamos la lista en el cuerpo de la solicitud
        response = get_boundaries(cleaned_parts, int(recinto_num))
        
        # Combinar las respuestas en un solo objeto JSON
        result = {
            'parcelInfo': info_data,
            'output': response
        }    
        
        return jsonify({
                "success": True,
                'parcelInfo': info_data,
                "output": response
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_boundaries(numbers, recinto_num):
    
# Extraemos la lista enviada
    print(numbers)
# Realizamos alguna operación con la lista (ejemplo: convertir a enteros)
    table=  None
    if(numbers[0]==41):
        table = ee.FeatureCollection('users/jbravo/sigpac/SP24_REC_41') 
    if(numbers[0]==4):
        table = ee.FeatureCollection('users/jbravo/sigpac/SP24_REC_04') 
    if(numbers[0]==11):
        table = ee.FeatureCollection('users/jbravo/sigpac/SP24_REC_11') 
    if(numbers[0]==14):
        table = ee.FeatureCollection('users/jbravo/sigpac/SP24_REC_14') 
    if(numbers[0]==18):
        table = ee.FeatureCollection('users/jbravo/sigpac/SP24_REC_18') 
    if(numbers[0]==21):
        table = ee.FeatureCollection('users/jbravo/sigpac/SP24_REC_21') 
    if(numbers[0]==23):
        table = ee.FeatureCollection('users/jbravo/sigpac/SP24_REC_23') 
    if(numbers[0]==29):      
        table = ee.FeatureCollection('users/jbravo/sigpac/SP24_REC_29') 

    print((numbers))
    
    cd_prov = ee.Number(numbers[0]).int()
    cd_mun = ee.Number(numbers[1]).int()
    cd_pol = ee.Number(numbers[2]).int()
    cd_parcela = ee.Number(numbers[3]).long()
    cd_recinto = ee.Number(recinto_num).long()

    # Filtrar los polígonos usando los valores con tipos adecuados
    filtered_polygon = table.filter(
        ee.Filter.And(
            ee.Filter.eq('CD_PROV', cd_prov),
            ee.Filter.eq('CD_MUN', cd_mun),
            ee.Filter.eq('CD_POL', cd_pol),
            ee.Filter.eq('CD_PARCELA', cd_parcela),
            ee.Filter.eq('CD_RECINTO', cd_recinto),     # Cambia al valor que corresponda
        )
    )

    polygon_count = filtered_polygon.size().getInfo()
    if polygon_count == 0:
        print("No se encontraron polígonos con los criterios especificados.")
    elif polygon_count > 1:
        print(f"Se encontraron {polygon_count} polígonos. Ajusta los filtros para ser más específico.")
    else:
        print(f"Se encontró {polygon_count} polígono.")
    
    erosion_viz_params = {'min': 0, 'max': 10, 'palette': ['#490eff', '#12f4ff', '#12ff50', '#e5ff12', '#ff4812']}

    
    map_id = filtered_polygon.getMapId(erosion_viz_params)
    
    
    
    return[map_id['tile_fetcher'].url_format, erosion_viz_params, 'Parcela_'+str(numbers[0])+str(numbers[1])+str(numbers[1])+str(recinto_num), filtered_polygon.geometry().getInfo()]
     
@app.route('/api/rusle', methods=['POST'])
def get_rusle():
    try:
        if 'aoiDataFiles' not in request.files:
            return jsonify({"error": "No file part"}), 400

        aoi_file = request.files['aoiDataFiles']

        if aoi_file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        with tempfile.TemporaryDirectory() as temp_dir:
            aoi_filepath = os.path.join(temp_dir, secure_filename(aoi_file.filename))
            aoi_file.save(aoi_filepath)

            # Suponiendo que el shapefile se extrae en el directorio temporal
            gdf = gpd.read_file(aoi_filepath)
            geojson_dict = gdf.__geo_interface__
            aoi = ee.FeatureCollection(geojson_dict['features'])
            
            # Definir fechas desde los parámetros del request
            start_date = request.form.get('startDate')
            end_date = request.form.get('endDate')
            
            # **************** R Factor ***************
            clim_rainmap = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterDate(start_date, end_date)
            annual_rain = clim_rainmap.select('precipitation').sum().clip(aoi)
            R = annual_rain.multiply(0.363).add(79).rename('R')
            
            # Visualización del factor R
            R_viz_params = {'min': 300, 'max': 900, 'palette': ['a52508', 'ff3818', 'fbff18', '25cdff', '2f35ff', '0b2dab']}
            
            # **************** K Factor ***************
            soil = ee.Image("OpenLandMap/SOL/SOL_SAND-WFRACTION_USDA-3A1A1A_M/v02").select('b0').clip(aoi).rename('soil')
            K = soil.expression(
                "(b('soil') > 11) ? 0.0053"
                ": (b('soil') > 10) ? 0.0170"
                ": (b('soil') > 9) ? 0.045"
                ": (b('soil') > 8) ? 0.050"
                ": (b('soil') > 7) ? 0.0499"
                ": (b('soil') > 6) ? 0.0394"
                ": (b('soil') > 5) ? 0.0264"
                ": (b('soil') > 4) ? 0.0423"
                ": (b('soil') > 3) ? 0.0394"
                ": (b('soil') > 2) ? 0.036"
                ": (b('soil') > 1) ? 0.0341"
                ": (b('soil') > 0) ? 0.0288"
                ": 0"
            ).rename('K').clip(aoi)
            
            # Visualización del factor K
            K_viz_params = {'min': 0, 'max': 0.06, 'palette': ['a52508', 'ff3818', 'fbff18', '25cdff', '0b2dab']}
            
            # **************** LS Factor ***************
            dem = ee.Image("WWF/HydroSHEDS/03CONDEM")
            slope = ee.Terrain.slope(dem).clip(aoi)
            slope_percent = slope.divide(180).multiply(math.pi).tan().multiply(100)
            LS4 = math.sqrt(500 / 100)
            LS = slope_percent.expression(
                "(b('slope') * 0.53) + (b('slope') * (b('slope') * 0.076)) + 0.76"
            ).multiply(LS4).rename('LS').clip(aoi)
            
            # Visualización del factor LS
            LS_viz_params = {'min': 0, 'max': 90, 'palette': ['a52508', 'ff3818', 'fbff18', '25cdff', '0b2dab']}
            
            # **************** C Factor **************


            L = 0.5;
            # Visualización del factor LS

            
            # **************** C Factor ***************
            s2 = ee.ImageCollection("COPERNICUS/S2_HARMONIZED").filterDate(start_date, end_date).median().clip(aoi)
            ndvi = s2.normalizedDifference(['B8', 'B4']).rename("NDVI")
            sentinelCollection = ee.ImageCollection('COPERNICUS/S2_HARMONIZED').filterBounds(aoi).filterDate(start_date, end_date).filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))

            sentinelMedian = sentinelCollection.median();
            savi = sentinelMedian.expression('((NIR - RED) / (NIR + RED + L)) * (1 + L)', {'NIR': sentinelMedian.select('B8'), 'RED': sentinelMedian.select('B4'), 'L': L }).rename('SAVI');

            savi_median = savi

            C = ee.Image(0.805).multiply(savi_median).multiply(-1).add(0.431).clip(aoi)

            
            # Visualización del factor C
            C_viz_params = {'min': 0, 'max': 1, 'palette': ['FFFFFF', 'CC9966', 'CC9900', '996600', '33CC00', '009900', '006600', '000000']}
            
            # **************** Erosion Calculation ***************
            erosion = R.multiply(K).multiply(LS).multiply(C).rename('erosion')
            
            erosion_viz_params = {'min': 0, 'max': 10, 'palette': ['#490eff', '#12f4ff', '#12ff50', '#e5ff12', '#ff4812']}
            
            # Generar mapa
            map_id = erosion.getMapId(erosion_viz_params) 
            bounds=aoi.geometry().getInfo()
            return jsonify({
                "success": True,
                "output": [map_id['tile_fetcher'].url_format, erosion_viz_params, 'Erosion_Result', bounds]
            }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/list-assets', methods=['GET'])
def list_assets():
    try:
        folder = 'users/jbravo/sigpac'  # Carpeta de ejemplo, puedes cambiar esto
        assets = ee.data.listAssets({'parent': folder})
        
        # Filtramos los assets y pasamos su tipo
        formatted_assets = [
            {'id': asset['id'], 'type': asset['type']} for asset in assets['assets']
        ]
        
        return jsonify({'assets': formatted_assets})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/get-map-url', methods=['POST'])
def get_map_url():
    try:
        data = request.get_json()
        asset_id = data.get('asset_id')  # Asset seleccionado por el usuario
        asset_type = data.get('asset_type')  # Tipo del asset (TABLE o IMAGE)
        colores = [
            '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#8B0000', '#A52A2A',
            '#5F9EA0', '#7FFF00', '#D2691E', '#6495ED', '#DC143C', '#00FA9A', '#FFD700', '#ADFF2F', '#4B0082', '#20B2AA',
            '#9370DB', '#3CB371', '#7B68EE', '#48D1CC', '#C71585', '#191970', '#FF4500', '#DA70D6', '#32CD32', '#4682B4',
            '#FA8072', '#778899', '#8A2BE2', '#00CED1', '#FF1493', '#2E8B57', '#7CFC00', '#B8860B', '#FF6347', '#4682B4',
            '#6A5ACD', '#008080', '#B22222', '#FF69B4', '#556B2F'
        ]
        # Definir los parámetros de visualización
        vis_params = {
            'palette': colores,
            'opacity': 0.65
        }
        
        url= None
        print(asset_id)
        # Verificamos el tipo de asset
        if asset_type == 'IMAGE':
            asset = ee.Image(asset_id)  # Cargar el asset como imagen
        elif asset_type == 'TABLE':
            if asset_id == "users/jbravo/sigpac/06_01_UsoSuelo":
            # Cargar el asset como FeatureCollection
                uso_suelo_values = [
                'Tejido urbano continuo', 'Tejido urbano discontinuo', 'Zonas industriales o comerciales',
                'Redes viarias, ferroviarias y terrenos asociados', 'Zonas portuarias', 'Aeropuertos',
                'Zonas de extracción minera', 'Escombreras y vertederos', 'Zonas en construcción',
                'Zonas verdes urbanas', 'Instalaciones deportivas y recreativas', 'Tierras de labor en secano',
                'Terrenos regados permanentemente', 'Arrozales', 'Viñedo', 'Frutales', 'Olivares',
                'Prados y Praderas', 'Cultivos anuales asociados con cultivos permanentes', 'Mosaico de cultivos',
                'Terrenos principalmente agrícolas, pero con importantes espacios de vegetación natural',
                'Sistemas agroforestales', 'Bosques de frondosas', 'Bosques de coníferas', 'Bosque mixto',
                'Pastizales naturales', 'Landas y matorrales', 'Matorrales esclerófilos',
                'Matorral boscoso de transición', 'Playas, dunas y arenales', 'Roquedo',
                'Espacios con vegetación escasa', 'Zonas quemadas', 'Humedales y zonas pantanosas', 'Marismas',
                'Salinas', 'Zonas llanas intermareales', 'Cursos de agua'
                ]

                colores = [
                '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
                '#8B0000', '#A52A2A', '#5F9EA0', '#7FFF00', '#D2691E', '#6495ED', '#DC143C', '#00FA9A',
                '#FFD700', '#ADFF2F', '#4B0082', '#20B2AA', '#9370DB', '#3CB371', '#7B68EE', '#48D1CC',
                '#C71585', '#191970', '#FF4500', '#DA70D6', '#32CD32', '#4682B4', '#FA8072', '#778899',
                '#8A2BE2', '#00CED1', '#FF1493', '#2E8B57', '#7CFC00', '#B8860B'
                ]

            # Crear un diccionario de colores en el cliente
                color_map = dict(zip(uso_suelo_values, colores))
                feature_collection = ee.FeatureCollection(asset_id)

            # Función para asignar colores en el lado del servidor
                def style_feature(feature):
                    uso_suelo = feature.get('uso_suelo')
                    color = ee.Dictionary(color_map).get(uso_suelo, '#000000')  # Color por defecto
                    return feature.set('style', {
                        'color': color,
                        'fillColor': color,
                        'width': 1
                    })

                styled_fc = feature_collection.map(style_feature).style(**{'styleProperty': 'style'})

                map_id_dict = styled_fc.getMapId()
            
            else:
                vis_params = {}
                asset = ee.FeatureCollection(asset_id) 
                map_id_dict = asset.getMapId(vis_params)  # Obtener el MapID de esa imagen o FeatureCollection

   
            url = map_id_dict['tile_fetcher'].url_format  # Extraer la URL del mapa

        else:
            return jsonify({'error': 'Unknown asset type'}), 400
        
        # Paleta de colores destacada y valores de uso_suelo
 
        return jsonify({'map_url': [url, vis_params, asset_id]})
    except Exception as e:
        print(str(e))
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/vegetation_index_change_inspector', methods=['POST'])
def vegetation_index_change_inspector():
    try:
        # --- DEBUG LOGGING ---
        print('request.files:', request.files)
        print('request.form:', request.form)
        # --- END DEBUG LOGGING ---

        import json
        import tempfile
        import os
        from werkzeug.utils import secure_filename
        import geopandas as gpd

        # Nueva validación: aceptar archivo o geojson
        aoiGeoJson = request.form.get('aoiGeoJson')
        band = request.form.get('indexType')
        start_date = request.form.get('startDate')
        end_date = request.form.get('endDate')
        
        if ('aoiDataFiles' not in request.files and not aoiGeoJson) or not band:
            print('Faltan datos requeridos (aoiDataFiles o aoiGeoJson, indexType)')
            return jsonify({"error": "Faltan datos requeridos (aoiDataFiles o aoiGeoJson, indexType)"}), 400

        # --- SOLO UNO DE LOS DOS: archivo o geojson ---
        aoiGeoJson = request.form.get('aoiGeoJson')
        if aoiGeoJson:
            try:
                geojson_dict = json.loads(aoiGeoJson)
                # Si es una lista, conviértela en FeatureCollection
                if isinstance(geojson_dict, list):
                    geojson_dict = {
                        "type": "FeatureCollection",
                        "features": [
                            {"type": "Feature", "geometry": geom, "properties": {}} for geom in geojson_dict
                        ]
                    }
                # Ahora procesa según el tipo
                if geojson_dict.get('type') == 'FeatureCollection':
                    bbox = ee.FeatureCollection(geojson_dict['features'])
                elif geojson_dict.get('type') == 'Feature':
                    bbox = ee.FeatureCollection([geojson_dict])
                elif geojson_dict.get('type') in ['Polygon', 'MultiPolygon']:
                    bbox = ee.FeatureCollection([ee.Feature(ee.Geometry(geojson_dict))])
                else:
                    raise ValueError("Formato de GeoJSON no soportado")
            except Exception as e:
                print(f"Error procesando aoiGeoJson: {e}")
                return jsonify({"error": f"GeoJSON inválido: {str(e)}"}), 400
        elif request.files.get('aoiDataFiles', None):
            file = request.files.get('aoiDataFiles', None)
            gdf = gpd.read_file(file)
            geojson_dict = gdf.__geo_interface__
            bbox = ee.FeatureCollection(geojson_dict['features'])
        else:
            return jsonify({"error": "No geojson or file provided"}), 400

        def harmonizationRoy(oli):
            slopes = ee.Image.constant([0.9785, 0.9542, 0.9825, 1.0073, 1.0171, 0.9949])
            itcp = ee.Image.constant([-0.0095, -0.0016, -0.0022, -0.0021, -0.0030, 0.0029])
            return oli.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'], 
                              ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7']) \
                      .subtract(itcp.multiply(10000)).divide(slopes).set('system:time_start', oli.get('system:time_start'))

        def getSRcollection(year, startDay, endDay, sensor, aoi):
            srCollection = ee.ImageCollection('LANDSAT/' + sensor + '/C02/T1_L2') \
                .filterBounds(aoi) \
                .filterDate(f'{year}-{startDay}', f'{year}-{endDay}')
            
            srCollection = srCollection.map(lambda img: harmonizationRoy(img) if sensor == 'LC08' else img \
                                            .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7']) \
                                            .resample('bicubic').set('system:time_start', img.get('system:time_start')))
            
            srCollection = srCollection.map(lambda img: img.toInt16())
            
            return srCollection

        def getCombinedSRcollection(startYear, endYear, startDay, endDay, aoi):
            lt5 = getSRcollection(startYear, startDay, endDay, 'LT05', aoi)
            le7 = getSRcollection(startYear, startDay, endDay, 'LE07', aoi)
            lc8 = getSRcollection(startYear, startDay, endDay, 'LC08', aoi)
            return ee.ImageCollection(lt5.merge(le7).merge(lc8))
        
        def add_indices(image):
            ndvi = image.expression('float((NIR - RED) / (NIR + RED))', {
                'NIR': image.select('SR_B4'), 'RED': image.select('SR_B3')
            }).rename('NDVI')

            evi = image.expression('2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
                'NIR': image.select('SR_B4'), 'RED': image.select('SR_B3'), 'BLUE': image.select('SR_B1')
            }).rename('EVI')

            savi = image.expression('((NIR - RED) / (NIR + RED + 0.5)) * (1 + 0.5)', {
                'NIR': image.select('SR_B4'), 'RED': image.select('SR_B3')
            }).rename('SAVI')

            msi = image.expression('SWIR1 / NIR', {
                'SWIR1': image.select('SR_B5'), 'NIR': image.select('SR_B4')
            }).rename('MSI')

            ndmi = image.expression('(NIR - SWIR1) / (NIR + SWIR1)', {
                'NIR': image.select('SR_B4'), 'SWIR1': image.select('SR_B5')
            }).rename('NDMI')

            nbr = image.expression('(NIR - SWIR2) / (NIR + SWIR2)', {
                'NIR': image.select('SR_B4'), 'SWIR2': image.select('SR_B7')
            }).rename('NBR')

            return image.addBands([ndvi, evi, savi, msi, ndmi, nbr])

                # ...existing code...
        startDay, endDay = start_date[5:], end_date[5:]
        
        # Añade esto para definir los años
        start_year = int(start_date[:4])
        end_year = int(end_date[:4])
        
        collection1 = getCombinedSRcollection(start_year, start_year, startDay, endDay, bbox)
        collection2 = getCombinedSRcollection(end_year, end_year, startDay, endDay, bbox)
        # ...existing code...

        collection1_median = collection1.median().clip(bbox)
        collection2_median = collection2.median().clip(bbox)
        composite1 = add_indices(collection1_median)
        composite2 = add_indices(collection2_median)
        visualization_parameters={}
        
        if band == "NDVI":
            delta_index = composite2.select('NDVI').subtract(composite1.select('NDVI')).rename('deltaNDVI')
            palette = ['red', 'white', 'green']
        elif band == "EVI":
            delta_index = composite2.select('EVI').subtract(composite1.select('EVI')).rename('deltaEVI')
            palette = ['red', 'white', 'green']
        elif band == "SAVI":
            delta_index = composite2.select('SAVI').subtract(composite1.select('SAVI')).rename('deltaSAVI')
            palette = ['red', 'white', 'green']
        elif band == "MSI":
            delta_index = composite2.select('MSI').subtract(composite1.select('MSI')).rename('deltaMSI')
            palette = ['red', 'white', 'green']
        elif band == "NDMI":
            delta_index = composite2.select('NDMI').subtract(composite1.select('NDMI')).rename('deltaNDMI')
            palette = ['red', 'white', 'green']
        elif band == "NBR":
            delta_index = composite2.select('NBR').subtract(composite1.select('NBR')).rename('deltaNBR')
            palette = ['red', 'white', 'green']
        else:
            print('Tipo de índice desconocido')
            return jsonify({"error": "Tipo de índice desconocido"}), 400

        percentiles = delta_index.reduceRegion(
            reducer=ee.Reducer.percentile([2, 98]),
            geometry=bbox.geometry(),
            scale=30,
            maxPixels=1e9
        ).getInfo()
        band_name = list(delta_index.bandNames().getInfo())[0]
        min_val = percentiles.get(f"{band_name}_p2")
        max_val = percentiles.get(f"{band_name}_p98")
        if min_val is None or max_val is None or min_val == max_val:
            min_val = -0.25
            max_val = 0.25

        visualization_parameters = {
            'palette': palette,
            'min': min_val,
            'max': max_val
        }

        map_id = delta_index.getMapId(visualization_parameters)
        bounds=bbox.geometry().getInfo()

        min_max_dict = delta_index.reduceRegion(
            reducer=ee.Reducer.minMax(),
            geometry=bbox.geometry(),
            scale=30,
            maxPixels=1e9
        ).getInfo()

        min_val = min_max_dict.get('delta' + band + '_min')
        max_val = min_max_dict.get('delta' + band + '_max')

        print(f"Calculated min: {min_val}, max: {max_val}") 

        output_data = [
            map_id['tile_fetcher'].url_format, 
            visualization_parameters, 
            'VICI_'+band+'_Result', 
            bounds,
            min_val, 
            max_val
        ]
        
        print(f"Sending output data: {output_data}")

        return jsonify({"success": True, "output": output_data}), 200

    except Exception as e:
        print(f"INTERNAL ERROR: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/get_image', methods=['POST'])
def get_image():
    try:
        # Resolucion fija
        scale_resolution = 10

        # Manejo de form-data con archivo o geojson
        start_date = request.form['startDate']
        end_date = request.form['endDate']
        index_type = request.form['indexType']
        aoiGeoJson = request.form.get('aoiGeoJson')
        import json
        import tempfile
        import os
        from werkzeug.utils import secure_filename
        import geopandas as gpd

        if aoiGeoJson:
            try:
                geojson_dict = json.loads(aoiGeoJson)
                # Si es una lista, conviértela en FeatureCollection
                if isinstance(geojson_dict, list):
                    geojson_dict = {
                        "type": "FeatureCollection",
                        "features": [
                            {"type": "Feature", "geometry": geom, "properties": {}} for geom in geojson_dict
                        ]
                    }
                # Ahora procesa según el tipo
                if geojson_dict.get('type') == 'FeatureCollection':
                    bbox = ee.FeatureCollection(geojson_dict['features'])
                elif geojson_dict.get('type') == 'Feature':
                    bbox = ee.FeatureCollection([geojson_dict])
                elif geojson_dict.get('type') == 'Polygon':
                    bbox = ee.FeatureCollection([ee.Feature(ee.Geometry.Polygon(geojson_dict['coordinates']))])
                else:
                    raise ValueError("Formato de GeoJSON no soportado")
            except Exception as e:
                print(f"Error procesando aoiGeoJson: {e}")
                return jsonify({"error": f"GeoJSON inválido: {str(e)}"}), 400
        elif request.files.get('aoiDataFiles', None):
            file = request.files.get('aoiDataFiles', None)
            gdf = gpd.read_file(file)
            geojson_dict = gdf.__geo_interface__
            bbox = ee.FeatureCollection(geojson_dict['features'])    
        else:
            return jsonify({"error": "No geojson or file provided"}), 400

        # ...el resto del código permanece igual...

        # Cargar coleccion Sentinel-2
        coleccion_sentinel = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")\
            .filterDate(start_date, end_date)\
            .filterBounds(bbox)\
            .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', 10)

        mosaico = coleccion_sentinel.median().clip(bbox)
        mosaico_bands = mosaico.select(['B4', 'B3', 'B2', 'B11', 'B1', 'B12', 'B8', 'B5'])

        # Funciones para indices
        def calculate_ndvi(image):
            return image.expression('float((NIR - RED) / (NIR + RED))', {
                'NIR': image.select('B8'),
                'RED': image.select('B4')
            }).rename('NDVI')

        def calculate_evi(image):
            return image.expression('2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
                'NIR': image.select('B8'),
                'RED': image.select('B4'),
                'BLUE': image.select('B2')
            }).rename('EVI')

        def calculate_gndvi(image):
            return image.expression('(NIR - GREEN) / (NIR + GREEN)', {
                'NIR': image.select('B8'),
                'GREEN': image.select('B3')
            }).rename('GNDVI')

        def calculate_ndmi(image):
            return image.expression('(NIR - SWIR1) / (NIR + SWIR1)', {
                'NIR': image.select('B8'),
                'SWIR1': image.select('B11')
            }).rename('NDMI')

        def calculate_msi(image):
            return image.expression('SWIR1 / NIR', {
                'SWIR1': image.select('B11'),
                'NIR': image.select('B8')
            }).rename('MSI')

        def calculate_bi(image):
            return image.expression('((SWIR1 + RED) - (NIR + BLUE)) / ((SWIR1 + RED) + (NIR + BLUE))', {
                'SWIR1': image.select('B11'),
                'RED': image.select('B4'),
                'NIR': image.select('B8'),
                'BLUE': image.select('B2')
            }).rename('BI')

        def calculate_savi(image):
            return image.expression('1.5 * (NIR - RED) / (NIR + RED + 0.5)', {
                'NIR': image.select('B8'),
                'RED': image.select('B4')
            }).rename('SAVI')

        # Agregar todos los índices
        def add_indices(image):
            indices = [
                calculate_ndvi(image),
                calculate_evi(image),
                calculate_gndvi(image),
                calculate_ndmi(image),
                calculate_msi(image),
                calculate_bi(image),
                calculate_savi(image)
            ]
            return image.addBands(indices)

        # Aplicar indices
        composite_indices = add_indices(mosaico_bands)

        # Seleccionar indice deseado
        if index_type == "NDVI":
            composite_clipped = composite_indices.clip(bbox).select("NDVI")
        elif index_type == "GNDVI":
            composite_clipped = composite_indices.clip(bbox).select("GNDVI")
        elif index_type == "EVI":
            composite_clipped = composite_indices.clip(bbox).select("EVI")
        elif index_type == "NDMI":
            composite_clipped = composite_indices.clip(bbox).select("NDMI")
        elif index_type == "MSI":
            composite_clipped = composite_indices.clip(bbox).select("MSI")
        elif index_type == "BI":
            composite_clipped = composite_indices.clip(bbox).select("BI")
        elif index_type == "SAVI":
            composite_clipped = composite_indices.clip(bbox).select("SAVI")
        else:
            return jsonify({"error": "Invalid index type specified."}), 400

        # Seleccionar paleta según el índice
        if index_type in ["MSI", "NDMI"]:
            palette = [
                "#f7e7c3",  # beige claro (muy seco)
                "#d9b77c",  # marrón claro
                "#a2c8a3",  # verde suave (transición)
                "#51a4c5",  # azul claro
                "#0050ef",  # azul fuerte
                "#4b0082"   # púrpura (muy húmedo)
            ]
        elif index_type == "BI":
            palette = [
                "#ffffff",  # blanco - valor mínimo (muy oscuro/brillante)
                "#e6e6e6",
                "#cccccc",
                "#b3b3b3",
                "#999999",
                "#808080",
                "#666666",
                "#4d4d4d",
                "#333333",
                "#1a1a1a",
                "#000000"   # negro - valor máximo (muy brillante)
            ]
        else:
            palette = [
                'a50026', 'd73027', 'f46d43', 'fdae61', 'fee08b',
                'ffffbf', 'd9ef8b', 'a6d96a', '66bd63', '1a9850', '006837'
            ]

        # Calcular percentiles 2 y 98
        percentiles = composite_clipped.reduceRegion(
            reducer=ee.Reducer.percentile([2, 98]),
            geometry=bbox.geometry(),
            scale=scale_resolution,
            maxPixels=1e9
        ).getInfo()

        band_name = list(composite_clipped.bandNames().getInfo())[0]
        min_val = percentiles.get(f"{band_name}_p2")
        max_val = percentiles.get(f"{band_name}_p98")

        if min_val is None or max_val is None or min_val == max_val:
            min_val = 0.3
            max_val = 0.8

        visualization_parameters = {
            'min': min_val, 'max': max_val, 'palette': palette
        }

        map_id = composite_clipped.getMapId(visualization_parameters)
        bounds = bbox.geometry().getInfo()

        # Generar dataset de valores del índice dentro del AOI
        # Usamos sample para obtener una muestra representativa de los valores del índice
        try:
            # sample devuelve una FeatureCollection con los valores del índice
            samples_fc = composite_clipped.sample(
                region=bbox.geometry(),
                scale=scale_resolution,
                numPixels=500,  # puedes ajustar el tamaño de la muestra
                geometries=False
            )
            # Extraer los valores del índice
            samples = samples_fc.aggregate_array(band_name).getInfo()
        except Exception as e:
            print(f"Error al extraer dataset de valores: {e}")
            samples = []

        return jsonify({
            "success": True,
            "output": [
                map_id['tile_fetcher'].url_format,
                visualization_parameters,
                'BAND_' + index_type + '_Result',
                bounds,
                min_val,  # valor mínimo calculado
                max_val,  # valor máximo calculado
                samples   # dataset de valores del índice
            ]
        }), 200

    except Exception as e:
        print(str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/api/get_spectral_indexes', methods=['POST'])
def get_spectral_indexes():
    try:
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        
        aoi_file = request.files['aoiDataFiles']

        print(f"Fetching image from {start_date} to {end_date}")
        
        with tempfile.TemporaryDirectory() as temp_dir:
            aoi_filepath = os.path.join(temp_dir, secure_filename(aoi_file.filename))

        # Directorio base donde se encuentra el script

        # Ruta al archivo shapefile
            aoi_file.save(aoi_filepath)

            gdf = gpd.read_file(aoi_filepath)
            geojson_dict = gdf.__geo_interface__
            bbox = ee.FeatureCollection(geojson_dict['features'])   
                
        
            coleccion_sentinel = ee.ImageCollection("COPERNICUS/S2_HARMONIZED")\
                .filterDate(start_date, end_date)\
                .filterBounds(bbox)\
                .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', 10)
                
            mosaico = coleccion_sentinel.median().clip(bbox)
                
            mosaico_bands = mosaico.select(['B4', 'B3', 'B2', 'B11', 'B1', 'B12', 'B8', 'B5'])
            
            def calculate_ndvi(image):
                # Calcular NDVI usando la expresión
                ndvi = image.expression(
                    'float((NIR - RED) / (NIR + RED))', {
                    'NIR': image.select('B8'),
                    'RED': image.select('B4')
                }).rename('NDVI')  # Renombrar como 'NDVI'
                
                # Imprimir NDVI (opcional, principalmente para debugging o exploración)
                
                return ndvi
            
            def calculate_evi(image):
                return image.expression(
                    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
                        'NIR': image.select('B8'),
                        'RED': image.select('B4'),
                        'BLUE': image.select('B2')
                    }).rename('EVI')
                
            def calculate_gndvi(image):
                gndvi = image.expression(
                    '(NIR - GREEN) / (NIR + GREEN)', 
                    {
                        'NIR': image.select('B8'),  
                        'GREEN': image.select('B3')
                    }).rename('GNDVI')
                return gndvi
            
            def add_indices(image):
                indices = [
                    calculate_ndvi(image), calculate_evi(image), calculate_gndvi(image)
                ]
                return image.addBands(indices)


            composite_indices = add_indices(mosaico_bands)
            
            band = request.args.get('indexType')
            
            composite_clipped = []
            
            if band=="NDVI" :
                composite_clipped = composite_indices.clip(bbox).select("NDVI")
                
            elif band=="GNDVI":
                composite_clipped = composite_indices.clip(bbox).select("GNDVI")

                
            elif band=="EVI":
                composite_clipped = composite_indices.clip(bbox).select("EVI")
            

            palette = [
            'a50026', 'd73027', 'f46d43', 'fdae61', 'fee08b',
            'ffffbf', 'd9ef8b', 'a6d96a', '66bd63', '1a9850', '006837'
            ]
            # Calcular percentiles 2 y 98
            percentiles = composite_clipped.reduceRegion(
                reducer=ee.Reducer.percentile([2, 98]),
                geometry=bbox.geometry(),
                scale=30,
                maxPixels=1e9
            ).getInfo()
            
            band_name = list(composite_clipped.bandNames().getInfo())[0]
            min_val = percentiles.get(f"{band_name}_p2")
            max_val = percentiles.get(f"{band_name}_p98")

            if min_val is None or max_val is None or min_val == max_val:
                min_val = 0.3
                max_val = 0.8
            visualization_parameters = {
                'min': min_val, 'max': max_val, 'palette': palette
            }

            map_id = composite_clipped.getMapId(visualization_parameters)
            bounds = bbox.geometry().getInfo()

            return jsonify({"success": True, "output": map_id['tile_fetcher'].url_format}), 200

    except Exception as e:
        print(str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/api/spatiotemporal_analysis', methods=['POST'])  
def get_spatiotemporal_analysis():
    try:
        if 'aoiDataFiles' not in request.files:
            return jsonify({"error": "No file part"}), 400

        aoi_file = request.files['aoiDataFiles']

        if aoi_file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        with tempfile.TemporaryDirectory() as temp_dir:
            aoi_filepath = os.path.join(temp_dir, secure_filename(aoi_file.filename))

            aoi_file.save(aoi_filepath)

            # Suponiendo que el shapefile se extrae en el directorio temporal
                        
            gdf = gpd.read_file(aoi_filepath)
            geojson_dict = gdf.__geo_interface__
            aoi = ee.FeatureCollection(geojson_dict['features'])
            
            startdate = '2001-01-01'
            enddate = '2023-12-31'
            df_result=None

            var = request.form['varType']
            
            if var == "LST":
                #-----------------------------MODIS NPP AGB-----------------------------------#

                # Cargar las colecciones de imágenes MODIS NPP y GPP
                npp = ee.ImageCollection('MODIS/061/MOD17A3HGF')
                gpp = ee.ImageCollection("MODIS/006/MYD17A2H")

                # Filtrar las colecciones por fecha y límites, y seleccionar las bandas relevantes
                nppCollection = npp.filterDate(startdate, enddate).filterBounds(aoi).select("Npp")
                gppCollection = gpp.filterDate(startdate, enddate).filterBounds(aoi).select("Gpp")

                # Filtrar las colecciones para asegurarse de la presencia de las bandas específicas
                nppfilteredCollection = nppCollection.filter(ee.Filter.listContains('system:band_names', 'Npp'))
                gppfilteredCollection = gppCollection.filter(ee.Filter.listContains('system:band_names', 'Gpp'))

                # Función para calcular NPP8
                def myNpp(myimg):
                    d = ee.Date(myimg.get('system:time_start'))
                    y = d.get('year').toInt()

                    GPPy = gppfilteredCollection.filter(ee.Filter.calendarRange(y, y, 'year')).sum()
                    NPPy = nppfilteredCollection.filter(ee.Filter.calendarRange(y, y, 'year')).mean()

                    npp8 = myimg.expression('(GGP8 / GPPy) * NPPy', {
                        'GGP8': myimg,
                        'GPPy': GPPy,
                        'NPPy': NPPy
                    }).multiply(0.0001)

                    return npp8.copyProperties(myimg, ['system:time_start'])

                # Aplicar la función a la colección de GPP
                npp8Collection = gppCollection.map(myNpp)


                #-------------------------------LST MODIS-----------------------------------#

                # Cargar la colección MODIS LST
                lst = ee.ImageCollection("MODIS/061/MOD11A2").select('LST_Day_1km')

                # Filtrar la colección LST por fecha y límites
                lstCollection = lst.filterDate(startdate, enddate).filterBounds(aoi).select("LST_Day_1km")

                # Función para calcular LST mensual
                def myLst(myimg):
                    d = ee.Date(myimg.get('system:time_start'))
                    y = d.get('year').toInt()
                    m = d.get('month').toInt()

                    LSTm = lstCollection.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month')).mean()

                    return LSTm.copyProperties(myimg, ['system:time_start'])

                # Aplicar la función a la colección de LST para obtener LST mensual
                monthlyLSTCollection = lstCollection.map(myLst)
                
                # Filtrar las colecciones para valores válidos y crear gráficos
                filteredFeaturesLST = monthlyLSTCollection.filterDate('2003-01-01', '2021-12-31').map(
                    lambda image: ee.Feature(None, {
                        'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                        'LST': image.reduceRegion(ee.Reducer.firstNonNull(), aoi, 30).get('LST_Day_1km')
                    })
                ).filter(ee.Filter.notNull(['LST']))
                
                features_list = filteredFeaturesLST.getInfo()['features']
                data = [feature['properties'] for feature in features_list]

                # Crear un DataFrame de pandas
                df = pd.DataFrame(data)

                # Convertir la columna de fecha a un tipo datetime
                df['Date'] = pd.to_datetime(df['Date'])

                # Filtrar valores nulos
                df = df.dropna()
                
                df_pivot = df.pivot_table(index='Date', values='LST', aggfunc='mean').reset_index()
                df_pivot = df_pivot.rename(columns={'LST': 'Value', 'Date': 'Date'})  # Renombrar columnas
                df_json_str = df_pivot.to_json(orient='records')
                df_json = json.loads(df_json_str)
                df_result=df_json
                
                
            elif var =="PRECIPT":
                # ----------------------------------- CHIRPS (Precipitación) -----------------------------------

                # Cargar la colección CHIRPS de precipitación diaria
                chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").select('precipitation')

                # Filtrar la colección por fecha y límites
                chirpsCollection = chirps.filterDate(startdate, enddate).filterBounds(aoi)

                # Función para agrupar y calcular la precipitación mensual
                def calculateMonthlyPrecipitation(year, month):
                    monthly_precipitation = chirpsCollection.filter(ee.Filter.calendarRange(year, year, 'year')) \
                                                            .filter(ee.Filter.calendarRange(month, month, 'month')) \
                                                            .mean()
                    return monthly_precipitation.set('year', year).set('month', month)

                # Generar una lista de años y meses
                years = ee.List.sequence(2001, 2021)
                months = ee.List.sequence(1, 12)

                # Aplicar la función para calcular precipitación mensual
                monthlyPrecipitationCollection = ee.ImageCollection(
                    years.map(lambda y: months.map(lambda m: calculateMonthlyPrecipitation(y, m))).flatten()
                )

                # Reducir la colección a valores medios dentro del AOI
                def reduceToFeature(image):
                    precipitation = image.reduceRegion(
                        reducer=ee.Reducer.mean(), geometry=aoi, scale=5000
                    ).get('precipitation')
                    return ee.Feature(None, {
                        'Date': ee.Date.fromYMD(image.get('year'), image.get('month'), 1).format('YYYY-MM'),
                        'Precipitation': precipitation
                    })

                # Reducir y convertir en un DataFrame
                filteredFeaturesPrecipitation = monthlyPrecipitationCollection.map(reduceToFeature).filter(ee.Filter.notNull(['Precipitation']))

                features_list_Precipitation = filteredFeaturesPrecipitation.getInfo()['features']
                data_Precipitation = [feature['properties'] for feature in features_list_Precipitation]
                df_Precipitation = pd.DataFrame(data_Precipitation)
                df_Precipitation['Date'] = pd.to_datetime(df_Precipitation['Date'])
                df_Precipitation = df_Precipitation.dropna()
                df_pivot = df_Precipitation.pivot_table(index='Date', values='Precipitation', aggfunc='mean').reset_index()
                df_pivot = df_pivot.rename(columns={'Precipitation': 'Value', 'Date': 'Date'})  # Renombrar columnas
                df_json_str = df_pivot.to_json(orient='records')
                df_json = json.loads(df_json_str)
                df_result=df_json
                
            elif var=="EVI":
                # Cargar la colección MODIS EVI
                evi = ee.ImageCollection("MODIS/061/MOD13A1").select('EVI')

                # Filtrar la colección de EVI por fecha y límites
                eviCollection = evi.filterDate(startdate, enddate).filterBounds(aoi)

                # Función para calcular la EVI media mensual
                def calculateMonthlyEVI(image):
                    return image.set('system:time_start', image.date().format('YYYY-MM')).set('EVI', image.reduceRegion(ee.Reducer.mean(), aoi, 30).get('EVI'))

                # Aplicar la función a la colección EVI
                monthlyEVICollection = eviCollection.map(calculateMonthlyEVI)

                # Filtrar y convertir en un DataFrame
                filteredFeaturesEVI = monthlyEVICollection.map(
                    lambda image: ee.Feature(None, {
                        'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                        'EVI': image.get('EVI')
                    })
                ).filter(ee.Filter.notNull(['EVI']))

                features_list_EVI = filteredFeaturesEVI.getInfo()['features']
                data_EVI = [feature['properties'] for feature in features_list_EVI]
                df_EVI = pd.DataFrame(data_EVI)
                df_EVI['Date'] = pd.to_datetime(df_EVI['Date'])
                df_EVI = df_EVI.dropna()
                df_pivot = df_EVI.pivot_table(index='Date', values='EVI', aggfunc='mean').reset_index()
                df_pivot = df_pivot.rename(columns={'EVI': 'Value', 'Date': 'Date'})  # Renombrar columnas
                df_json_str = df_pivot.to_json(orient='records')
                df_json = json.loads(df_json_str)
                df_result=df_json
                
            elif var=="NDVI":
                # Cargar la colección MODIS NDVI
                ndvi = ee.ImageCollection("MODIS/061/MOD13A1").select('NDVI')

                # Filtrar la colección de NDVI por fecha y límites
                ndviCollection = ndvi.filterDate(startdate, enddate).filterBounds(aoi)

                # Función para calcular la NDVI media mensual
                def calculateMonthlyNDVI(image):
                    return image.set('system:time_start', image.date().format('YYYY-MM')).set('NDVI', image.reduceRegion(ee.Reducer.mean(), aoi, 30).get('NDVI'))

                # Aplicar la función a la colección NDVI
                monthlyNDVICollection = ndviCollection.map(calculateMonthlyNDVI)

                # Filtrar y convertir en un DataFrame
                filteredFeaturesNDVI = monthlyNDVICollection.map(
                    lambda image: ee.Feature(None, {
                        'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                        'NDVI': image.get('NDVI')
                    })
                ).filter(ee.Filter.notNull(['NDVI']))

                features_list_NDVI = filteredFeaturesNDVI.getInfo()['features']
                data_NDVI = [feature['properties'] for feature in features_list_NDVI]
                df_NDVI = pd.DataFrame(data_NDVI)
                df_NDVI['Date'] = pd.to_datetime(df_NDVI['Date'])
                df_NDVI = df_NDVI.dropna()
                df_pivot = df_NDVI.pivot_table(index='Date', values='NDVI', aggfunc='mean').reset_index()
                df_pivot = df_pivot.rename(columns={'NDVI': 'Value', 'Date': 'Date'})  # Renombrar columnas
                df_json_str = df_pivot.to_json(orient='records')
                df_json = json.loads(df_json_str)
                df_result=df_json

            elif var=="TSAVI":
                # Cargar la colección Sentinel-2
                s = 1.0  # Ejemplo de valor, ajusta según tu región
                a = 0.0  # Ejemplo de valor, ajusta según tu región
                X = 0.08  # Parámetro de ajuste

                sentinel2 = ee.ImageCollection("COPERNICUS/S2_HARMONIZED").filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)).select(['B4', 'B8'])

                # Definir el período de análisis
                startdate_s2 = '2015-06-23'  # Fecha de inicio para Sentinel-2
                enddate_s2 = '2021-12-31'

                # Filtrar la colección Sentinel-2 por fecha y límites
                sentinel2Collection = sentinel2.filterDate(startdate_s2, enddate_s2).filterBounds(aoi)

                # Función para calcular TSAVI
                def calculateTSAVI(image):
                    tsavi = image.expression(
                        '((s * (NIR - s * Red - a)) / (s * NIR + Red - s * a + X))', {
                            'NIR': image.select('B8'),
                            'Red': image.select('B4'),
                            's': s,
                            'a': a,
                            'X': X
                        }).rename('TSAVI')
                    return image.addBands(tsavi).set('system:time_start', image.date().format('YYYY-MM'))

                # Aplicar la función a la colección TSAVI
                tsaviCollection = sentinel2Collection.map(calculateTSAVI)

                # Filtrar y convertir en un DataFrame
                filteredFeaturesTSAVI = tsaviCollection.map(
                    lambda image: ee.Feature(None, {
                        'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                        'TSAVI': image.select('TSAVI').reduceRegion(ee.Reducer.mean(), aoi, 30).get('TSAVI')
                    })
                ).filter(ee.Filter.notNull(['TSAVI']))

                features_list_TSAVI = filteredFeaturesTSAVI.getInfo()['features']
                data_TSAVI = [feature['properties'] for feature in features_list_TSAVI]
                df_TSAVI = pd.DataFrame(data_TSAVI)
                df_TSAVI['Date'] = pd.to_datetime(df_TSAVI['Date'])
                df_TSAVI = df_TSAVI.dropna()
                df_pivot = df_TSAVI.pivot_table(index='Date', values='TSAVI', aggfunc='mean').reset_index()
                df_pivot = df_pivot.rename(columns={'TSAVI': 'Value', 'Date': 'Date'})  # Renombrar columnas
                df_json_str = df_pivot.to_json(orient='records')
                df_json = json.loads(df_json_str)
                df_result = df_json
                
            elif var=="MSI":
                # Cargar la colección Sentinel-2 para MSI
                sentinel2_msi = ee.ImageCollection("COPERNICUS/S2_HARMONIZED").filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)).select(['B8', 'B11'])

                # Filtrar la colección Sentinel-2 por fecha y límites para MSI
                sentinel2Collection_msi = sentinel2_msi.filterDate(startdate_s2, enddate_s2).filterBounds(aoi)

                # Función para calcular MSI
                def calculateMSI(image):
                    msi = image.expression(
                        'SWIR / NIR', {
                            'SWIR': image.select('B11'),
                            'NIR': image.select('B8')
                        }).rename('MSI')
                    return image.addBands(msi).set('system:time_start', image.date().format('YYYY-MM'))

                # Aplicar la función a la colección MSI
                msiCollection = sentinel2Collection_msi.map(calculateMSI)

                # Filtrar y convertir en un DataFrame
                filteredFeaturesMSI = msiCollection.map(
                    lambda image: ee.Feature(None, {
                        'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                        'MSI': image.select('MSI').reduceRegion(ee.Reducer.mean(), aoi, 30).get('MSI')
                    })
                ).filter(ee.Filter.notNull(['MSI']))

                features_list_MSI = filteredFeaturesMSI.getInfo()['features']
                data_MSI = [feature['properties'] for feature in features_list_MSI]
                df_MSI = pd.DataFrame(data_MSI)
                df_MSI['Date'] = pd.to_datetime(df_MSI['Date'])
                df_MSI = df_MSI.dropna()
                df_pivot = df_MSI.pivot_table(index='Date', values='MSI', aggfunc='mean').reset_index()
                df_pivot = df_pivot.rename(columns={'MSI': 'Value', 'Date': 'Date'})  # Renombrar columnas
                df_json_str = df_pivot.to_json(orient='records')
                df_json = json.loads(df_json_str)
                df_result = df_json
                      
            elif var=="ABVGRND_CARBON":
                                # Cargar las colecciones de imágenes MODIS NPP y GPP
                npp = ee.ImageCollection('MODIS/061/MOD17A3HGF').select('Npp')
                gpp = ee.ImageCollection("MODIS/006/MYD17A2H").select('Gpp')

                # Filtrar las colecciones por fecha y límites
                nppCollection = npp.filterDate(startdate, enddate).filterBounds(aoi)
                gppCollection = gpp.filterDate(startdate, enddate).filterBounds(aoi)

                # Función para calcular NPP8 (Carbono sobre el suelo)
                def calculateNpp8(image):
                    # Extraer la fecha de la imagen
                    date = ee.Date(image.get('system:time_start'))
                    year = date.get('year')

                    # Filtrar las colecciones GPP y NPP para el año específico
                    GPPy = gppCollection.filter(ee.Filter.calendarRange(year, year, 'year')).sum()
                    NPPy = nppCollection.filter(ee.Filter.calendarRange(year, year, 'year')).mean()

                    # Calcular npp8 usando una expresión
                    npp8 = GPPy.expression(
                        '(GGP8 / GPPy) * NPPy',
                        {
                            'GGP8': image.select('Gpp'),
                            'GPPy': GPPy.select('Gpp'),
                            'NPPy': NPPy.select('Npp')
                        }
                    ).multiply(0.0001)

                    # Añadir propiedades para mantener la consistencia
                    return npp8.set({
                        'system:time_start': image.get('system:time_start'),
                        'year': year
                    })

                # Aplicar la función sobre la colección GPP
                npp8Collection = gppCollection.map(calculateNpp8)

                # Reducir la colección a valores medios dentro del AOI
                # Reducir la colección a valores medios dentro del AOI
                def reduceToFeature(image):
                    # Reducir la región para obtener el valor medio
                    carbon_dict = image.reduceRegion(
                        reducer=ee.Reducer.mean(), geometry=aoi, scale=5000
                    )

                    # Verificar si 'Gpp' está presente en el resultado
                    carbon = ee.Algorithms.If(
                        carbon_dict.contains('Gpp'),
                        carbon_dict.get('Gpp'),
                        ee.Algorithms.If(
                            carbon_dict.contains('Npp'),
                            carbon_dict.get('Npp'),
                            None  # Si ninguna de las claves está presente, devolver None
                        )
                    )

                    # Devolver la imagen con la propiedad 'Carbon'
                    return image.set('Carbon', carbon)

                # Aplicar la reducción y filtrar valores nulos en el servidor
                npp8CollectionWithCarbon = npp8Collection.map(reduceToFeature).filter(ee.Filter.notNull(['Carbon']))

                # Traer los datos al lado del cliente
                features_list_Carbon = npp8CollectionWithCarbon.getInfo()['features']
                data_Carbon = [feature['properties'] for feature in features_list_Carbon]

                # Crear el DataFrame
                df_Carbon = pd.DataFrame(data_Carbon)

                # Verifica si 'Date' está en las columnas antes de intentar la conversión
                if 'system:time_start' in df_Carbon.columns:
                    df_Carbon['Date'] = pd.to_datetime(df_Carbon['system:time_start'], unit='ms')
                else:
                    print("Error: La columna 'system:time_start' no está presente en el DataFrame.")

                # Filtrar filas con valores nulos
                df_Carbon = df_Carbon.dropna()
                df_pivot = df_Carbon.pivot_table(index='Date', values='Carbon', aggfunc='mean').reset_index()
                df_pivot = df_pivot.rename(columns={'Carbon': 'Value', 'Date': 'Date'})  # Renombrar columnas
                df_json_str = df_pivot.to_json(orient='records')
                df_json = json.loads(df_json_str)
                df_result = df_json
                
            elif var=="TREE_COVER":
                
                # Cargar la colección MODIS Percent Tree Cover
                cover = ee.ImageCollection('MODIS/006/MOD44B').select('Percent_Tree_Cover')

                # Filtrar la colección Percent Tree Cover por fecha y límites
                coverCollection = cover.filterDate(startdate, enddate).filterBounds(aoi)

                # Función para calcular la cobertura arbórea media mensual
                def calculateMonthlyTreeCover(year, month):
                    monthly_cover = coverCollection.filter(ee.Filter.calendarRange(year, year, 'year')) \
                                                .filter(ee.Filter.calendarRange(month, month, 'month')) \
                                                .mean()
                    return monthly_cover.set('year', year).set('month', month)

                # Generar una lista de años y meses
                years = ee.List.sequence(2001, 2023)
                months = ee.List.sequence(1, 12)

                # Aplicar la función para calcular cobertura arbórea mensual
                def map_over_months(year):
                    return months.map(lambda month: calculateMonthlyTreeCover(year, month))

                # Mapear sobre los años y aplanar la colección
                monthlyCoverCollection = ee.ImageCollection(years.map(map_over_months).flatten())

                # Reducir la colección a valores medios dentro del AOI
                def reduceToFeature(image):
                    # Verificar si la clave 'Percent_Tree_Cover' está presente en los datos
                    dict_keys = image.reduceRegion(
                        reducer=ee.Reducer.mean(), geometry=aoi, scale=5000
                    ).keys()

                    # Solo continuar si 'Percent_Tree_Cover' está presente
                    def createFeature(valid):
                        return ee.Algorithms.If(
                            valid,
                            ee.Feature(None, {
                                'Date': ee.Date.fromYMD(image.get('year'), image.get('month'), 1).format('YYYY-MM'),
                                'Percent_Tree_Cover': image.reduceRegion(
                                    reducer=ee.Reducer.mean(), geometry=aoi, scale=5000
                                ).get('Percent_Tree_Cover')
                            }),
                            ee.Feature(None, {})
                        )

                    return ee.Feature(createFeature(dict_keys.contains('Percent_Tree_Cover')))

                # Filtrar y convertir en un DataFrame
                filteredFeaturesCover = monthlyCoverCollection.map(reduceToFeature).filter(ee.Filter.notNull(['Percent_Tree_Cover']))

                features_list_Cover = filteredFeaturesCover.getInfo()['features']
                data_Cover = [feature['properties'] for feature in features_list_Cover]
                df_Cover = pd.DataFrame(data_Cover)
                df_Cover['Date'] = pd.to_datetime(df_Cover['Date'])
                df_Cover = df_Cover.dropna()
                df_pivot = df_Cover.pivot_table(index='Date', values='Percent_Tree_Cover', aggfunc='mean').reset_index()
                df_pivot = df_pivot.rename(columns={'Percent_Tree_Cover': 'Value', 'Date': 'Date'})  # Renombrar columnas
                df_json_str = df_pivot.to_json(orient='records')
                df_json = json.loads(df_json_str)
                df_result=df_json
                
            print(df_result)
            
            return jsonify({
                "success": True,
                "output": df_result[0]
            }), 200

    except Exception as e:
        print(str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/api/spatiotemporal_analysis_v2', methods=['POST'])
def spatiotemporal_analysis_v2():
    """
    Endpoint para análisis espaciotemporal: recibe fechas, indices y shapefile zip,
    ejecuta el análisis GEE para los índices seleccionados y devuelve los resultados.
    """
    try:
        # Validar y obtener parámetros
        indices = request.form.getlist('indices[]') or request.form.getlist('indices')
        startdate = request.form.get('startDate')
        enddate = request.form.get('endDate')
        if 'aoiDataFiles' not in request.files:
            return jsonify({"error": "No se subió el archivo ZIP"}), 400
        aoi_file = request.files['aoiDataFiles']
        if not indices or not startdate or not enddate:
            return jsonify({"error": "Faltan parámetros obligatorios"}), 400

        # Guardar y leer el shapefile zip
        with tempfile.TemporaryDirectory() as temp_dir:
            zip_path = os.path.join(temp_dir, secure_filename(aoi_file.filename))
            aoi_file.save(zip_path)
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
            # Buscar el .shp extraído
            shp_files = [f for f in os.listdir(temp_dir) if f.endswith('.shp')]
            if not shp_files:
                return jsonify({"error": "No se encontró el .shp en el ZIP"}), 400
            shp_path = os.path.join(temp_dir, shp_files[0])
            gdf = gpd.read_file(shp_path)
            geojson_dict = gdf.__geo_interface__
            aoi = ee.FeatureCollection(geojson_dict['features'])

            # Fechas
            start = startdate
            end = enddate

            results = {}
            # --- EVI ---
            if 'EVI' in indices:
                evi = ee.ImageCollection("MODIS/061/MOD13A1").select('EVI')
                eviCollection = evi.filterDate(start, end).filterBounds(aoi).select("EVI")
                def calculateMonthlyEVI(year, month):
                    monthly = eviCollection.filter(ee.Filter.calendarRange(year, year, 'year'))\
                        .filter(ee.Filter.calendarRange(month, month, 'month'))
                    count = monthly.size()
                    monthlyEVI = monthly.mean()
                    return ee.Algorithms.If(
                        count.gt(0),
                        monthlyEVI.set('year', year).set('month', month).set('system:time_start', ee.Date.fromYMD(year, month, 1)),
                        None
                    )
                years = ee.List.sequence(int(start[:4]), int(end[:4]))
                months = ee.List.sequence(1, 12)
                monthlyEVIList = years.map(lambda year: months.map(lambda month: calculateMonthlyEVI(year, month))).flatten()
                monthlyEVICollection = ee.ImageCollection.fromImages(monthlyEVIList).filter(ee.Filter.notNull(['system:time_start']))
                def safeEviFeature(image):
                    value = image.reduceRegion(ee.Reducer.mean(), aoi, 30).get('EVI')
                    return ee.Algorithms.If(
                        ee.Algorithms.IsEqual(value, None),
                        None,
                        ee.Feature(None, {
                            'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                            'EVI': value
                        })
                    )
                filteredFeaturesEvi = monthlyEVICollection.map(safeEviFeature).filter(ee.Filter.notNull(['EVI']))
                features = ee.FeatureCollection(filteredFeaturesEvi).getInfo()['features']
                data = [f['properties'] for f in features]
                results['EVI'] = data
            # --- Precipitación (CHIRPS) ---
            if 'Precipitation' in indices:
                chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").select('precipitation')
                chirpsCollection = chirps.filterDate(start, end).filterBounds(aoi)
                def calculateMonthlyPrecipitation(year, month):
                    monthly = chirpsCollection.filter(ee.Filter.calendarRange(year, year, 'year'))\
                        .filter(ee.Filter.calendarRange(month, month, 'month'))
                    count = monthly.size()
                    monthlyPrecipitation = monthly.mean()
                    return ee.Algorithms.If(
                        count.gt(0),
                        monthlyPrecipitation.set('year', year).set('month', month).set('system:time_start', ee.Date.fromYMD(year, month, 1)),
                        None
                    )
                years = ee.List.sequence(2001, 2021)
                months = ee.List.sequence(1, 12)
                monthlyPrecipList = years.map(lambda year: months.map(lambda m: calculateMonthlyPrecipitation(year, m))).flatten()
                monthlyPrecipCollection = ee.ImageCollection.fromImages(monthlyPrecipList).filter(ee.Filter.notNull(['system:time_start']))
                def safePrecipFeature(image):
                    value = image.reduceRegion(ee.Reducer.mean(), aoi, 30).get('precipitation')
                    return ee.Algorithms.If(
                        ee.Algorithms.IsEqual(value, None),
                        None,
                        ee.Feature(None, {
                            'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                            'Precipitation': value
                        })
                    )
                filteredFeaturesPrecip = monthlyPrecipCollection.map(safePrecipFeature).filter(ee.Filter.notNull(['Precipitation']))
                features = ee.FeatureCollection(filteredFeaturesPrecip).getInfo()['features']
                data = [f['properties'] for f in features]
                results['Precipitation'] = data
            # --- LST ---
            if 'LST' in indices:
                lst = ee.ImageCollection("MODIS/061/MOD11A2").select('LST_Day_1km')
                lstCollection = lst.filterDate(start, end).filterBounds(aoi).select("LST_Day_1km")
                def myLst(myimg):
                    d = ee.Date(myimg.get('system:time_start'))
                    y = d.get('year').toInt()
                    m = d.get('month').toInt()

                    LSTm = lstCollection.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month')).mean()

                    return LSTm.copyProperties(myimg, ['system:time_start'])
                monthlyLSTCollection = ee.ImageCollection(lstCollection.map(myLst))
                filteredFeaturesLST = monthlyLSTCollection.filterDate(start, end).map(lambda image: ee.Feature(None, {
                    'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                    'LST': image.reduceRegion(ee.Reducer.firstNonNull(), aoi, 30).get('LST_Day_1km')
                })).filter(ee.Filter.notNull(['LST']))
                features = filteredFeaturesLST.getInfo()['features']
                data = [ f['properties'] for f in features]
                results['LST'] = data

            # --- Percent Tree Cover ---
            if 'Percent_Tree_Cover' in indices:
                cover = ee.ImageCollection('MODIS/006/MOD44B').select('Percent_Tree_Cover')
                coverCollection = cover.filterDate(start, end).filterBounds(aoi).select("Percent_Tree_Cover")
                def myCover(myimg):
                    d = ee.Date(myimg.get('system:time_start'))
                    y = d.get('year').toInt()
                    m = d.get('month').toInt()
                    Coverm = coverCollection.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month')).mean()
                    return Coverm.copyProperties(myimg, ['system:time_start'])
                monthlyCoverCollection = ee.ImageCollection(coverCollection.map(myCover))
                filteredFeaturesCover = monthlyCoverCollection.filterDate(start, end).map(lambda image: ee.Feature(None, {
                    'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                    'Percent_Tree_Cover': image.reduceRegion(ee.Reducer.firstNonNull(), aoi, 30).get('Percent_Tree_Cover')
                })).filter(ee.Filter.notNull(['Percent_Tree_Cover']))
                features = filteredFeaturesCover.getInfo()['features']
                data = [f['properties'] for f in features]
                results['Percent_Tree_Cover'] = data
            # --- ET (Evapotranspiración MOD16A2GF) ---
            if 'ET' in indices:
                et_coll = (ee.ImageCollection('MODIS/061/MOD16A2GF')
                             .filterDate(start, end)
                             .filterBounds(aoi)
                             .select('ET'))
                def monthly_et(y, m):
                    subset = et_coll.filter(ee.Filter.calendarRange(y, y, 'year'))\
                                    .filter(ee.Filter.calendarRange(m, m, 'month'))
                    return ee.Algorithms.If(subset.size().gt(0),
                        subset.sum()
                              .multiply(0.1)
                              .set({'system:time_start': ee.Date.fromYMD(y, m, 1)}),
                        None)
                yrs = ee.List.sequence(int(start[:4]), int(end[:4]))
                mths = ee.List.sequence(1, 12)
                et_imgs = ee.ImageCollection.fromImages(
                               yrs.map(lambda y: mths.map(lambda m: monthly_et(y, m))).flatten()
                           ).filter(ee.Filter.notNull(['system:time_start']))
                feats = et_imgs.map(lambda img: ee.Feature(None, {
                            'Date': ee.Date(img.get('system:time_start')).format('YYYY-MM'),
                            'ET': img.reduceRegion(ee.Reducer.mean(), aoi, 500).get('ET')
                        })).filter(ee.Filter.notNull(['ET']))
                results['ET'] = [f['properties'] for f in feats.getInfo()['features']]
            # --- LAI (Leaf Area Index, Sentinel-2 NDVI) ---
            if 'LAI' in indices:
                def s2_mask_clouds(im):
                    scl = im.select('SCL')
                    mask = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10))
                    return im.updateMask(mask)
                s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                        .filterDate(start, end).filterBounds(aoi)
                        .map(s2_mask_clouds)
                        .map(lambda img: img.addBands(
                            img.normalizedDifference(['B8', 'B4']).rename('NDVI'))))
                def monthly_lai(y, m):
                    subset = s2.filter(ee.Filter.calendarRange(y, y, 'year'))\
                               .filter(ee.Filter.calendarRange(m, m, 'month'))
                    return ee.Algorithms.If(subset.size().gt(0),
                        subset.mean()
                              .expression('3.618 * NDVI - 0.118', {'NDVI': subset.mean().select('NDVI')})
                              .rename('LAI')
                              .set({'system:time_start': ee.Date.fromYMD(y, m, 1)}),
                        None)
                lai_imgs = ee.ImageCollection.fromImages(
                              yrs.map(lambda y: mths.map(lambda m: monthly_lai(y, m))).flatten()
                           ).filter(ee.Filter.notNull(['system:time_start']))
                feats = lai_imgs.map(lambda img: ee.Feature(None, {
                            'Date': ee.Date(img.get('system:time_start')).format('YYYY-MM'),
                            'LAI': img.reduceRegion(ee.Reducer.mean(), aoi, 10).get('LAI')
                        })).filter(ee.Filter.notNull(['LAI']))
                results['LAI'] = [f['properties'] for f in feats.getInfo()['features']]
            # --- Solar Irradiance (ERA5-Land) ---
            if 'Solar_Irradiance' in indices:
                ssr = (ee.ImageCollection('ECMWF/ERA5_LAND/DAILY')
                         .filterDate(start, end).filterBounds(aoi)
                         .select('surface_solar_radiation_downwards'))
                def monthly_ssr(y, m):
                    subset = ssr.filter(ee.Filter.calendarRange(y, y, 'year'))\
                                .filter(ee.Filter.calendarRange(m, m, 'month'))
                    return ee.Algorithms.If(subset.size().gt(0),
                        subset.sum()
                              .multiply(1e-6)
                              .rename('SSR')
                              .set({'system:time_start': ee.Date.fromYMD(y, m, 1)}),
                        None)
                ssr_imgs = ee.ImageCollection.fromImages(
                               yrs.map(lambda y: mths.map(lambda m: monthly_ssr(y, m))).flatten()
                           ).filter(ee.Filter.notNull(['system:time_start']))
                feats = ssr_imgs.map(lambda img: ee.Feature(None, {
                            'Date': ee.Date(img.get('system:time_start')).format('YYYY-MM'),
                            'Solar_Irradiance': img.reduceRegion(ee.Reducer.mean(), aoi, 10000).get('SSR')
                        })).filter(ee.Filter.notNull(['Solar_Irradiance']))
                results['Solar_Irradiance'] = [f['properties'] for f in feats.getInfo()['features']]
            # --- NPP8 (balance de Carbono, MODIS) ---
            if 'NPP8' in indices:
                gpp = (ee.ImageCollection('MODIS/061/MOD17A2H')
                         .filterDate(start, end).filterBounds(aoi)
                         .select('Gpp'))
                npp = (ee.ImageCollection('MODIS/061/MOD17A3HGF')
                         .filterDate(start, end).filterBounds(aoi)
                         .select('Npp'))
                def npp8(img):
                    y = ee.Date(img.get('system:time_start')).get('year').toInt()
                    gpp_y = gpp.filter(ee.Filter.calendarRange(y, y, 'year')).sum()
                    npp_y = npp.filter(ee.Filter.calendarRange(y, y, 'year')).mean()
                    npp8  = img.expression('(gpp8 / gppY) * nppY', {
                                'gpp8': img,
                                'gppY': gpp_y,
                                'nppY': npp_y
                            }).multiply(0.0001).rename('NPP8')
                    return npp8.copyProperties(img, ['system:time_start'])
                npp8_coll = ee.ImageCollection(gpp.map(npp8))
                feats = npp8_coll.map(lambda img: ee.Feature(None, {
                            'Date': ee.Date(img.get('system:time_start')).format('YYYY-MM-dd'),
                            'NPP8': img.reduceRegion(ee.Reducer.mean(), aoi, 500).get('NPP8')
                        })).filter(ee.Filter.notNull(['NPP8']))
                results['NPP8'] = [f['properties'] for f in feats.getInfo()['features']]
            return jsonify({"success": True, "results": results, "geojson": geojson_dict}), 200
    except Exception as e:
        print(str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/get_spatiotemporal', methods=['POST'])
def get_spatiotemporal():
    try:
        import tempfile, os, zipfile, geopandas as gpd, json
        indices = request.form.getlist('indices[]') or request.form.getlist('indices')
        startdate = request.form.get('startDate')
        enddate = request.form.get('endDate')
        aoiGeoJson = request.form.get('aoiGeoJson')
        aoi_file = request.files.get('aoiDataFiles', None)

        if not indices or not startdate or not enddate:
            return jsonify({"error": "Faltan parámetros obligatorios"}), 400

        # --- NUEVO: Si hay aoiGeoJson, usarlo ---
        if aoiGeoJson:
            geojson = json.loads(aoiGeoJson)
            aoi = ee.FeatureCollection([geojson])
        elif aoi_file:
            with tempfile.TemporaryDirectory() as temp_dir:
                zip_path = os.path.join(temp_dir, secure_filename(aoi_file.filename))
                aoi_file.save(zip_path)
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
                # Buscar el .shp extraído
                shp_files = [f for f in os.listdir(temp_dir) if f.endswith('.shp')]
                if not shp_files:
                    return jsonify({"error": "No se encontró el .shp en el ZIP"}), 400
                shp_path = os.path.join(temp_dir, shp_files[0])
                gdf = gpd.read_file(shp_path)
                geojson_dict = gdf.__geo_interface__
                aoi = ee.FeatureCollection(geojson_dict['features'])
        else:
            return jsonify({"error": "Debes subir un archivo ZIP o seleccionar una parcela guardada"}), 400

        start = startdate
        end = enddate
        idx = indices[0] if indices else 'EVI'

        # --- EVI ---
        if idx == 'EVI':
            evi = ee.ImageCollection("MODIS/061/MOD13A1").select('EVI')
            eviCollection = evi.filterDate(start, end).filterBounds(aoi).select("EVI")
            def calculateMonthlyEVI(year, month):
                monthly = eviCollection.filter(ee.Filter.calendarRange(year, year, 'year'))\
                    .filter(ee.Filter.calendarRange(month, month, 'month'))
                count = monthly.size()
                monthlyEVI = monthly.mean()
                return ee.Algorithms.If(
                    count.gt(0),
                    monthlyEVI.set('year', year).set('month', month).set('system:time_start', ee.Date.fromYMD(year, month, 1)),
                    None
                )
            years = ee.List.sequence(int(start[:4]), int(end[:4]))
            months = ee.List.sequence(1, 12)
            monthlyEVIList = years.map(lambda year: months.map(lambda month: calculateMonthlyEVI(year, month))).flatten()
            monthlyEVICollection = ee.ImageCollection.fromImages(monthlyEVIList).filter(ee.Filter.notNull(['system:time_start']))
            def safeEviFeature(image):
                value = image.reduceRegion(ee.Reducer.mean(), aoi, 30).get('EVI')
                return ee.Algorithms.If(
                    ee.Algorithms.IsEqual(value, None),
                    None,
                    ee.Feature(None, {
                        'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                        'EVI': value
                    })
                )
            filteredFeaturesEvi = monthlyEVICollection.map(safeEviFeature).filter(ee.Filter.notNull(['EVI']))
            features = ee.FeatureCollection(filteredFeaturesEvi).getInfo()['features']
            data = [f['properties'] for f in features]
            map_url = 'spatiotemporal_evi_url'
            layer_id = 'spatiotemporal_evi_layer'
            min_val = min([d['EVI'] for d in data if d['EVI'] is not None]) if data else 0
            max_val = max([d['EVI'] for d in data if d['EVI'] is not None]) if data else 1
            output = [map_url, None, layer_id, geojson if 'geojson' in locals() else None, min_val, max_val, data]
        # --- Precipitación (CHIRPS) ---
        elif idx == 'Precipitation':
            chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").select('precipitation')
            chirpsCollection = chirps.filterDate(start, end).filterBounds(aoi)
            def calculateMonthlyPrecipitation(year, month):
                monthly = chirpsCollection.filter(ee.Filter.calendarRange(year, year, 'year'))\
                    .filter(ee.Filter.calendarRange(month, month, 'month'))
                count = monthly.size()
                monthlyPrecipitation = monthly.mean()
                return ee.Algorithms.If(
                    count.gt(0),
                    monthlyPrecipitation.set('year', year).set('month', month).set('system:time_start', ee.Date.fromYMD(year, month, 1)),
                    None
                )
            years = ee.List.sequence(2001, 2021)
            months = ee.List.sequence(1, 12)
            monthlyPrecipList = years.map(lambda year: months.map(lambda m: calculateMonthlyPrecipitation(year, m))).flatten()
            monthlyPrecipCollection = ee.ImageCollection.fromImages(monthlyPrecipList).filter(ee.Filter.notNull(['system:time_start']))
            def safePrecipFeature(image):
                value = image.reduceRegion(ee.Reducer.mean(), aoi, 30).get('precipitation')
                return ee.Algorithms.If(
                    ee.Algorithms.IsEqual(value, None),
                    None,
                    ee.Feature(None, {
                        'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                        'Precipitation': value
                    })
                )
            filteredFeaturesPrecip = monthlyPrecipCollection.map(safePrecipFeature).filter(ee.Filter.notNull(['Precipitation']))
            features = ee.FeatureCollection(filteredFeaturesPrecip).getInfo()['features']
            data = [f['properties'] for f in features]
            map_url = 'spatiotemporal_precip_url'
            layer_id = 'spatiotemporal_precip_layer'
            min_val = min([d['Precipitation'] for d in data if d['Precipitation'] is not None]) if data else 0
            max_val = max([d['Precipitation'] for d in data if d['Precipitation'] is not None]) if data else 1
            output = [map_url, None, layer_id, geojson if 'geojson' in locals() else None, min_val, max_val, data]
        # --- LST ---
        elif idx == 'LST':
            lst = ee.ImageCollection("MODIS/061/MOD11A2").select('LST_Day_1km')
            lstCollection = lst.filterDate(start, end).filterBounds(aoi).select("LST_Day_1km")
            def myLst(myimg):
                d = ee.Date(myimg.get('system:time_start'))
                y = d.get('year').toInt()
                m = d.get('month').toInt()

                LSTm = lstCollection.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month')).mean()

                return LSTm.copyProperties(myimg, ['system:time_start'])
            monthlyLSTCollection = ee.ImageCollection(lstCollection.map(myLst))
            filteredFeaturesLST = monthlyLSTCollection.filterDate(start, end).map(lambda image: ee.Feature(None, {
                'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                'LST': image.reduceRegion(ee.Reducer.firstNonNull(), aoi, 30).get('LST_Day_1km')
            })).filter(ee.Filter.notNull(['LST']))
            features = filteredFeaturesLST.getInfo()['features']
            data = [f['properties'] for f in features]
            map_url = 'spatiotemporal_lst_url'
            layer_id = 'spatiotemporal_lst_layer'
            min_val = min([d['LST'] for d in data if d['LST'] is not None]) if data else 0
            max_val = max([d['LST'] for d in data if d['LST'] is not None]) if data else 1
            output = [map_url, None, layer_id, geojson if 'geojson' in locals() else None, min_val, max_val, data]
        # --- Percent Tree Cover ---
        elif idx == 'Percent_Tree_Cover':
            cover = ee.ImageCollection('MODIS/006/MOD44B').select('Percent_Tree_Cover')
            coverCollection = cover.filterDate(start, end).filterBounds(aoi).select("Percent_Tree_Cover")
            def myCover(myimg):
                d = ee.Date(myimg.get('system:time_start'))
                y = d.get('year').toInt()
                m = d.get('month').toInt()
                Coverm = coverCollection.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month')).mean()
                return Coverm.copyProperties(myimg, ['system:time_start'])
            monthlyCoverCollection = ee.ImageCollection(coverCollection.map(myCover))
            filteredFeaturesCover = monthlyCoverCollection.filterDate(start, end).map(lambda image: ee.Feature(None, {
                'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                'Percent_Tree_Cover': image.reduceRegion(ee.Reducer.firstNonNull(), aoi, 30).get('Percent_Tree_Cover')
            })).filter(ee.Filter.notNull(['Percent_Tree_Cover']))
            features = filteredFeaturesCover.getInfo()['features']
            data = [f['properties'] for f in features]
            map_url = 'spatiotemporal_treecover_url'
            layer_id = 'spatiotemporal_treecover_layer'
            min_val = min([d['Percent_Tree_Cover'] for d in data if d['Percent_Tree_Cover'] is not None]) if data else 0
            max_val = max([d['Percent_Tree_Cover'] for d in data if d['Percent_Tree_Cover'] is not None]) if data else 1
            output = [map_url, None, layer_id, geojson if 'geojson' in locals() else None, min_val, max_val, data]
        else:
            return jsonify({"error": "Índice no soportado"}), 400
        return jsonify({"success": True, "output": output}), 200
    except Exception as e:
        print(str(e))
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/soil_organic_prediction', methods=['POST'])
def soil_organic_prediction():
    try:
        if 'soilDataFiles' not in request.files or 'aoiDataFiles' not in request.files:
            return jsonify({"error": "No file part"}), 400

        soil_file = request.files['soilDataFiles']
        aoi_file = request.files['aoiDataFiles']

        if soil_file.filename == '' or aoi_file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        with tempfile.TemporaryDirectory() as temp_dir:
            soil_filepath = os.path.join(temp_dir, secure_filename(soil_file.filename))
            aoi_filepath = os.path.join(temp_dir, secure_filename(aoi_file.filename))

            soil_file.save(soil_filepath)
            aoi_file.save(aoi_filepath)

            data_scale = 10 ##he cambiado esto a 10 metros Sebas
            start_date = request.form.get('startDate')
            end_date = request.form.get('endDate')
            sentinel1 = request.form.get('sentinel1')
            sentinel2 = request.form.get('sentinel2')
            landsat = request.form.get('landsat')
            vegetationIndexes = request.form.get('vegetationIndexes')
            brightnessIndexes = request.form.get('brightnessIndexes')
            moistureIndexes = request.form.get('moistureIndexes')
            terrainIndexes = request.form.get('terrainIndexes')
            climateIndexes = request.form.get('climateIndexes')
            numberOfTrees = request.form.get('numberOfTrees')
            seed = request.form.get('seed')
            bagFraction = request.form.get('bagFraction')
            # Validación y valores por defecto
            if not numberOfTrees:
                numberOfTrees = 300 #he cambiado number of trees a 300 Sebas
            if not bagFraction:
                bagFraction = 0.7
            if not seed:
                seed = random.randint(0, 10000) #He cambiado esta linea, no se si esta bien escrito Sebas
            rsquare = request.form.get('rsquare')
            rmse = request.form.get('rmse')
            mse = request.form.get('mse')
            mae = request.form.get('mae')
            rpiq = request.form.get('rpiq') # ELIMINAR ESTE PARAMETRO, NO SE USA

            # Buscar columna objetivo (SOC) de los parámetros o variantes conocidas
            target_column = request.form.get('target_column')
            gdf_soil = gpd.read_file(soil_filepath)
            print(f"[DEBUG] target_column recibido: {target_column}")
            print(f"[DEBUG] Columnas en gdf_soil: {list(gdf_soil.columns)}")
            soc_column = None
            if target_column and target_column in gdf_soil.columns:
                soc_column = target_column
            else:
                posibles_soc = ['SOC', 'soc', 'SoC', 's_o_c', 'carbono', 'carbon', 'soil_organic_carbon', 'soilorganiccarbon'] #LISTA POSIBILIDADES DE ENCONTRAR SOC PONER ESTO AL USER??
                for col in gdf_soil.columns:
                    if col.strip().lower() in [v.lower() for v in posibles_soc]:
                        soc_column = col
                        break
            print(f"[DEBUG] soc_column determinado: {soc_column}")
            if soc_column is None:
                raise Exception("No se encontró ninguna columna de carbono orgánico del suelo en los datos de suelo. Usa el parámetro 'target_column' si tu columna tiene otro nombre.")
            # No renombrar, usar el nombre real
            geojson_dict_soil = gdf_soil.__geo_interface__
            table = ee.FeatureCollection(geojson_dict_soil['features'])

            # Procesar AOI
            try:
                gdf_aoi = gpd.read_file(aoi_filepath)
            except MemoryError:
                return jsonify({"error": "El archivo AOI es demasiado grande o el servidor no tiene suficiente memoria para procesarlo. Por favor, intente con un archivo más pequeño."}), 500
            except Exception as e:
                return jsonify({"error": f"Error al leer el archivo AOI: {str(e)}"}), 500

            geojson_dict_aoi = gdf_aoi.__geo_interface__
            bbox = ee.FeatureCollection(geojson_dict_aoi['features'])

            coleccion_sentinel = ee.ImageCollection("COPERNICUS/S2_HARMONIZED")\
            .filterDate(start_date, end_date)\
            .filterBounds(bbox)\
            .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', 10)
            
            mosaico = coleccion_sentinel.median().clip(bbox)
            
            mosaico_bands = mosaico.select(['B4', 'B3', 'B2', 'B11', 'B1', 'B12', 'B8', 'B5'])
            
            def calculate_ndvi(image):
                return image.normalizedDifference(['B8', 'B4']).rename('NDVI')

            def calculate_evi(image):
                return image.expression(
                    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
                        'NIR': image.select('B8'),
                        'RED': image.select('B4'),
                        'BLUE': image.select('B2')
                    }).rename('EVI')


            def calculate_nbr(image):
                nbr = image.expression(
                    '(NIR - SWIR2) / (NIR + SWIR2)', 
                    {
                        'NIR': image.select('B8'),  
                        'SWIR2': image.select('B12')
                    }).rename('NBR')
                return nbr

            def calculate_nbr2(image):
                nbr2 = image.expression(
                    '(SWIR - SWIR2) / (SWIR + SWIR2)', 
                    {
                        'SWIR': image.select('B11'),  
                        'SWIR2': image.select('B12')
                    }).rename('NBR2')
                return nbr2

            #Moisture
            def calculate_ndmi(image):
                ndmi = image.expression(
                    '(NIR - SWIR) / (NIR + SWIR)', 
                    {
                        'SWIR': image.select('B11'),  
                        'NIR': image.select('B8')
                    }).rename('NDMI')
                return ndmi

            def calculate_arvi(image):
                arvi = image.expression(
                    '((NIR - (2 * RED) + BLUE) / (NIR + (2 * RED) + BLUE))', 
                    {
                        'NIR': image.select('B8'),
                        'BLUE': image.select('B2'), 
                        'RED': image.select('B4')
                    }).rename('ARVI')
                return arvi

            def calculate_sipi(image):
                sipi = image.expression(
                    '((NIR - BLUE) / (NIR - RED))', 
                    {
                        'NIR': image.select('B8'),
                        'BLUE': image.select('B2'), 
                        'RED': image.select('B4')
                    }).rename('SIPI')
                return sipi


            def calculate_rgr(image):
                rgr = image.expression(
                    'RED / GREEN', 
                    {
                        'RED': image.select('B4'),  
                        'GREEN': image.select('B3')
                    }).rename('RGR')
                return rgr

            
            def calculate_gli(image):
                gli = image.expression(
                    '(((GREEN - RED) + (GREEN - BLUE)) / ((2 * GREEN) + RED + BLUE))', 
                    {
                        'GREEN': image.select('B3'),  
                        'RED': image.select('B4'),
                        'BLUE': image.select('B2')
                    }).rename('GLI')
                return gli

            #Moisture
            def calculate_msi(image):
                msi = image.expression(
                    'NIR / SWIR', 
                    {
                        'NIR': image.select('B8'),
                        'SWIR': image.select('B11')
                    }).rename('MSI')
                return msi

            #Brillo
            def calculate_soci(image):
                soci = image.expression(
                    'BLUE / (GREEN * RED)', 
                    {
                        'BLUE': image.select('B2'),
                        'GREEN': image.select('B3'),
                        'RED': image.select('B4')
                    }).rename('SOCI')
                return soci

            #Brillo
            def calculate_bi(image):
                bi = image.expression(
                    'sqrt(((RED * RED) / (GREEN * GREEN)) / 2)', 
                    {
                        'GREEN': image.select('B3'),
                        'RED': image.select('B4')
                    }).rename('BI')
                return bi

            def calculate_savi(image):
                savi = image.expression(
                    '((NIR - RED) / (NIR + RED + L)) * (1 + L)', 
                    {
                        'L': 0.5,  # Cover of vegetation 0-1
                        'NIR': image.select('B8'),
                        'RED': image.select('B4')
                    }).rename('SAVI')
                return savi

            def calculate_gci(image):
                gci = image.expression(
                    '((NIR) / (GREEN)) - 1', 
                    {
                        'NIR': image.select('B8'),  
                        'GREEN': image.select('B3')
                    }).rename('GCI')
                return gci

            def calculate_gndvi(image):
                gndvi = image.expression(
                    '(NIR - GREEN) / (NIR + GREEN)', 
                    {
                        'NIR': image.select('B8'),  
                        'GREEN': image.select('B3')
                    }).rename('GNDVI')
                return gndvi

            def add_indices(image):
                indices = [
                    calculate_nbr(image), calculate_nbr2(image), calculate_ndmi(image),
                    calculate_arvi(image), calculate_sipi(image), calculate_rgr(image),
                    calculate_gli(image), calculate_msi(image), calculate_soci(image),
                    calculate_bi(image), calculate_savi(image), calculate_gci(image),
                    calculate_gndvi(image), calculate_ndvi(image), calculate_evi(image)
                ]
                return image.addBands(indices)


            composite_indices = add_indices(mosaico_bands)
            
            precipitation_1d = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').select('precipitation').filterDate(start_date, end_date)
            LST= ee.ImageCollection('MODIS/061/MOD11A2').select('LST_Day_1km').filterDate(start_date, end_date)
            surface_radiance = ee.ImageCollection('MODIS/061/MCD18A1').select('DSR').filterDate(start_date, end_date)
            npp = ee.ImageCollection('MODIS/061/MOD17A3HGF').select('Npp').filterDate(start_date, end_date)
            eti = ee.ImageCollection('FAO/WAPOR/2/L1_AETI_D').select('L1_AETI_D').filterDate(start_date, end_date)
            
            
            def prec(image):
                x = image.select("precipitation")
                return x.rename('Precipitation')

            def statistics(image_collection, bbox):
                first_image = image_collection.first()
                band_name = first_image.bandNames().get(0).getInfo()
                mean = image_collection.mean().rename(band_name + '_mean')
                mode = image_collection.mode().rename(band_name + '_mode')
                min_ = image_collection.min().rename(band_name + '_min')
                max_ = image_collection.max().rename(band_name + '_max')
                median = image_collection.median().rename(band_name + '_median')
                stats = ee.Image.cat([mean, mode, min_, max_, median]).clip(bbox)
                return stats

            temperature_stats = statistics(LST, bbox)
            precipitation_stats = statistics(precipitation_1d.map(prec), bbox)
            
          
            # Crear imagen DEM y calcular productos de terreno (SRTM 30m global DEM)
            composite_terrain = None
            try:
                dem = ee.Image("USGS/SRTMGL1_003")
                terrain = ee.Terrain.products(dem)
                # terrain tiene bandas: 'elevation', 'slope', 'aspect'
                terrain_clipped = terrain.clip(bbox)
                composite_terrain = terrain_clipped.select(['elevation', 'slope', 'aspect'])
                print('[DEBUG] composite_terrain creado con bandas:', composite_terrain.bandNames().getInfo())
            except Exception as e:
                print('Error creando variables de terreno:', e)
                composite_terrain = None

            # --- STACK SELECTION ---
            stack = None
            if vegetationIndexes == 'true': 
                stack = composite_indices.select("NDVI", "EVI",
                "SAVI", "SIPI",
                "NBR",
                "NBR2",
                "RGR",
                "ARVI", "GLI", "GCI",
                "GNDVI","B8", "B11" )
            if brightnessIndexes == 'true':
                stack = composite_indices.select(
                "SOCI", "BI")
            if moistureIndexes == "true":
                stack = composite_indices.select("NDMI", "MSI")
            if terrainIndexes == "true" and composite_terrain is not None:
                stack = composite_terrain.select("elevation", "slope", "aspect")
                print('[DEBUG] Usando stack de variables de terreno:', stack.bandNames().getInfo())
            if climateIndexes == "true":
                try:
                    # Usar estadísticas climáticas calculadas previamente
                    stack = ee.Image.cat([
                        precipitation_stats.select([b for b in precipitation_stats.bandNames().getInfo() if 'mean' in b or 'median' in b]),
                        temperature_stats.select([b for b in temperature_stats.bandNames().getInfo() if 'mean' in b or 'median' in b]),
                        surface_radiance.mean().rename('surface_radiance'),
                        npp.mean().rename('npp'),
                        eti.mean().rename('eti')
                    ])
                    print('[DEBUG] Usando stack de variables climáticas:', stack.bandNames().getInfo())
                except Exception as e:
                    print('Error creando stack de variables climáticas:', e)
                    stack = None

            if stack is None:
                raise Exception('No se pudo crear el stack de variables para el modelo. Verifica la selección de variables.')
            
            # Sampling and Classifier
            training_samples = stack.sampleRegions(
                collection=table,
                properties=[soc_column], # RESALTAR QUE HAY QUE TENER LA COLUMNA DE SOC DE X FORMA ESPECIFICA PARA Q EL MODELO LO PILLE
                scale=data_scale,
                geometries=True
            )
            # Depuración: imprime el número de muestras de entrenamiento
            try:
                n_samples = training_samples.size().getInfo()
                print('Número de muestras de entrenamiento (sampleRegions):', n_samples)
            except Exception as e:
                print('Error al obtener el número de muestras de entrenamiento:', e)
	
            classifier_rf = ee.Classifier.smileRandomForest(numberOfTrees=int(numberOfTrees), bagFraction=float(bagFraction), seed=int(seed)).setOutputMode('REGRESSION').train(
                features=training_samples,
                classProperty=soc_column,
                inputProperties=stack.bandNames()
            )
            
            predicted_soil_carbon = stack.classify(classifier_rf).rename("Predicted_SOC")

            # Calcular min y max dinámicos sobre el AOI
            minmax = predicted_soil_carbon.reduceRegion(
                reducer=ee.Reducer.minMax(),
                geometry=bbox.geometry(),
                scale=data_scale,
                maxPixels=1e9
            ).getInfo()
            min_val = minmax.get('Predicted_SOC_min', 0)
            max_val = minmax.get('Predicted_SOC_max', 6)
            print(f"[SOC] Calculated min: {min_val}, max: {max_val}")
            if min_val is None or max_val is None or min_val == max_val:
                min_val = 0
                max_val = 6
            visualization_parameters = {
                'min': min_val,
                'max': max_val,
                'palette': ['#1a9850', '#a6d96a', '#ffffbf', '#fdae61', '#d73027']
            }
            map_id = predicted_soil_carbon.getMapId(visualization_parameters)
            
            # Extraer el polígono AOI para devolverlo al frontend
            aoi_polygon = None
            if 'features' in geojson_dict_aoi and len(geojson_dict_aoi['features']) > 0:
                aoi_polygon = geojson_dict_aoi['features'][0]['geometry']

            # --- Cálculo de métricas de desempeño si el usuario lo solicita ---
            metrics_result = {}
            scatter_data = []  # Nuevo: array para frontend scatter plot
            if any([rsquare == 'true', rmse == 'true', mse == 'true', mae == 'true']):
                try:
                    df = gdf_soil.copy()
                    print(f"[DEBUG] Columnas en df antes de métricas: {list(df.columns)}")
                    print(f"[DEBUG] soc_column usado en métricas: {soc_column}")
                    if soc_column not in df.columns:
                        raise Exception(f"No se encontró la columna '{soc_column}' en los datos de suelo para el cálculo de métricas.")
                    if df[soc_column].isnull().all() or df[soc_column].count() == 0:
                        raise Exception(f"La columna '{soc_column}' está vacía o todos sus valores son nulos. No se pueden calcular métricas.")

                    # --- NUEVO: Calcular métricas comparando predicción satelital vs real ---
                    # Obtener predicción satelital para todos los puntos de una vez
                    predicted_features = predicted_soil_carbon.sampleRegions(
                        collection=table,
                        scale=data_scale,
                        geometries=True
                    ).getInfo()

                    y_true_valid = []
                    y_pred_valid = []
                    for feat in predicted_features['features']:
                        props = feat['properties']
                        real = props.get(soc_column)
                        pred = props.get('Predicted_SOC')
                        if real is not None and pred is not None:
                            y_true_valid.append(real)
                            y_pred_valid.append(pred)
                            scatter_data.append({'real': real, 'predicted': pred})  # Agregar al array para scatter plot
                    if len(y_true_valid) > 1:
                        from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
                        if rsquare == 'true':
                            metrics_result['R2'] = r2_score(y_true_valid, y_pred_valid)
                        if rmse == 'true':
                            metrics_result['RMSE'] = mean_squared_error(y_true_valid, y_pred_valid) ** 0.5
                        if mse == 'true':
                            metrics_result['MSE'] = mean_squared_error(y_true_valid, y_pred_valid)
                        if mae == 'true':
                            metrics_result['MAE'] = mean_absolute_error(y_true_valid, y_pred_valid)
                    else:
                        metrics_result['error'] = 'No hay suficientes puntos válidos para calcular métricas.'
                except Exception as e:
                    print('Error calculando métricas:', e)
                    metrics_result['error'] = str(e)
            # --- Fin métricas ---

            return jsonify({
                "success": True,
                "output": [map_id['tile_fetcher'].url_format, visualization_parameters, 'DSM_Result', aoi_polygon],
                "metrics": metrics_result,
                "scatter_data": scatter_data  # Nuevo: array para scatter plot en frontend
            }), 200

    except MemoryError:
        return jsonify({"error": "El servidor ha superado el límite de memoria al procesar la petición. Intente con archivos más pequeños."}), 500
    except Exception as e:
        print(str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/api/maxent_species_distribution', methods=['POST'])
def maxent_species_distribution():
    """
    Endpoint para ejecutar el modelo MaxEnt de distribución de especies usando Google Earth Engine.
    Espera parámetros:
      - aoi_asset: asset de área de interés (string)
      - occurrences_asset: asset de puntos de presencia (string)
      - variables: lista de variables bioclimáticas y físicas (opcional)
      - betaMultiplier: float (opcional)
      - features: lista de features (opcional)
    """
    try:
        import ee
        import json
        # Leer parámetros del request
        aoi_asset = request.form.get('aoi_asset')
        occurrences_asset = request.form.get('occurrences_asset')
        variables = request.form.getlist('variables[]') or [
            'bio01','bio02','bio03','bio04','bio12','bio15','bio17','bio18','elevation','slope'
        ]
        betaMultiplier = float(request.form.get('betaMultiplier', 0.5))
        features = request.form.getlist('features[]')
        if not aoi_asset or not occurrences_asset:
            return jsonify({'error': 'Faltan parámetros obligatorios'}), 400

        # 1. Definir AOI y ocurrencias
        aoi = ee.FeatureCollection(aoi_asset)
        occurrences = ee.FeatureCollection(occurrences_asset)
        occurrences = occurrences.map(lambda f: f.set('presence', 1))

        # 2. Generar puntos de fondo
        background = ee.FeatureCollection.randomPoints({
            'region': aoi.geometry(),
            'points': 1000,
            'seed': 42
        }).map(lambda f: f.set('presence', 0))
        allPoints = occurrences.merge(background)

        # 3. Cargar variables bioclimáticas y físicas
        worldClim = ee.Image('WORLDCLIM/V1/BIO').clip(aoi)
        srtm = ee.Image('USGS/SRTMGL1_003').clip(aoi)
        elevation = srtm.select('elevation')
        slope = ee.Terrain.slope(elevation)
        predictors = ee.Image.cat([
            *(worldClim.select(v) for v in variables if v.startswith('bio')),
            elevation if 'elevation' in variables else None,
            slope if 'slope' in variables else None
        ]).clip(aoi)

        # 4. Añadir variables a los puntos
        validPoints = allPoints.map(lambda feature: feature.set(
            predictors.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=feature.geometry(),
                scale=1000
            )
        )).filter(ee.Filter.notNull(predictors.bandNames()))

        trainingData = predictors.sampleRegions({
            'collection': validPoints,
            'properties': ['presence'],
            'scale': 1000
        })

        # 5. Entrenar el clasificador MaxEnt
        classifier = ee.Classifier.amnhMaxent({
            'linear': 'linear' in features,
            'quadratic': 'quadratic' in features,
            'product': 'product' in features,
            'threshold': 'threshold' in features,
            'hinge': 'hinge' in features,
            'extrapolate': 'extrapolate' in features,
            'autoFeature': False,
            'betaMultiplier': betaMultiplier
        }).train({
            'features': trainingData,
            'classProperty': 'presence',
            'inputProperties': predictors.bandNames()
        })

        # 6. Clasificar y obtener predicción
        prediction = predictors.classify(classifier)
        variable_importance = classifier.explain().getInfo()

        # 7. Generar visualización y exportación
        vis_params = {'min': 0, 'max': 1, 'palette': ['blue', 'green', 'yellow', 'red']}
        map_id = prediction.getMapId(vis_params)

        # 8. Responder
        return jsonify({
            'success': True,
            'map_url': map_id['tile_fetcher'].url_format,
            'vis_params': vis_params,
            'variable_importance': variable_importance
        }), 200
    except Exception as e:
        print(str(e))
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)
