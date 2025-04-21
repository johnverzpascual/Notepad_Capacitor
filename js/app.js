// Initialize the app when the device is ready
document.addEventListener('DOMContentLoaded', () => {
    loadLastNote();
});

// Load the last saved note
function loadLastNote() {
    const savedTitle = localStorage.getItem('noteTitle') || '';
    const savedContent = localStorage.getItem('noteContent') || '';
    
    document.getElementById('noteTitle').value = savedTitle;
    document.getElementById('noteContent').value = savedContent;
}

// Save the current note
function saveNote() {
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;
    
    localStorage.setItem('noteTitle', title);
    localStorage.setItem('noteContent', content);
    
    // Show save confirmation
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg';
    toast.textContent = 'Note saved successfully!';
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 2000);
}

// Create a new note
function newNote() {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    localStorage.removeItem('noteTitle');
    localStorage.removeItem('noteContent');
}

// Auto-save feature
let autoSaveTimeout;
document.getElementById('noteContent').addEventListener('input', () => {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(saveNote, 1000);
});

document.getElementById('noteTitle').addEventListener('input', () => {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(saveNote, 1000);
}); 