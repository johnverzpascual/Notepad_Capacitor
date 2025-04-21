// Initialize Capacitor
const { Storage } = Capacitor.Plugins;

// Fallback storage for web
const webStorage = {
    async get({ key }) {
        const value = localStorage.getItem(key);
        return { value };
    },
    async set({ key, value }) {
        localStorage.setItem(key, value);
    }
};

// Use appropriate storage based on platform
const storage = (Capacitor.isNativePlatform() && Storage) ? Storage : webStorage;

// DOM Elements
const noteTitle = document.getElementById('noteTitle');
const noteContent = document.getElementById('noteContent');
const newNoteBtn = document.getElementById('newNoteBtn');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const deleteNoteBtn = document.getElementById('deleteNoteBtn');
const searchNotes = document.getElementById('searchNotes');
const notesList = document.getElementById('notesList');
const lastSaved = document.getElementById('lastSaved');
const wordCount = document.getElementById('wordCount');
let formatBtns = null; // Will be initialized in init()

// Mobile specific elements
const listViewBtn = document.getElementById('listViewBtn');
const closeListView = document.getElementById('closeListView');
const notesListView = document.getElementById('notesListView');

// State
let currentNoteId = null;
let notes = [];
let saveTimeout = null;
let isListViewVisible = false;

// Initialize
async function init() {
    try {
        console.log('Initializing app...');
        
        // Initialize format buttons
        formatBtns = document.querySelectorAll('.toolbar-btn');
        if (!formatBtns || formatBtns.length === 0) {
            throw new Error('Format buttons not found');
        }
        
        // Load notes
        await loadNotes();
        
        // Setup event listeners
        setupEventListeners();
        updateWordCount();
        
        // Create a welcome note if no notes exist
        if (notes.length === 0) {
            await createNewNote();
        } else {
            // Load the most recent note
            loadNote(notes[0].id);
        }
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Error initializing app: ' + error.message);
    }
}

// Wait for the device to be ready before initializing
document.addEventListener('DOMContentLoaded', () => {
    if (Capacitor.isNativePlatform()) {
        document.addEventListener('deviceready', init, false);
    } else {
        init();
    }
});

// Setup event listeners
function setupEventListeners() {
    try {
        console.log('Setting up event listeners...');
        
        // Mobile navigation
        listViewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showNotesListView();
        });
        
        closeListView.addEventListener('click', (e) => {
            e.stopPropagation();
            hideNotesListView();
        });
        
        // Auto-save on changes
        noteTitle.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => saveCurrentNote(false), 1000);
        });

        // Handle note content changes
        noteContent.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => saveCurrentNote(false), 1000);
            updateWordCount();
            updateFormatButtons();
        });

        // Update formatting buttons state when selection changes
        ['mouseup', 'keyup'].forEach(eventType => {
            noteContent.addEventListener(eventType, () => {
                updateFormatButtons();
            });
        });

        // Format buttons
        formatBtns.forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent losing focus from content
                const format = btn.dataset.format;
                applyFormatting(format);
            });
        });

        // New note button
        newNoteBtn.addEventListener('click', createNewNote);
        
        // Save note button
        saveNoteBtn.addEventListener('click', () => {
            saveCurrentNote(true);
        });
        
        // Delete note button
        deleteNoteBtn.addEventListener('click', deleteCurrentNote);
        
        // Search notes
        searchNotes.addEventListener('input', renderNotesList);
        
        // Handle back button on Android
        document.addEventListener('backbutton', () => {
            if (isListViewVisible) {
                hideNotesListView();
            }
        });
        
        console.log('Event listeners set up successfully');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Update formatting buttons state based on current selection
