#!/usr/bin/env python3
"""
Showcase recorder and gallery capture script for tech.livive.net.
Standardized 30-second 720p demo video + 6 high-resolution gallery screenshots.
"""

import http.server
import os
import socketserver
import subprocess
import sys
import threading
import time
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DEMOS_DIR = ROOT / "demos" / "latest"
GALLERY_DIR = DEMOS_DIR / "gallery"
PORT = 4195

GALLERY_DIR.mkdir(parents=True, exist_ok=True)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):
        pass  # Suppress HTTP access logging


def start_server():
    server = socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    return server


def inject_cursor(page):
    js_code = """
    (() => {
        if (window.__cursorInjected) return;
        window.__cursorInjected = true;
        const cursor = document.createElement('div');
        cursor.id = 'playwright-demo-cursor';
        cursor.style.position = 'fixed';
        cursor.style.top = '0';
        cursor.style.left = '0';
        cursor.style.width = '20px';
        cursor.style.height = '20px';
        cursor.style.borderRadius = '50%';
        cursor.style.backgroundColor = 'rgba(56, 189, 248, 0.7)';
        cursor.style.border = '2px solid #ffffff';
        cursor.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.8)';
        cursor.style.pointerEvents = 'none';
        cursor.style.zIndex = '9999999';
        cursor.style.transform = 'translate(-50%, -50%)';
        cursor.style.transition = 'width 0.15s ease, height 0.15s ease, background-color 0.15s ease';
        document.body.appendChild(cursor);

        window.__setCursorPos = (x, y) => {
            cursor.style.left = x + 'px';
            cursor.style.top = y + 'px';
        };

        window.__cursorClickAnim = () => {
            cursor.style.width = '30px';
            cursor.style.height = '30px';
            cursor.style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
            setTimeout(() => {
                cursor.style.width = '20px';
                cursor.style.height = '20px';
                cursor.style.backgroundColor = 'rgba(56, 189, 248, 0.7)';
            }, 200);
        };
    })();
    """
    page.evaluate(js_code)


def move_mouse_smooth(page, from_x, from_y, to_x, to_y, steps=15, interval=0.015):
    for i in range(1, steps + 1):
        curr_x = from_x + (to_x - from_x) * (i / steps)
        curr_y = from_y + (to_y - from_y) * (i / steps)
        page.mouse.move(curr_x, curr_y)
        page.evaluate(f"window.__setCursorPos && window.__setCursorPos({curr_x}, {curr_y})")
        time.sleep(interval)


def click_element_smooth(page, selector, current_pos, wait_after=0.2):
    elem = page.locator(selector).first
    elem.scroll_into_view_if_needed()
    time.sleep(0.1)
    box = elem.bounding_box()
    if box:
        target_x = box["x"] + box["width"] / 2
        target_y = box["y"] + box["height"] / 2
        move_mouse_smooth(page, current_pos[0], current_pos[1], target_x, target_y)
        page.evaluate("window.__cursorClickAnim && window.__cursorClickAnim()")
        time.sleep(0.08)
        elem.click()
        if wait_after > 0:
            time.sleep(wait_after)
        return (target_x, target_y)
    return current_pos


def scroll_smooth(page, target_y, steps=20, delay=0.03):
    current_y = page.evaluate("window.scrollY")
    diff = target_y - current_y
    for i in range(1, steps + 1):
        step_y = current_y + diff * (i / steps)
        page.evaluate(f"window.scrollTo(0, {step_y})")
        time.sleep(delay)


