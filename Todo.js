document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const filterTasksSelect = document.getElementById('filterTasks');

    // Modal elements
    const taskDetailModal = document.getElementById('taskDetailModal');
    const closeModalBtn = document.querySelector('.close-button');
    const modalTaskTitle = document.getElementById('modalTaskTitle');
    const modalTaskDescription = document.getElementById('modalTaskDescription');
    const modalDueDate = document.getElementById('modalDueDate');
    const saveTaskDetailsBtn = document.getElementById('saveTaskDetails');
    const cancelTaskDetailsBtn = document.getElementById('cancelTaskDetails');

    let currentEditingTaskLi = null; // Reference to the <li> element being edited

    // --- Event Listeners ---

    // Initial load of tasks
    loadTasks();
    applyFilters(); // Apply filters on load

    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    taskList.addEventListener('click', handleTaskActions); // Delegates clicks for buttons and task details
    filterTasksSelect.addEventListener('change', applyFilters);

    // Modal Event Listeners
    closeModalBtn.addEventListener('click', closeTaskDetailModal);
    cancelTaskDetailsBtn.addEventListener('click', closeTaskDetailModal);
    saveTaskDetailsBtn.addEventListener('click', saveTaskDetails);
    window.addEventListener('click', (event) => { // Close modal when clicking outside
        if (event.target == taskDetailModal) {
            closeTaskDetailModal();
        }
    });

    // --- Core Functions ---

    function addTask() {
        const taskText = taskInput.value.trim();
        if (taskText === '') {
            alert('Please enter a task!'); // Using browser alert for simplicity
            return;
        }

        const newTask = {
            id: Date.now(), // Unique ID for each task
            text: taskText,
            description: '',
            dueDate: '',
            completed: false,
            important: false
        };

        renderTask(newTask);
        taskInput.value = ''; // Clear the input field
        saveTasks();
        applyFilters(); // Re-apply filters to show the new task if it matches
    }

    function renderTask(task) {
        const li = document.createElement('li');
        li.dataset.taskId = task.id; // Store ID on the list item
        li.classList.toggle('completed', task.completed);
        li.classList.toggle('important', task.important);

        const dueDateHtml = task.dueDate ? `<div class="task-due-date">Due: ${formatDate(task.dueDate)}</div>` : '';

        li.innerHTML = `
            <div class="task-content">
                <span class="task-text">${task.text}</span>
                ${dueDateHtml}
            </div>
            <div class="task-actions">
                <button class="complete-btn" title="Toggle Complete"><i class="far fa-check-circle"></i></button>
                <button class="important-btn ${task.important ? 'active' : ''}" title="Toggle Important"><i class="far fa-star"></i></button>
                <button class="delete-btn" title="Delete Task"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        taskList.prepend(li); // Add to the top of the list
    }

    function handleTaskActions(e) {
        const li = e.target.closest('li');
        if (!li) return; // Click wasn't on a task item

        const taskId = parseInt(li.dataset.taskId);
        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        let taskIndex = tasks.findIndex(t => t.id === taskId);

        if (e.target.closest('.complete-btn')) {
            if (taskIndex !== -1) {
                tasks[taskIndex].completed = !tasks[taskIndex].completed;
                li.classList.toggle('completed', tasks[taskIndex].completed);
                saveTasks(tasks);
                applyFilters();
            }
        } else if (e.target.closest('.important-btn')) {
            if (taskIndex !== -1) {
                tasks[taskIndex].important = !tasks[taskIndex].important;
                li.classList.toggle('important', tasks[taskIndex].important);
                e.target.closest('.important-btn').classList.toggle('active', tasks[taskIndex].important);
                saveTasks(tasks);
                applyFilters();
            }
        } else if (e.target.closest('.delete-btn')) {
            if (confirm('Are you sure you want to delete this task?')) {
                tasks.splice(taskIndex, 1); // Remove from array
                li.style.animation = 'fadeOut 0.3s ease-out forwards'; // Add fade out animation
                li.addEventListener('animationend', () => {
                    li.remove(); // Remove after animation
                    saveTasks(tasks);
                    applyFilters();
                });
            }
        } else if (!e.target.closest('.task-actions')) { // Clicked on the task content, not a button
            openTaskDetailModal(li);
        }
    }

    function openTaskDetailModal(li) {
        currentEditingTaskLi = li;
        const taskId = parseInt(li.dataset.taskId);
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const task = tasks.find(t => t.id === taskId);

        if (task) {
            modalTaskTitle.value = task.text;
            modalTaskDescription.value = task.description;
            modalDueDate.value = task.dueDate;
            taskDetailModal.style.display = 'flex'; // Show modal
        }
    }

    function closeTaskDetailModal() {
        taskDetailModal.style.display = 'none'; // Hide modal
        currentEditingTaskLi = null; // Clear reference
    }

    function saveTaskDetails() {
        if (!currentEditingTaskLi) return;

        const taskId = parseInt(currentEditingTaskLi.dataset.taskId);
        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        let taskIndex = tasks.findIndex(t => t.id === taskId);

        if (taskIndex !== -1) {
            tasks[taskIndex].text = modalTaskTitle.value.trim();
            tasks[taskIndex].description = modalTaskDescription.value.trim();
            tasks[taskIndex].dueDate = modalDueDate.value;

            // Update the displayed task text and due date
            currentEditingTaskLi.querySelector('.task-text').textContent = tasks[taskIndex].text;
            const existingDueDateDiv = currentEditingTaskLi.querySelector('.task-due-date');
            if (tasks[taskIndex].dueDate) {
                if (existingDueDateDiv) {
                    existingDueDateDiv.textContent = `Due: ${formatDate(tasks[taskIndex].dueDate)}`;
                } else {
                    const newDueDateDiv = document.createElement('div');
                    newDueDateDiv.classList.add('task-due-date');
                    newDueDateDiv.textContent = `Due: ${formatDate(tasks[taskIndex].dueDate)}`;
                    currentEditingTaskLi.querySelector('.task-content').appendChild(newDueDateDiv);
                }
            } else {
                if (existingDueDateDiv) {
                    existingDueDateDiv.remove(); // Remove if due date is cleared
                }
            }

            saveTasks(tasks);
            closeTaskDetailModal();
            applyFilters(); // Re-apply filters in case task text or due date affects sorting/filtering
        }
    }

    function applyFilters() {
        const filter = filterTasksSelect.value;
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        taskList.innerHTML = ''; // Clear current list

        let filteredTasks = [...tasks]; // Create a mutable copy

        if (filter === 'active') {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        } else if (filter === 'completed') {
            filteredTasks = filteredTasks.filter(task => task.completed);
        } else if (filter === 'important') {
            filteredTasks = filteredTasks.filter(task => task.important);
        }
        // 'all' filter doesn't require extra filtering

        // Sort: important tasks first, then by due date (if any), then by creation (desc)
        filteredTasks.sort((a, b) => {
            // Prioritize important tasks
            if (a.important && !b.important) return -1;
            if (!a.important && b.important) return 1;

            // Then sort by due date
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            if (a.dueDate && !b.dueDate) return -1; // Task with due date comes before no due date
            if (!a.dueDate && b.dueDate) return 1;

            // Finally, by creation time (newest first)
            return b.id - a.id;
        });

        filteredTasks.forEach(task => renderTask(task));
    }

    // --- Local Storage Functions ---

    function saveTasks(tasksToSave = null) {
        const tasks = tasksToSave || Array.from(taskList.children).map(li => {
            const taskId = parseInt(li.dataset.taskId);
            // Re-fetch details from local storage for comprehensive save
            // This ensures description and original due date are preserved even if not visible
            const storedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
            const storedTask = storedTasks.find(t => t.id === taskId) || {};

            return {
                id: taskId,
                text: li.querySelector('.task-text').textContent,
                description: storedTask.description || '', // Retain description
                dueDate: storedTask.dueDate || '', // Retain due date
                completed: li.classList.contains('completed'),
                important: li.classList.contains('important')
            };
        });
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function loadTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks'));
        if (tasks) {
            // Clear current list before loading
            taskList.innerHTML = '';
            // Load, but don't render directly, let applyFilters handle rendering after sort
            // tasks.forEach(task => renderTask(task));
        }
    }

    // --- Utility Functions ---
    function formatDate(dateString) {
        if (!dateString) return '';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', options);
    }
});
