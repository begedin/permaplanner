#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:?Usage: ./unpaginate.sh https://example.com/table}"
OUT="${2:-unpaginated.html}"

python3 - "$BASE_URL" "$OUT" <<'PY'
import sys
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin

base_url = sys.argv[1].rstrip("/")
output = sys.argv[2]

parsed = urlparse(base_url)
site_root = f"{parsed.scheme}://{parsed.netloc}"

all_rows = []
table_header = None
page = 1

def absolutize_links(element):
    for tag in element.find_all("a", href=True):
        tag["href"] = urljoin(site_root, tag["href"])

while True:
    url = f"{base_url}/{page}"
    print(f"Fetching {url}", file=sys.stderr)

    response = requests.get(url)

    if response.status_code == 404:
        print(f"Stopping at page {page} (404)", file=sys.stderr)
        break

    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    table = soup.find("table")

    if not table:
        print(f"No table found on page {page}", file=sys.stderr)
        break

    # Capture header once
    if table_header is None:
        thead = table.find("thead")

        if thead:
            absolutize_links(thead)
            table_header = str(thead)
        else:
            table_header = ""

    tbody = table.find("tbody")

    if not tbody:
        print(f"No tbody found on page {page}", file=sys.stderr)
        break

    rows = tbody.find_all("tr")

    if not rows:
        print(f"No rows found on page {page}", file=sys.stderr)
        break

    for row in rows:
        absolutize_links(row)
        all_rows.append(str(row))

    page += 1

html = f"""<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Unpaginated Table</title>
<style>
body {{
    font-family: system-ui, sans-serif;
    padding: 20px;
}}

table {{
    border-collapse: collapse;
    width: 100%;
}}

th, td {{
    border: 1px solid #ccc;
    padding: 8px;
}}

th {{
    background: #f5f5f5;
}}
</style>
</head>
<body>
<table>
{table_header}
<tbody>
{''.join(all_rows)}
</tbody>
</table>
</body>
</html>
"""

with open(output, "w", encoding="utf-8") as f:
    f.write(html)

print(f"Wrote {output}", file=sys.stderr)
PY