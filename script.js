/**
 * Slide Puzzle 9x9 - Core Engine & Interactive Logic
 * Supports multi-tile sliding, guaranteed solvability, image cropping,
 * audio effects, undo history, and touch/keyboard controls.
 */

(function () {
    'use strict';

    // Game Configuration & State
    let gridSize = 9; // Default 9x9 as requested
    let board = [];   // Array of tile numbers: 1 to gridSize^2 - 1, and 0 for empty
    let emptyPos = 0; // Index of the empty slot in the board array
    let moveCount = 0;
    let timerInterval = null;
    let startTime = null;
    let elapsedTime = 0; // in seconds
    let isGameActive = false;
    let isShuffled = false;
    let undoStack = [];

    // Visual & Theme Settings
    let currentImage = 'assets/rathalos.jpg';
    let isNumbersMode = false;
    // Badge modes: 'corner', 'center', 'none'
    const badgeModes = ['corner', 'center', 'none'];
    let currentBadgeModeIndex = 0;
    let isGhostVisible = false;

    // DOM Elements
    const boardEl = document.getElementById('puzzle-board');
    const ghostOverlayEl = document.getElementById('ghost-overlay');
    const moveCounterEl = document.getElementById('move-counter');
    const timerDisplayEl = document.getElementById('timer-display');
    const bestDisplayEl = document.getElementById('best-display');
    const headerGridBadgeEl = document.getElementById('header-grid-badge');

    // Buttons
    const btnShuffle = document.getElementById('btn-shuffle');
    const btnUndo = document.getElementById('btn-undo');
    const btnSolveDemo = document.getElementById('btn-solve-demo');
    const btnSoundToggle = document.getElementById('btn-sound-toggle');
    const btnBadgeToggle = document.getElementById('btn-badge-toggle');
    const btnGhostToggle = document.getElementById('btn-ghost-toggle');
    const gridSizeSelector = document.getElementById('grid-size-selector');

    // Modals & Image Inputs
    const victoryModal = document.getElementById('victory-modal');
    const victoryMovesEl = document.getElementById('victory-moves');
    const victoryTimeEl = document.getElementById('victory-time');
    const btnModalRestart = document.getElementById('btn-modal-restart');

    const imageModal = document.getElementById('image-modal');
    const imageModalImg = document.getElementById('image-modal-img');
    const previewThumbnail = document.getElementById('preview-thumbnail');
    const refImageBox = document.getElementById('ref-image-box');
    const refGridOverlay = document.getElementById('ref-grid-overlay');
    const btnToggleRefGrid = document.getElementById('btn-toggle-ref-grid');
    const btnZoomRef = document.getElementById('btn-zoom-ref');
    const refGridBtnText = document.getElementById('ref-grid-btn-text');
    let isRefGridVisible = false;

    const choiceRathalos = document.getElementById('choice-rathalos');
    const choiceNumbers = document.getElementById('choice-numbers');

    const confettiCanvas = document.getElementById('confetti-canvas');

    // Initialize Game
    function init() {
        setupEventListeners();
        loadBestRecord();
        resetToSolved();
        renderRefGridOverlay();
        updateCollectionBadge();
    }

    // Reset board to solved state
    function resetToSolved() {
        stopTimer();
        moveCount = 0;
        elapsedTime = 0;
        isGameActive = false;
        isShuffled = false;
        undoStack = [];
        updateStatsDisplay();

        const totalCells = gridSize * gridSize;
        board = [];
        for (let i = 1; i < totalCells; i++) {
            board.push(i);
        }
        board.push(0); // 0 denotes the empty slot at the end
        emptyPos = totalCells - 1;

        updateGhostImage();
        renderRefGridOverlay();
        renderBoard();
    }

    // Render reference image grid overlay
    function renderRefGridOverlay() {
        if (!refGridOverlay) return;
        refGridOverlay.innerHTML = '';
        refGridOverlay.style.setProperty('--grid-size', gridSize);
        if (refGridBtnText) {
            refGridBtnText.textContent = `เส้นตาราง ${gridSize}×${gridSize}`;
        }

        const totalCells = gridSize * gridSize;
        for (let i = 1; i <= totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'ref-grid-cell';
            const num = document.createElement('span');
            num.className = 'ref-grid-cell-num';
            num.textContent = i;
            cell.appendChild(num);
            refGridOverlay.appendChild(cell);
        }
    }

    // Update Ghost / Reference image
    function updateGhostImage() {
        if (isNumbersMode) {
            ghostOverlayEl.style.backgroundImage = 'none';
            previewThumbnail.style.opacity = '0.3';
            imageModalImg.src = '';
            if (refGridOverlay) refGridOverlay.style.display = 'none';
        } else {
            ghostOverlayEl.style.backgroundImage = `url("${currentImage}")`;
            previewThumbnail.src = currentImage;
            previewThumbnail.style.opacity = '1';
            imageModalImg.src = currentImage;
            if (refGridOverlay) refGridOverlay.style.display = '';
        }
    }

    // Render puzzle board tiles
    function renderBoard() {
        boardEl.innerHTML = '';
        boardEl.style.setProperty('--grid-size', gridSize);

        const totalCells = gridSize * gridSize;

        for (let i = 0; i < totalCells; i++) {
            const tileValue = board[i];
            const tile = document.createElement('div');
            tile.classList.add('puzzle-tile');
            tile.dataset.index = i;

            if (tileValue === 0) {
                tile.classList.add('empty');
                tile.setAttribute('aria-label', 'Empty slot');
            } else {
                tile.setAttribute('aria-label', `Tile ${tileValue}`);

                // Check if tile can move (in same row or col as empty slot)
                const tileRow = Math.floor(i / gridSize);
                const tileCol = i % gridSize;
                const emptyRow = Math.floor(emptyPos / gridSize);
                const emptyCol = emptyPos % gridSize;

                if (tileRow === emptyRow || tileCol === emptyCol) {
                    tile.classList.add('movable');
                }

                // Apply Image or Number styling
                if (!isNumbersMode && currentImage) {
                    tile.style.backgroundImage = `url("${currentImage}")`;
                    tile.style.backgroundSize = `${gridSize * 100}% ${gridSize * 100}%`;

                    // Calculate original row and col for this tile value (1-indexed)
                    const origIndex = tileValue - 1;
                    const origRow = Math.floor(origIndex / gridSize);
                    const origCol = origIndex % gridSize;

                    const xPercent = (origCol / (gridSize - 1)) * 100;
                    const yPercent = (origRow / (gridSize - 1)) * 100;
                    tile.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
                } else {
                    tile.style.background = 'linear-gradient(135deg, #1f293d, #141a26)';
                }

                // Add Tile Number Badge
                const numSpan = document.createElement('span');
                numSpan.classList.add('tile-number');
                numSpan.textContent = tileValue;
                tile.appendChild(numSpan);

                // Click listener
                tile.addEventListener('click', () => handleTileClick(i));
            }

            boardEl.appendChild(tile);
        }

        btnUndo.disabled = undoStack.length === 0;
    }

    // Handle tile click with Multi-Tile Sliding
    function handleTileClick(clickedIndex) {
        if (clickedIndex === emptyPos) return;

        const clickedRow = Math.floor(clickedIndex / gridSize);
        const clickedCol = clickedIndex % gridSize;
        const emptyRow = Math.floor(emptyPos / gridSize);
        const emptyCol = emptyPos % gridSize;

        // Check if in same row or column
        const isSameRow = (clickedRow === emptyRow);
        const isSameCol = (clickedCol === emptyCol);

        if (!isSameRow && !isSameCol) {
            // Cannot move
            return;
        }

        // Save current board to undo stack
        undoStack.push([...board]);
        if (undoStack.length > 50) undoStack.shift();

        // Perform sliding
        if (isSameRow) {
            // Horizontal slide
            if (clickedCol < emptyCol) {
                // Shift tiles to the right
                for (let c = emptyCol; c > clickedCol; c--) {
                    const fromIdx = clickedRow * gridSize + (c - 1);
                    const toIdx = clickedRow * gridSize + c;
                    board[toIdx] = board[fromIdx];
                }
            } else {
                // Shift tiles to the left
                for (let c = emptyCol; c < clickedCol; c++) {
                    const fromIdx = clickedRow * gridSize + (c + 1);
                    const toIdx = clickedRow * gridSize + c;
                    board[toIdx] = board[fromIdx];
                }
            }
        } else if (isSameCol) {
            // Vertical slide
            if (clickedRow < emptyRow) {
                // Shift tiles downwards
                for (let r = emptyRow; r > clickedRow; r--) {
                    const fromIdx = (r - 1) * gridSize + clickedCol;
                    const toIdx = r * gridSize + clickedCol;
                    board[toIdx] = board[fromIdx];
                }
            } else {
                // Shift tiles upwards
                for (let r = emptyRow; r < clickedRow; r++) {
                    const fromIdx = (r + 1) * gridSize + clickedCol;
                    const toIdx = r * gridSize + clickedCol;
                    board[toIdx] = board[fromIdx];
                }
            }
        }

        // Place empty slot at clicked position
        board[clickedIndex] = 0;
        emptyPos = clickedIndex;

        // Move counter & sound
        moveCount++;
        if (window.soundCtrl) window.soundCtrl.playSlide();

        // Start timer if first move
        if (!isGameActive && isShuffled) {
            startTimer();
        }

        updateStatsDisplay();
        renderBoard();

        // Check victory
        if (isShuffled && checkWin()) {
            handleVictory();
        }
    }

    // Single step move helper for keyboard or solver
    function moveDirection(dir) {
        const emptyRow = Math.floor(emptyPos / gridSize);
        const emptyCol = emptyPos % gridSize;
        let targetRow = emptyRow;
        let targetCol = emptyCol;

        // 'up' means moving the tile below empty slot UP into empty slot
        if (dir === 'up') targetRow = emptyRow + 1;
        else if (dir === 'down') targetRow = emptyRow - 1;
        else if (dir === 'left') targetCol = emptyCol + 1;
        else if (dir === 'right') targetCol = emptyCol - 1;

        if (targetRow >= 0 && targetRow < gridSize && targetCol >= 0 && targetCol < gridSize) {
            const targetIdx = targetRow * gridSize + targetCol;
            handleTileClick(targetIdx);
        }
    }

    // Guaranteed Solvability Shuffle
    // Starts from solved board and performs N valid random moves
    function shuffleBoard() {
        resetToSolved();
        if (window.soundCtrl) window.soundCtrl.playShuffle();

        const numMoves = Math.max(300, gridSize * 60);
        let lastPos = -1;

        for (let i = 0; i < numMoves; i++) {
            const neighbors = getValidNeighbors(emptyPos);
            // Avoid immediately reversing the previous move
            const filteredNeighbors = neighbors.filter(pos => pos !== lastPos);
            const candidates = filteredNeighbors.length > 0 ? filteredNeighbors : neighbors;
            const chosen = candidates[Math.floor(Math.random() * candidates.length)];

            // Swap chosen and empty
            board[emptyPos] = board[chosen];
            board[chosen] = 0;
            lastPos = emptyPos;
            emptyPos = chosen;
        }

        isShuffled = true;
        isGameActive = false;
        moveCount = 0;
        elapsedTime = 0;
        undoStack = [];
        updateStatsDisplay();
        renderBoard();
    }

    // Get immediate adjacent neighbors (up, down, left, right) of a position
    function getValidNeighbors(pos) {
        const row = Math.floor(pos / gridSize);
        const col = pos % gridSize;
        const neighbors = [];

        if (row > 0) neighbors.push((row - 1) * gridSize + col);
        if (row < gridSize - 1) neighbors.push((row + 1) * gridSize + col);
        if (col > 0) neighbors.push(row * gridSize + (col - 1));
        if (col < gridSize - 1) neighbors.push(row * gridSize + (col + 1));

        return neighbors;
    }

    // Check if board is in solved order
    function checkWin() {
        const totalCells = gridSize * gridSize;
        for (let i = 0; i < totalCells - 1; i++) {
            if (board[i] !== i + 1) return false;
        }
        return board[totalCells - 1] === 0;
    }

    // Victory handling
    function handleVictory() {
        stopTimer();
        isGameActive = false;
        isShuffled = false;

        if (window.soundCtrl) window.soundCtrl.playVictory();

        // Save best record
        saveBestRecord(elapsedTime, moveCount);

        // Populate Victory Modal
        victoryMovesEl.textContent = moveCount;
        victoryTimeEl.textContent = formatTime(elapsedTime);
        victoryModal.classList.add('open');

        // Trigger confetti
        startConfetti();
    }

    // Undo action
    function undoMove() {
        if (undoStack.length === 0) return;

        board = undoStack.pop();
        emptyPos = board.indexOf(0);
        moveCount = Math.max(0, moveCount - 1);
        if (window.soundCtrl) window.soundCtrl.playUndo();

        updateStatsDisplay();
        renderBoard();
    }

    // Timer functions
    function startTimer() {
        isGameActive = true;
        startTime = Date.now() - (elapsedTime * 1000);
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            timerDisplayEl.textContent = formatTime(elapsedTime);
        }, 500);
    }

    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // LocalStorage Best Record
    function getBestStorageKey() {
        return `slidepuzzle_best_${gridSize}x${gridSize}`;
    }

    function loadBestRecord() {
        const key = getBestStorageKey();
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                bestDisplayEl.textContent = `${formatTime(data.time)} (${data.moves}m)`;
            } catch (e) {
                bestDisplayEl.textContent = '--:--';
            }
        } else {
            bestDisplayEl.textContent = '--:--';
        }
    }

    function saveBestRecord(time, moves) {
        const key = getBestStorageKey();
        const saved = localStorage.getItem(key);
        let shouldSave = true;

        if (saved) {
            try {
                const data = JSON.parse(saved);
                // Lower time or equal time with fewer moves
                if (data.time < time || (data.time === time && data.moves <= moves)) {
                    shouldSave = false;
                }
            } catch (e) {
                shouldSave = true;
            }
        }

        if (shouldSave) {
            localStorage.setItem(key, JSON.stringify({ time, moves }));
            loadBestRecord();
        }
    }

    // Update stats UI
    function updateStatsDisplay() {
        moveCounterEl.textContent = moveCount;
        timerDisplayEl.textContent = formatTime(elapsedTime);
        btnUndo.disabled = undoStack.length === 0;

        const totalTiles = gridSize * gridSize;
        headerGridBadgeEl.textContent = `${gridSize}×${gridSize} • ${totalTiles - 1} PIECES`;
    }

    // ══════════════════════════════════════════
    // COLLECTION SYSTEM (localStorage)
    // ══════════════════════════════════════════

    const COLLECTION_KEY = 'slide_puzzle_collection_v1';

    // The ID of the currently active collection item (null = built-in)
    let activeCollectionId = null;

    function loadCollection() {
        try {
            const raw = localStorage.getItem(COLLECTION_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveCollection(items) {
        try {
            localStorage.setItem(COLLECTION_KEY, JSON.stringify(items));
        } catch (e) {
            // Storage quota exceeded
            alert('พื้นที่จัดเก็บเต็ม ไม่สามารถบันทึกรูปใหม่ได้ กรุณาลบรูปเก่าออกบางส่วน');
        }
    }

    function addToCollection(name, dataUrl) {
        const items = loadCollection();
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        items.push({ id, name, dataUrl, addedAt: Date.now() });
        saveCollection(items);
        return id;
    }

    function deleteFromCollection(id) {
        let items = loadCollection();
        items = items.filter(item => item.id !== id);
        saveCollection(items);
        // If we deleted the currently active image, switch back to Rathalos
        if (activeCollectionId === id) {
            activeCollectionId = null;
            currentImage = 'assets/rathalos.jpg';
            isNumbersMode = false;
            choiceRathalos.classList.add('active');
            choiceNumbers.classList.remove('active');
            updateGhostImage();
            renderBoard();
        }
    }

    function selectFromCollection(id) {
        const items = loadCollection();
        const item = items.find(i => i.id === id);
        if (!item) return;

        activeCollectionId = id;
        currentImage = item.dataUrl;
        isNumbersMode = false;
        choiceRathalos.classList.remove('active');
        choiceNumbers.classList.remove('active');
        updateGhostImage();
        renderBoard();
        if (window.soundCtrl) window.soundCtrl.playClick();
    }

    function updateCollectionBadge() {
        const items = loadCollection();
        const badge = document.getElementById('coll-count-badge');
        if (badge) {
            if (items.length > 0) {
                badge.textContent = items.length;
                badge.style.display = '';
            } else {
                badge.style.display = 'none';
            }
        }
        const footer = document.getElementById('coll-footer-count');
        if (footer) footer.textContent = `${items.length} รูป`;
    }

    function renderCollectionModal() {
        const gridArea = document.getElementById('coll-grid-area');
        const emptyState = document.getElementById('coll-empty-state');
        if (!gridArea) return;

        const items = loadCollection();

        gridArea.innerHTML = '';

        if (items.length === 0) {
            gridArea.style.display = 'none';
            if (emptyState) emptyState.style.display = '';
        } else {
            gridArea.style.display = '';
            if (emptyState) emptyState.style.display = 'none';

            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'coll-card' + (activeCollectionId === item.id ? ' selected' : '');
                card.dataset.id = item.id;

                const img = document.createElement('img');
                img.className = 'coll-card-img';
                img.src = item.dataUrl;
                img.alt = item.name;
                img.loading = 'lazy';

                const overlay = document.createElement('div');
                overlay.className = 'coll-card-overlay';

                const nameEl = document.createElement('span');
                nameEl.className = 'coll-card-name';
                nameEl.textContent = item.name;
                nameEl.title = item.name;

                const delBtn = document.createElement('button');
                delBtn.className = 'btn-coll-delete';
                delBtn.title = 'ลบรูปนี้ออกจากคลัง';
                delBtn.textContent = '🗑';
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`ลบ "${item.name}" ออกจากคลังหรือไม่?`)) {
                        deleteFromCollection(item.id);
                        updateCollectionBadge();
                        renderCollectionModal();
                        if (window.soundCtrl) window.soundCtrl.playClick();
                    }
                });

                overlay.appendChild(nameEl);
                overlay.appendChild(delBtn);
                card.appendChild(img);
                card.appendChild(overlay);

                card.addEventListener('click', () => {
                    selectFromCollection(item.id);
                    renderCollectionModal(); // refresh selected state
                    closeCollectionModal();
                });

                gridArea.appendChild(card);
            });

            // "Add more" card at the end
            const addCard = document.createElement('label');
            addCard.className = 'coll-add-card';
            addCard.title = 'เพิ่มรูปภาพใหม่';
            addCard.htmlFor = 'custom-image-input';
            addCard.innerHTML = `<span class="coll-add-card-icon">➕</span><span>เพิ่มรูป</span>`;
            gridArea.appendChild(addCard);
        }

        updateCollectionBadge();
    }

    function openCollectionModal() {
        const modal = document.getElementById('collection-modal');
        if (modal) {
            renderCollectionModal();
            modal.classList.add('open');
            if (window.soundCtrl) window.soundCtrl.playClick();
        }
    }

    function closeCollectionModal() {
        const modal = document.getElementById('collection-modal');
        if (modal) modal.classList.remove('open');
    }

    // Crop uploaded image into square aspect ratio and save to collection
    function handleCustomImageUpload(file) {
        if (!file) return;

        const fileName = file.name.replace(/\.[^.]+$/, '').slice(0, 32); // trim extension, max 32 chars
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                const size = Math.min(img.width, img.height);
                canvas.width = 600;
                canvas.height = 600;
                const ctx = canvas.getContext('2d');

                const sx = (img.width - size) / 2;
                const sy = (img.height - size) / 2;
                ctx.drawImage(img, sx, sy, size, size, 0, 0, 600, 600);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

                // Save to collection
                const newId = addToCollection(fileName, dataUrl);
                updateCollectionBadge();

                // Auto-select the new image
                activeCollectionId = newId;
                currentImage = dataUrl;
                isNumbersMode = false;
                choiceRathalos.classList.remove('active');
                choiceNumbers.classList.remove('active');
                updateGhostImage();
                renderBoard();

                // Re-render modal to highlight new card
                renderCollectionModal();

                if (window.soundCtrl) window.soundCtrl.playClick();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Event Listeners setup
    function setupEventListeners() {
        // Shuffle Button
        btnShuffle.addEventListener('click', shuffleBoard);

        // Undo Button
        btnUndo.addEventListener('click', undoMove);

        // Solve / Reset Demo Button
        btnSolveDemo.addEventListener('click', () => {
            resetToSolved();
            if (window.soundCtrl) window.soundCtrl.playClick();
        });

        // Sound Toggle
        btnSoundToggle.addEventListener('click', () => {
            if (window.soundCtrl) {
                const enabled = window.soundCtrl.toggle();
                btnSoundToggle.textContent = enabled ? '🔊' : '🔇';
                btnSoundToggle.classList.toggle('active', enabled);
            }
        });

        // Badge / Numbers Mode Toggle
        btnBadgeToggle.addEventListener('click', () => {
            currentBadgeModeIndex = (currentBadgeModeIndex + 1) % badgeModes.length;
            const newMode = badgeModes[currentBadgeModeIndex];

            document.body.classList.remove('badge-mode-corner', 'badge-mode-center', 'badge-mode-none');
            document.body.classList.add(`badge-mode-${newMode}`);

            btnBadgeToggle.classList.toggle('active', newMode !== 'none');
            if (window.soundCtrl) window.soundCtrl.playClick();
        });

        // Ghost Overlay Toggle
        btnGhostToggle.addEventListener('click', () => {
            isGhostVisible = !isGhostVisible;
            ghostOverlayEl.classList.toggle('visible', isGhostVisible);
            btnGhostToggle.classList.toggle('active', isGhostVisible);
            if (window.soundCtrl) window.soundCtrl.playClick();
        });

        // Grid Size Buttons
        gridSizeSelector.addEventListener('click', (e) => {
            const pill = e.target.closest('.grid-pill');
            if (!pill) return;

            const newSize = parseInt(pill.dataset.size, 10);
            if (newSize === gridSize) return;

            gridSizeSelector.querySelectorAll('.grid-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            gridSize = newSize;
            loadBestRecord();
            resetToSolved();
            renderRefGridOverlay();
            if (window.soundCtrl) window.soundCtrl.playClick();
        });

        // Image Selection: Rathalos
        choiceRathalos.addEventListener('click', () => {
            activeCollectionId = null;
            currentImage = 'assets/rathalos.jpg';
            isNumbersMode = false;
            choiceRathalos.classList.add('active');
            choiceNumbers.classList.remove('active');
            updateGhostImage();
            renderBoard();
            if (window.soundCtrl) window.soundCtrl.playClick();
        });

        // Image Selection: Classic Numbers
        choiceNumbers.addEventListener('click', () => {
            activeCollectionId = null;
            isNumbersMode = true;
            choiceNumbers.classList.add('active');
            choiceRathalos.classList.remove('active');
            updateGhostImage();
            renderBoard();
            if (window.soundCtrl) window.soundCtrl.playClick();
        });

        // Open Collection Modal button
        const btnOpenCollection = document.getElementById('btn-open-collection');
        if (btnOpenCollection) {
            btnOpenCollection.addEventListener('click', openCollectionModal);
        }

        // Close Collection Modal button
        const btnCloseCollection = document.getElementById('btn-close-collection');
        if (btnCloseCollection) {
            btnCloseCollection.addEventListener('click', closeCollectionModal);
        }

        // Click backdrop to close collection modal
        const collModal = document.getElementById('collection-modal');
        if (collModal) {
            collModal.addEventListener('click', (e) => {
                if (e.target === collModal) closeCollectionModal();
            });
        }

        // Escape key closes any open modal
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeCollectionModal();
                imageModal.classList.remove('open');
                victoryModal.classList.remove('open');
            }
        });

        // Custom Image Upload Input (inside Collection modal — use delegation)
        document.body.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'custom-image-input') {
                if (e.target.files && e.target.files[0]) {
                    handleCustomImageUpload(e.target.files[0]);
                    e.target.value = ''; // allow re-upload of same file
                }
            }
        });

        // Preview thumbnail / Reference image click to zoom
        function openImageModal() {
            if (!isNumbersMode && currentImage) {
                imageModalImg.src = currentImage;
                imageModal.classList.add('open');
                if (window.soundCtrl) window.soundCtrl.playClick();
            }
        }

        if (refImageBox) {
            refImageBox.addEventListener('click', openImageModal);
        } else if (previewThumbnail) {
            previewThumbnail.addEventListener('click', openImageModal);
        }

        if (btnZoomRef) {
            btnZoomRef.addEventListener('click', (e) => {
                e.stopPropagation();
                openImageModal();
            });
        }

        // Toggle Reference Grid overlay
        if (btnToggleRefGrid) {
            btnToggleRefGrid.addEventListener('click', (e) => {
                e.stopPropagation();
                isRefGridVisible = !isRefGridVisible;
                if (refGridOverlay) {
                    refGridOverlay.classList.toggle('visible', isRefGridVisible);
                }
                btnToggleRefGrid.classList.toggle('active', isRefGridVisible);
                if (window.soundCtrl) window.soundCtrl.playClick();
            });
        }

        imageModal.addEventListener('click', () => {
            imageModal.classList.remove('open');
        });

        // Victory Modal Restart
        btnModalRestart.addEventListener('click', () => {
            victoryModal.classList.remove('open');
            stopConfetti();
            shuffleBoard();
        });

        // Keyboard navigation (WASD & Arrow Keys)
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'KeyW'].includes(e.code)) {
                e.preventDefault();
                moveDirection('up');
            } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
                e.preventDefault();
                moveDirection('down');
            } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
                e.preventDefault();
                moveDirection('left');
            } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
                e.preventDefault();
                moveDirection('right');
            } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                undoMove();
            }
        });

        // Touch Swipe Navigation for mobile
        let touchStartX = 0;
        let touchStartY = 0;

        boardEl.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        boardEl.addEventListener('touchend', (e) => {
            if (!touchStartX || !touchStartY || e.changedTouches.length === 0) return;

            const deltaX = e.changedTouches[0].clientX - touchStartX;
            const deltaY = e.changedTouches[0].clientY - touchStartY;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            // Minimum swipe threshold
            if (Math.max(absX, absY) > 30) {
                if (absX > absY) {
                    // Horizontal swipe
                    if (deltaX > 0) moveDirection('right');
                    else moveDirection('left');
                } else {
                    // Vertical swipe
                    if (deltaY > 0) moveDirection('down');
                    else moveDirection('up');
                }
            }

            touchStartX = 0;
            touchStartY = 0;
        }, { passive: true });
    }

    // Confetti Animation Effect
    let confettiAnimationId = null;
    let confettiParticles = [];

    function startConfetti() {
        const ctx = confettiCanvas.getContext('2d');
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;

        const colors = ['#e5a93c', '#ffd166', '#e63946', '#2a9d8f', '#ffffff'];
        confettiParticles = [];

        for (let i = 0; i < 120; i++) {
            confettiParticles.push({
                x: Math.random() * confettiCanvas.width,
                y: Math.random() * -confettiCanvas.height,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                speedX: Math.random() * 4 - 2,
                speedY: Math.random() * 5 + 3,
                rotation: Math.random() * 360,
                rotationSpeed: Math.random() * 8 - 4
            });
        }

        function renderParticles() {
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

            confettiParticles.forEach((p) => {
                p.x += p.speedX;
                p.y += p.speedY;
                p.rotation += p.rotationSpeed;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();

                if (p.y > confettiCanvas.height) {
                    p.y = -20;
                    p.x = Math.random() * confettiCanvas.width;
                }
            });

            confettiAnimationId = requestAnimationFrame(renderParticles);
        }

        cancelAnimationFrame(confettiAnimationId);
        renderParticles();

        // Auto stop after 7 seconds
        setTimeout(stopConfetti, 7000);
    }

    function stopConfetti() {
        if (confettiAnimationId) {
            cancelAnimationFrame(confettiAnimationId);
            confettiAnimationId = null;
            const ctx = confettiCanvas.getContext('2d');
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }
    }

    // Window resize handler for confetti canvas
    window.addEventListener('resize', () => {
        if (confettiCanvas) {
            confettiCanvas.width = window.innerWidth;
            confettiCanvas.height = window.innerHeight;
        }
    });

    // Run on DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
