// logic.js

/**
 * Formats a string into a human-readable label.
 * Example: "firstName" -> "First Name"
 */
export function toHumanReadable(text) {
    return text.replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Generates a fallback XPath selector for an input element.
 */
export function generateFallbackXPath(input) {
    let tag = input.tagName.toLowerCase();
    if (input.name) {
        return `//${tag}[@name='${input.name}']`;
    } else if (input.getAttribute('placeholder')) {
        let placeholder = input.getAttribute('placeholder').replace(/"/g, '');
        return `//${tag}[@placeholder='${placeholder}']`;
    } else {
        return `//${tag}`;
    }
}

/**
 * Gets the direct (not nested) text content of an element.
 */
export function getDirectText(element) {
    let directText = '';
    element.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            directText += node.nodeValue.trim() + ' ';
        }
    });
    return directText.trim();
}

/**
 * Finds the associated <label> element for a given input, if it exists.
 */
export function getLabelForInput(input) {
    if (input.id) {
        const explicit = document.querySelector(`label[for='${input.id}']`);
        if (explicit) return explicit;
    }
    let el = input;
    while (el && el !== document.body) {
        let prev = el.previousElementSibling;
        while (prev) {
            if (prev.tagName === 'LABEL') return prev;
            prev = prev.previousElementSibling;
        }
        if (el.parentElement?.tagName === 'LABEL') return el.parentElement;
        el = el.parentElement;
    }
    return null;
}

/**
 * Optionally used to insert the menu name into step templates.
 * If you use a menuName context variable elsewhere, you can pass it here.
 */
export function insertMenu(verb, label, menuName = '') {
    return menuName && menuName.trim().length > 0
        ? `${verb} ${menuName.trim()} ${label}`
        : `${verb} ${label}`;
}

// ---- Optional: Step templates if you want to centralize Gherkin step generation ----
export const stepTemplates = {
    click: (label, menuName = '') => `When ${insertMenu('Click On', label, menuName)}`,
    enter: (label, varName, menuName = '') => `When ${insertMenu('Enter', label, menuName)} "<${varName}>"`,
    select: (label, varName, menuName = '') => `When ${insertMenu('Select', label, menuName)} "<${varName}>"`,
};
