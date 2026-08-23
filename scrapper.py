import requests
import urllib.parse

BASE_MANGADEX = "https://api.mangadex.org"
COVER_BASE = "https://uploads.mangadex.org/covers"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def search_(query: str) -> str:
    """Format query into string."""
    return query.strip()

def get_search_result(query_or_url: str):
    """
    Search manga using MangaDex API with smart ranking & fallback.
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

    if not query:
        query = "popular"

    try:
        url = f"{BASE_MANGADEX}/manga"
        params = {
            "title": query,
            "limit": 20,
            "includes[]": ["cover_art"],
            "order[followedCount]": "desc",
            "contentRating[]": ["safe", "suggestive"]
        }
        res = requests.get(url, params=params, headers=HEADERS, timeout=10)
        items = res.json().get("data", []) if res.status_code == 200 else []

        # If primary search returned no results, try broader search
        if not items:
            params.pop("title", None)
            res = requests.get(url, params=params, headers=HEADERS, timeout=10)
            items = res.json().get("data", []) if res.status_code == 200 else []

        # Rank results: Prioritize entries with active feeds
        ranked = []
        for item in items:
            m_id = item.get("id")
            attr = item.get("attributes", {})
            title_dict = attr.get("title", {})
            title = title_dict.get("en") or next(iter(title_dict.values()), "Unknown Title")

            cover_filename = ""
            for rel in item.get("relationships", []):
                if rel.get("type") == "cover_art" and "attributes" in rel:
                    cover_filename = rel["attributes"].get("fileName", "")

            cover_url = (
                f"{COVER_BASE}/{m_id}/{cover_filename}.256.jpg"
                if cover_filename
                else "https://via.placeholder.com/200x300?text=No+Cover"
            )

            # Quick check feed for readable chapters count
            readable_count = 0
            try:
                f_res = requests.get(
                    f"{BASE_MANGADEX}/manga/{m_id}/feed",
                    params={"limit": 20, "order[chapter]": "asc"},
                    headers=HEADERS,
                    timeout=3
                )
                if f_res.status_code == 200:
                    chaps = f_res.json().get("data", [])
                    readable_count = len([c for c in chaps if c.get("attributes", {}).get("pages", 0) > 0])
            except Exception:
                readable_count = 1

            ranked.append({
                "id": m_id,
                "title": title,
                "cover": cover_url,
                "readable_count": readable_count
            })

        # Sort: Titles with readable pages first
        ranked.sort(key=lambda x: x["readable_count"], reverse=True)

        for r in ranked:
            titles.append(r["title"])
            links.append(r["id"])
            imgs.append(r["cover"])

    except Exception as e:
        print(f"Error fetching search results: {e}")

    return titles, links, imgs

def get_chapters(manga_id_or_url: str):
    """
    Fetch readable chapter list for a given manga with smart edition fallback.
    Returns: (list_of_chapter_ids, list_of_chapter_titles)
    """
    links = []
    titles = []

    manga_id = manga_id_or_url.strip()
    if "/" in manga_id:
        manga_id = manga_id.rstrip("/").split("/")[-1]

    try:
        # Step 1: Fetch English feed
        url = f"{BASE_MANGADEX}/manga/{manga_id}/feed"
        params = {
            "translatedLanguage[]": ["en"],
            "order[chapter]": "asc",
            "limit": 500
        }
        res = requests.get(url, params=params, headers=HEADERS, timeout=10)
        data = res.json().get("data", []) if res.status_code == 200 else []
        readable = [ch for ch in data if ch.get("attributes", {}).get("pages", 0) > 0]

        # Step 2: Fallback to all languages if EN direct pages are 0
        if not readable:
            params.pop("translatedLanguage[]", None)
            res_all = requests.get(url, params=params, headers=HEADERS, timeout=10)
            data_all = res_all.json().get("data", []) if res_all.status_code == 200 else []
            readable = [ch for ch in data_all if ch.get("attributes", {}).get("pages", 0) > 0]
            if not readable:
                readable = data_all

        # Step 3: If still empty, search for alternative colored/fan edition of the same manga title
        if not readable:
            m_res = requests.get(f"{BASE_MANGADEX}/manga/{manga_id}", headers=HEADERS, timeout=5)
            if m_res.status_code == 200:
                m_title = m_res.json().get("data", {}).get("attributes", {}).get("title", {}).get("en", "")
                if m_title:
                    alt_res = requests.get(
                        f"{BASE_MANGADEX}/manga",
                        params={"title": f"{m_title} colored", "limit": 3, "includes[]": ["cover_art"]},
                        headers=HEADERS,
                        timeout=5
                    )
                    alt_data = alt_res.json().get("data", []) if alt_res.status_code == 200 else []
                    if alt_data:
                        alt_id = alt_data[0]["id"]
                        alt_feed = requests.get(
                            f"{BASE_MANGADEX}/manga/{alt_id}/feed",
                            params={"limit": 500, "order[chapter]": "asc"},
                            headers=HEADERS,
                            timeout=5
                        ).json().get("data", [])
                        readable = [ch for ch in alt_feed if ch.get("attributes", {}).get("pages", 0) > 0]

        seen_chapters = set()
        for ch in readable:
            ch_id = ch.get("id")
            attr = ch.get("attributes", {})
            chap_num = attr.get("chapter") or "Extra"
            lang = attr.get("translatedLanguage", "en").upper()

            if chap_num in seen_chapters and chap_num != "Extra":
                continue
            seen_chapters.add(chap_num)

            chap_title = attr.get("title") or ""
            display_name = f"Chapter {chap_num}" + (f": {chap_title}" if chap_title else "") + f" [{lang}]"

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
            data_saver_filenames = chapter_data.get("dataSaver", [])

            target_files = filenames if filenames else data_saver_filenames
            subfolder = "data" if filenames else "data-saver"

            if base_url and hash_val and target_files:
                for fname in target_files:
                    pages.append(f"{base_url}/{subfolder}/{hash_val}/{fname}")
    except Exception as e:
        print(f"Error fetching chapter images: {e}")

    return pages
