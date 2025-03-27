import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import GraphEditor from './components/GraphEditor';
import { ProjectManager, ProjectMetadata, Project } from './components/types';
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

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: #f44336;
  cursor: pointer;
  font-size: 16px;
  padding: 5px;
  opacity: 0.7;
  
  &:hover {
    opacity: 1;
  }
`;

function App() {
  const [projectManager] = useState(() => new ProjectManager());
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    // Load project list on mount
    setProjects(projectManager.listProjects());
  }, [projectManager]);

  useEffect(() => {
    // Load selected project when ID changes
    if (selectedProjectId) {
        const project = projectManager.getProject(selectedProjectId);
        if (project) {
            setSelectedProject(project);
        } else {
            setSelectedProject(null);
            setSelectedProjectId(null);
        }
    } else {
        setSelectedProject(null);
    }
  }, [selectedProjectId, projectManager]);

  const handleCreateProject = () => {
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
        <ProjectList $isExpanded={isExpanded}>
          {projects.map(project => (
            <ProjectItem
              key={project.id}
              $isSelected={project.id === selectedProjectId}
              onClick={() => setSelectedProjectId(project.id)}
            >
              <ProjectInfo>
                <ProjectTitle>{project.name}</ProjectTitle>
                <ProjectDescription>{project.description}</ProjectDescription>
              </ProjectInfo>
              <DeleteButton 
                onClick={(e) => handleDeleteProject(project.id, e)}
                title="Delete Project"
              >
                🗑️
              </DeleteButton>
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
