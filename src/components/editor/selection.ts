export function normalizePlainText(content: string) {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function getCursorLocation(content: string, offset: number) {
  const safeOffset = Math.max(0, Math.min(offset, content.length));
  const head = content.slice(0, safeOffset).split("\n");
  const line = head.length - 1;
  const column = head.at(-1)?.length ?? 0;

  return {
    column,
    line
  };
}

export function getSelectionOffsets(container: HTMLElement) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
    return null;
  }

  // We normalize the editor back to a single plaintext node, so measuring offsets through
  // cloned ranges stays deterministic even after Enter, paste, and remote sync updates.
  const startRange = range.cloneRange();
  startRange.selectNodeContents(container);
  startRange.setEnd(range.startContainer, range.startOffset);

  const endRange = range.cloneRange();
  endRange.selectNodeContents(container);
  endRange.setEnd(range.endContainer, range.endOffset);

  const start = normalizePlainText(startRange.toString()).length;
  const end = normalizePlainText(endRange.toString()).length;

  return {
    end: Math.max(start, end),
    start: Math.min(start, end)
  };
}

export function setSelectionOffsets(container: HTMLElement, start: number, end: number) {
  const selection = window.getSelection();

  if (!selection) {
    return;
  }

  let textNode = container.firstChild;

  if (!(textNode instanceof Text)) {
    container.textContent = container.textContent ?? "";
    textNode = container.firstChild;
  }

  if (!(textNode instanceof Text)) {
    textNode = document.createTextNode("");
    container.appendChild(textNode);
  }

  const safeStart = Math.max(0, Math.min(start, textNode.data.length));
  const safeEnd = Math.max(safeStart, Math.min(end, textNode.data.length));
  const range = document.createRange();
  range.setStart(textNode, safeStart);
  range.setEnd(textNode, safeEnd);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function syncPlainTextValue(
  container: HTMLElement,
  value: string,
  selection?: {
    end: number;
    start: number;
  } | null
) {
  const normalized = normalizePlainText(value);
  const currentText = normalizePlainText(container.textContent ?? "");
  const needsReset =
    currentText !== normalized ||
    container.childNodes.length !== 1 ||
    !(container.firstChild instanceof Text);

  if (needsReset) {
    // Re-writing the DOM back to one text node keeps cursor math stable for the socket payloads.
    container.textContent = normalized;
  }

  if (selection) {
    setSelectionOffsets(container, selection.start, selection.end);
  }
}
