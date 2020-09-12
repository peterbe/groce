import os
from pathlib import Path

import requests

BASE_URL = os.environ.get("BASE_URL", "https://thatsgroce.web.app")
BUILD_ROOT = Path("build")


def get(uri, *args, **kwargs):
    url = BASE_URL + uri
    return requests.get(url, *args, **kwargs)


def test_index_html():
    r = get("/")
    assert r.status_code == 200
    assert r.headers["content-type"] == "text/html; charset=utf-8"


def test_about():
    r = get("/about")
    assert r.status_code == 200
    assert r.headers["content-type"] == "text/html; charset=utf-8"
    assert "<title>About That" in r.text


def test_shopping():
    r = get("/shopping")
    assert r.status_code == 200
    assert r.headers["content-type"] == "text/html; charset=utf-8"
    assert "<title>That" in r.text


def test_version_page():
    r = get("/version")
    assert r.status_code == 200
    assert r.headers["content-type"] == "text/html; charset=utf-8"


def test_shopping_list():
    r = get("/shopping/xyz")
    assert r.status_code == 200
    assert r.headers["content-type"] == "text/html; charset=utf-8"
    assert "<title>That" in r.text


def test_explicit_index_html():
    r = get("/index.html")
    assert r.status_code == 200
    assert r.headers["content-type"] == "text/html; charset=utf-8"
    assert "<title>That" in r.text


def test_200_bundles():
    for path in [
        x
        for x in BUILD_ROOT.iterdir()
        if x.name.startswith("bundle") and ".esm." in x.name
    ]:
        uri = f"/{path.relative_to(BUILD_ROOT)}"
        r = get(uri)
        assert r.status_code == 200
        if uri.endswith(".map"):
            # https://stackoverflow.com/a/19912684/205832
            assert r.headers["content-type"].startswith("application/json")
        else:
            assert r.headers["content-type"].startswith("text/javascript") or r.headers[
                "content-type"
            ].startswith("application/javascript")
        assert r.headers["cache-control"] == "max-age=315360000"


def test_400_nonexistant_bundle():
    r = get("/bundle.404000.js")
    assert r.status_code == 404


def test_sw_headers():
    r = get("/sw.js")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/javascript") or r.headers[
        "content-type"
    ].startswith("application/javascript")
    assert r.headers["cache-control"] == "no-cache"
    r = get("/sw-esm.js")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/javascript") or r.headers[
        "content-type"
    ].startswith("application/javascript")
    assert r.headers["cache-control"] == "no-cache"
