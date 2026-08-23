from flask import Blueprint, render_template, jsonify, request
from scrapper import get_search_result, get_chapters, get_images, search_

views = Blueprint('views', __name__)

@views.route('/')
def home():
    return render_template('index.html')

@views.route('/api/search')
def api_search():
    q = request.args.get('q', 'Dragon Ball')
    titles, links, imgs = get_search_result(q)
    return jsonify({'titles': titles, 'links': links, 'imgs': imgs})

@views.route('/api/chapters/<manga_id>')
def api_chapters(manga_id):
    links, titles = get_chapters(manga_id)
    return jsonify({'links': links, 'titles': titles})

@views.route('/api/images/<chapter_id>')
def api_images(chapter_id):
    pages = get_images(chapter_id)
    return jsonify({'pages': pages})
