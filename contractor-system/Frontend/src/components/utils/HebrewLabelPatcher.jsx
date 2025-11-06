import React, { useEffect } from "react";

/**
 * Exact + in-string patcher: replaces specific Hebrew UI labels under a scoped container
 * without touching logic or data keys. Safe for dynamic content via MutationObserver.
 */
export default function HebrewLabelPatcher({ containerSelector = "#quote-create-root" }) {
  useEffect(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    // Patterns for common variants (order matters: specific -> generic)
    const patterns = [
      { re: /הגדרות\s*טיח/g, replacement: "הגדרות שפכטל" },
      { re: /רמת\s*מורכבות\s*לטיח/g, replacement: "רמת מורכבות לשפכטל" },
      { re: /מורכבות\s*לטיח/g, replacement: "מורכבות לשפכטל" },
      { re: /סוג\s*טיח/g, replacement: "סוג שפכטל" },
      { re: /צבע\s*וטיח/g, replacement: "צבע ושפכטל" },
      { re: /צבע\s*ו\s*טיח/g, replacement: "צבע ושפכטל" },
      // Generic: replace standalone/word 'טיח' (also inside buttons with icons/emojis)
      { re: /טיח/g, replacement: "שפכטל" },
    ];

    const replaceInTextNode = (node) => {
      const original = node.textContent;
      if (!original) return;
      let text = original;
      patterns.forEach(({ re, replacement }) => {
        text = text.replace(re, replacement);
      });
      if (text !== original) {
        node.textContent = text;
      }
    };

    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        replaceInTextNode(node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        node.childNodes.forEach(walk);
      }
    };

    // Initial pass
    walk(container);

    // Observe future changes
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === Node.ELEMENT_NODE) {
            walk(n);
          } else if (n.nodeType === Node.TEXT_NODE) {
            replaceInTextNode(n);
          }
        });
        if (m.type === "characterData" && m.target) {
          replaceInTextNode(m.target);
        }
      }
    });

    observer.observe(container, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [containerSelector]);

  return null;
}