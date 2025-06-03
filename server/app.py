import random
from flask import Flask, jsonify, request, make_response
import subprocess
from flask_cors import CORS  # Importa CORS
import pandas as pd
import psycopg2
import json
from datetime import datetime, timedelta
import requests
from ria import RIA
import time
import numpy as np
from sqlalchemy import create_engine

from datetime import datetime
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity


app = Flask(__name__)
CORS(app) 
bcrypt = Bcrypt(app)
app.config['JWT_SECRET_KEY'] = 'your_secret_key'
jwt = JWTManager(app)



# Separar las características y la variable objetivo
# Función para calcular Shannon
def calculate_shannon(data, species_column, count_column):
    species_counts = data.groupby(species_column)[count_column].sum()
    total_individuals = species_counts.sum()
    proportions = species_counts / total_individuals
    return -np.sum(proportions * np.log(proportions))

# Función para calcular Chao1
def calculate_chao1(data, species_column, count_column):
    species_counts = data.groupby(species_column)[count_column].sum()
    singletons = (species_counts == 1).sum()
    doubletons = (species_counts == 2).sum()
    observed_species = len(species_counts)
    if doubletons > 0:
        chao1 = observed_species + (singletons**2) / (2 * doubletons)
    else:
        chao1 = observed_species + (singletons * (singletons - 1)) / 2
    return chao1

# Función para calcular Chao2
def calculate_chao2(data, species_column, sample_column):
    presence_absence = data.groupby([species_column, sample_column]).size().unstack(fill_value=0)
    presence_absence[presence_absence > 0] = 1
    singletons = (presence_absence.sum(axis=1) == 1).sum()
    doubletons = (presence_absence.sum(axis=1) == 2).sum()
    observed_species = presence_absence.shape[0]
    if doubletons > 0:
        chao2 = observed_species + (singletons**2) / (2 * doubletons)
    else:
        chao2 = observed_species + (singletons * (singletons - 1)) / 2
    return chao2

# Ruta para calcular el índice de Shannon
@app.route('/api/shannon', methods=['GET'])
def calculate_shannon_index():
    try:
        file = 'server\earth_engine_service\censos.xlsx'
        data = pd.read_excel(file)
        print(data.columns)
        shannon_index = calculate_shannon(data, species_column='especie', count_column='num')
        return jsonify({"shannon_index": shannon_index}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# Ruta para calcular el índice de Chao1
@app.route('/api/chao1', methods=['GET'])
def calculate_chao1_index():
    try:
        file = 'server\earth_engine_service\censos.xlsx'
        data = pd.read_excel(file)
        chao1_index = calculate_chao1(data, species_column='especie', count_column='num')
        return jsonify({"chao1_index": chao1_index}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Ruta para calcular el índice de Chao2
@app.route('/api/chao2', methods=['GET'])
def calculate_chao2_index():
    try:
        file = 'server\earth_engine_service\censos.xlsx'
        data = pd.read_excel(file)
        chao2_index = calculate_chao2(data, species_column='especie', sample_column='num')
        return jsonify({"chao2_index": chao2_index}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/data', methods=['POST'])
def handle_data_request():
    conn = psycopg2.connect(dbname="tepro", user="postgres", password="postgres")
    cur = conn.cursor()  
    data = request.get_json()
    category = data.get('category')
    data_types = data.get('dataTypes')  # List of data types
    start_date = data.get('startDate')
    end_date = data.get('endDate')

    try:
        if category.lower() == 'sensors':
            query = """
            SELECT sampling_date, measurement_value, measurement 
            FROM sensores 
            WHERE measurement = ANY(%s) AND sampling_date BETWEEN %s AND %s
            """
            cur.execute(query, (data_types, start_date, end_date))
        elif category.lower() == 'cameras':
            query = """
            SELECT sampling_date, tracked, insect_type 
            FROM camaras 
            WHERE insect_type = ANY(%s) AND sampling_date BETWEEN %s AND %s
            """
            cur.execute(query, (data_types, start_date, end_date))

        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]
        df = pd.DataFrame(rows, columns=columns)
        result = df.to_json(orient='records')
        
        return jsonify({"success": True, "data": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/dataTypes/<equipment_type>', methods=['GET'])
def get_data_types(equipment_type):
    conn = psycopg2.connect(dbname="tepro", user="postgres", password="postgres")
    cur = conn.cursor()
    if equipment_type.lower() == 'cameras':
        query = "SELECT DISTINCT insect_type FROM camaras"
    elif equipment_type.lower() == 'sensors':
        query = "SELECT DISTINCT measurement FROM sensores"
    else:
        return jsonify({"error": "Invalid equipment type"}), 400

    try:
        cur.execute(query)
        data_types = cur.fetchall()
        return jsonify([item[0] for item in data_types]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()    
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = bcrypt.generate_password_hash(data.get('password')).decode('utf-8')
    conn = psycopg2.connect(dbname="tepro", user="postgres", password="postgres")
    cur = conn.cursor()

    try:
        cur.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (username, password))
        conn.commit()
        return jsonify({"message": "User registered successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    conn = psycopg2.connect(dbname="tepro", user="postgres", password="postgres")
    cur = conn.cursor()

    try:
        cur.execute("SELECT id, password FROM users WHERE username = %s", (username,))
        user = cur.fetchone()
        if user and bcrypt.check_password_hash(user[1], password):
            access_token = create_access_token(identity=user[0])
            return jsonify({"message": "Login successful", "access_token": access_token}), 200
        else:
            return jsonify({"error": "Invalid username or password"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()
        
@app.route('/save_result', methods=['POST'])
@jwt_required()
def save_result():
    user_id = get_jwt_identity()
    data = request.json
    result_id = data.get('result_id')
    conn = psycopg2.connect(dbname="tepro", user="postgres", password="postgres")
    cur = conn.cursor()

    try:
        cur.execute("INSERT INTO user_results (user_id, result_id) VALUES (%s, %s)", (user_id, result_id))
        conn.commit()
        return jsonify({"message": "Result saved successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()
        
@app.route('/my_results', methods=['GET'])
@jwt_required()
def my_results():
    user_id = get_jwt_identity()
    conn = psycopg2.connect(dbname="tepro", user="postgres", password="postgres")
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT pr.id, pr.process_name, pr.output_data->>'map_url' AS map_url, ur.saved_at
            FROM user_results ur
            JOIN process_results pr ON ur.result_id = pr.id
            WHERE ur.user_id = %s
        """, (user_id,))
        results = cur.fetchall()
        output = [{"result_id": row[0], "process_name": row[1], "map_url": row[2], "saved_at": row[3]} for row in results]
        return jsonify({"results": output}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    app.run(port=5003)