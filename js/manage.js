document.addEventListener('DOMContentLoaded', () => {
    // Initialize Supabase
    const supabaseUrl = 'https://elcizzczflunmjuyfhvq.supabase.co';
    const supabaseKey = 'sb_publishable_LRHrxxr8BewhV5VacNfk0w_rBqPCS5S';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // Get Form Elements
    const addStudentForm = document.getElementById('addStudentForm');
    const newStudentNameInput = document.getElementById('newStudentName');

    const addCourseForm = document.getElementById('addCourseForm');
    const newCourseNameInput = document.getElementById('newCourseName');

    const addGradeForm = document.getElementById('addGradeForm');
    const newGradeNameInput = document.getElementById('newGradeName');

    // Table Bodies
    const studentsTableBody = document.querySelector('#studentsTable tbody');
    const coursesTableBody = document.querySelector('#coursesTable tbody');
    const gradesTableBody = document.querySelector('#gradesTable tbody');

    // ============================================================
    // Delete handler using event delegation on table bodies
    // This ensures ALL buttons (current and future) are handled
    // ============================================================
    function setupDeleteDelegation(tableBody, tableName) {
        tableBody.addEventListener('click', async function(e) {
            // Find the closest .btn-delete from the click target
            const btn = e.target.closest('.btn-delete');
            if (!btn) return;

            const row = btn.closest('tr');
            if (!row) return;

            const id = row.getAttribute('data-id');
            const text = row.querySelector('td').textContent.trim();

            if (!confirm('Are you sure you want to delete "' + text + '"?')) return;

            // Disable button and show loading
            btn.disabled = true;
            btn.style.opacity = '0.5';

            try {
                const { error } = await supabase
                    .from(tableName)
                    .delete()
                    .eq('id', id);

                if (error) {
                    console.error('Delete error:', error);
                    alert('Failed to delete: ' + error.message);
                    btn.disabled = false;
                    btn.style.opacity = '1';
                } else {
                    row.remove();
                }
            } catch (err) {
                console.error('Delete exception:', err);
                alert('Failed to delete item.');
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        });
    }

    // Set up delegation ONCE for each table body
    setupDeleteDelegation(studentsTableBody, 'students');
    setupDeleteDelegation(coursesTableBody, 'courses');
    setupDeleteDelegation(gradesTableBody, 'progress_milestones');

    // ============================================================
    // Helper to add a row to a table (no individual event listeners)
    // ============================================================
    function addTableRow(tableBody, text, id) {
        // Prevent duplicates
        if (tableBody.querySelector('tr[data-id="' + id + '"]')) return;

        const row = document.createElement('tr');
        row.setAttribute('data-id', id);

        const tdName = document.createElement('td');
        tdName.textContent = text;

        const tdAction = document.createElement('td');
        tdAction.style.textAlign = 'right';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.title = 'Delete';
        deleteBtn.innerHTML = '<i class="ph ph-trash"></i>';

        tdAction.appendChild(deleteBtn);
        row.appendChild(tdName);
        row.appendChild(tdAction);

        tableBody.prepend(row);
    }

    // ============================================================
    // Load initial data
    // ============================================================
    async function loadAllData() {
        try {
            // Load Students
            const { data: students, error: e1 } = await supabase
                .from('students')
                .select('id, name')
                .order('created_at', { ascending: false });
            if (e1) console.error('Error loading students:', e1);
            if (students) students.forEach(s => addTableRow(studentsTableBody, s.name, s.id));

            // Load Courses
            const { data: courses, error: e2 } = await supabase
                .from('courses')
                .select('id, name')
                .order('created_at', { ascending: false });
            if (e2) console.error('Error loading courses:', e2);
            if (courses) courses.forEach(c => addTableRow(coursesTableBody, c.name, c.id));

            // Load Milestones
            const { data: milestones, error: e3 } = await supabase
                .from('progress_milestones')
                .select('id, label')
                .order('created_at', { ascending: false });
            if (e3) console.error('Error loading milestones:', e3);
            if (milestones) milestones.forEach(m => addTableRow(gradesTableBody, m.label, m.id));
        } catch (err) {
            console.error('Error loading initial data:', err);
        }
    }

    // Initial load
    loadAllData();

    // ============================================================
    // Realtime subscriptions
    // ============================================================
    supabase
        .channel('manage-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'students' }, payload => {
            addTableRow(studentsTableBody, payload.new.name, payload.new.id);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'courses' }, payload => {
            addTableRow(coursesTableBody, payload.new.name, payload.new.id);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'progress_milestones' }, payload => {
            addTableRow(gradesTableBody, payload.new.label, payload.new.id);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'students' }, payload => {
            const row = studentsTableBody.querySelector('tr[data-id="' + payload.old.id + '"]');
            if (row) row.remove();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'courses' }, payload => {
            const row = coursesTableBody.querySelector('tr[data-id="' + payload.old.id + '"]');
            if (row) row.remove();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'progress_milestones' }, payload => {
            const row = gradesTableBody.querySelector('tr[data-id="' + payload.old.id + '"]');
            if (row) row.remove();
        })
        .subscribe();

    // ============================================================
    // UI Feedback Helper
    // ============================================================
    function showFeedback(button, message, isSuccess) {
        const originalText = button.innerHTML;

        button.innerText = message;
        button.style.background = isSuccess ? 'var(--success)' : 'var(--danger)';

        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
        }, 2000);
    }

    // ============================================================
    // Form Submissions
    // ============================================================

    // 1. Add Student
    addStudentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const studentName = newStudentNameInput.value.trim();

        if (!studentName) return;

        const { error } = await supabase
            .from('students')
            .insert([{ name: studentName }]);

        if (error) {
            console.error('Error adding student:', error);
            showFeedback(submitBtn, 'Failed to Add', false);
        } else {
            showFeedback(submitBtn, 'Student Added!', true);
            newStudentNameInput.value = '';
        }
    });

    // 2. Add Course
    addCourseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const courseName = newCourseNameInput.value.trim();

        if (!courseName) return;

        const { error } = await supabase
            .from('courses')
            .insert([{ name: courseName }]);

        if (error) {
            console.error('Error adding course:', error);
            showFeedback(submitBtn, 'Failed to Add', false);
        } else {
            showFeedback(submitBtn, 'Course Added!', true);
            newCourseNameInput.value = '';
        }
    });

    // 3. Add Grade / Status
    addGradeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const gradeName = newGradeNameInput.value.trim();

        if (!gradeName) return;

        const { error } = await supabase
            .from('progress_milestones')
            .insert([{ label: gradeName }]);

        if (error) {
            console.error('Error adding grade/status:', error);
            showFeedback(submitBtn, 'Failed to Add', false);
        } else {
            showFeedback(submitBtn, 'Status Added!', true);
            newGradeNameInput.value = '';
        }
    });
});