function updateFormatButtons() {
    try {
        const selection = window.getSelection();
        
        // Check if we have a valid selection within the editor
        if (!selection || !noteContent.contains(selection.anchorNode)) {
            formatBtns.forEach(btn => btn.classList.remove('active'));
            return;
        }

        // Update button states
        formatBtns.forEach(btn => {
            const format = btn.dataset.format;
            let isActive = false;

            switch (format) {
                case 'bold':
                    isActive = document.queryCommandState('bold');
                    break;
                case 'italic':
                    isActive = document.queryCommandState('italic');
                    break;
                case 'underline':
                    isActive = document.queryCommandState('underline');
                    break;
                case 'list':
                    isActive = document.queryCommandState('insertUnorderedList');
                    break;
                case 'heading':
                    isActive = selection.anchorNode.parentElement.closest('h2') !== null;
                    break;
                case 'alignLeft':
                    isActive = document.queryCommandState('justifyLeft');
                    break;
                case 'alignCenter':
                    isActive = document.queryCommandState('justifyCenter');
                    break;
                case 'alignRight':
                    isActive = document.queryCommandState('justifyRight');
                    break;
                case 'alignJustify':
                    isActive = document.queryCommandState('justifyFull');
                    break;
            }

            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive);
        });
    } catch (error) {
        console.error('Error updating format buttons:', error);
    }
}

// Apply formatting to selected text
function applyFormatting(format) {
    try {
        // Focus the content div if not already focused
        noteContent.focus();

        // Get selection
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        // Toggle button state
        const btn = document.querySelector(`[data-format="${format}"]`);
        
        // Apply formatting based on format type
        switch(format) {
            case 'bold':
                document.execCommand('bold', false);
                btn.classList.toggle('active', document.queryCommandState('bold'));
                break;
            case 'italic':
                document.execCommand('italic', false);
                btn.classList.toggle('active', document.queryCommandState('italic'));
                break;
            case 'underline':
                document.execCommand('underline', false);
                btn.classList.toggle('active', document.queryCommandState('underline'));
                break;
            case 'list':
                document.execCommand('insertUnorderedList', false);
                btn.classList.toggle('active', document.queryCommandState('insertUnorderedList'));
                break;
            case 'heading':
                const isHeading = selection.anchorNode.parentElement.closest('h2');
                if (isHeading) {
                    document.execCommand('formatBlock', false, 'p');
                    btn.classList.remove('active');
                } else {
                    document.execCommand('formatBlock', false, 'h2');
                    btn.classList.add('active');
                }
                break;
            case 'alignLeft':
                document.execCommand('justifyLeft', false);
                updateAlignmentButtons('left');
                break;
            case 'alignCenter':
                document.execCommand('justifyCenter', false);
                updateAlignmentButtons('center');
                break;
            case 'alignRight':
                document.execCommand('justifyRight', false);
                updateAlignmentButtons('right');
                break;
            case 'alignJustify':
                document.execCommand('justifyFull', false);
                updateAlignmentButtons('justify');
                break;
        }

        // Save changes
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => saveCurrentNote(false), 1000);
        
    } catch (error) {
        console.error('Error applying format:', error);
        showError('Error applying format: ' + error.message);
    }
}

// Update alignment button states
function updateAlignmentButtons(activeAlignment) {
    const alignments = ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify'];
    alignments.forEach(align => {
        const btn = document.querySelector(`[data-format="${align}"]`);
        btn.classList.toggle('active', align === `align${activeAlignment.charAt(0).toUpperCase() + activeAlignment.slice(1)}`);
    });
}

// Delete current note
async function deleteCurrentNote() {
    if (!currentNoteId) {
        showError('No note selected to delete');
        return;
    }
    
    try {
        if (confirm('Are you sure you want to delete this note?')) {
            console.log('Deleting note:', currentNoteId);
            notes = notes.filter(n => n.id !== currentNoteId);
            await saveNotes();
            
            // Clear the editor
            currentNoteId = null;
            noteTitle.value = '';
            noteContent.innerHTML = '';
            lastSaved.textContent = 'Last saved: Never';
            updateWordCount();
            
            // Load the most recent note if available
            if (notes.length > 0) {
                loadNote(notes[0].id);
            }
            
            renderNotesList();
            showSuccess('Note deleted');
            hideNotesListView();
        }
    } catch (error) {
        console.error('Error deleting note:', error);
        showError('Error deleting note');
    }
}

// Load all notes from storage
async function loadNotes() {
    try {
        console.log('Loading notes...');
        const { value } = await storage.get({ key: 'notes' });
        notes = value ? JSON.parse(value) : [];
        console.log('Notes loaded:', notes.length);
        renderNotesList();
    } catch (error) {
        console.error('Error loading notes:', error);
        notes = [];
        showError('Error loading notes. Using empty notes list.');
    }
}

