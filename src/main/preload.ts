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
    deleteMilestone: (id: number) => ipcRenderer.invoke('db:deleteMilestone', id),
    getDiscussionItems: (segmentId: number) => ipcRenderer.invoke('db:getDiscussionItems', segmentId),
    createDiscussionItem: (segmentId: number, content: string) => 
      ipcRenderer.invoke('db:createDiscussionItem', segmentId, content),
    calculateAndSaveEvaluation: (segmentId: number, date: string) => 
      ipcRenderer.invoke('db:calculateAndSaveEvaluation', segmentId, date),
    recordCarryover: (segmentId: number, todoId: number, title: string, originalDate: string, carriedOverDate: string) =>
      ipcRenderer.invoke('db:recordCarryover', segmentId, todoId, title, originalDate, carriedOverDate),
    getCarryoverRecords: (segmentId: number) =>
      ipcRenderer.invoke('db:getCarryoverRecords', segmentId),
    
    // Habit Todos
    getHabitTodos: (segmentId: number) => ipcRenderer.invoke('db:getHabitTodos', segmentId),
    getAllHabitTodos: (segmentId: number) => ipcRenderer.invoke('db:getAllHabitTodos', segmentId),
    createHabitTodo: (segmentId: number, title: string) => 
      ipcRenderer.invoke('db:createHabitTodo', segmentId, title),
    updateHabitTodo: (id: number, title: string) => 
      ipcRenderer.invoke('db:updateHabitTodo', id, title),
    deactivateHabitTodo: (id: number) => 
      ipcRenderer.invoke('db:deactivateHabitTodo', id),
    reactivateHabitTodo: (id: number) => 
      ipcRenderer.invoke('db:reactivateHabitTodo', id),
    deleteHabitTodo: (id: number) => 
      ipcRenderer.invoke('db:deleteHabitTodo', id),
    generateHabitTodos: (segmentId: number, date: string) => 
      ipcRenderer.invoke('db:generateHabitTodos', segmentId, date),
    
    // Bulk delete operations
    bulkDeleteMilestones: (segmentId: number) => 
      ipcRenderer.invoke('db:bulkDeleteMilestones', segmentId),
    bulkDeleteDiscussions: (segmentId: number) => 
      ipcRenderer.invoke('db:bulkDeleteDiscussions', segmentId),
    bulkDeleteTodaysUncompletedTodos: (segmentId: number, date: string) => 
      ipcRenderer.invoke('db:bulkDeleteTodaysUncompletedTodos', segmentId, date),
    bulkDeleteTodaysTodos: (segmentId: number, date: string) => 
      ipcRenderer.invoke('db:bulkDeleteTodaysTodos', segmentId, date),
    
    // Habit todo completion tracking
    getHabitTodoCompletions: (segmentId: number, date: string) => 
      ipcRenderer.invoke('db:getHabitTodoCompletions', segmentId, date),
    toggleHabitTodoCompletion: (habitTodoId: number, segmentId: number, date: string) => 
      ipcRenderer.invoke('db:toggleHabitTodoCompletion', habitTodoId, segmentId, date),
    getAllTodosWithCompletions: (segmentId: number) => 
      ipcRenderer.invoke('db:getAllTodosWithCompletions', segmentId),
    
    // Todo toggle with point handling  
    toggleTodo: (id: number) => ipcRenderer.invoke('db:toggleTodo', id),
    
    // Activity Points
    addActivityPoint: (segmentId: number, date: string, points: number, sourceType: string, sourceId: number, description: string) =>
      ipcRenderer.invoke('db:addActivityPoint', segmentId, date, points, sourceType, sourceId, description),
    removeActivityPoints: (sourceType: string, sourceId: number, date: string) =>
      ipcRenderer.invoke('db:removeActivityPoints', sourceType, sourceId, date),
    getTotalPoints: (segmentId?: number) =>
      ipcRenderer.invoke('db:getTotalPoints', segmentId),
    
    // Reset functions
    resetAllEvaluations: () =>
      ipcRenderer.invoke('db:resetAllEvaluations'),
    resetSegmentEvaluations: (segmentId: number) =>
      ipcRenderer.invoke('db:resetSegmentEvaluations', segmentId)
  }
});