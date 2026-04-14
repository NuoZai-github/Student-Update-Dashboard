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

    // Helper to add row to table
    const addTableRow = (tableBody, text, id, tableName) => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', id);
        row.innerHTML = `
            <td>${text}</td>
            <td style="text-align: right;">
                <button class="btn-delete" title="Delete">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;

        // Handle delete button click
        row.querySelector('.btn-delete').addEventListener('click', async () => {
            if (!confirm(`Are you sure you want to delete "${text}"?`)) return;
            
            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq('id', id);

            if (error) {
                console.error(`Error deleting from ${tableName}:`, error);
                alert('Failed to delete item.');
            }
            // Note: UI will be updated by Realtime listener
        });

        tableBody.prepend(row);
    };

    // Load initial data
    const loadAllData = async () => {
        // Load Students
        const { data: students } = await supabase.from('students').select('id, name').order('created_at', { ascending: false });
        if (students) students.forEach(s => addTableRow(studentsTableBody, s.name, s.id, 'students'));

        // Load Courses
        const { data: courses } = await supabase.from('courses').select('id, name').order('created_at', { ascending: false });
        if (courses) courses.forEach(c => addTableRow(coursesTableBody, c.name, c.id, 'courses'));

        // Load Milestones
        const { data: milestones } = await supabase.from('progress_milestones').select('id, label').order('created_at', { ascending: false });
        if (milestones) milestones.forEach(m => addTableRow(gradesTableBody, m.label, m.id, 'progress_milestones'));
    };

    // Initial load
    loadAllData();

    // Set up Realtime for tables
    supabase
        .channel('manage-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'students' }, payload => {
            addTableRow(studentsTableBody, payload.new.name, payload.new.id, 'students');
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'courses' }, payload => {
            addTableRow(coursesTableBody, payload.new.name, payload.new.id, 'courses');
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'progress_milestones' }, payload => {
            addTableRow(gradesTableBody, payload.new.label, payload.new.id, 'progress_milestones');
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'students' }, payload => {
            const row = studentsTableBody.querySelector(`tr[data-id="${payload.old.id}"]`);
            if (row) row.remove();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'courses' }, payload => {
            const row = coursesTableBody.querySelector(`tr[data-id="${payload.old.id}"]`);
            if (row) row.remove();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'progress_milestones' }, payload => {
            const row = gradesTableBody.querySelector(`tr[data-id="${payload.old.id}"]`);
            if (row) row.remove();
        })
        .subscribe();



    // UI Feedback Helper
    const showFeedback = (button, message, isSuccess = true) => {
        const originalText = button.innerHTML;
        const buttonClass = isSuccess ? 'success' : 'danger'; // Assuming custom styles might exist, otherwise just text change
        
        button.innerText = message;
        button.style.background = isSuccess ? 'var(--success)' : 'var(--danger)';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = ''; // reset back to CSS class rules
        }, 2000);
    };

    // Form Submissions
    
    // 1. Add Student
    addStudentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button');
        const studentName = newStudentNameInput.value.trim();
        
        if (!studentName) return;

        const { data, error } = await supabase
            .from('students')
            .insert([{ name: studentName }]);

        if (error) {
            console.error('Error adding student:', error);
            showFeedback(submitBtn, 'Failed to Add', false);
        } else {
            showFeedback(submitBtn, 'Student Added!');
            newStudentNameInput.value = '';
        }
    });

    // 2. Add Course
    addCourseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button');
        const courseName = newCourseNameInput.value.trim();
        
        if (!courseName) return;

        const { data, error } = await supabase
            .from('courses')
            .insert([{ name: courseName }]);

        if (error) {
            console.error('Error adding course:', error);
            showFeedback(submitBtn, 'Failed to Add', false);
        } else {
            showFeedback(submitBtn, 'Course Added!');
            newCourseNameInput.value = '';
        }
    });

    // 3. Add Grade / Status
    addGradeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button');
        const gradeName = newGradeNameInput.value.trim();
        
        if (!gradeName) return;

        const { data, error } = await supabase
            .from('progress_milestones')
            .insert([{ label: gradeName }]);

        if (error) {
            console.error('Error adding grade/status:', error);
            showFeedback(submitBtn, 'Failed to Add', false);
        } else {
            showFeedback(submitBtn, 'Status Added!');
            newGradeNameInput.value = '';
        }
    });
});
