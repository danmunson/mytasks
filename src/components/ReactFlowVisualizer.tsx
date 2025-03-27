import React, { CSSProperties, useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
  Connection,
  Edge as EdgeType,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Task, TaskRelationship, TaskStatus } from './types';
import dagre from 'dagre';
import styled from 'styled-components';

interface ReactFlowVisualizerProps {
  tasks: Task[];
  relationships: TaskRelationship[];
  onRelationshipsChange: (relationships: TaskRelationship[]) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
}

// Custom node styles
const nodeStyles: Record<string, CSSProperties> = {
  pending: {
    background: '#f0f0f0', // grey
    border: '1px solid #d9d9d9',
    borderRadius: '5px',
    padding: '10px',
    fontSize: '12px'
  },
  pending_ready: {
    background: '#f0f0f0',
    border: '2px solid #52c41a', // green border for ready state
    borderRadius: '5px',
    padding: '10px',
    fontSize: '12px'
  },
  in_progress: {
    background: '#fffbe6', // very mild yellow
    border: '1px solid #ffd666',
    borderRadius: '5px',
    padding: '10px',
    fontSize: '12px'
  },
  in_progress_ready: {
    background: '#fffbe6',
    border: '2px solid #52c41a', // green border for ready state
    borderRadius: '5px',
    padding: '10px',
    fontSize: '12px'
  },
  completed: {
    background: '#f6ffed', // light green
    border: '1px solid #b7eb8f',
    borderRadius: '5px',
    padding: '10px',
    fontSize: '12px',
  },
  completed_ready: {
    background: '#f6ffed',
    border: '2px solid #52c41a', // green border for ready state
    borderRadius: '5px',
    padding: '10px',
    fontSize: '12px',
  },
  parent: {
    background: 'rgba(240, 240, 255, 0.2)',
    border: '2px dashed #9370DB',
    borderRadius: '8px',
    padding: '20px',
    paddingTop: '40px',
    fontSize: '14px',
    color: '#4B0082',
    width: 300,
    minHeight: 200,
  }
};

// Add this new component
const StatusMenu = styled.div`
  position: absolute;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  padding: 8px 0;
  z-index: 1000;
`;

const StatusMenuItem = styled.div<{ active?: boolean }>`
  padding: 6px 12px;
  cursor: pointer;
  background: ${props => props.active ? '#e6f7ff' : 'transparent'};
  &:hover {
    background: ${props => props.active ? '#e6f7ff' : '#f0f0f0'};
  }
`;

