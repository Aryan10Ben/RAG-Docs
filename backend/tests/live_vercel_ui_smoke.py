"""Real browser acceptance test for the deployed SourceLens review build.

Uses Playwright Chromium to upload a synthetic PDF through the React UI,
ask a question, and verify both the returned answer and displayed evidence.
No user data and no API mocks.

Install: pip install playwright reportlab; python -m playwright install chromium
Run: RAG_API_URL=https://your-preview.vercel.app python backend/tests/live_vercel_ui_smoke.py
"""
import asyncio
import io
import os
import sys

from playwright.async_api import async_playwright, expect
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

BASE_URL = os.environ.get("RAG_API_URL", "").rstrip("/")
FACT = "481726"


def make_pdf():
    buffer = io.BytesIO()
    doc = canvas.Canvas(buffer, pagesize=letter)
    doc.setTitle("SourceLens harmless browser smoke test")
    for index, line in enumerate([
        "Silver Compass is a fictional university research project.",
        "The certification number of Silver Compass is 481726.",
        "The study included 73 participants.",
        "This PDF contains fabricated and safe test content.",
    ]):
        doc.drawString(55, 750 - 27 * index, line)
    doc.save()
    return buffer.getvalue()


async def run():
    if not BASE_URL.startswith("https://"):
        raise RuntimeError("Set RAG_API_URL to the HTTPS Vercel preview URL.")
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        page_errors = []
        server_responses = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on("response", lambda response: server_responses.append((response.url, response.status)))
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=35000)
        await expect(page.locator(".kinetic-title")).to_have_text("Upload. Ask. Find.")
        await expect(page.locator(".hero-description")).to_have_text("Upload a PDF. Ask a question. Find answers.")
        await expect(page.locator(".kinetic-track")).to_be_visible()
        assert await page.locator(".kinetic-title > span").count() == 3
        for obsolete in ("DOCUMENT INTELLIGENCE", "YOUR DOCUMENTS, MADE SEARCHABLE", "Find what matters.", "AI generation optional"):
            assert obsolete not in await page.locator("body").inner_text(), "Obsolete hero copy: " + obsolete
        await expect(page.get_by_role("link", name="SourceLens home")).to_be_visible()
        assert await page.locator(".brand-wordmark").inner_text() == "SourceLens"
        assert await page.locator(".brand-symbol").count() == 1
        scan = await page.locator(".drop-target").evaluate("(el) => getComputedStyle(el, \"::before\").animationName")
        assert scan == "upload-glass-scan", "Missing upload scan animation"
        backdrop = await page.locator(".drop-target").evaluate("(el) => getComputedStyle(el).backdropFilter")
        assert "blur(5px)" in backdrop, "The glass panel blur is missing"
        print("PASS: SourceLens logo and glass upload light sweep", flush=True)
        assert await page.locator(".orbital-dotfield").count() == 1
        assert await page.locator("[data-meridian]").count() == 24
        animations = []
        for selector in (".hero-word-upload", ".hero-word-ask", ".ask-s", ".hero-word-find"):
            animations.append(await page.locator(selector).evaluate("(el) => getComputedStyle(el).animationName"))
        assert animations == ["upload-rock", "ask-sweep", "ask-s-pulse", "find-shift"], "Unexpected word animations: " + str(animations)
        meridian = page.locator("[data-meridian]").nth(4)
        before = float(await meridian.get_attribute("rx"))
        await page.wait_for_timeout(460)
        after = float(await meridian.get_attribute("rx"))
        assert abs(before - after) > 1, "Globe longitudes did not rotate"
        await page.screenshot(path="sourcelens-kinetic-hero.png", full_page=True, animations="allow")
        print("PASS: Globe revolves smoothly, matte dotted background, and three distinct word animations", flush=True)
        print("PASS: Desktop page renders", flush=True)
        await page.locator('input[aria-label="Choose a PDF document"]').set_input_files({
            "name": "silver-compass.pdf",
            "mimeType": "application/pdf",
            "buffer": make_pdf(),
        })
        await expect(page.locator(".selected-file-name")).to_contain_text("silver-compass.pdf")
        await page.get_by_role("button", name="Analyze document").click()
        await expect(page.locator(".studio-intro h1")).to_be_visible(timeout=65000)
        await expect(page.locator(".document-pill")).to_contain_text("silver-compass.pdf")
        print("PASS: PDF uploaded and indexed in the real browser", flush=True)
        await page.locator("#document-question").fill("What is the certification number of Silver Compass?")
        await page.get_by_role("button", name="Ask", exact=True).click()
        await expect(page.locator(".answer-content > p").first).to_contain_text(FACT, timeout=65000)
        await expect(page.locator(".evidence-item summary").first).to_contain_text("Page 1")
        await expect(page.locator(".answer-actions")).to_contain_text("Extracted from your PDF")
        print("PASS: UI shows the actual fact, the cited PDF page, and honest extractive status", flush=True)
        for endpoint in ("/api/extract", "/api/index", "/api/ask"):
            matches = [code for url, code in server_responses if endpoint in url]
            assert matches and 200 in matches, f"Missing successful API response for {endpoint}: {matches}"
        print("PASS: All three real API requests returned HTTP 200", flush=True)
        await page.screenshot(path="sourcelens-desktop-proof.png", full_page=True)

        mobile = await browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, reduced_motion="reduce")
        mobile_page = await mobile.new_page()
        await mobile_page.goto(BASE_URL, wait_until="domcontentloaded", timeout=35000)
        await expect(mobile_page.locator(".landing h1")).to_be_visible()
        reduced = await mobile_page.locator(".hero-word-upload").evaluate("(el) => getComputedStyle(el).animationName")
        assert reduced == "none", "Reduced-motion preference ignored"
        fixed = mobile_page.locator("[data-meridian]").nth(4)
        reduced_before = await fixed.get_attribute("rx")
        await mobile_page.wait_for_timeout(350)
        reduced_after = await fixed.get_attribute("rx")
        assert reduced_before == reduced_after, "Globe motion continues when reduced motion is requested"
        overflow = await mobile_page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 4")
        assert not overflow, "Mobile viewport has horizontal overflow"
        await mobile_page.screenshot(path="sourcelens-mobile-proof.png", full_page=True)
        print("PASS: Mobile landing page renders without horizontal overflow", flush=True)
        await mobile.close()
        await context.close()
        await browser.close()
        assert not page_errors, "Page JavaScript errors: " + "; ".join(page_errors)
        print("PASS: Zero uncaught page errors", flush=True)


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except Exception as error:
        print("FAIL:", type(error).__name__, str(error)[:1000], file=sys.stderr, flush=True)
        raise SystemExit(1)
