import React, { useEffect } from "react";

// Hide only the "הוסף פריט חדש מהקטלוג" header and its immediate section in tiling editor,
// without collapsing the entire category editor.
export default function HideTilingCatalogAdd() {
  useEffect(() => {
    const HIDE_ATTR = "data-hidden-by-b44";
    const titleText = "הוסף פריט חדש מהקטלוג";
    const stopAtText = "פריטי ריצוף/חיפוי בפרויקט";

    const hideSection = () => {
      // Look for headings (safer than scanning all divs) that contain the title
      const candidates = Array.from(
        document.querySelectorAll("h1,h2,h3,[role='heading']")
      );
      candidates.forEach((el) => {
        const text = (el.textContent || "").trim();
        if (!text || !text.includes(titleText)) return;

        // Avoid re-processing
        if (el.getAttribute(HIDE_ATTR) === "1") return;

        // Hide the heading itself
        el.style.display = "none";
        el.setAttribute(HIDE_ATTR, "1");

        // Hide following siblings until we reach the next section title
        let sib = el.nextElementSibling;
        while (sib) {
          const sibText = (sib.textContent || "").trim();
          // Stop when reaching the next section content
          if (sibText && sibText.includes(stopAtText)) break;

          sib.style.display = "none";
          sib.setAttribute(HIDE_ATTR, "1");
          sib = sib.nextElementSibling;
        }
      });
    };

    // Initial run and observe future renders
    hideSection();
    const observer = new MutationObserver(hideSection);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}