import * as d3 from 'd3';
import type { LayoutNode, FlowPath } from './D3TreeLayout';

export interface AnimationOptions {
  duration: number;
  easing: (t: number) => number;
  stagger: number;
  onStart?: () => void;
  onComplete?: () => void;
  onUpdate?: (progress: number) => void;
}

export interface AnimationState {
  isAnimating: boolean;
  progress: number;
  startTime: number;
  currentFrame: number;
}

export interface NodeTransition {
  node: LayoutNode;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startOpacity: number;
  endOpacity: number;
}

export interface FlowTransition {
  flow: FlowPath;
  startPath: string;
  endPath: string;
  startWidth: number;
  endWidth: number;
  startOpacity: number;
  endOpacity: number;
}

export class D3AnimationManager {
  private animationState: AnimationState = {
    isAnimating: false,
    progress: 0,
    startTime: 0,
    currentFrame: 0
  };

  private currentAnimation: number | null = null;
  private defaultOptions: AnimationOptions = {
    duration: 750,
    easing: d3.easeCubicInOut,
    stagger: 50
  };

  /**
   * Animate node positions
   */
  animateNodes(
    nodes: LayoutNode[],
    targetPositions: Map<string, { x: number; y: number }>,
    options: Partial<AnimationOptions> = {}
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Create transitions
    const transitions: NodeTransition[] = nodes.map(node => {
      const target = targetPositions.get(node.id) || { x: node.x, y: node.y };
      return {
        node,
        startX: node.x,
        startY: node.y,
        endX: target.x,
        endY: target.y,
        startOpacity: 1,
        endOpacity: 1
      };
    });

    return this.runAnimation(transitions, [], opts);
  }

  /**
   * Animate node collapse/expand
   */
  animateCollapse(
    affectedNodes: LayoutNode[],
    collapsing: boolean,
    options: Partial<AnimationOptions> = {}
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Create transitions with opacity changes
    const transitions: NodeTransition[] = affectedNodes.map((node, index) => ({
      node,
      startX: node.x,
      startY: node.y,
      endX: node.x,
      endY: node.y,
      startOpacity: collapsing ? 1 : 0,
      endOpacity: collapsing ? 0 : 1
    }));

    return this.runAnimation(transitions, [], opts);
  }

  /**
   * Animate the entire layout change
   */
  animateLayoutChange(
    currentNodes: LayoutNode[],
    targetNodes: LayoutNode[],
    currentFlows: FlowPath[],
    targetFlows: FlowPath[],
    options: Partial<AnimationOptions> = {}
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Create node transitions
    const nodeTransitions: NodeTransition[] = [];
    const targetNodeMap = new Map(targetNodes.map(n => [n.id, n]));
    
    currentNodes.forEach(currentNode => {
      const targetNode = targetNodeMap.get(currentNode.id);
      if (targetNode) {
        nodeTransitions.push({
          node: currentNode,
          startX: currentNode.x,
          startY: currentNode.y,
          endX: targetNode.x,
          endY: targetNode.y,
          startOpacity: 1,
          endOpacity: 1
        });
      } else {
        // Node is being removed
        nodeTransitions.push({
          node: currentNode,
          startX: currentNode.x,
          startY: currentNode.y,
          endX: currentNode.x,
          endY: currentNode.y,
          startOpacity: 1,
          endOpacity: 0
        });
      }
    });

    // Add new nodes
    targetNodes.forEach(targetNode => {
      if (!currentNodes.find(n => n.id === targetNode.id)) {
        nodeTransitions.push({
          node: targetNode,
          startX: targetNode.x,
          startY: targetNode.y,
          endX: targetNode.x,
          endY: targetNode.y,
          startOpacity: 0,
          endOpacity: 1
        });
      }
    });

    // Create flow transitions
    const flowTransitions: FlowTransition[] = [];
    // This would require more complex path interpolation
    // For now, we'll focus on node animations

    return this.runAnimation(nodeTransitions, flowTransitions, opts);
  }

