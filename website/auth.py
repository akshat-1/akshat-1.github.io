from flask import Blueprint, render_template, request, flash, redirect, url_for
from scrapper import get_search_result, get_chapters, get_images, search_

auth = Blueprint('auth', __name__)

@auth.route('/home')
def home():
    return render_template('home.html')

@auth.route('/search', methods=['GET', 'POST'])
def sumbit():
    if request.method == 'POST':
        user_input = request.form.get('search', '').strip()
        if user_input:
            text, links, imgs = get_search_result(user_input)
            if text:
                return redirect(url_for('auth.results', texts=text, img=imgs, link=links, n=len(text)))
            else:
                flash('NO RESULTS FOUND! TRY SEARCHING SOMETHING ELSE', 'error')
        else:
            flash('Please enter a search query', 'error')

    return render_template('sumbit.html')

@auth.route('/results', methods=['GET', 'POST'])
def results():
    if request.method == 'POST':
        manga_id = request.form.get('manga_id') or (list(request.form.keys())[0] if request.form else None)
        if manga_id:
            manga_id = manga_id.rstrip(',')
            lst, title = get_chapters(manga_id)
            return redirect(url_for('auth.chapters', chap=lst, title=title, n=len(lst)))

    texts = request.args.getlist('texts')
    imgs = request.args.getlist('img')
    links = request.args.getlist('link')
    n = int(request.args.get('n', len(texts)))
    return render_template("results.html", text=texts, img=imgs, link=links, n=n)

@auth.route('/chapters', methods=['GET', 'POST'])
def chapters():
    if request.method == 'POST':
        chap_id = request.form.get('chap_id') or (list(request.form.keys())[0] if request.form else None)
        if chap_id:
            chap_id = chap_id.rstrip(',')
            manga = get_images(chap_id)
            return redirect(url_for('auth.read_manga', images=manga, n=len(manga), url=chap_id))

    links = request.args.getlist('chap')
    titles = request.args.getlist('title')
    n = int(request.args.get('n', len(links)))
    return render_template("chapters.html", link=links, title=titles, n=n)

@auth.route('/readmanga')
def read_manga():
    images = request.args.getlist('images')
    n = int(request.args.get('n', len(images)))
    url = request.args.get('url', '')
    return render_template("read.html", img=images, n=n, url=url)
