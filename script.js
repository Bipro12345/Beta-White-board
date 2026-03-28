const canvas = document.getElementById('whiteboardCanvas');
const ctx = canvas.getContext('2d');
const objectsContainer = document.getElementById('objects-container');
const drawingPalette = document.getElementById('drawingPalette');
const shapePalette = document.getElementById('shapePalette');

let currentTool = 'draw';
let subMode = 'pen';
let isDrawing = false;
let historyStack = [];
let redoStack = [];
let selectedShapeType = null;

function init() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    lucide.createIcons();
    saveState(); 
}

window.addEventListener('resize', () => {
    const tempImage = canvas.toDataURL();
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const img = new Image();
    img.src = tempImage;
    img.onload = () => ctx.drawImage(img, 0, 0);
});

// --- TOOL LOGIC ---
function setMainTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`tool-${tool}`);
    if(btn) btn.classList.add('active');
    
    // Close menus when switching tools
    if (tool !== 'draw') drawingPalette.classList.remove('show');
    if (tool !== 'shape') shapePalette.classList.remove('show');
    
    canvas.style.cursor = (tool === 'draw' || tool === 'shape') ? 'crosshair' : 'default';
}

function toggleDrawingPalette() {
    shapePalette.classList.remove('show');
    drawingPalette.classList.toggle('show');
    setMainTool('draw');
}

function toggleShapePalette() {
    drawingPalette.classList.remove('show');
    shapePalette.classList.toggle('show');
    setMainTool('shape');
}

function setDrawingSubTool(mode) {
    subMode = mode;
    document.querySelectorAll('.sub-tool').forEach(b => b.classList.remove('active'));
    document.getElementById(`sub-${mode}`).classList.add('active');
}

function selectShape(type) {
    selectedShapeType = type;
    shapePalette.classList.remove('show');
}

// --- DRAWING & CREATION ---
canvas.addEventListener('mousedown', (e) => {
    if (currentTool === 'sticky') {
        createSticky(e.clientX, e.clientY);
        return;
    }
    if (currentTool === 'shape' && selectedShapeType) {
        createShape(e.clientX, e.clientY, selectedShapeType);
        return;
    }
    if (currentTool !== 'draw') return;

    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || currentTool !== 'draw') return;

    if (subMode === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 30;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = (subMode === 'highlighter') ? 'rgba(255, 235, 59, 0.4)' : '#333';
        ctx.lineWidth = (subMode === 'highlighter') ? 20 : 3;
    }

    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();
});

canvas.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;
        saveState();
    }
});

// --- OBJECT CREATION ---
function createSticky(x, y) {
    const note = document.createElement('div');
    note.className = 'sticky-note';
    note.style.left = (x - 75) + 'px';
    note.style.top = (y - 75) + 'px';
    note.innerHTML = `<textarea placeholder="Write..."></textarea>`;
    makeDraggable(note);
    objectsContainer.appendChild(note);
    setMainTool('move'); 
}

function createShape(x, y, type) {
    const shape = document.createElement('div');
    shape.className = `board-shape ${type}`;
    shape.style.left = (x - 50) + 'px';
    shape.style.top = (y - 50) + 'px';
    
    let path = "";
    if(type === 'rect') path = `<rect x="5" y="25" width="90" height="50" rx="2" stroke="#333" fill="none" stroke-width="2"/>`;
    if(type === 'circle') path = `<circle cx="50" cy="50" r="40" stroke="#333" fill="none" stroke-width="2"/>`;
    if(type === 'diamond') path = `<path d="M50 10 L90 50 L50 90 L10 50 Z" stroke="#333" fill="none" stroke-width="2"/>`;
    
    shape.innerHTML = `<svg viewBox="0 0 100 100" style="width:100px; height:100px;">${path}</svg>`;
    makeDraggable(shape);
    objectsContainer.appendChild(shape);
    setMainTool('move');
}

// --- DRAG LOGIC ---
function makeDraggable(el) {
    el.onmousedown = (e) => {
        if (currentTool !== 'move') return;
        
        // Prevent textarea focus from blocking drag
        if (e.target.tagName === 'TEXTAREA') return;

        el.style.cursor = 'grabbing';
        let shiftX = e.clientX - el.getBoundingClientRect().left;
        let shiftY = e.clientY - el.getBoundingClientRect().top;
        
        function moveAt(pageX, pageY) {
            el.style.left = pageX - shiftX + 'px';
            el.style.top = pageY - shiftY + 'px';
        }
        
        function onMouseMove(e) { moveAt(e.pageX, e.pageY); }
        document.addEventListener('mousemove', onMouseMove);
        
        document.onmouseup = () => {
            document.removeEventListener('mousemove', onMouseMove);
            el.style.cursor = 'grab';
            document.onmouseup = null;
        };
    };
}

