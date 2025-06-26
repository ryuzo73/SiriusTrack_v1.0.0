export interface IElectronAPI {
  database: {
    // Backwards compatibility for evaluation and calendar
    query: (sql: string, params?: any[]) => Promise<any>;
    
    // Secure specific handlers
    getOverallPurpose: () => Promise<any>;
    saveOverallPurpose: (title: string, description: string, goal: string) => Promise<any>;
    getSegments: () => Promise<any[]>;
    createSegment: (name: string, goal: string, color: string) => Promise<any>;
    updateSegment: (id: number, name: string, goal: string, color: string) => Promise<any>;
    deleteSegment: (id: number) => Promise<any>;
    getTodos: (segmentId: number, date: string) => Promise<any[]>;
    createTodo: (segmentId: number, title: string, date: string, type: string) => Promise<any>;
    updateTodoAchievement: (id: number, achievementLevel: string) => Promise<any>;
    deleteTodo: (id: number) => Promise<any>;
    getMilestones: (segmentId: number) => Promise<any[]>;
    createMilestone: (segmentId: number, title: string, targetDate: string) => Promise<any>;
    updateMilestoneAchievement: (id: number, achievementLevel: string) => Promise<any>;
    getDiscussionItems: (segmentId: number) => Promise<any[]>;
    createDiscussionItem: (segmentId: number, content: string) => Promise<any>;
  };
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}