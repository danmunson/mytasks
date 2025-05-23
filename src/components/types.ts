import { ContentState, convertFromHTML, EditorState, convertToRaw, convertFromRaw } from "draft-js";

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
    id: string;
    description: string;
    status: TaskStatus;
    ready?: true;
    depth: number;
    // this is related to grouping, not a task dependency
    parentId?: string;
    subTasks: Task[];
}

export interface TaskRelationship {
    id: string;
    sourceId: string;
    targetId: string;
}

export interface ProjectMetadata {
    version: '0';
    id: string;
    name: string;
    description: string;
    lastModified: number;
    completed?: boolean;
}

// Add this new interface
export interface TaskMetadata {
    id: string;
    status: TaskStatus;
}

// Interface for serialized project data
interface SerializedProject extends ProjectMetadata {
    editorStateRaw: any; // Raw editor state
    relationshipsRaw: any;
    taskMetadataRaw: { [key: string]: TaskMetadata }; // Add this
}

export interface Project extends ProjectMetadata {
    editorState: EditorState;
    relationships: TaskRelationship[];
    taskMetadata: Map<string, TaskMetadata>; // Add this
}

class ProjectManagerV0 {
    private projects: Map<string, Project>;
    private readonly STORAGE_PREFIX = 'project_';
    private readonly PROJECT_INDEX_KEY = 'project_manager_index';

    constructor() {
        this.projects = new Map<string, Project>();
        this.loadProjectsFromStorage();
    }

    private getProjectKey(projectId: string): string {
        return `${this.STORAGE_PREFIX}${projectId}`;
    }

    private loadProjectsFromStorage(): void {
        try {
            const indexData = localStorage.getItem(this.PROJECT_INDEX_KEY);
            const projectIds = indexData ? JSON.parse(indexData) as string[] : [];

            projectIds.forEach(id => {
                const projectData = localStorage.getItem(this.getProjectKey(id));
                if (projectData) {
                    const serializedProject = JSON.parse(projectData) as SerializedProject;
                    
                    const contentState = convertFromRaw(serializedProject.editorStateRaw);
                    const editorState = EditorState.createWithContent(contentState);
                    
                    const project: Project = {
                        version: serializedProject.version,
                        id: serializedProject.id,
                        name: serializedProject.name,
                        description: serializedProject.description,
                        lastModified: serializedProject.lastModified,
                        completed: serializedProject.completed || false,
                        editorState,
                        relationships: serializedProject.relationshipsRaw,
                        taskMetadata: new Map(Object.entries(serializedProject.taskMetadataRaw)) // Convert object to Map
                    };
                    
                    this.projects.set(id, project);
                }
            });
        } catch (error) {
            console.error('Error loading projects from storage:', error);
        }
    }

    private saveProjectToStorage(project: Project): void {
        try {
            const editorStateRaw = convertToRaw(project.editorState.getCurrentContent());
            
            const serializedProject: SerializedProject = {
                version: project.version,
                id: project.id,
                name: project.name,
                description: project.description,
                lastModified: project.lastModified,
                completed: project.completed || false,
                editorStateRaw,
                relationshipsRaw: project.relationships,
                taskMetadataRaw: Object.fromEntries(project.taskMetadata) // Convert Map to object
            };
            
            localStorage.setItem(
                this.getProjectKey(project.id),
                JSON.stringify(serializedProject)
            );
            this.updateProjectIndex();
        } catch (error) {
            console.error('Error saving project to storage:', error);
        }
    }

    private updateProjectIndex(): void {
        try {
            const projectIds = Array.from(this.projects.keys());
            localStorage.setItem(this.PROJECT_INDEX_KEY, JSON.stringify(projectIds));
        } catch (error) {
            console.error('Error updating project index:', error);
        }
    }

    public newProject(metadata: ProjectMetadata): Project {
        const initialHTML = `
            <h1>Project Plan</h1>
            <h2>Tasks</h2>
            <ul>
                <li>Task 1</li>
                <li>Task 2</li>
            </ul>
        `;
        const blocksFromHTML = convertFromHTML(initialHTML);
        const contentState = ContentState.createFromBlockArray(
            blocksFromHTML.contentBlocks,
            blocksFromHTML.entityMap
        );
        const editorState = EditorState.createWithContent(contentState);
        
        const project: Project = {
            ...metadata,
            completed: false,
            editorState,
            relationships: [],
            taskMetadata: new Map(), // Initialize empty Map
            lastModified: Date.now()
        };
        
        this.projects.set(project.id, project);
        this.saveProjectToStorage(project);
        return project;
    }

    public updateProject(project: Project): void {
        project.lastModified = Date.now();
        this.projects.set(project.id, project);
        this.saveProjectToStorage(project);
    }

    public listProjects(): ProjectMetadata[] {
        return Array.from(this.projects.values()).map(project => ({
            version: project.version,
            id: project.id,
            name: project.name,
            description: project.description,
            lastModified: project.lastModified,
            completed: project.completed || false
        }));
    }

    public getProject(id: string|null): Project | undefined {
        if (!id) return undefined;
        const project = this.projects.get(id);
        return project;
    }

    public deleteProject(id: string): boolean {
        const result = this.projects.delete(id);
        if (result) {
            try {
                localStorage.removeItem(this.getProjectKey(id));
                this.updateProjectIndex();
            } catch (error) {
                console.error('Error deleting project from storage:', error);
            }
        }
        return result;
    }

    public toggleProjectCompletion(id: string): void {
        const project = this.projects.get(id);
        if (project) {
            project.completed = !project.completed;
            this.updateProject(project);
        }
    }
}

export class ProjectManager extends ProjectManagerV0 {}

// Interface for serialized project data for URL
interface SerializedProjectForUrl {
    id: string;
    name: string;
    description: string;
    version: '0';
    completed?: boolean;
    editorStateRaw: any; // Raw editor state
    relationshipsRaw: TaskRelationship[];
    taskMetadataRaw: { [key: string]: TaskMetadata };
}

export function serializeProjectForUrl(project: Project): string {
    const editorStateRaw = convertToRaw(project.editorState.getCurrentContent());
    const taskMetadataRaw = Object.fromEntries(project.taskMetadata);

    const serializedProjectForUrl: SerializedProjectForUrl = {
        id: project.id,
        name: project.name,
        description: project.description,
        version: project.version,
        completed: project.completed || false,
        editorStateRaw,
        relationshipsRaw: project.relationships,
        taskMetadataRaw,
    };

    return JSON.stringify(serializedProjectForUrl);
}

export function deserializeProjectFromUrl(jsonString: string): Project | null {
    try {
        const parsedObject = JSON.parse(jsonString) as SerializedProjectForUrl;

        const contentState = convertFromRaw(parsedObject.editorStateRaw);
        const editorState = EditorState.createWithContent(contentState);
        const taskMetadata = new Map(Object.entries(parsedObject.taskMetadataRaw));

        const project: Project = {
            id: parsedObject.id,
            name: parsedObject.name,
            description: parsedObject.description,
            version: parsedObject.version,
            completed: parsedObject.completed || false,
            editorState,
            relationships: parsedObject.relationshipsRaw,
            taskMetadata,
            lastModified: Date.now(),
        };

        return project;
    } catch (error) {
        console.error('Error deserializing project from URL:', error);
        return null;
    }
}
