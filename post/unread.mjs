export function unreadCount(rows,isRead){
 return rows.filter(m=>!m.sent&&!['scheduled','cancelled','rejected'].includes(m.status)&&!isRead(m.id)).length;
}
