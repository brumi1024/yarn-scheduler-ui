function drawArrowToChild(parentRect, childRect, svgRect, svg) {
  // Calculate center Y for both boxes, relative to the SVG container
  const startY = parentRect.top + parentRect.height / 2 - svgRect.top;
  const endY = childRect.top + childRect.height / 2 - svgRect.top;

  // Start at the right edge of the parent box, relative to the SVG
  const startX = parentRect.right - svgRect.left;
  // End at the left edge of the child box, relative to the SVG
  const endX = childRect.left - svgRect.left;

  // Nudge the arrow a bit inside the card to avoid overshooting
  const nudge = 8;
  const adjustedStartX = startX - nudge;
  const adjustedEndX = endX + nudge;

  // Use a quadratic curve for a nice effect
  const midX = adjustedStartX + (adjustedEndX - adjustedStartX) / 2;
  const pathData = `M ${adjustedStartX} ${startY} Q ${midX} ${startY} ${adjustedEndX} ${endY}`;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  path.setAttribute("class", "arrow-line");
  path.setAttribute("marker-end", "url(#arrowhead)");
  svg.appendChild(path);
}

function drawArrows() {
  const svg = document.getElementById("arrow-svg");
  svg.innerHTML = svg.innerHTML.split("</defs>")[0] + "</defs>";

  // Use the bounding rect of the SVG overlay, not the queue-tree
  const svgRect = svg.getBoundingClientRect();

  function drawArrowsForQueue(queue) {
    const parentElement = queueElements.get(queue.path);
    if (!parentElement) return;

    const parentRect = parentElement.getBoundingClientRect();

    // Draw arrows to existing children
    Object.values(queue.children).forEach((child) => {
      if (pendingDeletions.has(child.path)) return;
      const childElement = queueElements.get(child.path);
      if (!childElement) return;
      const childRect = childElement.getBoundingClientRect();
      drawArrowToChild(parentRect, childRect, svgRect, svg);
      drawArrowsForQueue(child);
    });

    // Draw arrows to new children
    Array.from(pendingAdditions.values()).forEach((newQueue) => {
      if (newQueue.parentPath !== queue.path) return;
      const childElement = queueElements.get(newQueue.path);
      if (!childElement) return;
      const childRect = childElement.getBoundingClientRect();
      drawArrowToChild(parentRect, childRect, svgRect, svg);
      drawArrowsForQueue(newQueue);
    });
  }

  drawArrowsForQueue(queueData);
}

window.drawArrows = drawArrows;
