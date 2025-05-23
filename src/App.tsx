import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import GraphEditor from './components/GraphEditor';
import { ProjectManager, ProjectMetadata, Project, deserializeProjectFromUrl } from './components/types'; // Import deserializeProjectFromUrl
import './App.css';

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
`;

const ProjectSidebar = styled.div<{ $isExpanded: boolean }>`
  width: ${props => props.$isExpanded ? '250px' : '30px'};
  border-right: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  transition: width 0.3s ease;
`;

const TabContainer = styled.div<{ $isExpanded: boolean }>`
  display: ${props => props.$isExpanded ? 'flex' : 'none'};
  border-bottom: 1px solid #ddd;
  margin: 0 10px;
`;

const Tab = styled.button<{ $isActive: boolean }>`
  flex: 1;
  padding: 8px 12px;
  background: ${props => props.$isActive ? '#fff' : '#f5f5f5'};
  border: none;
  border-bottom: ${props => props.$isActive ? '2px solid #4CAF50' : '2px solid transparent'};
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: ${props => props.$isActive ? '#fff' : '#eaeaea'};
  }
`;

const ProjectList = styled.div<{ $isExpanded: boolean }>`
  flex: 1;
  overflow-y: auto;
  padding: ${props => props.$isExpanded ? '10px' : '0'};
  visibility: ${props => props.$isExpanded ? 'visible' : 'hidden'};
`;

const ExpandButton = styled.button<{ $isExpanded: boolean }>`
  padding: 5px;
  margin: 5px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  align-self: ${props => props.$isExpanded ? 'flex-end' : 'center'};
  
  &:hover {
    color: #666;
  }
`;

const NewProjectButton = styled.button<{ $isExpanded: boolean }>`
  margin: 10px;
  padding: 10px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: ${props => props.$isExpanded ? 'block' : 'none'};
  
  &:hover {
    background: #45a049;
  }
`;

const MainContent = styled.div`
  flex: 1;
  overflow: hidden;
