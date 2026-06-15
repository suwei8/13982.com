#!/usr/bin/env python3
"""Export content from MySQL to Markdown files for Astro."""
import json
import html
import re
import subprocess
import os
import sys

MYSQL_HOST = os.environ.get("MYSQL_HOST", "127.0.0.1")
MYSQL_USER = os.environ.get("MYSQL_USER")
MYSQL_PASS = os.environ.get("MYSQL_PASS")
MYSQL_DB = os.environ.get("MYSQL_DB", "com_13982")

if not MYSQL_USER or not MYSQL_PASS:
    print("Error: MYSQL_USER and MYSQL_PASS environment variables are required.", file=sys.stderr)
    print("Set them before running: export MYSQL_USER=xxx MYSQL_PASS=xxx", file=sys.stderr)
    sys.exit(1)

DB_CMD = f"mysql -h {MYSQL_HOST} -u {MYSQL_USER} -p'{MYSQL_PASS}' {MYSQL_DB} -N -e"

def query(sql):
    result = subprocess.run(
        f"{DB_CMD} \"{sql}\"", shell=True, capture_output=True, text=True
    )
    return result.stdout.strip()

def html_to_markdown(html_str):
    """Convert simple HTML to Markdown."""
    if not html_str:
        return ""
    text = html.unescape(html_str)
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'</p>\s*<p[^>]*>', '\n\n', text)
    text = re.sub(r'<p[^>]*>', '', text)
    text = re.sub(r'</p>', '', text)
    text = re.sub(r'<img[^>]*title="([^"]*)"[^>]*src="([^"]*)"[^>]*/?>',
                  r'![\1](\2)', text)
    text = re.sub(r'<img[^>]*src="([^"]*)"[^>]*/?>', r'![](\1)', text)
    text = re.sub(r'<span[^>]*>', '', text)
    text = re.sub(r'</span>', '', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def slugify(text):
    """Create a URL-safe slug from Chinese/English text."""
    text = text.strip()
    # Use pinyin-like fallback for Chinese
    slug = re.sub(r'[^a-zA-Z0-9一-鿿]+', '-', text)
    slug = slug.strip('-').lower()
    return slug or 'item'

# Export cases
def export_cases():
    rows = query("""
        SELECT n.id, n.title, n.description, n.inputtime,
               d.content, a.attachment
        FROM dr_1_news n
        LEFT JOIN dr_1_news_data_0 d ON n.id = d.id
        LEFT JOIN dr_attachment_data a ON a.id = n.thumb
        WHERE n.catid = 3
        ORDER BY n.id DESC
    """)

    cases_dir = "/home/sw/13982-demo/src/content/cases"
    os.makedirs(cases_dir, exist_ok=True)

    # Clear old files
    for f in os.listdir(cases_dir):
        if f.endswith('.md'):
            os.remove(os.path.join(cases_dir, f))

    for line in rows.split('\n'):
        if not line.strip():
            continue
        parts = line.split('\t')
        if len(parts) < 6:
            continue
        cid, title, desc, ts, content, thumb_path = parts[0], parts[1], parts[2], parts[3], parts[4] if len(parts) > 4 else '', parts[5] if len(parts) > 5 else ''

        if not title or title == 'NULL':
            continue

        from datetime import datetime
        date = datetime.fromtimestamp(int(ts)).strftime('%Y-%m-%d') if ts and ts != 'NULL' else '2025-01-15'

        slug = slugify(title)
        thumb = f"/images/cases/{thumb_path}" if thumb_path and thumb_path != 'NULL' else ""

        md_content = html_to_markdown(content) if content and content != 'NULL' else ""

        safe_desc = (desc or '')[:200].replace('"', '\\"')
        fm = f"""---
title: "{title}"
description: "{safe_desc}"
thumbnail: "{thumb}"
tags: ["网站建设"]
date: {date}
---

{md_content}
"""
        filepath = os.path.join(cases_dir, f"{slug}.md")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fm)
        print(f"  Exported case: {title} -> {slug}.md")

# Export services
def export_services():
    rows = query("""
        SELECT id, name FROM dr_1_share_category
        WHERE pids LIKE '%,2' AND id != 2
        ORDER BY id
    """)

    svc_dir = "/home/sw/13982-demo/src/content/services"
    os.makedirs(svc_dir, exist_ok=True)

    # Clear old files
    for f in os.listdir(svc_dir):
        if f.endswith('.md'):
            os.remove(os.path.join(svc_dir, f))

    order = 1
    for line in rows.split('\n'):
        if not line.strip():
            continue
        parts = line.split('\t')
        if len(parts) < 2:
            continue
        sid, name = parts[0], parts[1]
        if not name or name == 'NULL':
            continue

        slug = slugify(name)
        fm = f"""---
title: "{name}"
description: "{name}服务，专业团队为您量身定制。"
icon: ""
order: {order}
---

滇码科技提供专业的{name}服务，凭借多年行业经验，为各类企业提供定制化解决方案。

## 服务优势

- 专业团队，丰富经验
- 定制方案，精准服务
- 持续运维，稳定保障
"""
        filepath = os.path.join(svc_dir, f"{slug}.md")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fm)
        print(f"  Exported service: {name} -> {slug}.md")
        order += 1

# Export site.json
def export_site():
    raw = query("SELECT setting FROM dr_site WHERE id=1")
    data = json.loads(raw)
    config = data.get('config', {})

    site = {
        "name": config.get('SITE_NAME', '滇码科技'),
        "icp": config.get('SITE_ICP', '滇ICP备2024030568号-1'),
        "phone_400": "400-998-0873",
        "phone_mobile": "136-5873-3979",
        "wechat": "16687180373",
        "email": "sw@sw586.com",
        "address": "云南省红河州蒙自市",
        "address_full": "云南省红河哈尼族彝族自治州蒙自市文澜街道育才路长河天娇1幢1单元1层1-9号商铺",
        "company": "蒙自市滇码网络服务中心",
        "slogan": "互联网+选：滇码科技",
        "description": "助力企业拥抱互联网+：网站建设+微信开发+小程序开发+APP开发+运营推广",
        "stats": {
            "years": "7年",
            "clients": "400+",
            "longterm": "47"
        }
    }

    filepath = "/home/sw/13982-demo/src/content/site.json"
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(site, f, ensure_ascii=False, indent=2)
    print("  Exported site.json")

# Copy images
def copy_images():
    src = "/srv/client-web/www/13982.com/public/uploadfile/202501"
    dst = "/home/sw/13982-demo/public/images/cases"
    os.makedirs(dst, exist_ok=True)

    if os.path.exists(src):
        for f in os.listdir(src):
            if f.endswith(('.jpg', '.png', '.jpeg', '.gif')):
                import shutil
                shutil.copy2(os.path.join(src, f), os.path.join(dst, f))
                print(f"  Copied image: {f}")

if __name__ == '__main__':
    print("Exporting cases...")
    export_cases()
    print("\nExporting services...")
    export_services()
    print("\nExporting site info...")
    export_site()
    print("\nCopying images...")
    copy_images()
    print("\nDone!")
