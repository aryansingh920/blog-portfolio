# add_project.py (PUT IN REPO ROOT)
# Run:
#   python -m streamlit run add_project.py

import json
import os
import re
import shutil
from datetime import datetime
from pathlib import Path

import streamlit as st
from streamlit_monaco import st_monaco


# ----------------------------
# YOUR repo structure defaults
# ----------------------------
DEFAULT_JSON_PATH = "content/blog-index.json"
# content/posts/projectN/index.html
DEFAULT_HTML_ROOT = "content/posts"
# public/posts/projectN/<image files>
DEFAULT_PUBLIC_POSTS_ROOT = "public/posts"


# ----------------------------
# Helpers
# ----------------------------
def ensure_dir(path: str | Path) -> None:
    Path(path).mkdir(parents=True, exist_ok=True)


def load_json_list(file_path: str) -> list:
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(
            "content/blog-index.json must be a LIST (array) of objects.")
    return data


def save_json_list(data: list, file_path: str) -> None:
    ensure_dir(Path(file_path).parent)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def get_next_id(posts: list) -> int:
    max_id = 0
    for p in posts:
        try:
            max_id = max(max_id, int(p.get("id", 0)))
        except Exception:
            pass
    return max_id + 1


def slugify(title: str) -> str:
    s = title.strip().lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"\s+", "-", s).strip("-")
    s = re.sub(r"-{2,}", "-", s)
    return s


def write_index_html(dest_dir: str, html_text: str) -> str:
    ensure_dir(dest_dir)
    index_path = os.path.join(dest_dir, "index.html")
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(html_text)
    return index_path


def save_uploaded_file(uploaded, dest_dir: str) -> str:
    ensure_dir(dest_dir)
    filename = uploaded.name
    dest_path = os.path.join(dest_dir, filename)
    with open(dest_path, "wb") as f:
        f.write(uploaded.getbuffer())
    return filename


def copy_local_file(src_path: str, dest_dir: str) -> str:
    ensure_dir(dest_dir)
    src = Path(src_path)
    if not src.exists() or not src.is_file():
        raise FileNotFoundError(f"File not found: {src_path}")
    dest_path = Path(dest_dir) / src.name
    shutil.copy2(src, dest_path)
    return src.name


def validate_date(date_str: str) -> bool:
    return bool(re.match(r"^\d{4}-\d{2}-\d{2}$", date_str.strip()))


# ----------------------------
# App
# ----------------------------
st.set_page_config(page_title="Blog Index + Post Generator", layout="wide")
st.title(
    "Blog Index + Post Generator "
    "(updates content/blog-index.json + writes content/posts/projectN/index.html + copies image to public/posts/projectN/)"
)

with st.sidebar:
    st.header("Config")
    json_path = st.text_input("Root JSON path", value=DEFAULT_JSON_PATH)
    html_root = st.text_input("HTML root", value=DEFAULT_HTML_ROOT)
    public_posts_root = st.text_input(
        "Image root", value=DEFAULT_PUBLIC_POSTS_ROOT)

# Load JSON
try:
    posts = load_json_list(json_path)
except Exception as e:
    st.error(f"Failed to load JSON: {e}")
    st.stop()

project_number = get_next_id(posts)

# Sections from JSON
existing_sections = sorted(
    {p.get("section", "") for p in posts if p.get("section")},
    key=str.lower,
)

left, right = st.columns([1, 1], gap="large")

