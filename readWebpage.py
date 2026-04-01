"""Fetch visible page text and a PNG screenshot for a given URL."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


@dataclass
class WebpageCapture:
    url: str
    text: str
    screenshot_png: bytes
    title: Optional[str]


def read_webpage(
    url: str,
    *,
    goto_timeout_ms: int = 60_000,
    wait_until: str = "load",
) -> WebpageCapture:
    """
    Open the URL in a headless browser, return body text and a full-page PNG.
    ``wait_until`` is passed to Playwright (e.g. ``load``, ``domcontentloaded``, ``networkidle``).
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={"width": 1280, "height": 720})
            page.goto(url, wait_until=wait_until, timeout=goto_timeout_ms)
            title = page.title()
            text = page.inner_text("body")
            screenshot_png = page.screenshot(full_page=True, type="png")
        except PlaywrightTimeoutError as e:
            raise TimeoutError(f"Timed out loading page: {url}") from e
        finally:
            browser.close()

    return WebpageCapture(
        url=url,
        text=(text or "").strip(),
        screenshot_png=screenshot_png,
        title=title or None,
    )