  /**
   * Run the animation loop
   */
  private runAnimation(
    nodeTransitions: NodeTransition[],
    flowTransitions: FlowTransition[],
    options: AnimationOptions
  ): Promise<void> {
    return new Promise((resolve) => {
      // Cancel any existing animation
      if (this.currentAnimation) {
        cancelAnimationFrame(this.currentAnimation);
      }

      // Initialize animation state
      this.animationState = {
        isAnimating: true,
        progress: 0,
        startTime: performance.now(),
        currentFrame: 0
      };

      // Call onStart callback
      options.onStart?.();

      // Animation loop
      const animate = (currentTime: number) => {
        const elapsed = currentTime - this.animationState.startTime;
        const progress = Math.min(elapsed / options.duration, 1);
        const easedProgress = options.easing(progress);

        // Update animation state
        this.animationState.progress = progress;
        this.animationState.currentFrame++;

        // Apply transitions
        this.applyNodeTransitions(nodeTransitions, easedProgress);
        this.applyFlowTransitions(flowTransitions, easedProgress);

        // Call onUpdate callback
        options.onUpdate?.(progress);

        if (progress < 1) {
          this.currentAnimation = requestAnimationFrame(animate);
        } else {
          // Animation complete
          this.animationState.isAnimating = false;
          this.currentAnimation = null;
          options.onComplete?.();
          resolve();
        }
      };

      this.currentAnimation = requestAnimationFrame(animate);
    });
  }

  /**
   * Apply node transitions
   */
  private applyNodeTransitions(
    transitions: NodeTransition[],
    progress: number
  ): void {
    transitions.forEach(transition => {
      const { node, startX, startY, endX, endY, startOpacity, endOpacity } = transition;
      
      // Interpolate position
      node.x = startX + (endX - startX) * progress;
      node.y = startY + (endY - startY) * progress;
      
      // Interpolate opacity (would need to be applied in renderer)
      const opacity = startOpacity + (endOpacity - startOpacity) * progress;
      // Store opacity in node data for renderer to use
      (node as any).opacity = opacity;
    });
  }

  /**
   * Apply flow transitions
   */
  private applyFlowTransitions(
    transitions: FlowTransition[],
    progress: number
  ): void {
    transitions.forEach(transition => {
      const { flow, startWidth, endWidth, startOpacity, endOpacity } = transition;
      
      // Interpolate width
      flow.width = startWidth + (endWidth - startWidth) * progress;
      
      // Interpolate opacity
      const opacity = startOpacity + (endOpacity - startOpacity) * progress;
      (flow as any).opacity = opacity;
      
      // Path interpolation would require more complex logic
    });
  }

  /**
   * Stop current animation
   */
  stopAnimation(): void {
    if (this.currentAnimation) {
      cancelAnimationFrame(this.currentAnimation);
      this.currentAnimation = null;
      this.animationState.isAnimating = false;
    }
  }

  /**
   * Check if animation is running
   */
  isAnimating(): boolean {
    return this.animationState.isAnimating;
  }

  /**
   * Get current animation progress
   */
  getProgress(): number {
    return this.animationState.progress;
  }

  /**
   * Create staggered animations for multiple elements
   */
  createStaggeredAnimation(
    elements: LayoutNode[],
    staggerDelay: number = 50
  ): Promise<void>[] {
    return elements.map((element, index) => {
      return new Promise(resolve => {
        setTimeout(() => {
          // Animate individual element
          resolve();
        }, index * staggerDelay);
      });
    });
  }

  /**
   * Interpolate between two paths (simplified)
   */
  interpolatePath(startPath: string, endPath: string, progress: number): string {
    // This is a simplified implementation
    // A full implementation would parse SVG paths and interpolate control points
    return progress < 0.5 ? startPath : endPath;
  }
}