// --- HISTORY ---
function saveState() {
    historyStack.push(canvas.toDataURL());
    if (historyStack.length > 25) historyStack.shift();
    redoStack = [];
}

function undo() {
    if (historyStack.length <= 1) return;
    redoStack.push(historyStack.pop());
    renderState(historyStack[historyStack.length - 1]);
}

function redo() {
    if (redoStack.length === 0) return;
    let state = redoStack.pop();
    historyStack.push(state);
    renderState(state);
}

function renderState(src) {
    let img = new Image();
    img.src = src;
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
}

window.onload = init;

let scale = 1.0;

canvas.addEventListener('mousedown', (e) => {
    // ADJUST COORDINATES FOR ZOOM
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    if (currentTool === 'sticky') {
        createSticky(x, y); // Use adjusted x,y
        return;
    }
    if (currentTool === 'shape' && selectedShapeType) {
        createShape(x, y, selectedShapeType);
        return;
    }
    if (currentTool !== 'draw') return;

    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || currentTool !== 'draw') return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    ctx.lineTo(x, y);
    ctx.stroke();
});

function changeZoom(delta) {
    scale = Math.min(Math.max(0.2, scale + delta), 3.0);
    document.getElementById('zoom-display').innerText = `${Math.round(scale * 100)}%`;
    canvas.style.transform = `scale(${scale})`;
    objectsContainer.style.transform = `scale(${scale})`;
}

function addNewPage() {
    // Save current
    pages[currentPageIndex] = { canvas: canvas.toDataURL(), objects: objectsContainer.innerHTML };
    // Reset
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    objectsContainer.innerHTML = "";
    // Setup new
    currentPageIndex = pages.length;
    pages.push({ canvas: null, objects: "" });
    updatePageDisplay();
}

function switchPage(index) {
    if (index < 0 || index >= pages.length) return;
    pages[currentPageIndex] = { canvas: canvas.toDataURL(), objects: objectsContainer.innerHTML };
    
    currentPageIndex = index;
    const target = pages[currentPageIndex];
    objectsContainer.innerHTML = target.objects;
    
    if (target.canvas) renderState(target.canvas);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    document.querySelectorAll('.board-shape, .sticky-note').forEach(makeDraggable);
    updatePageDisplay();
}

function updatePageDisplay() {
    document.getElementById('page-display').innerText = `Page ${currentPageIndex + 1}`;
}
let pages = []; // Array to store {canvas: dataURL, objects: htmlString}
let currentPageIndex = 0;

// Initialize the first page
function initPages() {
    pages = [{
        canvas: null,
        objects: ""
    }];
    updatePageDisplay();
}

function updatePageDisplay() {
    const display = document.getElementById('page-display');
    if (display) display.innerText = `Page ${currentPageIndex + 1}`;
}

function addNewPage() {
    // 1. Save current state to the current index
    pages[currentPageIndex] = {
        canvas: canvas.toDataURL(),
        objects: objectsContainer.innerHTML
    };

    // 2. Create new blank state
    currentPageIndex = pages.length;
    pages.push({ canvas: null, objects: "" });

    // 3. Clear the board
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    objectsContainer.innerHTML = "";
    
    updatePageDisplay();
    saveState(); // Reset history stack for new page
}

function switchPage(index) {
    // Boundary check
    if (index < 0 || index >= pages.length) return;

    // 1. Save the page you are currently leaving
    pages[currentPageIndex] = {
        canvas: canvas.toDataURL(),
        objects: objectsContainer.innerHTML
    };

    // 2. Update index and get the target page data
    currentPageIndex = index;
    const targetPage = pages[currentPageIndex];

    // 3. Load Objects (Sticky notes/Shapes)
    objectsContainer.innerHTML = targetPage.objects;

    // 4. Load Canvas Drawing
    if (targetPage.canvas) {
        renderState(targetPage.canvas);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // 5. Re-attach event listeners to the new DOM elements
    document.querySelectorAll('.board-shape, .sticky-note').forEach(el => {
        makeDraggable(el);
    });

    updatePageDisplay();
}

// Navigation Helpers
function prevPage() { switchPage(currentPageIndex - 1); }
function nextPage() { switchPage(currentPageIndex + 1); }

// Update your window.onload
window.onload = () => {
    init();      // Your existing init
    initPages(); // Initialize the page array
};

let currentBrushSize = 3;

function updateBrushSize(val) {
    currentBrushSize = parseInt(val);
    document.getElementById('size-num').innerText = val;
}
canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || currentTool !== 'draw') return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    if (subMode === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = currentBrushSize * 5; // Eraser is 5x bigger
    } else if (subMode === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(255, 235, 59, 0.4)';
        ctx.lineWidth = currentBrushSize * 4; // Highlighter is 4x bigger
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = currentBrushSize;    // Standard Pen size
    }

    ctx.lineTo(x, y);
    ctx.stroke();
});

