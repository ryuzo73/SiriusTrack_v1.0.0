import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  database: {
    // Keep backwards compatibility for evaluation and calendar queries
    query: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
    
    // Secure specific handlers
    getOverallPurpose: () => ipcRenderer.invoke('db:getOverallPurpose'),
    saveOverallPurpose: (title: string, description: string, goal: string) => 
      ipcRenderer.invoke('db:saveOverallPurpose', title, description, goal),
    getSegments: () => ipcRenderer.invoke('db:getSegments'),
    createSegment: (name: string, goal: string, color: string) => 
      ipcRenderer.invoke('db:createSegment', name, goal, color),
    updateSegment: (id: number, name: string, goal: string, color: string) => 
      ipcRenderer.invoke('db:updateSegment', id, name, goal, color),
    deleteSegment: (id: number) => ipcRenderer.invoke('db:deleteSegment', id),
    getTodos: (segmentId: number, date: string) => 
      ipcRenderer.invoke('db:getTodos', segmentId, date),
    createTodo: (segmentId: number, title: string, date: string, type: string) => 
      ipcRenderer.invoke('db:createTodo', segmentId, title, date, type),
    updateTodoAchievement: (id: number, achievementLevel: string) => 
      ipcRenderer.invoke('db:updateTodoAchievement', id, achievementLevel),
    deleteTodo: (id: number) => ipcRenderer.invoke('db:deleteTodo', id),
    getMilestones: (segmentId: number) => ipcRenderer.invoke('db:getMilestones', segmentId),
    createMilestone: (segmentId: number, title: string, targetDate: string) => 
      ipcRenderer.invoke('db:createMilestone', segmentId, title, targetDate),
    updateMilestoneAchievement: (id: number, achievementLevel: string) => 
      ipcRenderer.invoke('db:updateMilestoneAchievement', id, achievementLevel),
    getDiscussionItems: (segmentId: number) => ipcRenderer.invoke('db:getDiscussionItems', segmentId),
    createDiscussionItem: (segmentId: number, content: string) => 
      ipcRenderer.invoke('db:createDiscussionItem', segmentId, content),
    calculateAndSaveEvaluation: (segmentId: number, date: string) => 
      ipcRenderer.invoke('db:calculateAndSaveEvaluation', segmentId, date)
  }
});