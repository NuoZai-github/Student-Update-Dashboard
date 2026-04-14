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
    const addTableRow = (tableBody, text) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${text}</td>`;
        tableBody.prepend(row); // Add new ones to the top
    };

    // Load initial data
    const loadAllData = async () => {
        // Load Students
        const { data: students } = await supabase.from('students').select('name').order('created_at', { ascending: false });
        if (students) students.forEach(s => addTableRow(studentsTableBody, s.name));

        // Load Courses
        const { data: courses } = await supabase.from('courses').select('name').order('created_at', { ascending: false });
        if (courses) courses.forEach(c => addTableRow(coursesTableBody, c.name));

        // Load Milestones
        const { data: milestones } = await supabase.from('progress_milestones').select('label').order('created_at', { ascending: false });
        if (milestones) milestones.forEach(m => addTableRow(gradesTableBody, m.label));
    };

    // Initial load
    loadAllData();

    // Set up Realtime for tables
    supabase
        .channel('manage-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'students' }, payload => {
            addTableRow(studentsTableBody, payload.new.name);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'courses' }, payload => {
            addTableRow(coursesTableBody, payload.new.name);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'progress_milestones' }, payload => {
            addTableRow(gradesTableBody, payload.new.label);
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
