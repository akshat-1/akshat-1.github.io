import requests
import urllib.parse

BASE_MANGADEX = "https://api.mangadex.org"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def search_(query: str) -> str:
    """Format query into string."""
    return query.strip()

def get_search_result(query_or_url: str):
    """
    Search manga using MangaDex API.
    Returns: (list_of_titles, list_of_ids, list_of_cover_urls)
    """
    titles = []
    links = []
    imgs = []

    if query_or_url.startswith("http"):
        parsed = urllib.parse.urlparse(query_or_url)
        query = parsed.path.split("/")[-1].replace("_", " ")
    else:
        query = query_or_url.replace("_", " ")

    try:
        url = f"{BASE_MANGADEX}/manga"
        params = {
            "title": query,
            "limit": 20,
            "includes[]": ["cover_art"],
            "order[relevance]": "desc",
            "contentRating[]": ["safe", "suggestive"]
        }
        res = requests.get(url, params=params, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            data = res.json().get("data", [])
            for item in data:
                m_id = item.get("id")
                attr = item.get("attributes", {})
                
                title_dict = attr.get("title", {})
                title = title_dict.get("en") or next(iter(title_dict.values()), "Unknown Title")
                
                cover_filename = ""
                for rel in item.get("relationships", []):
                    if rel.get("type") == "cover_art" and "attributes" in rel:
                        cover_filename = rel["attributes"].get("fileName", "")
                
                cover_url = (
                    f"https://uploads.mangadex.org/covers/{m_id}/{cover_filename}"
                    if cover_filename
                    else "https://via.placeholder.com/200x300?text=No+Cover"
                )
                
                titles.append(title)
                links.append(m_id)
                imgs.append(cover_url)

    except Exception as e:
        print(f"Error fetching search results: {e}")

    return titles, links, imgs

def get_chapters(manga_id_or_url: str):
    """
    Fetch readable chapter list for a given manga.
    Returns: (list_of_chapter_ids, list_of_chapter_titles)
    """
    links = []
    titles = []

    manga_id = manga_id_or_url.strip()
    if "/" in manga_id:
        manga_id = manga_id.rstrip("/").split("/")[-1]

    try:
        url = f"{BASE_MANGADEX}/manga/{manga_id}/feed"
        params = {
            "translatedLanguage[]": ["en"],
            "order[chapter]": "asc",
            "limit": 100
        }
        res = requests.get(url, params=params, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            data = res.json().get("data", [])
            # Filter chapters with pages > 0 or include readable ones
            readable = [ch for ch in data if ch.get("attributes", {}).get("pages", 0) > 0]
            # Fallback to all chapters if none have pages > 0 attribute explicitly
            target_list = readable if readable else data
            
            seen_chapters = set()
            for ch in target_list:
                ch_id = ch.get("id")
                attr = ch.get("attributes", {})
                chap_num = attr.get("chapter") or "Extra"
                
                # Avoid duplicate chapter numbers if multiple scanlations exist
                if chap_num in seen_chapters and chap_num != "Extra":
                    continue
                seen_chapters.add(chap_num)

                chap_title = attr.get("title") or ""
                display_name = f"Chapter {chap_num}" + (f": {chap_title}" if chap_title else "")
                
                links.append(ch_id)
                titles.append(display_name)
    except Exception as e:
        print(f"Error fetching chapters: {e}")

    return links, titles

def get_images(chapter_id_or_url: str) -> list:
    """
    Fetch page image URLs for a chapter.
    Returns: list of image URLs
    """
    pages = []
    ch_id = chapter_id_or_url.strip()
    if "/" in ch_id:
        ch_id = ch_id.rstrip("/").split("/")[-1]

    try:
        url = f"{BASE_MANGADEX}/at-home/server/{ch_id}"
        res = requests.get(url, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            data = res.json()
            base_url = data.get("baseUrl")
            chapter_data = data.get("chapter", {})
            hash_val = chapter_data.get("hash")
            filenames = chapter_data.get("data", [])
            
            if base_url and hash_val and filenames:
                for fname in filenames:
                    pages.append(f"{base_url}/data/{hash_val}/{fname}")
    except Exception as e:
        print(f"Error fetching chapter images: {e}")

    return pages