def main():
    print(f"[*] Starting local server on http://127.0.0.1:{PORT} ...")
    server = start_server()
    time.sleep(0.5)

    video_tmp_dir = ROOT / "demos" / "tmp_video"
    video_tmp_dir.mkdir(parents=True, exist_ok=True)

    print("[*] Launching Playwright Chromium (1280x720, 30-second target) ...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            device_scale_factor=1,
            record_video_dir=str(video_tmp_dir),
            record_video_size={"width": 1280, "height": 720},
        )
        page = context.new_page()

        start_time = time.time()
        pos = (640, 360)

        # Navigate
        page.goto(f"http://127.0.0.1:{PORT}/", wait_until="networkidle")
        inject_cursor(page)
        page.evaluate(f"window.__setCursorPos && window.__setCursorPos({pos[0]}, {pos[1]})")
        time.sleep(0.5)

        # ----------------------------------------------------
        # Act I: The Publication Index & Dynamic Filtering (00.0s - 06.0s)
        # ----------------------------------------------------
        print("[1/5] Capturing Publication Index and Category Filtering...")
        page.wait_for_selector(".chips button", timeout=4000)

        # Move cursor to 'DIY / Maker Project' chip
        diy_btn = 'button[data-filter="diy-maker-project"]'
        pos = click_element_smooth(page, diy_btn, pos, wait_after=0.6)

        # Still 1: Publication index with active filter
        page.screenshot(path=str(GALLERY_DIR / "01-publication-index-and-chips.png"))
        print("  -> Saved 01-publication-index-and-chips.png")

        # Move to 'Modular Computing' chip
        mod_btn = 'button[data-filter="modular-computing"]'
        pos = click_element_smooth(page, mod_btn, pos, wait_after=0.6)

        # Reset back to 'All'
        all_btn = 'button[data-filter=""]'
        pos = click_element_smooth(page, all_btn, pos, wait_after=0.6)

        # ----------------------------------------------------
        # Act II: Deep Hardware Architecture & Interactive Teardown (06.0s - 14.5s)
        # ----------------------------------------------------
        print("[2/5] Demonstrating Deep Hardware Architecture & PCB Teardown...")
        hackberry_link = 'a[href="#/post/inside-the-hackberry-pi-cm5-how-open-pcb-design-is-reviving"]'
        pos = click_element_smooth(page, hackberry_link, pos, wait_after=0.8)
        inject_cursor(page)

        # Scroll to Fig 4 (Power Path)
        page.wait_for_selector('img[src*="fig4-power-path.svg"]', timeout=3000)
        fig4_elem = page.locator('img[src*="fig4-power-path.svg"]').first
        fig4_y = fig4_elem.bounding_box()["y"] + page.evaluate("window.scrollY") - 80
        scroll_smooth(page, fig4_y, steps=15, delay=0.03)
        time.sleep(0.6)

        # Move mouse near power path diagram
        move_mouse_smooth(page, pos[0], pos[1], 640, 380, steps=10)
        pos = (640, 380)

        # Still 2: Hardware schematic power path
        page.screenshot(path=str(GALLERY_DIR / "02-hardware-schematic-power-path.png"))
        print("  -> Saved 02-hardware-schematic-power-path.png")
        time.sleep(0.6)

        # Scroll to Fig 2 (CM5 Routing) and Fig 5 (DPI timing)
        page.wait_for_selector('img[src*="fig2-cm5-routing.svg"]', timeout=3000)
        fig2_elem = page.locator('img[src*="fig2-cm5-routing.svg"]').first
        fig2_y = fig2_elem.bounding_box()["y"] + page.evaluate("window.scrollY") - 70
        scroll_smooth(page, fig2_y, steps=15, delay=0.03)
        time.sleep(0.6)

        # Move mouse over routing rules
        move_mouse_smooth(page, pos[0], pos[1], 580, 320, steps=10)
        pos = (580, 320)

        # Still 3: High speed bus routing & DPI timing
        page.screenshot(path=str(GALLERY_DIR / "03-high-speed-bus-routing.png"))
        print("  -> Saved 03-high-speed-bus-routing.png")
        time.sleep(0.8)

        # Scroll down to sources section
        sources_y = page.evaluate("document.body.scrollHeight - 900")
        scroll_smooth(page, sources_y, steps=12, delay=0.02)
        time.sleep(0.4)

        # ----------------------------------------------------
        # Act III: Multi-Agent AI Persona Masthead (14.5s - 20.5s)
        # ----------------------------------------------------
        print("[3/5] Navigating to Authors Directory...")
        # Scroll back to top
        scroll_smooth(page, 0, steps=10, delay=0.02)
        time.sleep(0.3)

        pos = click_element_smooth(page, 'header.site nav a[href="#/authors"]', pos, wait_after=0.8)
        inject_cursor(page)
        page.wait_for_selector(".author-list .author-card", timeout=3000)

        # Move mouse over author cards
        move_mouse_smooth(page, pos[0], pos[1], 450, 360, steps=12)
        pos = (450, 360)
        time.sleep(0.5)

        # Still 4: AI Persona masthead
        page.screenshot(path=str(GALLERY_DIR / "04-ai-persona-masthead.png"))
        print("  -> Saved 04-ai-persona-masthead.png")
        time.sleep(0.6)

        # ----------------------------------------------------
        # Act IV: Persona Dossier — Beats, Traits & Bench Toolkits (20.5s - 25.5s)
        # ----------------------------------------------------
        print("[4/5] Exploring Author Dossier: Forge (Hardware & Teardowns)...")
        pos = click_element_smooth(page, 'a.author-card[href="#/author/forge"]', pos, wait_after=0.8)
        inject_cursor(page)
        page.wait_for_selector(".author-head h1", timeout=3000)

        # Scroll to inspect traits and toolkit
        scroll_smooth(page, 280, steps=10, delay=0.03)
        time.sleep(0.5)

        # Move mouse over Toolkit tags
        move_mouse_smooth(page, pos[0], pos[1], 500, 390, steps=10)
        pos = (500, 390)

        # Still 5: Persona dossier, beats, and toolkit
        page.screenshot(path=str(GALLERY_DIR / "05-persona-dossier-and-toolkit.png"))
        print("  -> Saved 05-persona-dossier-and-toolkit.png")
        time.sleep(0.6)

        # ----------------------------------------------------
        # Act V: Primary Sources & The Zero-Build Manifesto (25.5s - 30.0s)
        # ----------------------------------------------------
        print("[5/5] Presenting About Manifesto and Zero-Build Philosophy...")
        scroll_smooth(page, 0, steps=8, delay=0.02)
        time.sleep(0.2)

        pos = click_element_smooth(page, 'header.site nav a[href="#/about"]', pos, wait_after=0.6)
        inject_cursor(page)
        page.wait_for_selector("article header h1", timeout=3000)

        # Move cursor to manifesto card
        move_mouse_smooth(page, pos[0], pos[1], 520, 260, steps=12)
        pos = (520, 260)

        # Still 6: Zero-build philosophy
        page.screenshot(path=str(GALLERY_DIR / "06-sources-and-static-philosophy.png"))
        print("  -> Saved 06-sources-and-static-philosophy.png")

        # Hold on final frame until exactly 30.0s elapsed
        elapsed = time.time() - start_time
        remaining = 30.0 - elapsed
        if remaining > 0:
            print(f"[*] Polishing final frame hold ({remaining:.1f}s) to hit exact 30.0s runtime...")
            time.sleep(remaining)

        # Finish recording
        print("[*] Closing browser session to flush video stream...")
        video_path = page.video.path()
        context.close()
        browser.close()

    server.shutdown()

    # Move and transcode video
    print(f"[*] Raw video saved at: {video_path}")
    final_webm = DEMOS_DIR / "demo.webm"

    ffmpeg_bin = Path(os.path.expanduser("~/Library/Caches/ms-playwright/ffmpeg-1013/ffmpeg-mac"))
    if not ffmpeg_bin.exists():
        ffmpeg_bin = Path("/usr/bin/ffmpeg")

    if ffmpeg_bin.exists():
        print(f"[*] Transcoding with {ffmpeg_bin} to {final_webm} ...")
        cmd = [
            str(ffmpeg_bin),
            "-y",
            "-i", str(video_path),
            "-t", "30.0",
            "-c:v", "libvpx-vp9",
            "-b:v", "750k",
            "-crf", "32",
            "-an",
            str(final_webm),
        ]
        subprocess.run(cmd, check=True)
    else:
        print(f"[*] Moving raw video to {final_webm} ...")
        os.replace(video_path, final_webm)

    # Generate webp thumbnail
    thumb_path = DEMOS_DIR / "thumb.webp"
    netfix_thumb = ROOT.parent / "thumbnails" / "tech-livive-net.webp"
    print(f"[*] Generating optimized WebP thumbnail at {thumb_path} ...")
    with Image.open(GALLERY_DIR / "02-hardware-schematic-power-path.png") as img:
        img_rgb = img.convert("RGB")
        img_rgb.save(thumb_path, "WEBP", quality=85)
        if netfix_thumb.parent.exists():
            img_rgb.save(netfix_thumb, "WEBP", quality=85)
            print(f"  -> Also updated netfix root {netfix_thumb}")

    print("[SUCCESS] Showcase assets created successfully:")
    print(f"  - Video: {final_webm} ({os.path.getsize(final_webm)} bytes)")
    print(f"  - Thumbnail: {thumb_path} ({os.path.getsize(thumb_path)} bytes)")
    for g in sorted(GALLERY_DIR.glob("*.png")):
        print(f"  - Gallery: {g.name} ({os.path.getsize(g)} bytes)")


if __name__ == "__main__":
    main()