// Save notes to storage
async function saveNotes() {
    try {
        console.log('Saving notes...');
        await storage.set({
            key: 'notes',
            value: JSON.stringify(notes)
        });
        console.log('Notes saved successfully');
        return true;
    } catch (error) {
        console.error('Error saving notes:', error);
        showError('Error saving note. Please try again.');
        return false;
    }
}

// Show error message to user
function showError(message) {
    // Create and show error toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50 text-center';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Show success message to user
function showSuccess(message) {
    // Create and show success toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50 text-center';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Create a new note
async function createNewNote() {
    try {
        console.log('Creating new note...');
        const newNote = {
            id: Date.now().toString(),
            title: 'Untitled Note',
            content: '',
            lastModified: new Date().toISOString()
        };
        
        notes.unshift(newNote);
        if (await saveNotes()) {
            renderNotesList();
            loadNote(newNote.id);
            hideNotesListView();
            console.log('New note created:', newNote.id);
            showSuccess('New note created');
        }
    } catch (error) {
        console.error('Error creating new note:', error);
        showError('Error creating new note. Please try again.');
    }
}

// Load a note into the editor
function loadNote(noteId) {
    try {
        console.log('Loading note:', noteId);
        const note = notes.find(n => n.id === noteId);
        if (note) {
            currentNoteId = noteId;
            noteTitle.value = note.title;
            noteContent.innerHTML = note.content || '';
            lastSaved.textContent = `Last saved: ${new Date(note.lastModified).toLocaleString()}`;
            updateWordCount();
            
            // Update active state in list
            document.querySelectorAll('.note-item').forEach(item => {
                item.classList.toggle('active', item.dataset.id === noteId);
            });
            
            hideNotesListView();
            console.log('Note loaded successfully');
        }
    } catch (error) {
        console.error('Error loading note:', error);
        showError('Error loading note. Please try again.');
    }
}

// Save current note
async function saveCurrentNote(showNotification = false) {
    if (!currentNoteId) return;
    
    try {
        console.log('Saving current note:', currentNoteId);
        const note = notes.find(n => n.id === currentNoteId);
        if (note) {
            note.title = noteTitle.value || 'Untitled Note';
            note.content = noteContent.innerHTML;
            note.lastModified = new Date().toISOString();
            
            if (await saveNotes()) {
                lastSaved.textContent = `Last saved: ${new Date().toLocaleString()}`;
                renderNotesList();
                console.log('Note saved successfully');
                if (showNotification) {
                    showSuccess('Note saved');
                }
            }
        }
    } catch (error) {
        console.error('Error saving current note:', error);
        if (showNotification) {
            showError('Error saving note. Please try again.');
        }
    }
}

// Render notes list
function renderNotesList() {
    try {
        console.log('Rendering notes list...');
        const searchTerm = searchNotes.value.toLowerCase();
        const filteredNotes = notes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) || 
            note.content.toLowerCase().includes(searchTerm)
        );
        
        notesList.innerHTML = filteredNotes.map(note => {
            // Strip HTML tags for preview
            const contentPreview = note.content
                .replace(/<[^>]+>/g, '') // Remove HTML tags
                .substring(0, 50); // Get first 50 characters
                
            return `
                <div class="note-item ${note.id === currentNoteId ? 'active' : ''}" 
                     data-id="${note.id}">
                    <div class="font-semibold truncate">${note.title || 'Untitled Note'}</div>
                    <div class="text-sm text-gray-500 truncate">${contentPreview}</div>
                    <div class="text-xs text-gray-400">${new Date(note.lastModified).toLocaleDateString()}</div>
                </div>
            `;
        }).join('');
        
        // Add click events to note items
        document.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => loadNote(item.dataset.id));
        });
        
        console.log('Notes list rendered:', filteredNotes.length);
    } catch (error) {
        console.error('Error rendering notes list:', error);
    }
}

// Update word count
function updateWordCount() {
    try {
        const text = noteContent.innerText || noteContent.textContent;
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        wordCount.textContent = `${words.length} words`;
    } catch (error) {
        console.error('Error updating word count:', error);
    }
}

// Mobile UI functions
function showNotesListView() {
    notesListView.classList.remove('translate-x-full');
    isListViewVisible = true;
}

function hideNotesListView() {
    notesListView.classList.add('translate-x-full');
    isListViewVisible = false;
} 