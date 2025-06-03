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

/**
 * Recursively draws arrows for a formatted queue node and its effective children.
 * @param {Object} formattedQueueNode - The formatted queue node from QueueViewDataFormatter.
 * @param {SVGElement} svg - The SVG container.
 * @param {DOMRect} svgRect - The bounding rect of the SVG container.
 */
function drawArrowsForFormattedQueue(formattedQueueNode, svg, svgRect) {
  if (!formattedQueueNode || typeof formattedQueueNode.path !== 'string' || formattedQueueNode.isDeleted) {
    // Don't draw arrows from or to a deleted queue, or if node is invalid
    return;
  }

  const parentElement = queueElements.get(formattedQueueNode.path);
  if (!parentElement) {
    return;
  }
  const parentRect = parentElement.getBoundingClientRect();

  if (formattedQueueNode.children && typeof formattedQueueNode.children === 'object') {
    Object.values(formattedQueueNode.children).forEach((formattedChildNode) => {
      // formattedChildNode is already an effective child (not deleted, could be new)
      if (formattedChildNode && typeof formattedChildNode.path === 'string' && !formattedChildNode.isDeleted) {
        const childElement = queueElements.get(formattedChildNode.path);
        if (childElement) {
          const childRect = childElement.getBoundingClientRect();
          drawArrowToChild(parentRect, childRect, svgRect, svg); // Existing helper
          drawArrowsForFormattedQueue(formattedChildNode, svg, svgRect); // Recursive call with formatted child
        }
      }
    });
  }
}

/**
 * Main function to draw all arrows on the queue tree.
 * Uses the formatted hierarchy from QueueViewDataFormatter.
 */
function drawArrows() {
  if (!viewDataFormatter) {
    console.warn("drawArrows: ViewDataFormatter not available. Skipping arrow rendering.");
    return;
  }
  const formattedHierarchyRoot = viewDataFormatter.getFormattedQueueHierarchy();
  if (!formattedHierarchyRoot) {
    return;
  }

  const svg = document.getElementById("arrow-svg");
  if (!svg) {
    console.error("drawArrows: SVG element 'arrow-svg' not found.");
    return;
  }

  // Clear only previous arrow paths
  const arrowPaths = svg.querySelectorAll("path.arrow-line");
  arrowPaths.forEach(path => path.remove());

  // Ensure <defs> exists (it should be static in HTML or added once on init)
  if (!svg.querySelector("defs #arrowhead")) {
    console.warn("Arrowhead definition missing in SVG. Arrows may not render correctly.");
    // Optionally, recreate defs here if it might be missing, though it's better if static in HTML.
  }

  const svgRect = svg.getBoundingClientRect();
  drawArrowsForFormattedQueue(formattedHierarchyRoot, svg, svgRect);
}
window.drawArrows = drawArrows;