// Apply dagre layout to nodes and edges
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  // Create a new dagre graph instance for the main layout
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Set graph direction and spacing
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 120,
    ranksep: 180,
    marginx: 50,
    marginy: 50
  });

  // Constants for node sizing
  const DEFAULT_WIDTH = 200;        // Default width for nodes without children
  const DEFAULT_HEIGHT = 60;        // Default height for nodes without children
  const MARGIN = 40;                // Regular margin around sides
  const TOP_MARGIN = 60;            // Extra margin at the top for parent nodes
  const MIN_PARENT_WIDTH = 300;     // Minimum width for parent nodes
  const MIN_PARENT_HEIGHT = 200;    // Minimum height for parent nodes
  
  // Create a map to track child nodes by parent ID
  const childrenByParent = new Map<string, Node[]>();
  
  // First pass - identify child nodes for each parent
  nodes.forEach(node => {
    if (node.parentId) {
      if (!childrenByParent.has(node.parentId)) {
        childrenByParent.set(node.parentId, []);
      }
      childrenByParent.get(node.parentId)?.push(node);
    }
  });
  
  // Calculate node size using dagre to lay out children and find the bounding box
  const calculateNodeSize = (nodeId: string): { width: number, height: number } => {
    const children = childrenByParent.get(nodeId) || [];
    
    if (children.length === 0) {
      // No children - return default size
      return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    }
    
    if (children.length === 1) {
      // Single child - return child size plus margin
      const childSize = calculateNodeSize(children[0].id);
      return {
        width: childSize.width + MARGIN * 2,
        height: childSize.height + MARGIN + TOP_MARGIN
      };
    }
    
    // Multiple children - use dagre to calculate layout and find bounding box
    const childGraph = new dagre.graphlib.Graph();
    childGraph.setDefaultEdgeLabel(() => ({}));
    
    // Configure child graph with same direction as parent
    childGraph.setGraph({ 
      rankdir: direction,
      nodesep: 80,
      ranksep: 100
    });
    
    // Add child nodes to graph
    children.forEach(child => {
      // Get child size (recursively if needed)
      const childSize = calculateNodeSize(child.id);
      childGraph.setNode(child.id, childSize);
    });
    
    // Add edges between children
    edges.forEach(edge => {
      // Check if both source and target are children of this node
      const sourceIsChild = children.some(child => child.id === edge.source);
      const targetIsChild = children.some(child => child.id === edge.target);
      
      if (sourceIsChild && targetIsChild) {
        childGraph.setEdge(edge.source, edge.target);
      }
    });
    
    // Run dagre layout on children
    dagre.layout(childGraph);
    
    // Find the bounding box of the children layout
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    
    children.forEach(child => {
      const childWithPosition = childGraph.node(child.id);
      const childSize = calculateNodeSize(child.id);
      
      // Calculate corners of the child node
      const left = childWithPosition.x - childSize.width / 2;
      const right = childWithPosition.x + childSize.width / 2;
      const top = childWithPosition.y - childSize.height / 2;
      const bottom = childWithPosition.y + childSize.height / 2;
      
      // Update bounding box
      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, bottom);
    });
    
    // Calculate total width and height needed
    const totalWidth = (maxX - minX) + MARGIN * 2;
    const totalHeight = (maxY - minY) + MARGIN + TOP_MARGIN;
    
    // Return the maximum of calculated size and minimum parent size
    return {
      width: Math.max(MIN_PARENT_WIDTH, totalWidth),
      height: Math.max(MIN_PARENT_HEIGHT, totalHeight)
    };
  };

  // Map to store node sizes and layouts
  const nodeSizes = new Map<string, { width: number, height: number }>();
  const childLayouts = new Map<string, { [nodeId: string]: { x: number, y: number } }>();
  
  // Calculate node sizes and store child layouts
  const calculateSizeAndLayout = (nodeId: string) => {
    const children = childrenByParent.get(nodeId) || [];
    
    if (children.length == 0) {
      // Use simple size calculation for 0 or 1 child
      nodeSizes.set(nodeId, calculateNodeSize(nodeId));
      return;
    }
    
    // For multiple children, create a dagre layout and store it
    const childGraph = new dagre.graphlib.Graph();
    childGraph.setDefaultEdgeLabel(() => ({}));
    
    childGraph.setGraph({ 
      rankdir: direction,
      nodesep: 80,
      ranksep: 100
    });
    
    // Add all children to graph with their calculated sizes
    children.forEach(child => {
      // Recursively calculate child size first
      if (!nodeSizes.has(child.id)) {
        calculateSizeAndLayout(child.id);
      }
      
      const childSize = nodeSizes.get(child.id)!;
      childGraph.setNode(child.id, childSize);
    });
    
    // Add edges between children
    edges.forEach(edge => {
      const sourceIsChild = children.some(child => child.id === edge.source);
      const targetIsChild = children.some(child => child.id === edge.target);
      
      if (sourceIsChild && targetIsChild) {
        childGraph.setEdge(edge.source, edge.target);
      }
    });
    
    // Run dagre layout
    dagre.layout(childGraph);
    
    // Store the layout
    const layout: { [nodeId: string]: { x: number, y: number } } = {};
    
    // Find bounding box and store positions
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    
    children.forEach(child => {
      const childWithPosition = childGraph.node(child.id);
      const childSize = nodeSizes.get(child.id)!;
      
      // Store the position
      layout[child.id] = { 
        x: childWithPosition.x - childSize.width / 2,
        y: childWithPosition.y - childSize.height / 2
      };
      
      // Calculate corners of the child node
      const left = childWithPosition.x - childSize.width / 2;
      const right = childWithPosition.x + childSize.width / 2;
      const top = childWithPosition.y - childSize.height / 2;
      const bottom = childWithPosition.y + childSize.height / 2;
      
      // Update bounding box
      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, bottom);
    });
    
    // Calculate parent size based on bounding box
    const width = Math.max(MIN_PARENT_WIDTH, (maxX - minX) + MARGIN * 2);
    const height = Math.max(MIN_PARENT_HEIGHT, (maxY - minY) + MARGIN + TOP_MARGIN);
    
    // Store the size
    nodeSizes.set(nodeId, { width, height });
    
    // Normalize child positions relative to parent (0,0) with margins
    const offsetX = minX - MARGIN;
    const offsetY = minY - 0;//MARGIN;
    
    Object.keys(layout).forEach(childId => {
      layout[childId] = {
        x: layout[childId].x - offsetX,
        y: layout[childId].y - offsetY
      };
    });
    
    // Store the normalized layout
    childLayouts.set(nodeId, layout);
  };

  // Get root nodes
  const rootNodes = nodes.filter(node => !node.parentId);
  
  // Calculate sizes for all nodes from the bottom up
  rootNodes.forEach(node => {
    calculateSizeAndLayout(node.id);
  });

  // Add root nodes to main dagre graph with calculated sizes
  rootNodes.forEach(node => {
    const size = nodeSizes.get(node.id)!;
    dagreGraph.setNode(node.id, size);
  });

  // Add edges between root nodes
  edges.forEach(edge => {
    const sourceIsRoot = !nodes.find(n => n.id === edge.source)?.parentId;
    const targetIsRoot = !nodes.find(n => n.id === edge.target)?.parentId;
    
    if (sourceIsRoot && targetIsRoot) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  // Calculate the layout for root nodes
  dagre.layout(dagreGraph);

  // Copy all nodes for the result
  const layoutedNodes = [...nodes];
  
  // Position all nodes using the calculated layouts
  const positionNodes = (parentId: string | null, parentX = 0, parentY = 0) => {
    const nodeList = parentId === null
      ? rootNodes
      : childrenByParent.get(parentId) || [];
    
    nodeList.forEach(node => {
      const nodeIndex = layoutedNodes.findIndex(n => n.id === node.id);
      const nodeSize = nodeSizes.get(node.id)!;

      if (nodeIndex === -1) return;
      
      let x, y;
      
      if (parentId === null) {
        // Root node - position from dagre
        const nodeWithPosition = dagreGraph.node(node.id);
        x = nodeWithPosition.x - nodeSize.width / 2;
        y = nodeWithPosition.y - nodeSize.height / 2;
        
        // Update root node position and size
        layoutedNodes[nodeIndex] = {
          ...layoutedNodes[nodeIndex],
          position: { x, y },
          style: {
            ...layoutedNodes[nodeIndex].style,
            width: nodeSize.width,
            height: nodeSize.height
          }
        };

        // Recursively position children of root nodes
        if (childrenByParent.has(node.id)) {
          positionNodes(node.id, x, y);
        }
      } else {
        // Child node - position from stored layout
        const layout = childLayouts.get(parentId);
        if (!layout || !layout[node.id]) return;

        // Calculate absolute position for this node
        const nodeX = parentX + layout[node.id].x;
        const nodeY = parentY + layout[node.id].y + TOP_MARGIN;

        // Update child node with position relative to parent
        layoutedNodes[nodeIndex] = {
          ...layoutedNodes[nodeIndex],
          position: { 
            x: layout[node.id].x, 
            y: layout[node.id].y + TOP_MARGIN 
          },
          style: {
            ...layoutedNodes[nodeIndex].style,
            width: nodeSize.width,
            height: nodeSize.height
          },
          parentId,
          extent: [
            [0, 0],
            [nodeSize.width, nodeSize.height]
          ]
        };

        // Recursively position children of this node
        if (childrenByParent.has(node.id)) {
          positionNodes(node.id, nodeX, nodeY);
        }
      }
    });
  };
  
  // Position all nodes starting from the root
  positionNodes(null);

  return { nodes: layoutedNodes, edges };
};

const ReactFlowVisualizer: React.FC<ReactFlowVisualizerProps> = ({ 
  tasks, 
  relationships,
  onRelationshipsChange,
  onTaskStatusChange
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [invalidConnectionMessage, setInvalidConnectionMessage] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);

  // Parse tasks and relationships into ReactFlow nodes and edges
  const parseTasksToGraph = useCallback(() => {
    if (tasks.length === 0) {
      return { nodes: [], edges: [] };
    }

    const taskMap = new Map<string, Task>();
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    // Create a map of all tasks for quick reference
    const populateTaskMap = (taskList: Task[]) => {
      taskList.forEach(task => {
        taskMap.set(task.id, task);
        if (task.subTasks && task.subTasks.length > 0) {
          populateTaskMap(task.subTasks);
        }
      });
    };
    
    populateTaskMap(tasks);
    
    // Process tasks recursively to create nodes
    const computeNodeStatus = (task: Task): TaskStatus => {
      if (!task.subTasks || task.subTasks.length === 0) {
        return task.status;
      }

      const childStatuses = task.subTasks.map(subtask => computeNodeStatus(subtask));
      
      if (childStatuses.every(status => status === 'completed')) {
        return 'completed';
      }
      if (childStatuses.every(status => status === 'pending')) {
        return 'pending';
      }
      return 'in_progress';
    };

    const createNodes = (taskList: Task[], parentId?: string) => {
      taskList.forEach(task => {
        const hasSubtasks = task.subTasks && task.subTasks.length > 0;
        const computedStatus = computeNodeStatus(task);
        
        // Determine style key based on status and ready state
        const styleKey = task.ready ? `${computedStatus}_ready` : computedStatus;
        
        // Update node style based on computed status and ready state
        let nodeStyle: CSSProperties = { ...nodeStyles[styleKey] || nodeStyles[computedStatus] };
        
        if (hasSubtasks) {
          // Parent node styling
          nodeStyle = { 
            ...nodeStyle,
            ...nodeStyles.parent,
            // Ensure larger initial size for parent nodes
            width: 300,
            height: 200,
            zIndex: 0, // Lower z-index for parent containers
            paddingTop: 30, // Add specific top padding for parent nodes
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: '#9370DB',
            borderRadius: '8px'
          };
        }
        
        // Create a node for this task
        const node: Node = {
          id: task.id,
          data: { 
            label: task.description,
            hasChildren: hasSubtasks,
            ready: task.ready // Add ready state to node data
          },
          position: { x: 0, y: 0 }, // Placeholder position
          style: nodeStyle,
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          ...(parentId && { 
            parentId, 
            extent: 'parent',
            zIndex: 1 // Higher z-index for child nodes
          })
        };
        
        newNodes.push(node);
        
        // Process subtasks recursively
        if (hasSubtasks) {
          createNodes(task.subTasks, task.id);
        }
      });
    };
    
    // Create all nodes
    createNodes(tasks);
    
    // Add relationship edges
    relationships.forEach((rel, index) => {
      // Only add if both source and target exist
      if (taskMap.has(rel.sourceId) && taskMap.has(rel.targetId)) {
        newEdges.push({
          id: `rel-${index}`,
          source: rel.sourceId,
          target: rel.targetId,
          type: 'default',
          animated: true,
          style: { stroke: '#ff6b6b' },
          markerEnd: { type: MarkerType.ArrowClosed },
          zIndex: 2 // Highest z-index for relationship edges
        });
      }
    });
    
    return { nodes: newNodes, edges: newEdges };
  }, [tasks, relationships]);

  // Update nodes and edges when tasks or relationships change
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = parseTasksToGraph();
    
    if (newNodes.length > 0) {
      // Apply layout algorithm
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        newNodes,
        newEdges,
        'TB' // Start with Top to Bottom layout
      );
      
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } else {
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [tasks, relationships, parseTasksToGraph]);

  // Handle layout button click
  const onLayout = useCallback((direction: 'TB' | 'LR') => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      direction
    );
    
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [nodes, edges]);

  // Helper function to get a node's parent ID or null if it's a root node
  const getNodeParentId = useCallback((nodeId: string): string | null => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.parentId || null;
  }, [nodes]);

  // Check if a connection is valid (same parent or both root nodes)
  const isValidConnection = useCallback((connection: Connection): boolean => {
    if (!connection.source || !connection.target) return false;
    
    const sourceParentId = getNodeParentId(connection.source);
    const targetParentId = getNodeParentId(connection.target);
    
    // Both are root nodes (no parent)
    if (sourceParentId === null && targetParentId === null) {
      return true;
    }
    
    // Both have the same parent
    if (sourceParentId === targetParentId) {
      return true;
    }
    
    return false;
  }, [getNodeParentId]);

  // Handle connecting two nodes with an edge
  const onConnect = useCallback(
    (connection: Connection) => {
      // Validate the connection
      if (!isValidConnection(connection)) {
        // Show error message
        setInvalidConnectionMessage("Invalid connection: Nodes must share the same parent or both be root nodes");
        
        // Hide message after a delay
        setTimeout(() => {
          setInvalidConnectionMessage(null);
        }, 3000);
        
        return; // Don't create the edge
      }
      
      // Add the edge to the ReactFlow component
      setEdges((eds) => addEdge(
        {
          ...connection,
          animated: true,
          style: { stroke: '#ff6b6b' },
          markerEnd: { type: MarkerType.ArrowClosed }
        }, 
        eds
      ));
      
      if (connection.source && connection.target) {
        // Create a new TaskRelationship
        const newRelationship: TaskRelationship = {
          id: `rel-${connection.source}-${connection.target}`,
          sourceId: connection.source,
          targetId: connection.target
        };
        
        // Add to the existing relationships and update parent
        const updatedRelationships = [...relationships, newRelationship];
        onRelationshipsChange(updatedRelationships);
      }
    },
    [setEdges, relationships, onRelationshipsChange, isValidConnection]
  );

  // Handle validation while dragging connections
  const onConnectStart = useCallback(() => {
    // Reset any previous error message
    setInvalidConnectionMessage(null);
  }, []);

  // Check connection validity during the dragging process
  const isValidConnectionFunc = useCallback(
    (connection: Connection) => {
      return isValidConnection(connection);
    },
    [isValidConnection]
  );

  // Handle edge deletion
  const onEdgeDelete = useCallback(
    (edge: EdgeType) => {
      // Find the corresponding relationship
      const relationshipToDelete = relationships.find(
        (rel) => rel.sourceId === edge.source && rel.targetId === edge.target
      );
      
      if (relationshipToDelete) {
        // Remove the edge from relationships
        const updatedRelationships = relationships.filter(
          (rel) => !(rel.sourceId === edge.source && rel.targetId === edge.target)
        );
        
        // Update parent component with new relationships
        onRelationshipsChange(updatedRelationships);
        
        // Also remove from local edges state
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }
    },
    [relationships, onRelationshipsChange, setEdges]
  );
  
  // Handle edge selection
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation(); // Prevent triggering background click
      setSelectedEdge(edge);
    },
    []
  );
  
  // Add this helper function
  const isLeafNode = useCallback((nodeId: string) => {
    return !nodes.some(node => node.parentId === nodeId);
  }, [nodes]);

  // Add this handler
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    
    if (!isLeafNode(node.id)) {
      return; // Only show menu for leaf nodes
    }
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setMenuPosition({ x: rect.left, y: rect.bottom });
    setSelectedNode(node);
  }, [isLeafNode]);

  // Update the handleStatusChange function to immediately update node appearance
  const handleStatusChange = useCallback((status: TaskStatus) => {
    if (selectedNode) {
      // First, notify parent component
      onTaskStatusChange(selectedNode.id, status);

      // Then, immediately update the local node appearance
      setNodes(nodes => nodes.map(node => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            style: {
              ...node.style,
              ...nodeStyles[status]
            }
          };
        }
        return node;
      }));

      // Close the menu
      setSelectedNode(null);
      setMenuPosition(null);
    }
  }, [selectedNode, onTaskStatusChange, setNodes]);

  // Update the existing onPaneClick handler
  const onPaneClick = useCallback(() => {
    setSelectedEdge(null);
    setSelectedNode(null);
    setMenuPosition(null);
  }, []);

  // Handle key press for deletion
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedEdge) {
        onEdgeDelete(selectedEdge);
        setSelectedEdge(null);
      }
    },
    [selectedEdge, onEdgeDelete]
  );
  
  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);

  // Add this helper function to get current node status
  const getNodeStatus = useCallback((nodeId: string): TaskStatus => {
    const findTaskStatus = (taskList: Task[]): TaskStatus | undefined => {
      for (const task of taskList) {
        if (task.id === nodeId) {
          return task.status;
        }
        if (task.subTasks) {
          const status = findTaskStatus(task.subTasks);
          if (status) return status;
        }
      }
      return undefined;
    };

    return findTaskStatus(tasks) || 'pending';
  }, [tasks]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        zIndex: 10,
        display: 'flex',
        gap: '10px'
      }}>
        {selectedEdge && (
          <button 
            onClick={() => {
              onEdgeDelete(selectedEdge);
              setSelectedEdge(null);
            }}
            style={{ 
              padding: '6px 12px', 
              background: '#ff4d4f', 
              color: 'white',
              border: '1px solid #ff4d4f',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Delete Selected Edge
          </button>
        )}
      </div>
      
      {/* Instructions tooltip */}
      {/* <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 5
      }}>
        <div>Connections can only be made between nodes that share the same parent</div>
        <div>Click on an edge to select it</div>
        <div>Press Delete or Backspace to remove the selected edge</div>
      </div> */}
      
      {/* Error message for invalid connections */}
      {invalidConnectionMessage && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#ff4d4f',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 1000,
          maxWidth: '80%',
          textAlign: 'center'
        }}>
          {invalidConnectionMessage}
        </div>
      )}
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        isValidConnection={isValidConnectionFunc}
        onEdgeClick={onEdgeClick}
        onEdgeDoubleClick={(event, edge) => {
          event.stopPropagation();
          onEdgeDelete(edge);
        }}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        minZoom={0.1} // Allow zooming out further (default is 0.5)
        maxZoom={4}   // Keep default max zoom
        attributionPosition="bottom-right"
        edgesFocusable={true}
        edgesUpdatable={false}
        elementsSelectable={true}
        edgeUpdaterRadius={0}
        selectNodesOnDrag={false}
      >
        <Controls />
        <MiniMap 
          style={{ 
            width: 120,  // Default is 200
            height: 80   // Default is 150
          }}
          zoomable
          pannable
        />
        <Background color="#f8f8f8" gap={16} />
      </ReactFlow>

      {menuPosition && selectedNode && (
        <StatusMenu
          style={{
            left: menuPosition.x,
            top: menuPosition.y,
          }}
        >
          <StatusMenuItem 
            onClick={() => handleStatusChange('pending')}
            active={getNodeStatus(selectedNode.id) === 'pending'}
          >
            Pending
          </StatusMenuItem>
          <StatusMenuItem 
            onClick={() => handleStatusChange('in_progress')}
            active={getNodeStatus(selectedNode.id) === 'in_progress'}
          >
            In Progress
          </StatusMenuItem>
          <StatusMenuItem 
            onClick={() => handleStatusChange('completed')}
            active={getNodeStatus(selectedNode.id) === 'completed'}
          >
            Completed
          </StatusMenuItem>
        </StatusMenu>
      )}
    </div>
  );
};

export default ReactFlowVisualizer; 