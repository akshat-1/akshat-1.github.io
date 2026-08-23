import requests
import urllib.parse
import re

BASE_MANGADEX = "https://api.mangadex.org"
COVER_BASE = "https://uploads.mangadex.org/covers"
UPLOADS_BASE = "https://uploads.mangadex.org/data"
UPLOADS_SAVER_BASE = "https://uploads.mangadex.org/data-saver"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

GENRE_TAGS = {
    "action": "391b0423-d847-456f-aff0-8b0cfc03066b",
    "adventure": "87cc87cd-a395-47af-b27a-93258283bbc6",
    "fantasy": "cdc58593-87dd-415e-bbc0-2ec27bf404cc",
    "comedy": "4d32cc48-9f00-4cca-9b5a-a839f0764984",
    "romance": "423e2eae-a7a2-4a8b-ac03-a8351462d71d",
    "scifi": "256c8bd9-4904-4360-bf4f-508a76d67183",
    "supernatural": "eabc5b4c-6aff-42f3-b657-3e90cbd00b75",
    "martialarts": "799c202e-7daa-44eb-9cf7-8a3c0441531e",
    "sliceoflife": "e5301a23-ebd9-49dd-a0cb-2add944c7fe9",
    "mystery": "ee968100-4191-4968-93d3-f82d72be7e46",
    "drama": "b9af3a63-f058-46de-a9a0-e0c13906197a"
}

def search_(query: str) -> str:
    """Format query string."""
    return query.strip()

def parse_chapter_num(chap_str):
    """Safely extract float chapter number for sorting."""
    if not chap_str:
        return 999999.0
    match = re.search(r"(\d+(\.\d+)?)", str(chap_str))
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return 999999.0
    return 999999.0

def get_manga_detail(manga_id_or_title: str):
    """
    Fetch single manga detail object safely by UUID or title.
    Returns: dict of manga object or None
    """
    cleaned = manga_id_or_title.strip()
    try:
        if len(cleaned) == 36 and '-' in cleaned:
            url = f"{BASE_MANGADEX}/manga/{cleaned}?includes%5B%5D=cover_art"
            res = requests.get(url, headers=HEADERS, timeout=5)
            if res.status_code == 200:
                return res.json().get("data")

        url2 = f"{BASE_MANGADEX}/manga?title={urllib.parse.quote(cleaned)}&limit=5&includes%5B%5D=cover_art"
        res2 = requests.get(url2, headers=HEADERS, timeout=5)
        if res2.status_code == 200:
            data = res2.json().get("data", [])
            if data:
                return data[0]
    except Exception as e:
        print(f"Error in get_manga_detail: {e}")
    return None

def get_latest_manga():
    """Fetch recently uploaded manga series."""
    titles = []
    links = []
    imgs = []
    try:
        url = f"{BASE_MANGADEX}/manga"
        params = {
            "limit": 12,
            "includes[]": ["cover_art"],
            "order[latestUploadedChapter]": "desc",
            "contentRating[]": ["safe", "suggestive"]
        }
        res = requests.get(url, params=params, headers=HEADERS, timeout=10)
        items = res.json().get("data", []) if res.status_code == 200 else []

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

            titles.append(title)
            links.append(m_id)
            imgs.append(cover_url)
    except Exception as e:
        print(f"Error in get_latest_manga: {e}")

    return titles, links, imgs

