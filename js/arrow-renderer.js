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

function drawArrowsForQueue(queue) {
  // ---- START ADDED GUARD ----
  if (!queue || typeof queue.path !== 'string') {
    // console.warn("drawArrowsForQueue: Attempted to draw arrows for a null or invalid queue object:", queue);
    return;
  }
  // ---- END ADDED GUARD ----

  const parentElement = queueElements.get(queue.path); // Line 35 from original error
  if (!parentElement) {
    // console.warn(`drawArrowsForQueue: Parent element not found for queue path "${queue.path}". Arrows might be incomplete.`);
    return;
  }

  const svg = document.getElementById("arrow-svg"); // Ensure svg is accessible here
  const svgRect = svg.getBoundingClientRect(); // And svgRect

  const parentRect = parentElement.getBoundingClientRect();

  // Draw arrows to existing children
  if (queue.children && typeof queue.children === 'object') {
    Object.values(queue.children).forEach((child) => {
      // The recursive call drawArrowsForQueue(child) will be protected by the guard at its start.
      if (child && typeof child.path === 'string' && !pendingDeletions.has(child.path)) {
        const childElement = queueElements.get(child.path);
        if (childElement) {
          const childRect = childElement.getBoundingClientRect();
          drawArrowToChild(parentRect, childRect, svgRect, svg);
          drawArrowsForQueue(child); // Recursive call
        }
      }
    });
  }


  // Draw arrows to new children
  if (typeof pendingAdditions !== 'undefined' && pendingAdditions instanceof Map) {
    Array.from(pendingAdditions.values()).forEach((newQueue) => {
      if (newQueue && newQueue.parentPath === queue.path) { // Check if newQueue and newQueue.parentPath exist
        const childElement = queueElements.get(newQueue.path);
        if (childElement) {
          const childRect = childElement.getBoundingClientRect();
          drawArrowToChild(parentRect, childRect, svgRect, svg);
          drawArrowsForQueue(newQueue); // Recursive call for newly added children that might have their own pending children
        }
      }
    });
  }
}

function drawArrows() {
  // ---- START ADDED GUARD ----
  if (!window.queueData) {
    // console.warn("drawArrows: window.queueData is not available. Skipping arrow rendering.");
    return;
  }
  // ---- END ADDED GUARD ----

  const svg = document.getElementById("arrow-svg");
  if (!svg) { // Ensure SVG element exists
      // console.error("drawArrows: SVG element 'arrow-svg' not found.");
      return;
  }
  svg.innerHTML = svg.innerHTML.split("</defs>")[0] + "</defs>"; // Clear previous arrows except defs

  // Initial call to the recursive function
  drawArrowsForQueue(window.queueData);
}

window.drawArrows = drawArrows;
