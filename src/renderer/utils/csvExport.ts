import { format } from 'date-fns';
import { database } from './database';

export const exportToCSV = async () => {
  const segments = await database.getSegments();
  const overallPurpose = await database.getOverallPurpose();
  
  let csv = 'Goal Todo App Export\n';
  csv += `Export Date: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n\n`;
  
  if (overallPurpose) {
    csv += 'Overall Purpose\n';
    csv += `Title,Description\n`;
    csv += `"${overallPurpose.title}","${overallPurpose.description}"\n\n`;
  }
  
  for (const segment of segments) {
    csv += `Segment: ${segment.name}\n`;
    csv += `Overall Goal: ${segment.overall_goal}\n\n`;
    
    const milestones = await database.getMilestones(segment.id);
    if (milestones.length > 0) {
      csv += 'Milestones\n';
      csv += 'Title,Target Date,Status\n';
      for (const milestone of milestones) {
        csv += `"${milestone.title}","${milestone.target_date}","${milestone.status}"\n`;
      }
      csv += '\n';
    }
    
    const todos = await window.electronAPI.database.query(
      'SELECT * FROM todos WHERE segment_id = ? ORDER BY date DESC',
      [segment.id]
    );
    if (todos.length > 0) {
      csv += 'Todos\n';
      csv += 'Date,Title,Type,Completed\n';
      for (const todo of todos) {
        csv += `"${todo.date}","${todo.title}","${todo.type}","${todo.completed ? 'Yes' : 'No'}"\n`;
      }
      csv += '\n';
    }
    
    const discussions = await database.getDiscussionItems(segment.id);
    if (discussions.length > 0) {
      csv += 'Discussion Items\n';
      csv += 'Content,Created At,Resolved,Resolved At\n';
      for (const discussion of discussions) {
        csv += `"${discussion.content}","${discussion.created_at}","${discussion.resolved ? 'Yes' : 'No'}","${discussion.resolved_at || 'N/A'}"\n`;
      }
      csv += '\n';
    }
    
    csv += '---\n\n';
  }
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `goal-todo-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};