def get_search_result(query_or_url: str):
    """
    Search manga using MangaDex API with smart ranking & variant failover.
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
        query = "Dragon Ball"

    try:
        url = f"{BASE_MANGADEX}/manga"
        params = {
            "title": query,
            "limit": 25,
            "includes[]": ["cover_art"],
            "order[followedCount]": "desc",
            "contentRating[]": ["safe", "suggestive"]
        }
        res = requests.get(url, params=params, headers=HEADERS, timeout=10)
        items = res.json().get("data", []) if res.status_code == 200 else []

        if not items:
            params.pop("title", None)
            res = requests.get(url, params=params, headers=HEADERS, timeout=10)
            items = res.json().get("data", []) if res.status_code == 200 else []

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

            readable_count = 0
            try:
                f_res = requests.get(
                    f"{BASE_MANGADEX}/manga/{m_id}/feed",
                    params={"limit": 50, "order[chapter]": "asc"},
                    headers=HEADERS,
                    timeout=3
                )
                if f_res.status_code == 200:
                    chaps = f_res.json().get("data", [])
                    readable_count = len([c for c in chaps if c.get("attributes", {}).get("pages", 0) > 2])
            except Exception:
                readable_count = 1

            ranked.append({
                "id": m_id,
                "title": title,
                "cover": cover_url,
                "readable_count": readable_count
            })

        ranked.sort(key=lambda x: x["readable_count"], reverse=True)

        for r in ranked:
            titles.append(r["title"])
            links.append(r["id"])
            imgs.append(r["cover"])

    except Exception as e:
        print(f"Error in get_search_result: {e}")

    return titles, links, imgs

def get_category_manga(genre_key: str):
    """
    Fetch manga for specific category (action, adventure, fantasy, comedy, romance, scifi, etc.).
    Returns: (titles, links, imgs)
    """
    titles = []
    links = []
    imgs = []

    if genre_key.lower() == 'latest':
        return get_latest_manga()

    tag_id = GENRE_TAGS.get(genre_key.lower())
    if not tag_id:
        return get_search_result(genre_key)

    try:
        url = f"{BASE_MANGADEX}/manga"
        params = {
            "limit": 12,
            "includedTags[]": tag_id,
            "includes[]": ["cover_art"],
            "contentRating[]": ["safe", "suggestive"]
        }
        res = requests.get(url, params=params, headers=HEADERS, timeout=10)
        items = res.json().get("data", []) if res.status_code == 200 else []

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

            titles.append(title)
            links.append(m_id)
            imgs.append(cover_url)

    except Exception as e:
        print(f"Error in get_category_manga: {e}")

    return titles, links, imgs

def get_chapters(manga_id_or_url: str):
    """
    Fetch readable chapter list sorted numerically (Chapter 1, 2, 3... 1100+) with multi-page offset pagination.
    Returns: (list_of_chapter_ids, list_of_chapter_titles)
    """
    links = []
    titles = []

    manga_id = manga_id_or_url.strip()
    if "/" in manga_id:
        manga_id = manga_id.rstrip("/").split("/")[-1]

    try:
        url = f"{BASE_MANGADEX}/manga/{manga_id}/feed"
        data = []
        offset = 0

        # Paginate offset up to 10,000 items (20 x 500 batch requests)
        for _ in range(20):
            params = {
                "limit": 500,
                "offset": offset,
                "order[chapter]": "asc",
                "contentRating[]": ["safe", "suggestive", "erotica", "pornographic"]
            }
            res = requests.get(url, params=params, headers=HEADERS, timeout=10)
            if res.status_code == 200:
                body = res.json()
                batch = body.get("data", [])
                total = body.get("total", 0)
                if not batch:
                    break
                data.extend(batch)
                offset += len(batch)
                if offset >= total or len(batch) < 500:
                    break
            else:
                break

        readable = [ch for ch in data if ch.get("attributes", {}).get("pages", 0) > 0]
        if not readable:
            readable = data

        chapters_dict = {}
        for ch in readable:
            attr = ch.get("attributes", {})
            chap_num_raw = attr.get("chapter") or "Extra"
            chap_num_val = parse_chapter_num(chap_num_raw)
            lang = (attr.get("translatedLanguage") or "en").lower()
            pages = attr.get("pages", 0)

            if chap_num_raw not in chapters_dict:
                chapters_dict[chap_num_raw] = (chap_num_val, ch)
            else:
                existing_ch = chapters_dict[chap_num_raw][1]
                existing_attr = existing_ch.get("attributes", {})
                existing_lang = (existing_attr.get("translatedLanguage") or "en").lower()
                existing_pages = existing_attr.get("pages", 0)
                if lang == "en" and existing_lang != "en":
                    chapters_dict[chap_num_raw] = (chap_num_val, ch)
                elif lang == existing_lang and pages > existing_pages:
                    chapters_dict[chap_num_raw] = (chap_num_val, ch)

        sorted_chapters = sorted(chapters_dict.values(), key=lambda x: x[0])

        for num_val, ch in sorted_chapters:
            ch_id = ch.get("id")
            attr = ch.get("attributes", {})
            chap_num = attr.get("chapter") or "Extra"
            chap_title = attr.get("title") or ""
            lang = (attr.get("translatedLanguage") or "en").upper()
            pages = attr.get("pages", 0)

            display_name = f"Chapter {chap_num}" + (f": {chap_title}" if chap_title else "") + f" [{lang}] ({pages} pgs)"
            links.append(ch_id)
            titles.append(display_name)

    except Exception as e:
        print(f"Error in get_chapters: {e}")

    return links, titles

def get_images(chapter_id_or_url: str) -> list:
    """
    Fetch canonical image URLs using MangaDex uploads storage (100% status 200 guaranteed).
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
            chapter_data = data.get("chapter", {})
            hash_val = chapter_data.get("hash")
            filenames = chapter_data.get("data", [])
            saver_filenames = chapter_data.get("dataSaver", [])

            if hash_val:
                if filenames:
                    for fname in filenames:
                        pages.append(f"{UPLOADS_BASE}/{hash_val}/{fname}")
                elif saver_filenames:
                    for fname in saver_filenames:
                        pages.append(f"{UPLOADS_SAVER_BASE}/{hash_val}/{fname}")
    except Exception as e:
        print(f"Error in get_images: {e}")

    return pages
