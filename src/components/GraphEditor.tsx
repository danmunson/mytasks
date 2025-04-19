import React, { useState, useEffect, useCallback } from 'react';
import ReactFlowVisualizer from './ReactFlowVisualizer';
import { 
  Editor, 
  EditorState,
  RichUtils, 
  getDefaultKeyBinding,
} from 'draft-js';
import 'draft-js/dist/Draft.css';
import { Project, Task, TaskRelationship, TaskStatus } from './types';
import { deriveTaskSpecifications, debounce } from './utils';
import { 
  EditorContainer,
  FloatingEditorPanel,
  InputSection,
  EditorWrapper,
  ToolbarContainer,
  ToggleToolbarButton,
  ToolbarButton,
  GraphContainer,
  FloatingEditButton,
  CloseButton
} from './styles';
import { Resizable } from 're-resizable';

interface GraphEditorProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

const GraphEditor: React.FC<GraphEditorProps> = ({ project, onProjectUpdate }) => {
  console.log("GraphEditor render with project:", project.id, project.name);
  
  const { tasks: initialTasks, relationships: initialRelationships } = deriveTaskSpecifications(
    project.editorState, project.taskMetadata, project.relationships);

  // State for tasks and relationships instead of dotString
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [relationships, setRelationships] = useState<TaskRelationship[]>(initialRelationships);
  
  // State for toolbar visibility
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  
  const [editorState, setEditorState] = useState(project.editorState);

  // Add state for editor visibility
  const [isEditorVisible, setIsEditorVisible] = useState(true);

  // Create a debounced version of project update
  const debouncedProjectUpdate = useCallback(
    debounce((updatedProject: Project) => {
      console.log("Saving to localStorage:", updatedProject.id);
      onProjectUpdate(updatedProject);
    }, 500), // Wait 1 second after last change before saving
    [onProjectUpdate]
  );

  // Update handleEditorChange to use debounced save
  const handleEditorChange = (newState: EditorState) => {
    console.log("Setting editor state");
  
    const {tasks, taskMetadata, relationships} = deriveTaskSpecifications(
      newState, project.taskMetadata, project.relationships);

    const contentState = editorState.getCurrentContent();
    const firstBlock = contentState.getFirstBlock();
    const firstLine = firstBlock.getText().trim();
    
    const updatedProject: Project = {
      ...project,
      name: firstLine,
      editorState: newState,
      relationships: relationships,
      taskMetadata: taskMetadata,
      lastModified: Date.now()
    };
    debouncedProjectUpdate(updatedProject);

    setEditorState(newState);
    setTasks(tasks);
  };

  // Clean up the debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedProjectUpdate.cancel();
    };
  }, [debouncedProjectUpdate]);

  // Handle keyboard shortcuts
  const handleKeyCommand = (command: string, editorState: EditorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  // Custom key binding function
  const mapKeyToEditorCommand = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      const newEditorState = RichUtils.onTab(e, editorState, 4);
      if (newEditorState !== editorState) {
        setEditorState(newEditorState);
      }
      return null;
    }
    return getDefaultKeyBinding(e);
  };

  // Toggle block type (paragraph, h1, h2, blockquote, etc.)
  const toggleBlockType = (blockType: string) => {
    setEditorState(RichUtils.toggleBlockType(editorState, blockType));
  };

  // Toggle inline style (bold, italic, underline, etc.)
  const toggleInlineStyle = (inlineStyle: string) => {
    setEditorState(RichUtils.toggleInlineStyle(editorState, inlineStyle));
  };

  // Check if the current selection has a specific block type
  const hasBlockType = (blockType: string) => {
    const selection = editorState.getSelection();
    const blockKey = selection.getStartKey();
    const block = editorState.getCurrentContent().getBlockForKey(blockKey);
    return block.getType() === blockType;
  };

  // Check if the current selection has a specific inline style
  const hasInlineStyle = (inlineStyle: string) => {
    return editorState.getCurrentInlineStyle().has(inlineStyle);
  };

  // Toggle toolbar visibility
  const toggleToolbar = () => {
    setIsToolbarOpen(!isToolbarOpen);
  };

  // Handle relationships changes from ReactFlowVisualizer (for new edges and deletions)
  const handleRelationshipsChange = (newRelationships: TaskRelationship[]) => {
    console.log("Setting relationships:", newRelationships);

    const updatedProject: Project = {
      ...project,
      editorState: editorState,
      relationships: newRelationships,
      lastModified: Date.now()
    };
    debouncedProjectUpdate(updatedProject);
    setRelationships(newRelationships);
  };

  // Update task status handler to store in metadata
  const handleTaskStatusChange = useCallback((taskId: string, newStatus: TaskStatus) => {
    console.log("Changing task status:", taskId, "to:", newStatus);
    
    // Update task metadata
    const newTaskMetadata = new Map(project.taskMetadata);
    newTaskMetadata.set(taskId, {
      id: taskId,
      status: newStatus
    });

    // Update project with new metadata
    const updatedProject: Project = {
      ...project,
      editorState: editorState,
      relationships: relationships,
      taskMetadata: newTaskMetadata,
      lastModified: Date.now()
    };
    
    console.log("Updating project with new task status");
    onProjectUpdate(updatedProject);
  }, [editorState, relationships, project, onProjectUpdate]);

  // Add toggle handler
  const toggleEditor = () => {
    setIsEditorVisible(!isEditorVisible);
  };

  return (
    <EditorContainer>
      <GraphContainer>
        <ReactFlowVisualizer 
          tasks={tasks} 
          relationships={relationships}
          onRelationshipsChange={handleRelationshipsChange}
          onTaskStatusChange={handleTaskStatusChange}
        />
      </GraphContainer>

      {isEditorVisible ? (
        <FloatingEditorPanel>
          <Resizable
            defaultSize={{
              width: 500,
              height: 400,
            }}
            minWidth={300}
            minHeight={200}
            maxWidth="90vw"
            maxHeight="90vh"
          >
            <InputSection>
              <CloseButton onClick={toggleEditor}>×</CloseButton>
              <EditorWrapper>
                <ToolbarContainer isOpen={isToolbarOpen}>
                  <ToggleToolbarButton onClick={toggleToolbar}>
                    {isToolbarOpen ? '▲ Hide Formatting' : '▼ Show Formatting'}
                  </ToggleToolbarButton>
                  
                  {/* Only render these when toolbar is open */}
                  {isToolbarOpen && (
                    <>
                      <ToolbarButton 
                        onClick={() => toggleInlineStyle('BOLD')}
                        active={hasInlineStyle('BOLD')}
                      >
                        Bold
                      </ToolbarButton>
                      <ToolbarButton 
                        onClick={() => toggleInlineStyle('ITALIC')}
                        active={hasInlineStyle('ITALIC')}
                      >
                        Italic
                      </ToolbarButton>
                      <ToolbarButton 
                        onClick={() => toggleInlineStyle('UNDERLINE')}
                        active={hasInlineStyle('UNDERLINE')}
                      >
                        Underline
                      </ToolbarButton>
                      <ToolbarButton 
                        onClick={() => toggleInlineStyle('STRIKETHROUGH')}
                        active={hasInlineStyle('STRIKETHROUGH')}
                      >
                        Strikethrough
                      </ToolbarButton>
                      <ToolbarButton 
                        onClick={() => toggleBlockType('header-one')}
                        active={hasBlockType('header-one')}
                      >
                        H1
                      </ToolbarButton>
                      <ToolbarButton 
                        onClick={() => toggleBlockType('header-two')}
                        active={hasBlockType('header-two')}
                      >
                        H2
                      </ToolbarButton>
                      <ToolbarButton 
                        onClick={() => toggleBlockType('unordered-list-item')}
                        active={hasBlockType('unordered-list-item')}
                      >
                        Bullet List
                      </ToolbarButton>
                      <ToolbarButton 
                        onClick={() => toggleBlockType('ordered-list-item')}
                        active={hasBlockType('ordered-list-item')}
                      >
                        Numbered List
                      </ToolbarButton>
                      <ToolbarButton 
                        onClick={() => toggleBlockType('code-block')}
                        active={hasBlockType('code-block')}
                      >
                        Code
                      </ToolbarButton>
                      <ToolbarButton 
                        onClick={() => toggleBlockType('blockquote')}
                        active={hasBlockType('blockquote')}
                      >
                        Quote
                      </ToolbarButton>
                    </>
                  )}
                </ToolbarContainer>
                <Editor
                  editorState={editorState}
                  onChange={handleEditorChange}
                  handleKeyCommand={handleKeyCommand}
                  keyBindingFn={mapKeyToEditorCommand}
                  placeholder="Start typing..."
                  customStyleMap={{
                    STRIKETHROUGH: {
                      textDecoration: 'line-through',
                    }
                  }}
                />
              </EditorWrapper>
            </InputSection>
          </Resizable>
        </FloatingEditorPanel>
      ) : (
        <FloatingEditButton onClick={toggleEditor}>
          Edit
        </FloatingEditButton>
      )}
    </EditorContainer>
  );
};

export default GraphEditor; 