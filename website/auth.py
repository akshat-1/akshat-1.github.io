from flask import Blueprint, render_template, request, jsonify
from scrapper import get_search_result, get_chapters, get_images

auth = Blueprint('auth', __name__)

@auth.route('/home')
def home():
    return render_template('index.html')

@auth.route('/search', methods=['GET', 'POST'])
def search_route():
    return render_template('index.html')

@auth.route('/results', methods=['GET', 'POST'])
def results():
    return render_template('index.html')

@auth.route('/chapters', methods=['GET', 'POST'])
def chapters():
    return render_template('index.html')

@auth.route('/readmanga')
def read_manga():
    return render_template('index.html')
