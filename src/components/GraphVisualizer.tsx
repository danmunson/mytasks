import React, { useState, useEffect, useRef, useCallback } from 'react';
import { instance, Viz } from '@viz-js/viz';
import styled from 'styled-components';

const Container = styled.div`
  border: 1px solid #ccc;
  padding: 20px;
  overflow: hidden;
  width: 500px;
  height: 500px;
`;

const SVGContainer = styled.div<{ scale: number; x: number; y: number }>`
  transform: translate3d(${props => props.x}px, ${props => props.y}px, 0) scale(${props => props.scale});
  transform-origin: center;
  width: fit-content;
  height: fit-content;
  margin: 0 auto;
  will-change: transform;
`;

interface Props {
  dotString: string;
}

interface NodeModifier {
  color: string;
}

interface SvgModifiers {
  nodes: Record<string, NodeModifier>;
}

const GraphVisualizer: React.FC<Props> = ({ dotString }) => {
  const [viz, setViz] = useState<Viz | null>(null);
  const [baseSvgElement, setBaseSvgElement] = useState<SVGElement | null>(null);
  const [modifiers, setModifiers] = useState<SvgModifiers>({ nodes: {} });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initViz = async () => {
      const vizInstance = await instance();
      setViz(vizInstance);
    };
    initViz();
  }, []);

  // Helper function to get node name from node element
  const getNodeName = (nodeElement: Element): string => {
    const textElement = nodeElement.querySelector('text');
    return textElement?.textContent || '';
  };

  // Render base SVG when dotString changes
  useEffect(() => {
    if (viz) {
      try {
        const newSvgElement = viz.renderSVGElement(dotString);
        setBaseSvgElement(newSvgElement);
      } catch (error) {
        console.error('Graph rendering error:', error);
      }
    }
  }, [dotString, viz]);

  // Apply modifiers to create final SVG
  useEffect(() => {
    if (!baseSvgElement) return;

    const modifiedSvg = baseSvgElement.cloneNode(true) as SVGElement;

    // Apply node modifiers using node names
    const currentNodes = new Set<string>();
    Object.entries(modifiers.nodes).forEach(([nodeName, modifier]) => {
      modifiedSvg.querySelectorAll('.node').forEach(node => {
        currentNodes.add(getNodeName(node));
        if (getNodeName(node) === nodeName) {
          const ellipse = node.querySelector('ellipse');
          if (ellipse) {
            (ellipse as SVGElement).setAttribute('fill', modifier.color);
          }
        }
      });
    });

    // remove any entries in modifiers.nodes that are not in currentNodes
    Object.keys(modifiers.nodes).forEach(nodeName => {
      if (!currentNodes.has(nodeName)) {
        delete modifiers.nodes[nodeName];
      }
    });

    if (svgContainerRef.current) {
      svgContainerRef.current.innerHTML = modifiedSvg.outerHTML;

      // Attach click handlers
      const container = svgContainerRef.current;
      container.querySelectorAll('.node').forEach(node => {
        node.addEventListener('click', (e) => {
          e.stopPropagation();
          const nodeName = getNodeName(node);
          setModifiers(prev => {
            const newModifiers = { 
              ...prev,
              nodes: { ...prev.nodes }
            };
            if (newModifiers.nodes[nodeName]?.color === '#90EE90') {
              delete newModifiers.nodes[nodeName];
            } else {
              newModifiers.nodes[nodeName] = { color: '#90EE90' };
            }
            return newModifiers;
          });
        });
      });
    }
  }, [baseSvgElement, modifiers]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const delta = e.deltaY > 0 ? 1/zoomFactor : zoomFactor;
    setScale(prevScale => Math.min(Math.max(prevScale * delta, 0.1), 5));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only start dragging if we click the background
    if ((e.target as Element).tagName === 'DIV') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <Container
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <SVGContainer
        scale={scale}
        x={offset.x}
        y={offset.y}
        ref={svgContainerRef}
      />
    </Container>
  );
};

export default GraphVisualizer; 