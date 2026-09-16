export function downloadDocument(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const a = document.createElement('a'); a.href=url; a.download=name.replace(/[<>:"/\\|?*]/g,'_');
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