let currentBrushColor = '#333333';

function updateBrushColor(hex, element) {
    currentBrushColor = hex;
    
    // UI: Update active swatch
    if(element) {
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        element.classList.add('active');
    }
}

// Helper to convert hex to RGBA for the highlighter
function hexToRGBA(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || currentTool !== 'draw') return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    if (subMode === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = currentBrushSize * 5;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        
        if (subMode === 'highlighter') {
            // Use the selected color but make it 40% transparent
            ctx.strokeStyle = hexToRGBA(currentBrushColor, 0.4);
            ctx.lineWidth = currentBrushSize * 4;
        } else {
            // Standard Pen
            ctx.strokeStyle = currentBrushColor;
            ctx.lineWidth = currentBrushSize;
        }
    }

    ctx.lineTo(x, y);
    ctx.stroke();
});

function updateBrushColor(hex, element) {
    currentBrushColor = hex;

    // 1. Remove active class from all swatches AND the custom wrapper
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.custom-color-wrapper').forEach(w => w.classList.remove('active'));

    // 2. Add active class to the selected element
    if (element) {
        element.classList.add('active');
    }
    
    // 3. (Optional) If it's a highlighter, update transparency
    if (subMode === 'highlighter') {
        ctx.strokeStyle = hexToRGBA(currentBrushColor, 0.4);
    } else {
        ctx.strokeStyle = currentBrushColor;
    }
}

// Function to change the background color of the sticky note
function changeStickyColor(element, color) {
    const note = element.closest('.sticky-note');
    if (note) {
        note.style.backgroundColor = color;
    }
}
function createSticky(x, y) {
    const note = document.createElement('div');
    note.className = 'sticky-note';
    note.style.left = (x - 75) + 'px';
    note.style.top = (y - 75) + 'px';

    note.innerHTML = `
        <div class="sticky-toolbar">
            <div class="sticky-dots">
                <div class="s-dot" style="background:#fff9ac" onclick="changeStickyColor(this, '#fff9ac')"></div>
                <div class="s-dot" style="background:#ffcfcf" onclick="changeStickyColor(this, '#ffcfcf')"></div>
                <div class="s-dot" style="background:#d1faff" onclick="changeStickyColor(this, '#d1faff')"></div>
                <div class="s-dot" style="background:#d3ffd1" onclick="changeStickyColor(this, '#d3ffd1')"></div>
                
                <div class="s-dot multi-picker-dot" title="Custom Color">
                    <input type="color" oninput="changeStickyColor(this, this.value)">
                </div>
            </div>
            <button class="sticky-delete" onclick="this.closest('.sticky-note').remove()">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
        <textarea placeholder="Write..."></textarea>
    `;

    makeDraggable(note);
    objectsContainer.appendChild(note);
    
    // Important: Re-render icons for the new delete button
    if(window.lucide) lucide.createIcons();
    
    setMainTool('move'); 
}
function makeDraggable(el) {
    el.onmousedown = (e) => {
        if (currentTool !== 'move') return;
        
        // STOP dragging if user clicks the toolbar, buttons, or typing area
        if (e.target.closest('.sticky-toolbar') || e.target.tagName === 'TEXTAREA') {
            return;
        }

        el.style.cursor = 'grabbing';
        let shiftX = e.clientX - el.getBoundingClientRect().left;
        let shiftY = e.clientY - el.getBoundingClientRect().top;
        
        function moveAt(pageX, pageY) {
            el.style.left = pageX - shiftX + 'px';
            el.style.top = pageY - shiftY + 'px';
        }
        
        function onMouseMove(e) { moveAt(e.pageX, e.pageY); }
        document.addEventListener('mousemove', onMouseMove);
        
        document.onmouseup = () => {
            document.removeEventListener('mousemove', onMouseMove);
            el.style.cursor = 'grab';
            document.onmouseup = null;
        };
    };
}

// This is a simple logic. In a real app, you would check a database.
const isLoggedIn = false; // Change this based on your login logic

if (!isLoggedIn && window.location.pathname.includes('index.html')) {
    // Uncomment the line below if you want to force users to login
    // window.location.href = 'login.html'; 
}