with left:
    st.subheader("Post fields")

    title = st.text_input("title", value="")
    slug_default = slugify(title) if title else ""
    slug = st.text_input(
        "slug (auto from title, edit if needed)", value=slug_default)

    st.divider()
    st.subheader("Section")

    section_mode = st.selectbox(
        "section", options=["Pick existing", "Add new"], index=0)
    if section_mode == "Pick existing":
        if existing_sections:
            section = st.selectbox("existing sections",
                                   options=existing_sections, index=0)
        else:
            st.warning("No existing sections found. Use 'Add new'.")
            section = ""
    else:
        section = st.text_input("new section name", value="")

    st.divider()
    author = st.text_input("author", value="Aryan Singh")
    date_str = st.text_input(
        "date (YYYY-MM-DD)", value=datetime.now().strftime("%Y-%m-%d"))
    excerpt = st.text_area(
        "excerpt (1–2 line teaser)",
        value="",
        height=120,
        placeholder="Example: Built a CNN-based CAPTCHA solver using PyTorch + OpenCV, reaching 94% accuracy.",
    )

    st.divider()
    st.subheader("HTML Editor (Monaco / VS Code style)")
    st.caption("Formatting shortcut: Shift + Alt + F")

    default_html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title></title>
  <meta name="description" content="" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="" />
</head>
<body>

</body>
</html>
"""

    # NOTE: older streamlit-monaco versions don't support key=...
    html_text = st_monaco(
        value=default_html,
        language="html",
        theme="vs-dark",
        height=520,
    )

with right:
    st.subheader("Image (copied to public/posts/projectN/...)")

    uploaded_img = st.file_uploader(
        "Upload image (e.g., desktop.png)",
        accept_multiple_files=False,
    )
    local_img_path = st.text_input("Or local image path (optional)", value="")

    st.divider()
    st.subheader("Computed destinations")

    fs_html_dir = os.path.join(html_root, f"project{project_number}")
    fs_img_dir = os.path.join(public_posts_root, f"project{project_number}")

    st.code(
        f"JSON:   {json_path}\n"
        f"HTML:   {fs_html_dir}/index.html\n"
        f"IMAGE:  {fs_img_dir}/<file>\n",
        language="text",
    )

    st.divider()
    st.subheader("JSON preview")

    json_dir = f"/posts/project{project_number}"
    json_html = f"/posts/project{project_number}/index.html"

    preview = {
        "id": project_number,
        "slug": slug,
        "title": title,
        "section": section,
        "date": date_str,
        "author": author,
        "dir": json_dir,
        "html": json_html,
        "imageMobile": "",
        "imageDesktop": "",
        "excerpt": excerpt,
    }
    st.json(preview)

st.divider()
add = st.button("Add post", type="primary")

if add:
    errs = []
    if not title.strip():
        errs.append("title is required")
    if not slug.strip():
        errs.append("slug is required")
    if not section.strip():
        errs.append("section is required")
    if not validate_date(date_str):
        errs.append("date must be YYYY-MM-DD")
    if not html_text or not html_text.strip():
        errs.append("index.html content is required")
    if uploaded_img is None and not local_img_path.strip():
        errs.append("image is required (upload or local path)")

    if errs:
        st.error("Fix these:\n- " + "\n- ".join(errs))
        st.stop()

    # 1) Write HTML
    try:
        write_index_html(fs_html_dir, html_text)
    except Exception as e:
        st.error(f"Failed writing HTML: {e}")
        st.stop()

    # 2) Copy image
    try:
        if uploaded_img is not None:
            img_filename = save_uploaded_file(uploaded_img, fs_img_dir)
        else:
            img_filename = copy_local_file(local_img_path.strip(), fs_img_dir)
    except Exception as e:
        st.error(f"Failed copying image: {e}")
        st.stop()

    img_public_path = f"/posts/project{project_number}/{img_filename}"

    # 3) Append JSON entry (EXACT format)
    new_entry = {
        "id": project_number,
        "slug": slug,
        "title": title,
        "section": section,
        "date": date_str,
        "author": author,
        "dir": json_dir,
        "html": json_html,
        "imageMobile": img_public_path,
        "imageDesktop": img_public_path,
        "excerpt": excerpt,
    }

    posts.append(new_entry)

    # 4) Save JSON
    try:
        save_json_list(posts, json_path)
    except Exception as e:
        st.error(f"Failed saving JSON: {e}")
        st.stop()

    st.success("Done. JSON updated + HTML saved + image copied.")
    st.json(new_entry)
