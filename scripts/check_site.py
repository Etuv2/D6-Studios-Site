"""Check static links before deployment and compare published files over HTTPS."""

import hashlib
import os
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
from urllib.parse import quote, unquote, urljoin, urlsplit
from urllib.request import Request, urlopen


SITE = Path(__file__).resolve().parent.parent / "site"
ORIGIN = "https://d6studio.uk"


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.urls.extend(attrs[key] for key in ("src", "href") if attrs.get(key))
        if attrs.get("srcset"):
            self.urls.extend(item.strip().split()[0] for item in attrs["srcset"].split(","))


def check_local():
    files = sorted(path for path in SITE.rglob("*") if path.is_file())
    names = {path.relative_to(SITE).as_posix() for path in files}
    required = {
        "index.html", "projects/arcverse/index.html", "portfolio/index.html",
        "portfolio/alexandru-tunaru/index.html",
    }
    errors = [f"Missing required page: {name}" for name in sorted(required - names)]
    for path in files:
        if path.suffix not in (".html", ".css", ".js"):
            continue
        data = path.read_bytes()
        text = data.decode("utf-8", errors="strict")
        if data.startswith(b"\xef\xbb\xbf"):
            errors.append(f"UTF-8 BOM: {path.relative_to(SITE)}")
        urls = []
        if path.suffix == ".html":
            parser = References()
            parser.feed(text)
            urls = parser.urls
            if "http://d6studio.uk" in text:
                errors.append(f"Insecure production URL: {path.relative_to(SITE)}")
        elif path.suffix == ".css":
            matches = re.finditer(r"url\(\s*(?:\"([^\"]*)\"|'([^']*)'|([^'\")\s]+))\s*\)", text)
            urls = [next(value for value in match.groups() if value is not None) for match in matches]
        base = ORIGIN + "/" + path.relative_to(SITE).as_posix()
        for url in urls:
            if url.startswith("#"):
                continue
            target = urlsplit(urljoin(base, url))
            if target.scheme not in ("http", "https") or target.netloc != "d6studio.uk":
                continue
            name = unquote(target.path).lstrip("/")
            if not name or name.endswith("/"):
                name += "index.html"
            if name not in names:
                errors.append(f"{path.relative_to(SITE)}: missing local target {url}")
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"Validated {len(files)} public files and local page/asset references.")
    return files


def check_live(path):
    relative = path.relative_to(SITE).as_posix()
    # These files are deliberately denied to HTTP clients by .htaccess.
    if path.name.startswith("."):
        return
    url = ORIGIN + "/" + quote(relative)
    request = Request(url + "?deploy=" + quote(os.environ.get("GITHUB_SHA", "check")),
                      headers={"Cache-Control": "no-cache", "User-Agent": "D6-Deploy-Check"})
    with urlopen(request, timeout=30) as response:
        if response.status != 200 or urlsplit(response.url).scheme != "https":
            raise RuntimeError(f"Unexpected response for {relative}")
        if hashlib.sha256(response.read()).digest() != hashlib.sha256(path.read_bytes()).digest():
            raise RuntimeError(f"Published contents differ: {relative}")


if __name__ == "__main__":
    public_files = check_local()
    if "--live" in sys.argv:
        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(check_live, public_files))
        print("All published page and asset contents match this checkout over verified HTTPS.")
