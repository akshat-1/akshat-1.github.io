from flask import Blueprint, render_template, jsonify, request
import requests
import base64
from scrapper import get_search_result, get_chapters, get_images, get_category_manga, get_manga_detail, HEADERS

views = Blueprint('views', __name__)

@views.route('/')
def home():
    return render_template('index.html')

@views.route('/api/search')
def api_search():
    q = request.args.get('q', 'Dragon Ball')
    titles, links, imgs = get_search_result(q)
    return jsonify({'titles': titles, 'links': links, 'imgs': imgs})

@views.route('/api/manga/<manga_id>')
def api_manga(manga_id):
    data = get_manga_detail(manga_id)
    return jsonify({'data': data})

@views.route('/api/category/<genre_key>')
def api_category(genre_key):
    titles, links, imgs = get_category_manga(genre_key)
    return jsonify({'titles': titles, 'links': links, 'imgs': imgs})

@views.route('/api/chapters/<manga_id>')
def api_chapters(manga_id):
    links, titles = get_chapters(manga_id)
    return jsonify({'links': links, 'titles': titles})

@views.route('/api/images/<chapter_id>')
def api_images(chapter_id):
    pages = get_images(chapter_id)
    return jsonify({'pages': pages})

@views.route('/api/proxy_image')
def proxy_image():
    url = request.args.get('url')
    if not url:
        return jsonify({'data_url': None}), 400
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            b64 = base64.b64encode(res.content).decode('utf-8')
            mime = res.headers.get('content-type', 'image/jpeg')
            return jsonify({'data_url': f"data:{mime};base64,{b64}"})
    except Exception as e:
        print(f"Proxy image error: {e}")
    return jsonify({'data_url': None}), 500