`;

const ProjectItem = styled.div<{ $isSelected: boolean }>`
  padding: 10px;
  margin: 5px 0;
  border-radius: 4px;
  cursor: pointer;
  background: ${props => props.$isSelected ? '#e0e0e0' : 'transparent'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &:hover {
    background: ${props => props.$isSelected ? '#e0e0e0' : '#eaeaea'};
  }
`;

const ProjectInfo = styled.div`
  flex: 1;
`;

const ProjectTitle = styled.div`
  font-weight: bold;
`;

const ProjectDescription = styled.div`
  font-size: 0.9em;
  color: #666;
  margin-top: 4px;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 5px;
  opacity: 0.7;
  margin-left: 5px;
  
  &:hover {
    opacity: 1;
  }
`;

const DeleteButton = styled(ActionButton)`
  color: #f44336;
`;

const CompleteButton = styled(ActionButton)<{ $isCompleted: boolean }>`
  color: ${props => props.$isCompleted ? '#4CAF50' : '#666'};
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
`;

type TabType = 'active' | 'completed';

function App() {
  const [projectManager] = useState(() => new ProjectManager());
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('active');

  useEffect(() => {
    // Load project list on mount
    setProjects(projectManager.listProjects());

    // Attempt to load project from URL query parameter on initial mount
    const queryParams = new URLSearchParams(window.location.search);
    const encodedProjectData = queryParams.get('project');

    if (encodedProjectData) {
      console.log("Found project data in URL, attempting to load...");
      try {
        const decodedJsonString = atob(encodedProjectData);
        const deserializedProject = deserializeProjectFromUrl(decodedJsonString);

        if (deserializedProject) {
          // Check if this project already exists in local storage, if not, save it
          // This makes it behave as if the user "imported" it.
          if (!projectManager.getProject(deserializedProject.id)) {
            projectManager.updateProject(deserializedProject); // This will save it
            setProjects(projectManager.listProjects()); // Update the list
            console.log("Project from URL saved to local storage:", deserializedProject.id);
          }

          setSelectedProject(deserializedProject);
          setSelectedProjectId(deserializedProject.id);
          console.log("Project loaded from URL:", deserializedProject.id);

          // Clear the query parameter from the URL
          window.history.replaceState(null, '', window.location.pathname);
        } else {
          console.error("Failed to deserialize project from URL: Invalid project data format.");
          // Clear the bad query parameter from the URL
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (error) {
        console.error("Failed to decode project from URL:", error);
        // Clear the bad query parameter from the URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [projectManager]); // projectManager added as dependency as it's used

  useEffect(() => {
    console.log('Circ Checker')
    // Load selected project when ID changes (or if set by URL load)
    if (selectedProjectId) { // Only load if not already set by URL
      const project = projectManager.getProject(selectedProjectId);
      if (project) {
        setSelectedProject(project);
      } else {
        // If project ID is set but project not found (e.g. invalid ID from old state or URL)
        setSelectedProject(null);
        setSelectedProjectId(null);
      }
    } else if (!selectedProjectId) {
      setSelectedProject(null);
    }
  }, [selectedProjectId, projectManager]); // selectedProject added to avoid re-running if already set

  const handleCreateProject = () => {
    const project = projectManager.getProject(selectedProjectId);
    if (project) {
      setSelectedProject(project);
    } else {
      setSelectedProject(null);
      setSelectedProjectId(null);
    }
    const projectId = `project_${Date.now()}`;
    const metadata: ProjectMetadata = {
      version: '0',
      id: projectId,
      name: 'New Project',
      description: '',
      lastModified: Date.now()
    };

    const newProject = projectManager.newProject(metadata);
    setProjects(projectManager.listProjects());
    setSelectedProjectId(projectId);
    setSelectedProject(newProject);
  };

  const handleProjectUpdate = (updatedProject: Project) => {
    projectManager.updateProject(updatedProject);
    setProjects(projectManager.listProjects());
    setSelectedProject(updatedProject);
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    // Stop the click event from bubbling up to the parent
    e.stopPropagation();

    if (window.confirm('Are you sure you want to delete this project?')) {
      projectManager.deleteProject(id);
      setProjects(projectManager.listProjects());
      if (selectedProjectId === id) {
        setSelectedProjectId(null);
        setSelectedProject(null);
      }
    }
  };

  const handleToggleCompletion = (id: string, e: React.MouseEvent) => {
    // Stop the click event from bubbling up to the parent
    e.stopPropagation();
    
    projectManager.toggleProjectCompletion(id);
    setProjects(projectManager.listProjects());
    
    // Update selected project if it's the one being toggled
    if (selectedProjectId === id) {
      const updatedProject = projectManager.getProject(id);
      setSelectedProject(updatedProject || null);
    }
  };

  const getFilteredProjects = () => {
    return projects.filter(project => {
      if (activeTab === 'active') {
        return !project.completed;
      } else {
        return project.completed;
      }
    });
  };

  return (
    <AppContainer>
      <ProjectSidebar $isExpanded={isExpanded}>
        <ExpandButton
          $isExpanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? '◀' : '▶'}
        </ExpandButton>
        <NewProjectButton $isExpanded={isExpanded} onClick={handleCreateProject}>
          New Project
        </NewProjectButton>
        <TabContainer $isExpanded={isExpanded}>
          <Tab 
            $isActive={activeTab === 'active'} 
            onClick={() => setActiveTab('active')}
          >
            Active
          </Tab>
          <Tab 
            $isActive={activeTab === 'completed'} 
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </Tab>
        </TabContainer>
        <ProjectList $isExpanded={isExpanded}>
          {getFilteredProjects().map(project => (
            <ProjectItem
              key={project.id}
              $isSelected={project.id === selectedProjectId}
              onClick={() => setSelectedProjectId(project.id)}
            >
              <ProjectInfo>
                <ProjectTitle>{project.name}</ProjectTitle>
                <ProjectDescription>{project.description}</ProjectDescription>
              </ProjectInfo>
              <ActionContainer>
                <CompleteButton
                  $isCompleted={project.completed || false}
                  onClick={(e) => handleToggleCompletion(project.id, e)}
                  title={project.completed ? "Mark as Active" : "Mark as Complete"}
                >
                  {project.completed ? '↺' : '✓'}
                </CompleteButton>
                <DeleteButton
                  onClick={(e) => handleDeleteProject(project.id, e)}
                  title="Delete Project"
                >
                  🗑️
                </DeleteButton>
              </ActionContainer>
            </ProjectItem>
          ))}
        </ProjectList>
      </ProjectSidebar>
      <MainContent>
        {selectedProject ? (
          <GraphEditor
            key={selectedProject.id}
            project={selectedProject}
            onProjectUpdate={handleProjectUpdate}
          />
        ) : (
          <div style={{ padding: 20 }}>Select a project to begin</div>
        )}
      </MainContent>
    </AppContainer>
  );
}

export default App;
