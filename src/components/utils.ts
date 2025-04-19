import { ContentState, EditorState } from "draft-js";
import { Task, TaskMetadata, TaskRelationship } from "./types";

/**
 * Parses editor content to extract tasks with their hierarchy
 * @param contentState The Draft.js content state to parse
 * @param taskMetadata Map of task metadata
 * @returns Array of hierarchical tasks
 */
function parseEditorContent(contentState: ContentState): Task[] {
    const blocks = contentState.getBlocksAsArray();
    let lastIsTasks = false;
    const taskStack: Task[] = [];
    const rootTasks: Task[] = [];
  
    const taskMap = new Map<string, Task>();

    for (const block of blocks) {
      const text = block.getText().trim();
      const type = block.getType();
      const depth = block.getDepth();
      // Key is useful as an ID since it persists
      const key = block.getKey();
  
      if (!(type.endsWith('list-item'))) {
          /**
           * Look for the tasks header
           */
          lastIsTasks = text.toLowerCase() === 'tasks';
          continue;
      } else if (lastIsTasks) {
          /**
           * TASK PARSING
           */
          const task: Task = {
              id: key,
              description: text,
              status: 'pending',
              depth,
              subTasks: []
          }
          taskMap.set(key, task);
          if (depth === 0) {
              rootTasks.push(task);
          }

          while (taskStack.length > 0 && depth <= taskStack[taskStack.length - 1].depth) {
              taskStack.pop();
          }

          if (taskStack.length > 0) {
              taskStack[taskStack.length - 1].subTasks.push(task);
              task.parentId = taskStack[taskStack.length - 1].id;
          }

          taskStack.push(task);
          
      } else if (rootTasks.length > 0) {
          /**
           * END OF TASKS
           */
          break;
      }
  
    }

    return rootTasks;
}


function *traverseTasks(tasks: Task[]): Generator<Task> {
    for (const task of tasks) {
        yield task;
        yield* traverseTasks(task.subTasks);
    }
}


export function deriveTaskSpecifications(
    editorState: EditorState,
    taskMetadata: Map<string, TaskMetadata>,
    relationships: TaskRelationship[]
): {
    tasks: Task[],
    taskMetadata: Map<string, TaskMetadata>,
    relationships: TaskRelationship[]
} {
    const hierarchicalTasks = parseEditorContent(editorState.getCurrentContent());
    const tasks = Array.from(traverseTasks(hierarchicalTasks));

    // annotate tasks with metadata
    const retainedTaskMetadata = new Map<string, TaskMetadata>();
    for (const task of tasks) {
        const metadata = taskMetadata.get(task.id);
        if (metadata) {
            task.status = metadata.status;
            retainedTaskMetadata.set(task.id, metadata);
        }
    }

    // figure out which tasks have no pending or in_progress parents
    const allTasks = new Set<string>(tasks.map(task => task.id));
    const relationshipMap = new Map<string, string[]>();
    const retainedRelationships: TaskRelationship[] = [];

    for (const relationship of relationships) {
        if (allTasks.has(relationship.sourceId) && allTasks.has(relationship.targetId)) {
            retainedRelationships.push(relationship);
            if (relationshipMap.has(relationship.sourceId)) {
                relationshipMap.get(relationship.sourceId)!.push(relationship.targetId);
            } else {
                relationshipMap.set(relationship.sourceId, [relationship.targetId]);
            }
        }
    }

    // remove all tasks that have pending or in_progress parents
    for (const task of tasks) {
        if (task.status === 'pending' || task.status === 'in_progress') {
            const dependents = relationshipMap.get(task.id);
            if (dependents) {
                for (const dependent of dependents) {
                    allTasks.delete(dependent);
                }
            }
        }
    }

    
    // // set ready to true for all tasks that have no pending or in_progress parents
    
    /**
     * Need a better algorithm for this. We can't just take into account the relationships,
     * but also the hierarchy. SubTasks can only by ready if their parent is ready.
     * Furthermore a parent should be "complete" if all its subtasks are complete.
     */

    // for (const task of tasks) {
    //     if (allTasks.has(task.id)) {
    //         task.ready = true;
    //     }
    // }

    return {
        tasks:hierarchicalTasks,
        taskMetadata: retainedTaskMetadata,
        relationships: retainedRelationships
    }
}


// Update the return type to include the cancel method
type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
};

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  let timeout: NodeJS.Timeout | null = null;

  const debouncedFn = (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };

  // Add cancel method
  debouncedFn.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debouncedFn;
}