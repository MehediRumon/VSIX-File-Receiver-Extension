// locatorHighlighter.js
export function highlightElement(element) {
    const previousOutline = element.style.outline;
    element.style.outline = '3px solid #0ea5e9';
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
        element.style.outline = previousOutline;  // Restore previous outline after a delay
    }, 3000);
}

export function highlightElementsByXpath(xpath) {
    const evaluator = new XPathEvaluator();
    const result = evaluator.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < result.snapshotLength; i++) {
        highlightElement(result.snapshotItem(i));
    }
}
